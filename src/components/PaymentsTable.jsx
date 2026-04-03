import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { API_BASE_URL } from '../config/api';
import PaymentForm from './PaymentForm';
import Modal from './Modal';
import ProvisionalReceipt from './ProvisionalReceipt';
import PaymentEditModal from './PaymentEditModal';
import CurrencyDisplay from './CurrencyDisplay';
import { formatMethodName, formatMethodNameShort } from '../utils/paymentMethodUtils';
import { useAuth } from '../contexts/AuthContext';

const PaymentsTable = ({ saleId, onPaymentAdded, saleCurrency = 'USD' }) => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [showSellerForm, setShowSellerForm] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [completedReceipts, setCompletedReceipts] = useState(new Set());
  const [respondedReceipts, setRespondedReceipts] = useState(new Set());
  const [existingReceipts, setExistingReceipts] = useState(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // NUEVOS ESTADOS PARA EL VISOR DE IMÁGENES/PDF
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [isPdfReceipt, setIsPdfReceipt] = useState(false);

  const [columnWidths, setColumnWidths] = useState({
    type: 'w-28',
    method: 'w-24', 
    amount: 'w-32',
    date: 'w-24',
    receipt: 'w-32',
    notes: 'w-32'
  });

  useEffect(() => {
    fetchPayments();
  }, [saleId]);

const fetchPayments = async () => {
    try {
      setLoading(true);
      
      if (!saleId || saleId === 'undefined') {
        setPayments([]);
        setLoading(false);
        return;
      }
      
      const response = await api.get(`/api/payments?saleId=${saleId}`);

if (response.data.success) {
        // --- ORDENAMIENTO DOBLE PARA DESEMPATAR ---
        const sortedPayments = response.data.data.payments.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();

          // Si las fechas son distintas, ordenamos por fecha (descendente)
          if (dateB !== dateA) {
            return dateB - dateA;
          }

          // Si las fechas son iguales (mismo día), desempatamos con createdAt
          // Esto asegura que el último que se grabó aparezca arriba
          const createdA = new Date(a.createdAt || a._id.getTimestamp?.() || 0).getTime();
          const createdB = new Date(b.createdAt || b._id.getTimestamp?.() || 0).getTime();
          
          return createdB - createdA;
        });
        
        setPayments(sortedPayments);
        // --------------------------------------------
        
        const respondedSet = new Set();
        const existingSet = new Set();
        for (const payment of sortedPayments) { // Usamos los ya ordenados
          const isResponded = await checkReceiptStatus(payment._id);
          if (isResponded) {
            respondedSet.add(payment._id);
          }
          
          const hasReceipt = await checkReceiptExists(payment._id);
          if (hasReceipt) {
            existingSet.add(payment._id);
          }
        }
        setRespondedReceipts(respondedSet);
        setExistingReceipts(existingSet);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  };

  
  const handlePaymentAdded = (newPayment) => {
    setPayments(prev => [newPayment, ...prev]);
    setShowClientForm(false);
    setShowProviderForm(false);
    setShowSellerForm(false);
    onPaymentAdded && onPaymentAdded();
  };

  const handleRowDoubleClick = (payment) => {
    setEditingPayment(payment);
    setShowEditModal(true);
  };

  const handleSavePayment = async (updatedPaymentData) => {
    if (!editingPayment) return;

    if (!updatedPaymentData) {
        handleCancelEdit();
        await fetchPayments();
        onPaymentAdded && onPaymentAdded();
        return;
    }

    setSaving(true);
    try {
      const isFormData = updatedPaymentData instanceof FormData;
      let response;
      if (isFormData) {
        response = await api.put(`/api/payments/${editingPayment._id}`, updatedPaymentData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await api.put(`/api/payments/${editingPayment._id}`, updatedPaymentData);
      }
      
      if (response.data.success) {
        setShowEditModal(false);
        setEditingPayment(null);
        await fetchPayments();
        onPaymentAdded && onPaymentAdded();
      }
    } catch (error) {
      console.error('Error actualizando pago:', error);
      setError(error.response?.data?.message || 'Error al actualizar el pago');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSuccess = async () => {
    setShowEditModal(false);
    setEditingPayment(null);
    await fetchPayments();
    if (onPaymentAdded) onPaymentAdded();
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingPayment(null);
    setError('');
  };

  const generateReceipt = async (paymentId) => {
    try {
      setError('');
      const response = await api.post('/api/receipts/generate', {
        paymentId,
        saleId
      });

      if (response.data.success) {
        setSelectedPaymentId(paymentId);
        setShowReceipt(true);
        await fetchPayments();
      }
    } catch (error) {
      console.error('Error generando recibo:', error);
      const errorMessage = error.response?.data?.message || 'Error al generar recibo';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };

  // LÓGICA MODIFICADA: Activa el Modal Visor en lugar de abrir pestaña nueva
  const viewReceipt = async (paymentId) => {
    try {
      setError('');
      const paymentResponse = await api.get(`/api/payments/${paymentId}`);
      if (paymentResponse.data.success) {
        const payment = paymentResponse.data.data.payment;
        if (payment.receiptImage) {
          try {
            const imageResponse = await api.get(`/api/payments/${paymentId}/receipt-image`);
            if (imageResponse.data.success && imageResponse.data.url) {
              
              // Verificamos si es PDF para el renderizado
              const isPdf = payment.receiptImage.toLowerCase().endsWith('.pdf');
              setIsPdfReceipt(isPdf);
              setCurrentImageUrl(imageResponse.data.url);
              setShowImageModal(true); // Abrimos el visor elegante

            } else {
              setError('No se pudo generar el enlace del recibo');
              setTimeout(() => setError(''), 5000);
            }
          } catch (imgError) {
            console.error("Error pidiendo URL firmada:", imgError);
            setError('Error al obtener la imagen de la nube');
            setTimeout(() => setError(''), 5000);
          }
        } else if (existingReceipts.has(paymentId)) {
          const receiptResponse = await api.get(`/api/receipts?paymentId=${paymentId}`);
          if (receiptResponse.data.success && receiptResponse.data.data.length > 0) {
            setSelectedPaymentId(paymentId);
            setShowReceipt(true);
          } else {
            setError('No se encontró el recibo');
            setTimeout(() => setError(''), 5000);
          }
        } else {
          setError('No se encontró el recibo');
          setTimeout(() => setError(''), 5000);
        }
      }
    } catch (error) {
      setError('Error al cargar el recibo');
      setTimeout(() => setError(''), 5000);
    }
  };

  const checkReceiptStatus = async (paymentId) => {
    try {
      const response = await api.get(`/api/receipts?paymentId=${paymentId}`);
      if (response.data.success && response.data.data.length > 0) {
        const receipt = response.data.data[0];
        return receipt.whatsappStatus?.status === 'responded';
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const checkReceiptExists = async (paymentId) => {
    try {
      const response = await api.get(`/api/receipts?paymentId=${paymentId}`);
      return response.data.success && response.data.data.length > 0;
    } catch (error) {
      return false;
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setSelectedPaymentId(null);
  };

  const handleReceiptCompleted = (paymentId) => {
    setCompletedReceipts(prev => new Set([...prev, paymentId]));
    setExistingReceipts(prev => new Set([...prev, paymentId]));
    if (onPaymentAdded) onPaymentAdded();
  };

  const handleReceiptResponded = (paymentId) => {
    setRespondedReceipts(prev => new Set([...prev, paymentId]));
    fetchPayments();
    if (onPaymentAdded) onPaymentAdded();
  };

  const formatCurrency = (amount, currency) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
    if ((currency || 'USD').toUpperCase() === 'USD') {
      return formatted.replace('$', 'U$');
    }
    return formatted;
  };

const getPaymentTypeColor = (type) => {
    if (type === 'client') return 'bg-success-500/20 text-success-400 border border-success-500/30';
    if (type === 'provider') return 'bg-primary-500/20 text-primary-400 border border-primary-500/30';
    if (type === 'commission') return 'bg-purple-500/20 text-purple-400 border border-purple-500/30'; // Color para la comisión
    return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
  };

  const getReceiptIcon = (filename) => {
    if (!filename) return null;
    const extension = filename.split('.').pop().toLowerCase();
    if (['pdf'].includes(extension)) return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return '🖼️';
    return '📎';
  };

  const handleColumnResize = (column) => {
    const widthMap = {
      type: ['w-20', 'w-24', 'w-28', 'w-32'],
      method: ['w-20', 'w-24', 'w-28', 'w-32'],
      amount: ['w-24', 'w-32', 'w-40', 'w-48'],
      date: ['w-20', 'w-24', 'w-28', 'w-32'],
      receipt: ['w-16', 'w-20', 'w-24', 'w-28'],
      notes: ['w-24', 'w-32', 'w-40', 'w-48']
    };
    const currentWidth = columnWidths[column];
    const availableWidths = widthMap[column];
    const currentIndex = availableWidths.indexOf(currentWidth);
    const nextIndex = (currentIndex + 1) % availableWidths.length;
    setColumnWidths(prev => ({ ...prev, [column]: availableWidths[nextIndex] }));
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Pagos</h3>
        <div className="flex space-x-3">
          <button onClick={() => setShowClientForm(true)} className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">+ Pago de Pasajero</button>
          <button onClick={() => setShowProviderForm(true)} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">+ Pago a Proveedor</button>
          {user?.role === 'admin' && (
            <button onClick={() => setShowSellerForm(true)} className="px-3 py-1 bg-cyan-600 text-white text-sm rounded-md hover:bg-cyan-700">+ Pago al Vendedor</button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-md">{error}</div>}

      <Modal isOpen={showClientForm} onClose={() => setShowClientForm(false)} title="Registrar Pago de Pasajero" size="lg">
        <PaymentForm saleId={saleId} paymentType="client" onPaymentAdded={handlePaymentAdded} onCancel={() => setShowClientForm(false)} saleCurrency={saleCurrency} />
      </Modal>

      <Modal isOpen={showProviderForm} onClose={() => setShowProviderForm(false)} title="Registrar Pago a Proveedor" size="lg">
        <PaymentForm saleId={saleId} paymentType="provider" onPaymentAdded={handlePaymentAdded} onCancel={() => setShowProviderForm(false)} saleCurrency={saleCurrency} />
      </Modal>

      <Modal isOpen={showSellerForm} onClose={() => setShowSellerForm(false)} title="Registrar Pago al Vendedor" size="lg">
        <PaymentForm saleId={saleId} paymentType="seller" onPaymentAdded={handlePaymentAdded} onCancel={() => setShowSellerForm(false)} saleCurrency={saleCurrency} />
      </Modal>

      <PaymentEditModal payment={editingPayment} isOpen={showEditModal} onClose={handleCancelEdit} onSave={handleSavePayment} onDeleteSuccess={handleDeleteSuccess} saving={saving} saleCurrency={saleCurrency} />

      {payments.length === 0 ? (
        <div className="text-center py-8 text-dark-400">
          <p>Todavía no hay pagos registrados</p>
          <p className="text-sm">Agregá pagos de pasajeros o proveedores para seguir los saldos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-dark-400 bg-dark-800/50 px-3 py-2 rounded-md">
            💡 <strong>Tips:</strong> Doble clic en encabezado para cambiar tamaño. Doble clic en una fila para editar.
          </div>
          <div className="overflow-x-auto">
          <table className="w-full divide-y divide-white/10 table-fixed">
            <thead className="bg-dark-700">
              <tr>
                <th className={`${columnWidths.type} px-3 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider cursor-pointer hover:bg-dark-600 transition-colors`} onDoubleClick={() => handleColumnResize('type')}>Tipo</th>
                <th className={`${columnWidths.method} px-3 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider cursor-pointer hover:bg-dark-600 transition-colors`} onDoubleClick={() => handleColumnResize('method')}>Método</th>
                <th className={`${columnWidths.amount} px-3 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider cursor-pointer hover:bg-dark-600 transition-colors`} onDoubleClick={() => handleColumnResize('amount')}>Monto</th>
                <th className={`${columnWidths.date} px-3 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider cursor-pointer hover:bg-dark-600 transition-colors`} onDoubleClick={() => handleColumnResize('date')}>Fecha</th>
                <th className={`${columnWidths.receipt} px-3 py-3 text-center text-xs font-semibold text-dark-300 uppercase tracking-wider cursor-pointer hover:bg-dark-600 transition-colors`} onDoubleClick={() => handleColumnResize('receipt')}>Recibo</th>
                <th className={`${columnWidths.notes} px-3 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider cursor-pointer hover:bg-dark-600 transition-colors`} onDoubleClick={() => handleColumnResize('notes')}>Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {payments.map((payment, index) => (
                <tr key={payment.id || payment._id || `payment-${index}`} className="hover:bg-white/5 transition-colors cursor-pointer" onDoubleClick={() => handleRowDoubleClick(payment)}>
                      <td className="px-3 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentTypeColor(payment.type)}`}>
                          {payment.type === 'client' ? 'Pasajero' : 
                          payment.type === 'provider' ? 'Proveedor' : 
                          payment.type === 'commission' ? 'Comisión vendedor' : 'Pago Vendedor'}
                        </span>
                      </td>                  <td className="px-3 py-4 text-sm text-dark-100">{formatMethodNameShort(payment.method)}</td>
                  <td className="px-3 py-4">
                    <div className="text-sm font-medium text-dark-100"><CurrencyDisplay>{formatCurrency(payment.amount, saleCurrency)}</CurrencyDisplay></div>
                    {payment.originalAmount && payment.originalCurrency && (
                      <div className="text-[10px] text-dark-400">Origen: <CurrencyDisplay>{formatCurrency(payment.originalAmount, payment.originalCurrency)}</CurrencyDisplay> (Cambio: {payment.exchangeRate?.toFixed(4)})</div>
                    )}
                  </td>
                  <td className="px-3 py-4 text-sm text-dark-300">{new Date(payment.date).toLocaleDateString()}</td>
                  <td className="px-3 py-4 text-center">
                    {(payment.receiptImage || existingReceipts.has(payment._id)) ? (
                      <div className="flex items-center justify-center space-x-2">
                        <span>{getReceiptIcon(payment.receiptImage)}</span>
                        <button onClick={() => viewReceipt(payment._id)} className="text-primary-400 hover:text-primary-300 text-xs bg-primary-500/20 px-2 py-1 rounded border border-primary-500/30">Ver</button>
                      </div>
                    ) : (
                      <button onClick={() => generateReceipt(payment._id)} className="text-primary-400 hover:text-primary-300 text-xs bg-primary-500/20 px-2 py-1 rounded border border-primary-500/30">Generar</button>
                    )}
                  </td>
                  <td className="px-3 py-4 text-sm text-dark-300 truncate">{payment.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* MODAL ORIGINAL DE RECIBOS PROVISIONALES */}
      {showReceipt && (
        <ProvisionalReceipt paymentId={selectedPaymentId} saleId={saleId} onClose={handleReceiptClose} onReceiptCompleted={handleReceiptCompleted} onReceiptResponded={handleReceiptResponded} />
      )}

      {/* NUEVO MODAL VISOR ELEGANTE PARA IMÁGENES Y PDFS */}
      <Modal isOpen={showImageModal} onClose={() => setShowImageModal(false)} title="Visor de Recibo" size="lg">
        <div className="flex flex-col items-center justify-center p-4 bg-dark-800/50 rounded-lg">
          {isPdfReceipt ? (
            <iframe 
              src={currentImageUrl} 
              className="w-full h-[60vh] rounded bg-white" 
              title="Recibo PDF" 
            />
          ) : (
            <img 
              src={currentImageUrl} 
              alt="Recibo" 
              className="max-w-full max-h-[60vh] object-contain rounded" 
            />
          )}
          <div className="mt-4 w-full flex justify-end">
            <a
              href={currentImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700 transition-colors shadow-lg"
            >
              Descargar / Abrir original
            </a>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default PaymentsTable;
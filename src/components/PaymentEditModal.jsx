import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Modal from './Modal'; 

const PaymentEditModal = ({ 
  payment, 
  isOpen, 
  onClose, 
  onSave, 
  onDeleteSuccess,
  saving = false,
  saleCurrency = 'USD'
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    method: '',
    date: '',
    notes: '',
    exchangeRate: ''
  });

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // ESTADO PARA VISTA PREVIA
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchMethods = async () => {
      setLoadingMethods(true);
      try {
        const response = await api.get('/api/manage-currencies');
        if (response.data.success) {
          setPaymentMethods(response.data.data.paymentMethods || []);
        }
      } catch (error) {
        console.error('Error al cargar métodos de pago:', error);
      } finally {
        setLoadingMethods(false);
      }
    };
    if (isOpen) fetchMethods();
  }, [isOpen]);

  useEffect(() => {
    if (payment && isOpen) {
      setFormData({
        amount: payment.originalAmount || payment.amount,
        currency: payment.originalCurrency || payment.currency,
        method: payment.method || '',
        date: new Date(payment.date).toISOString().split('T')[0],
        notes: payment.notes || '',
        exchangeRate: payment.exchangeRate ? payment.exchangeRate.toString() : ''
      });
      setReceiptFile(null);
      setImagePreview(null); // Limpiar vista previa al abrir
      setExtractionError('');
    }
  }, [payment, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      setExtractionError('');
      
      // Lógica de vista previa
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => setImagePreview(event.target.result);
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
    }
  };

  const handleExtractReceipt = async () => {
    if (!receiptFile) {
      setExtractionError('Seleccioná un archivo primero');
      return;
    }
    setExtracting(true);
    setExtractionError('');
    try {
      const ocrData = new FormData();
      ocrData.append('receipt', receiptFile);
      const response = await api.post('/api/receipts/extract', ocrData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 
      });
      if (response.data.success) {
        const { amount, date, currency } = response.data.data;
        if (amount) handleInputChange('amount', amount.toString());
        if (currency) handleInputChange('currency', currency.toUpperCase());
        if (date) {
          const formattedDate = new Date(date).toISOString().split('T')[0];
          handleInputChange('date', formattedDate);
        }
      }
    } catch (error) {
      setExtractionError('Error al extraer datos de la imagen');
    } finally {
      setExtracting(false);
    }
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      const response = await api.delete(`/api/payments/${payment._id}`);
      if (response.data.success) {
        onDeleteSuccess();
      }
    } catch (error) {
      alert('Error al eliminar el pago');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = new FormData();
    const updateData = {
      ...formData,
      amount: parseFloat(formData.amount),
      date: new Date(formData.date)
    };
    Object.keys(updateData).forEach(key => {
      submitData.append(key, updateData[key]);
    });
    // Si hay una foto nueva, la mandamos. El backend se encarga de subirla a Supabase.
    if (receiptFile) submitData.append('receipt', receiptFile);
    
    onSave(submitData);
  };

  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* max-w-sm lo hace más angosto, px-4 py-3 reduce el aire interno */}
      <div className="bg-dark-700 rounded-lg shadow-2xl w-full max-w-sm border border-white/10 overflow-hidden flex flex-col">
        
        <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-dark-800/50">
          <h3 className="text-base font-bold text-white uppercase tracking-tight">Editar Pago</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[80vh]">
          
          {/* Sección OCR Compacta Modificada */}
          <div className="bg-primary-600/10 border border-primary-500/20 rounded-md p-3">
            <label className="block text-[10px] font-bold text-primary-400 uppercase mb-1">
              Actualizar Recibo / Extraer OCR
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="text-[11px] text-dark-300 w-full mb-2 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-primary-600 file:text-white file:text-[10px]"
            />
            
            {/* BLOQUE DE VISTA PREVIA */}
            {imagePreview ? (
              <div className="mt-2 mb-2 flex justify-center bg-dark-800/50 rounded p-1 border border-white/10">
                <img src={imagePreview} alt="Preview" className="max-h-24 object-contain rounded" />
              </div>
            ) : receiptFile && receiptFile.type === 'application/pdf' ? (
              <div className="mt-2 mb-2 flex justify-center items-center bg-dark-800/50 rounded p-2 border border-white/10">
                <span className="text-xl">📄</span>
                <span className="text-[10px] ml-2 text-dark-400 uppercase">PDF seleccionado</span>
              </div>
            ) : null}

            {receiptFile && (
              <button
                type="button"
                onClick={handleExtractReceipt}
                disabled={extracting}
                className="w-full py-1.5 bg-primary-600 text-white text-[11px] font-bold rounded shadow-lg hover:bg-primary-700 transition-all disabled:opacity-50"
              >
                {extracting ? 'EXTRAYENDO...' : 'EXTRAER DATOS'}
              </button>
            )}
            {extractionError && <p className="text-[10px] text-red-400 mt-1 font-medium">{extractionError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-dark-300 mb-1">Monto</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className="w-full px-3 py-1.5 bg-dark-600 border border-dark-500 rounded text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-dark-300 mb-1">Moneda</label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-3 py-1.5 bg-dark-600 border border-dark-500 rounded text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-dark-300 mb-1">Método de Pago</label>
            <select
              value={formData.method}
              onChange={(e) => handleInputChange('method', e.target.value)}
              className="w-full px-3 py-1.5 bg-dark-600 border border-dark-500 rounded text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none"
              required
            >
              <option value="">Seleccionar...</option>
              {paymentMethods.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-dark-300 mb-1">Fecha</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="w-full px-3 py-1.5 bg-dark-600 border border-dark-500 rounded text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none"
              required
            />
          </div>

          <div className="flex flex-col space-y-2 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-primary-600 text-white rounded font-bold text-sm shadow-lg hover:bg-primary-700 transition-all disabled:opacity-50"
            >
              {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </button>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-dark-500 text-dark-100 rounded text-xs font-medium hover:bg-dark-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-xs font-medium hover:bg-red-500/20 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmación de eliminación */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Confirmar" size="sm">
        <div className="p-4 text-center">
          <p className="text-white text-sm mb-4 uppercase font-bold text-red-400">¿Eliminar este pago?</p>
          <div className="flex justify-center space-x-3">
            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-dark-600 text-white rounded text-xs font-bold">NO</button>
            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded text-xs font-bold shadow-lg">SÍ, ELIMINAR</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentEditModal;
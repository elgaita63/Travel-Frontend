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
    exchangeRate: '',
    paymentTo: '' 
  });

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [usdEquivalent, setUsdEquivalent] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  const [showExchangeRate, setShowExchangeRate] = useState(false);
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [methodsRes, providersRes] = await Promise.all([
          api.get('/api/manage-currencies'),
          api.get('/api/providers')
        ]);
        if (methodsRes.data.success) setPaymentMethods(methodsRes.data.data.paymentMethods || []);
        if (providersRes.data.success) setProviders(providersRes.data.data.providers || []);
      } catch (error) {
        console.error('Error fetching modal data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (isOpen) fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (payment && isOpen) {
      setFormData({
        amount: payment.originalAmount || payment.amount,
        currency: payment.originalCurrency || payment.currency,
        method: payment.method || '',
        date: new Date(payment.date).toISOString().split('T')[0],
        notes: payment.notes || '',
        exchangeRate: payment.exchangeRate ? payment.exchangeRate.toString() : '',
        paymentTo: payment.paymentTo?._id || payment.paymentTo || ''
      });
    }
  }, [payment, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'currency') setShowExchangeRate(value && value !== saleCurrency);
  };

  const handleDeleteClick = () => setShowDeleteConfirm(true);

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      const response = await api.delete(`/api/payments/${payment._id}`);
      if (response.data.success && onDeleteSuccess) onDeleteSuccess();
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Error al eliminar el pago');
    } finally { setIsDeleting(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let updateData = { ...formData };
    updateData.date = new Date(formData.date);
    updateData.amount = parseFloat(formData.amount);
    
    if (receiptFile) {
      const submitData = new FormData();
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== null) submitData.append(key, updateData[key]);
      });
      submitData.append('receipt', receiptFile);
      onSave(submitData);
    } else {
      onSave(updateData);
    }
  };

  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-dark-700 rounded-lg shadow-xl w-full max-w-md mx-4 border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Edit Payment</h3>
          <p className="text-sm text-dark-300 mt-1">{payment.type === 'client' ? 'Passenger' : 'Provider'} Payment</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">Destinatario del Pago</label>
            <select
              value={formData.paymentTo}
              onChange={(e) => handleInputChange('paymentTo', e.target.value)}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-md text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="">A la Agencia</option>
              {providers.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">Payment Method</label>
            <select
              value={formData.method}
              onChange={(e) => handleInputChange('method', e.target.value)}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-md text-white focus:border-primary-500 focus:outline-none"
              required
            >
              <option value="">Select method</option>
              {paymentMethods.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">Amount</label>
              <input type="number" step="0.01" value={formData.amount} onChange={(e) => handleInputChange('amount', e.target.value)} className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-md text-white focus:border-primary-500 focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">Currency</label>
              <select value={formData.currency} onChange={(e) => handleInputChange('currency', e.target.value)} className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-md text-white focus:border-primary-500 focus:outline-none">
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">Payment Date</label>
            <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-md text-white focus:border-primary-500 focus:outline-none" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">Notes</label>
            <textarea value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-md text-white focus:border-primary-500 focus:outline-none" rows="3" />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <button type="button" onClick={handleDeleteClick} className="px-4 py-2 text-red-500 bg-red-500/10 rounded-md text-sm font-medium">Eliminar Pago</button>
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-dark-300 bg-dark-600 rounded-md">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </form>
      </div>

      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Confirmar Eliminación" size="sm">
        <div className="p-4 text-center">
          <p className="text-dark-100 mb-6">¿Eliminar pago? <br /><span className="text-red-400 text-sm font-bold uppercase">Esta acción no se puede deshacer.</span></p>
          <div className="flex justify-center space-x-3">
            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-dark-600 text-white rounded-md">Cancelar</button>
            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md font-bold">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentEditModal;
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import ProvisionalReceipt from './ProvisionalReceipt';

const PaymentForm = ({ saleId, paymentType, onPaymentAdded, onCancel, saleCurrency = 'USD' }) => {
  // 1. Estado del Formulario
  const [formData, setFormData] = useState({
    amount: '',
    currencyType: '',
    paymentMethod: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    paymentTo: '' 
  });

  // 2. Estados para Datos Maestros
  const [currencyTypes, setCurrencyTypes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [providers, setProviders] = useState([]);

  // 3. Estados de Control
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [generatedPaymentId, setGeneratedPaymentId] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [addingMethod, setAddingMethod] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  const [showExchangeRate, setShowExchangeRate] = useState(false);

  // 4. Carga de Datos Iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [currRes, providersRes] = await Promise.all([
          api.get('/api/manage-currencies'),
          api.get('/api/providers')
        ]);
        
        if (currRes.data.success) {
          setCurrencyTypes([
            { _id: 'usd-default', code: 'USD', name: 'U$' },
            { _id: 'ars-default', code: 'ARS', name: 'AR$' }
          ]);
          setPaymentMethods(currRes.data.data.paymentMethods || []);
        }
        if (providersRes.data.success) {
          setProviders(providersRes.data.data.providers || []);
        }
      } catch (error) {
        console.error('Failed to fetch initial form data:', error);
      }
    };
    fetchInitialData();
  }, []);

  // 5. Handlers de Cambio
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    
    if (name === 'currencyType') {
      if (value && value !== saleCurrency) {
        setShowExchangeRate(true);
        setExchangeRate('');
        setConvertedAmount(null);
      } else {
        setShowExchangeRate(false);
        setExchangeRate('');
        setConvertedAmount(null);
      }
    }
  };

  const handleFileChange = (e) => {
    setReceiptFile(e.target.files[0]);
    setExtractionError('');
  };

  // 6. Conversión de Moneda Automática
  useEffect(() => {
    if (exchangeRate && formData.amount && formData.currencyType && formData.currencyType !== saleCurrency) {
      const amount = parseFloat(formData.amount);
      const rate = parseFloat(exchangeRate);
      if (saleCurrency === 'USD') setConvertedAmount(amount / rate);
      else if (saleCurrency === 'ARS') setConvertedAmount(amount * rate);
    } else if (formData.currencyType && formData.currencyType === saleCurrency) {
      setConvertedAmount(parseFloat(formData.amount));
    } else {
      setConvertedAmount(null);
    }
  }, [exchangeRate, formData.amount, formData.currencyType, saleCurrency]);

  // 7. Extracción de Recibo (OCR)
  const handleExtractReceipt = async () => {
    if (!receiptFile) return setExtractionError('Please select a receipt file');
    setExtracting(true);
    setExtractionError('');
    try {
      const data = new FormData();
      data.append('receipt', receiptFile);
      const response = await api.post('/api/receipts/extract', data, { timeout: 120000 });
      if (response.data.success) {
        const ext = response.data.data;
        if (ext.amount) setFormData(p => ({ ...p, amount: ext.amount.toString() }));
        if (ext.currency) {
          const curr = ext.currency.toUpperCase();
          setFormData(p => ({ ...p, currencyType: curr }));
          setShowExchangeRate(curr !== saleCurrency);
        }
        if (ext.date) setFormData(p => ({ ...p, date: new Date(ext.date).toISOString().split('T')[0] }));
      }
    } catch (error) { setExtractionError('Failed to process receipt'); }
    finally { setExtracting(false); }
  };

  // 8. Agregar Nuevo Método
  const addNewPaymentMethod = async () => {
    if (!newMethodName.trim()) return;
    setAddingMethod(true);
    try {
      const res = await api.post('/api/manage-currencies/payment-method', { name: newMethodName.trim() });
      if (res.data.success) {
        const updateRes = await api.get('/api/manage-currencies');
        setPaymentMethods(updateRes.data.data.paymentMethods || []);
        setNewMethodName('');
        setShowAddMethod(false);
      }
    } catch (err) { setError('Failed to add method'); }
    finally { setAddingMethod(false); }
  };

  // 9. Envío del Formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const submitData = new FormData();
      submitData.append('saleId', saleId);
      submitData.append('method', formData.paymentMethod);
      submitData.append('amount', formData.amount);
      submitData.append('currency', formData.currencyType);
      submitData.append('date', formData.date);
      submitData.append('notes', formData.notes);
      submitData.append('paymentTo', formData.paymentTo || '');

      if (formData.currencyType !== saleCurrency) {
        if (!exchangeRate) {
          setError(`Rate required for ${formData.currencyType}`);
          setLoading(false); return;
        }
        submitData.append('exchangeRate', exchangeRate);
        submitData.append('baseCurrency', saleCurrency);
        submitData.append('originalCurrency', formData.currencyType);
        submitData.append('originalAmount', formData.amount);
      }
      if (receiptFile) submitData.append('receipt', receiptFile);

      const endpoint = paymentType === 'client' ? '/api/payments/client' : '/api/payments/provider';
      const response = await api.post(endpoint, submitData, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (response.data.success) {
        setGeneratedPaymentId(response.data.data.payment._id);
        setShowReceipt(true);
        onPaymentAdded(response.data.data.payment);
      }
    } catch (err) { setError(err.response?.data?.message || 'Failed to save'); }
    finally { setLoading(false); }
  };

  if (showReceipt) {
    return <ProvisionalReceipt paymentId={generatedPaymentId} saleId={saleId} onClose={() => setShowReceipt(false)} />;
  }

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-md mb-4">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">Amount *</label>
            <input type="number" name="amount" value={formData.amount} onChange={handleChange} required step="0.01" className="input-field" />
            {convertedAmount && <p className="mt-1 text-sm text-dark-400">≈ {saleCurrency} {convertedAmount.toFixed(2)}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">Payment Date *</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} required className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">Currency Type *</label>
            <select name="currencyType" value={formData.currencyType} onChange={handleChange} required className="input-field">
              <option value="">Select currency</option>
              {currencyTypes.map(c => <option key={c._id} value={c.code}>{c.code} - {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">Destinatario del Pago</label>
            <select name="paymentTo" value={formData.paymentTo} onChange={handleChange} className="input-field">
              <option value="">A la Agencia</option>
              {providers.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-dark-200">Payment Method *</label>
              <button type="button" onClick={() => setShowAddMethod(!showAddMethod)} className="text-primary-400 bg-primary-500/10 border border-primary-500/30 rounded px-1">+</button>
            </div>
            {showAddMethod ? (
              <div className="flex gap-2">
                <input type="text" value={newMethodName} onChange={(e) => setNewMethodName(e.target.value)} className="input-field flex-1" />
                <button type="button" onClick={addNewPaymentMethod} className="btn-primary text-xs">Add</button>
              </div>
            ) : (
              <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required className="input-field">
                <option value="">Select method</option>
                {paymentMethods.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {showExchangeRate && (
          <div className="bg-primary-500/5 border border-primary-500/20 rounded-lg p-4">
            <label className="block text-sm font-medium text-dark-200 mb-2">Exchange Rate *</label>
            <input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} step="0.0001" className="input-field" required />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">Receipt (Optional)</label>
          <input type="file" onChange={handleFileChange} className="block w-full text-sm text-dark-300" />
          {receiptFile && <button type="button" onClick={handleExtractReceipt} className="mt-2 text-xs bg-primary-600 px-2 py-1 rounded">{extracting ? 'Extracting...' : 'Extract Data'}</button>}
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">Notes</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="input-field" />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
          <button type="button" onClick={onCancel} className="px-6 py-2 text-dark-300 bg-dark-600 rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Payment'}</button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
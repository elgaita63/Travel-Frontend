import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import ProvisionalReceipt from './ProvisionalReceipt';
import Modal from './Modal';

const PaymentForm = ({ saleId, paymentType, onPaymentAdded, onCancel, saleCurrency = 'USD' }) => {
  const [formData, setFormData] = useState({
    amount: '',
    currencyType: '',
    paymentMethod: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // NUEVO: Estado para la vista previa
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [generatedPaymentId, setGeneratedPaymentId] = useState(null);
  const [currencyTypes, setCurrencyTypes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showCurrencyTooltip, setShowCurrencyTooltip] = useState(false);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [addingMethod, setAddingMethod] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  const [extractedCurrency, setExtractedCurrency] = useState('');
  const [showExchangeRate, setShowExchangeRate] = useState(false);


  useEffect(() => {
    fetchCurrencies();
  }, []);

  useEffect(() => {
    if (formData.currencyType === 'USD') {
      setExchangeRate('');
      setConvertedAmount(null);
    }
  }, [formData.currencyType]);

  useEffect(() => {
    if (exchangeRate && formData.amount && formData.currencyType && formData.currencyType !== saleCurrency) {
      const amount = parseFloat(formData.amount);
      const rate = parseFloat(exchangeRate);
      
      if (saleCurrency === 'USD') {
        setConvertedAmount(amount / rate);
      } else if (saleCurrency === 'ARS') {
        setConvertedAmount(amount * rate);
      }
    } else if (formData.currencyType && formData.currencyType === saleCurrency) {
      setConvertedAmount(parseFloat(formData.amount));
    } else {
      setConvertedAmount(null);
    }
  }, [exchangeRate, formData.amount, formData.currencyType, saleCurrency]);

  const fetchCurrencies = async () => {
    try {
      const response = await api.get('/api/manage-currencies');
      if (response.data.success) {
        const defaultCurrencies = [
          { _id: 'usd-default', code: 'USD', name: 'U$' },
          { _id: 'ars-default', code: 'ARS', name: 'AR$' }
        ];
        
        setCurrencyTypes(defaultCurrencies);
        setPaymentMethods(response.data.data.paymentMethods || []);
      }
    } catch (error) {
      console.error('Error al cargar monedas:', error);
      setCurrencyTypes([
        { _id: 'usd-default', code: 'USD', name: 'U$' },
        { _id: 'ars-default', code: 'ARS', name: 'AR$' }
      ]);
      setPaymentMethods([]);
    }
  };

  const handleExchangeRateChange = (e) => {
    const value = e.target.value;
    setExchangeRate(value);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      setExtractionError('');
      
      // NUEVO: Generar vista previa de la imagen
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null); // No previsualizar si es PDF u otro
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
      const formData = new FormData();
      formData.append('receipt', receiptFile);

      const response = await api.post('/api/receipts/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      if (response.data.success) {
        const extractedData = response.data.data;
        
        if (extractedData.amount) {
          setFormData(prev => ({
            ...prev,
            amount: extractedData.amount.toString()
          }));
        }
        if (extractedData.currency) {
          const extractedCurr = extractedData.currency.toUpperCase();
          setExtractedCurrency(extractedCurr);
          setFormData(prev => ({
            ...prev,
            currencyType: extractedCurr
          }));
          
          if (extractedCurr !== saleCurrency) {
            setShowExchangeRate(true);
            setExchangeRate('');
            setConvertedAmount(null);
          } else {
            setShowExchangeRate(false);
            setExchangeRate('');
            setConvertedAmount(null);
          }
        }
        if (extractedData.date) {
          const date = new Date(extractedData.date);
          const formattedDate = date.toISOString().split('T')[0];
          setFormData(prev => ({
            ...prev,
            date: formattedDate
          }));
        }
        
        setExtractionError('');
      } else {
        setExtractionError(response.data.message || 'Error al extraer datos de la imagen');
      }
    } catch (error) {
      console.error('Error en extracción de recibo:', error);
      setExtractionError('No se pudo procesar el recibo. Intentá de nuevo o cargá los datos a mano.');
    } finally {
      setExtracting(false);
    }
  };

  const addNewPaymentMethod = async () => {
    if (!newMethodName.trim()) return;
    setAddingMethod(true);
    setError('');
    try {
      const response = await api.post('/api/manage-currencies/payment-method', {
        name: newMethodName.trim()
      });
      if (response.data.success) {
        await fetchCurrencies();
        setNewMethodName('');
        setShowAddMethod(false);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al agregar método de pago');
    } finally {
      setAddingMethod(false);
    }
  };

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
      
      if (formData.currencyType !== saleCurrency) {
        if (!exchangeRate) {
          setError(`Se requiere el tipo de cambio para convertir ${formData.currencyType} a ${saleCurrency}`);
          setLoading(false);
          return;
        }
        submitData.append('exchangeRate', exchangeRate);
        submitData.append('baseCurrency', saleCurrency);
        submitData.append('originalCurrency', formData.currencyType);
        submitData.append('originalAmount', formData.amount);
      }
      
      if (receiptFile) {
        submitData.append('receipt', receiptFile);
      }

      // DETERMINAR ENDPOINT SEGÚN TIPO
      const endpoint = paymentType === 'client' 
        ? '/api/payments/client'
        : paymentType === 'provider'
          ? '/api/payments/provider'
          : '/api/payments/seller-payout';

      const response = await api.post(endpoint, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const payment = response.data.data.payment;
        setGeneratedPaymentId(payment._id);
        
        // El pago a vendedor no genera recibo provisional de cliente habitualmente
        if (paymentType !== 'seller') {
          setShowReceipt(true);
        } else {
          onPaymentAdded(payment);
          onCancel(); // Cerrar modal si es vendedor
        }
        
        if (paymentType !== 'seller') onPaymentAdded(payment);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al guardar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setGeneratedPaymentId(null);
    setFormData({
      amount: '',
      currencyType: '',
      paymentMethod: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setReceiptFile(null);
    setImagePreview(null); // NUEVO: Resetear vista previa
    setExchangeRate('');
    setConvertedAmount(null);
    setShowAddMethod(false);
    setNewMethodName('');
    setExtractedCurrency('');
    setShowExchangeRate(false);
  };

  if (showReceipt) {
    return <ProvisionalReceipt paymentId={generatedPaymentId} saleId={saleId} onClose={handleReceiptClose} />;
  }

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-md mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Monto y Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-dark-200 mb-2">Monto *</label>
            <input type="number" id="amount" name="amount" value={formData.amount} onChange={handleChange} required step="0.01" className="input-field" placeholder="Ingresá el monto" />
            {convertedAmount && (
              <p className="mt-1 text-sm text-dark-400">≈ U${convertedAmount.toFixed(2)} USD {exchangeRate && <span className="ml-2 text-xs">(Cambio: {parseFloat(exchangeRate).toFixed(4)})</span>}</p>
            )}
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-dark-200 mb-2">Fecha de Pago *</label>
            <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} required className="input-field" />
          </div>
        </div>

        {/* Moneda y Método */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="currencyType" className="block text-sm font-medium text-dark-200 mb-2">Tipo de Moneda *</label>
            <select id="currencyType" name="currencyType" value={formData.currencyType} onChange={handleChange} required className="input-field">
              <option value="">Seleccioná tipo de moneda</option>
              {currencyTypes.map(currency => (<option key={currency._id} value={currency.code}>{currency.code} - {currency.name}</option>))}
            </select>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-dark-200">Método de Pago *</label>
              <button type="button" onClick={() => setShowAddMethod(!showAddMethod)} className="flex items-center justify-center w-6 h-6 text-primary-400 bg-primary-500/10 border border-primary-500/30 rounded hover:bg-primary-500/20 transition-colors" title="Agregar nuevo método de pago">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
            {showAddMethod ? (
              <div className="flex gap-2">
                <input type="text" value={newMethodName} onChange={(e) => setNewMethodName(e.target.value)} placeholder="Nombre del método" className="input-field flex-1" />
                <button type="button" onClick={addNewPaymentMethod} disabled={!newMethodName.trim() || addingMethod} className="px-3 py-2 text-sm font-medium text-white bg-primary-500 rounded hover:bg-primary-600 disabled:opacity-50">Agregar</button>
              </div>
            ) : (
              <select id="paymentMethod" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required className="input-field">
                <option value="">Seleccioná método de pago</option>
                {paymentMethods.map(method => (<option key={method._id} value={method.name}>{method.name}</option>))}
              </select>
            )}
          </div>
        </div>

        {/* Sección de Recibo y Vista Previa (MODIFICADA) */}
        <div className="bg-dark-700/50 p-4 rounded-lg border border-white/10">
          <label htmlFor="receipt" className="block text-sm font-medium text-dark-200 mb-3">Imagen con datos del Pago (Recibo)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <input type="file" id="receipt" name="receipt" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" className="block w-full text-sm text-dark-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-400 hover:file:bg-primary-500/30" />
              {receiptFile && (
                <div className="flex items-center justify-between bg-dark-600/50 p-2 rounded">
                  <span className="text-xs text-dark-300 truncate max-w-[150px]">{receiptFile.name}</span>
                  <button type="button" onClick={handleExtractReceipt} disabled={extracting} className="px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 disabled:opacity-50">
                    {extracting ? 'Extrayendo...' : 'Extraer Datos'}
                  </button>
                </div>
              )}
              {extractionError && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{extractionError}</div>}
            </div>

            {/* Bloque de Vista Previa */}
            {imagePreview ? (
              <div className="border-2 border-dashed border-white/20 rounded-lg p-2 flex items-center justify-center">
                <img src={imagePreview} alt="Preview" className="max-w-full h-32 object-contain" />
              </div>
            ) : receiptFile && receiptFile.type === 'application/pdf' ? (
                <div className="border-2 border-dashed border-white/20 rounded-lg p-2 flex flex-col items-center justify-center">
                    <span className="text-3xl mb-1">📄</span>
                    <span className="text-[10px] text-dark-400 uppercase">Documento PDF</span>
                </div>
            ) : (
              <div className="border-2 border-dashed border-white/10 rounded-lg p-2 flex items-center justify-center text-dark-500 text-[10px] uppercase">
                Sin imagen seleccionada
              </div>
            )}
          </div>
        </div>

        {/* Cambio si es necesario */}
        {showExchangeRate && formData.currencyType && formData.currencyType !== saleCurrency && (
          <div className="bg-primary-500/5 border border-primary-500/20 rounded-lg p-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">Tipo de Cambio *</label>
                <input type="number" value={exchangeRate} onChange={handleExchangeRateChange} required step="0.0001" className="input-field" placeholder="1 USD = ? ARS" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">Equivalente en {saleCurrency}</label>
                <div className="input-field bg-gray-100 text-gray-700">{convertedAmount ? `${saleCurrency} ${convertedAmount.toFixed(2)}` : 'Calculando...'}</div>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-dark-200 mb-2">Notas (Opcional)</label>
          <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={2} className="input-field" placeholder="Agregar notas adicionales..." />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
          <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium text-dark-300 bg-dark-600 hover:bg-dark-500 rounded-lg transition-all duration-200">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">{loading ? 'Guardando...' : 'Guardar Pago'}</button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
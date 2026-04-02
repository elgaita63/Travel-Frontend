import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Modal from './Modal';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';

const SellerPaymentModal = ({ seller, onClose }) => {
  const { formatCurrencyFullJSX } = useCurrencyFormat();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'ARS',
    date: new Date().toISOString().split('T')[0],
    method: '',
    notes: ''
  });

  const [receiptFile, setReceiptFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const response = await api.get('/api/manage-currencies');
        if (response.data.success) {
          setPaymentMethods(response.data.data.paymentMethods || []);
        }
      } catch (err) { console.error("Error cargando métodos", err); }
    };
    fetchMethods();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
      } else { setImagePreview(null); }
    }
  };

  const handleExtract = async () => {
    if (!receiptFile) return;
    setExtracting(true);
    setError('');
    try {
      const ocrData = new FormData();
      // Cambiamos 'receipt' por lo que espera tu endpoint de extracción
      ocrData.append('receipt', receiptFile);
      
      const res = await api.post('/api/receipts/extract', ocrData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 
      });
      
      if (res.data.success) {
        const { amount, currency, date } = res.data.data;
        setFormData(prev => ({
          ...prev,
          amount: amount ? amount.toString() : prev.amount,
          currency: currency ? currency.toUpperCase() : prev.currency,
          date: date ? new Date(date).toISOString().split('T')[0] : prev.date
        }));
      }
    } catch (err) { 
      console.error("Error OCR:", err);
      setError('Fallo al extraer datos con IA.'); 
    } finally { setExtracting(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const submitData = new FormData();
      // Aseguramos los campos que el backend necesita para identificar al vendedor y el monto
      submitData.append('userId', seller._id || seller.id);
      submitData.append('amount', formData.amount);
      submitData.append('currency', formData.currency);
      submitData.append('method', formData.method);
      submitData.append('date', formData.date);
      submitData.append('notes', formData.notes);
      
      if (receiptFile) {
        submitData.append('receipt', receiptFile);
      }

      // IMPORTANTE: Verificar si este endpoint existe. Si no, usaremos uno genérico.
      const res = await api.post('/api/payments/seller-payout', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) { 
        onClose(); 
      }
    } catch (err) { 
      console.error("Error en pago:", err);
      setError(err.response?.data?.message || 'Error al procesar el pago'); 
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Pagar a: ${seller.username}`} size="md">
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-center">
            <span className="block text-[10px] uppercase font-bold text-primary-400">Le debés (ARS)</span>
            <span className="text-lg font-bold text-white">{formatCurrencyFullJSX(seller.balance?.ars || 0, 'ARS')}</span>
          </div>
          <div className="p-3 rounded-lg bg-success-500/10 border border-success-500/20 text-center">
            <span className="block text-[10px] uppercase font-bold text-success-400">Le debés (USD)</span>
            <span className="text-lg font-bold text-white">{formatCurrencyFullJSX(seller.balance?.usd || 0, 'USD')}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-md animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-dark-700/50 p-4 rounded-xl border border-white/10">
            <label className="block text-sm font-medium text-dark-200 mb-3 text-center uppercase tracking-wider">Escanear Comprobante</label>
            <div className="flex flex-col items-center space-y-4">
              <input 
                type="file" 
                accept="image/*,.pdf"
                onChange={handleFileChange} 
                className="text-xs text-dark-300 file:bg-primary-500/20 file:text-primary-400 file:border-0 file:rounded-full file:px-4 file:py-2 cursor-pointer hover:file:bg-primary-500/30 transition-all" 
              />
              {imagePreview && <img src={imagePreview} className="h-32 rounded shadow-lg border border-white/10" alt="Recibo" />}
              {receiptFile && (
                <button type="button" onClick={handleExtract} disabled={extracting} className="btn-secondary text-xs uppercase font-bold py-2 px-6 border-primary-500/30 hover:bg-primary-500/10">
                  {extracting ? 'Analizando con IA...' : 'Analizar Recibo'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-dark-300 uppercase mb-2">Monto a Pagar</label>
              <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark-300 uppercase mb-2">Moneda</label>
              <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className="input-field">
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-300 uppercase mb-2">Método de Pago</label>
            <select value={formData.method} onChange={(e) => setFormData({...formData, method: e.target.value})} className="input-field" required>
              <option value="">Seleccionar método...</option>
              {paymentMethods.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-300 uppercase mb-2">Notas</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="input-field" rows="2" placeholder="Opcional..." />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
            <button type="button" onClick={onClose} className="btn-secondary px-6">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary px-6">
              {loading ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default SellerPaymentModal;
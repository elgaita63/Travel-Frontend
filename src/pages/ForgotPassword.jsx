import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../utils/api'; // Importación correcta
import StatusBar from '../components/StatusBar';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  const agencyLogo = import.meta.env.VITE_AGENCY_LOGO;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Usamos la función del api.js que ya tiene el prefijo /api
      const response = await forgotPassword(email);
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error al procesar la solicitud' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-6 px-4 bg-dark-900">
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="text-center mb-4">
          {agencyLogo && (
            <img src={agencyLogo} alt="Logo" className="mx-auto mb-6 max-w-[200px] h-auto" />
          )}
          <h1 className="text-4xl font-bold text-primary-400 mb-2">Recuperar Clave</h1>
          <p className="text-xs text-dark-400 uppercase tracking-widest">Ingresá tu email registrado</p>
        </div>

        <div className="card-glass p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {message.text && (
              <div className={`notification ${message.type === 'error' ? 'border-error-500 text-error-400' : 'border-primary-500 text-primary-400'} p-3 text-sm text-center`}>
                {message.text}
              </div>
            )}
            
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="input-field" 
              placeholder="Tu Email" 
            />

            <button type="submit" disabled={loading} className="w-full btn-primary py-4 font-bold uppercase tracking-widest">
              {loading ? 'Enviando...' : 'Enviar email con instrucciones'}
            </button>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-xs font-bold text-dark-400 hover:text-white transition-colors uppercase tracking-widest"
              >
                Volver al Login
              </button>
            </div>
          </form>
        </div>
      </div>
      <StatusBar /> 
    </div>
  );
};

export default ForgotPassword;
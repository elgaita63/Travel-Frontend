import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../utils/api'; 
import StatusBar from '../components/StatusBar';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Estados para los ojitos
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();
  const agencyLogo = import.meta.env.VITE_AGENCY_LOGO;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
    }

    setLoading(true);
    try {
      const response = await resetPassword(token, newPassword);
      setMessage({ type: 'success', text: response.data.message });
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error al restablecer la contraseña' 
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
          <h1 className="text-4xl font-bold text-primary-400 mb-2">Nueva Contraseña</h1>
        </div>

        <div className="card-glass p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {message.text && (
              <div className={`notification ${message.type === 'error' ? 'border-error-500 text-error-400' : 'border-primary-500 text-primary-400'} p-3 text-sm text-center`}>
                {message.text}
              </div>
            )}
            
            {/* Campo Nueva Contraseña */}
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                autoComplete="new-password"
                required 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                className="input-field pr-12" 
                placeholder="Nueva Contraseña" 
              />
              <button
                type="button"
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-dark-400 hover:text-primary-400 transition-colors"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>

            {/* Campo Confirmar Contraseña */}
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                autoComplete="new-password"
                required 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="input-field pr-12" 
                placeholder="Confirmar Contraseña" 
              />
              <button
                type="button"
                onMouseDown={() => setShowConfirmPassword(true)}
                onMouseUp={() => setShowConfirmPassword(false)}
                onMouseLeave={() => setShowConfirmPassword(false)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-dark-400 hover:text-primary-400 transition-colors"
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-4 font-bold uppercase tracking-widest">
              {loading ? 'Procesando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        </div>
      </div>
      <StatusBar /> 
    </div>
  );
};

export default ResetPassword;
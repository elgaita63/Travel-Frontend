import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StatusBar from '../components/StatusBar'; 

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // --- ESTADO PARA EL OJITO ---
  const [showPassword, setShowPassword] = useState(false);
  // ----------------------------------------------------

  const { login, version } = useAuth();
  const navigate = useNavigate();

  const agencyLogo = import.meta.env.VITE_AGENCY_LOGO;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        if (result.requirePasswordChange) {
          navigate('/force-password-change', { state: { userId: result.data?.userId } });
        } else {
          setTimeout(() => navigate('/dashboard'), 100);
        }
      } else {
        setError(result.message);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        setError('Ya has iniciado sesión en otro navegador.');
      } else {
        setError('Ocurrió un error inesperado durante el ingreso');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-6 px-4 bg-dark-900">
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="text-center mb-4">
          {agencyLogo && (
            <img 
              src={agencyLogo} 
              alt="Agency Logo" 
              className="mx-auto mb-6 max-w-[200px] h-auto"
            />
          )}
          <h1 className="text-4xl font-bold text-primary-400 mb-2">{import.meta.env.VITE_AGENCY_NAME}</h1>
          <h3 className="text-xl font-semibold text-primary-400">Travel AI Management</h3>
          <p className="text-xs text-dark-400">{version}</p>
        </div>

        <div className="card-glass p-8">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {error && <div className="notification border-error-500 text-error-400 p-2">{error}</div>}
            
            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="input-field" placeholder="Email" />
            
            {/* CAMPO CON OJITO */}
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                required 
                value={formData.password} 
                onChange={handleChange} 
                className="input-field pr-12" 
                placeholder="Contraseña" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-dark-400 hover:text-primary-400 transition-colors"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-4">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
      <StatusBar /> 
    </div>
  );
};

export default Login;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StatusBar from '../components/StatusBar'; 

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, version } = useAuth();
  const navigate = useNavigate();

  // Restauración del logo de la agencia
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
          {/* Logo restaurado */}
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
            <input type="password" name="password" required value={formData.password} onChange={handleChange} className="input-field" placeholder="Contraseña" />

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
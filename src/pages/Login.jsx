import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StatusBar from '../components/StatusBar'; 

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState('v0.0.0-NonVersioned');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/system/version');
        const result = await response.json();
        if (result.success && result.version) {
          setVersion(result.version);
        }
      } catch (err) {
        console.error('Error recuperando versión:', err);
      }
    };
    fetchVersion();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        setTimeout(() => {
          navigate('/dashboard');
        }, 100);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('💥 Error de login:', error);
      if (error.response?.status === 409 && error.response?.data?.code === 'ALREADY_LOGGED_IN') {
        setError('Ya has iniciado sesión en otro navegador.');
      } else {
        setError('Ocurrió un error inesperado durante el ingreso');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-dark-900">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-400/20 to-primary-600/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-accent-300/20 to-primary-500/20 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto -mt-12">
        <div className="text-center mb-4">
          <div className="flex flex-col items-center justify-center mb-2">
            {/* LOGO DINÁMICO */}
            <img 
              src={import.meta.env.VITE_AGENCY_LOGO} 
              alt={`Logo ${import.meta.env.VITE_AGENCY_NAME}`} 
              className="h-32 w-auto mb-1 shadow-2xl"
              style={{ objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
            {/* NOMBRE DINÁMICO */}
            <h1 className="text-4xl font-bold text-primary-400 font-poppins tracking-wider uppercase">
              {import.meta.env.VITE_AGENCY_NAME}
            </h1>
          </div>

          <div className="mb-4">
            <h3 className="text-xl font-semibold text-primary-400 font-poppins m-0 leading-tight">
              Travel AI Management
            </h3>
            <p className="text-sm text-dark-400 font-mono mt-1">
              {version}
            </p>
          </div>

          <h2 className="text-2xl font-medium text-dark-200 mb-1">
            Ingrese con su cuenta
          </h2>
        </div>

        <div className="card-glass p-8 mb-16">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {error && (
              <div className="notification bg-error-900 border-error-500">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-dark-200 mb-4">
                  Dirección email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field pl-12"
                    placeholder="Ingrese su dirección de email"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-dark-200 mb-4">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field pl-12"
                    placeholder="Ingrese su contraseña"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4"
            >
              <span className="flex items-center justify-center space-x-3">
                {loading ? <span>Ingresando...</span> : (
                  <>
                    <span>Ingresar</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>
        </div>
      </div>

      <StatusBar /> 

    </div>
  );
};

export default Login;
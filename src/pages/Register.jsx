import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'seller',
    comision: 50 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

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

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      const result = await register(
        formData.username,
        formData.email,
        formData.password,
        formData.role,
        formData.comision
      );
      
      if (result.success) {
        navigate('/users');
      } else {
        setError(result.message || 'Error en el registro');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-start pt-2 pb-8 sm:px-6 lg:px-8 relative overflow-hidden bg-dark-900">
      {/* Background Elements - Ajustados para que no empujen el contenido */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-40 w-80 h-80 bg-gradient-to-br from-primary-400/10 to-primary-600/10 rounded-full blur-3xl animate-float"></div>
      </div>

      {/* Cabezal bien arriba */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md mt-2">
        <div className="text-center mb-3">
          <h1 className="text-2xl font-bold text-primary-400 mb-0 font-poppins tracking-tight">
            Nuevo Usuario
          </h1>
          <p className="text-dark-400 text-[9px] uppercase tracking-[0.3em] font-semibold">
            Configuración de cuenta
          </p>
        </div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-glass p-5">
          <form className="space-y-3" onSubmit={handleSubmit}>
            {error && (
              <div className="p-2 rounded border border-error-500/50 bg-error-500/10 text-error-400 text-[11px] text-center">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-dark-300 mb-1 uppercase tracking-wider">Usuario</label>
                <input name="username" type="text" required value={formData.username} onChange={handleChange} className="input-field py-2" placeholder="Nombre de usuario" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-dark-300 mb-1 uppercase tracking-wider">Email</label>
                <input name="email" type="email" required value={formData.email} onChange={handleChange} className="input-field py-2" placeholder="email@agencia.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-dark-300 mb-1 uppercase tracking-wider">Rol</label>
                  <select name="role" value={formData.role} onChange={handleChange} className="input-field py-2">
                    <option value="seller">Vendedor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-dark-300 mb-1 uppercase tracking-wider">% Comisión</label>
                  <input name="comision" type="number" value={formData.comision} onChange={handleChange} className="input-field py-2" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-dark-300 mb-1 uppercase tracking-wider">Contraseña</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field pr-10 py-2"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-400"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-dark-300 mb-1 uppercase tracking-wider">Confirmar</label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input-field pr-10 py-2"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowConfirmPassword(true)}
                    onMouseUp={() => setShowConfirmPassword(false)}
                    onMouseLeave={() => setShowConfirmPassword(false)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-400"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2 pt-2">
              <button type="submit" disabled={loading} className="w-full btn-primary py-3 font-bold uppercase tracking-widest text-xs">
                {loading ? 'Registrando...' : 'Dar de Alta'}
              </button>
              <button type="button" onClick={() => navigate('/dashboard')} className="w-full py-1 text-[9px] font-bold text-dark-400 hover:text-white transition-all uppercase tracking-widest">
                ← Cancelar y Volver
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
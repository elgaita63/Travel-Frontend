import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import StatusBar from '../components/StatusBar'; 

const ForcePasswordChange = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { version } = useAuth();
  
  const userId = location.state?.userId;

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para los ojitos
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const agencyLogo = import.meta.env.VITE_AGENCY_LOGO;
  const agencyName = import.meta.env.VITE_AGENCY_NAME;

  if (!userId) {
    navigate('/login');
    return null;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/reset-expired-password', {
        userId,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      if (response.data.success) {
        setSuccess('Contraseña actualizada. Redirigiendo al login...');
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * EyeBtn Corregido: Centrado vertical absoluto respecto al input
   */
  const EyeBtn = ({ show, onShow, onHide }) => (
    <button
      type="button"
      onMouseDown={onShow}
      onMouseUp={onHide}
      onMouseLeave={onHide}
      onTouchStart={onShow}
      onTouchEnd={onHide}
      className="absolute inset-y-0 right-0 pr-4 flex items-center text-dark-400 hover:text-primary-400 transition-colors select-none"
    >
      {show ? (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-6 px-4 bg-dark-900">
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="text-center mb-4">
          {agencyLogo && <img src={agencyLogo} alt="Agency Logo" className="mx-auto mb-6 max-w-[200px] h-auto" />}
          <h1 className="text-4xl font-bold text-primary-400 mb-2">{agencyName}</h1>
          <h3 className="text-xl font-semibold text-primary-400">Actualización Obligatoria</h3>
          <p className="text-xs text-dark-400">{version}</p>
        </div>

        <div className="card-glass p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="notification border-error-500 text-error-400 p-2 text-sm">{error}</div>}
            {success && <div className="notification border-success-500 text-success-400 p-2 text-sm">{success}</div>}

            {/* Password Actual */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-primary-400 uppercase">Contraseña Actual</label>
              <div className="relative">
                <input 
                  type={showCurrent ? "text" : "password"} 
                  name="currentPassword" 
                  required 
                  autoComplete="current-password"
                  value={formData.currentPassword} 
                  onChange={handleChange} 
                  className="input-field pr-12" 
                  placeholder="Ingrese su clave actual"
                />
                <EyeBtn 
                  show={showCurrent} 
                  onShow={() => setShowCurrent(true)} 
                  onHide={() => setShowCurrent(false)} 
                />
              </div>
            </div>

            {/* Nueva Password */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-primary-400 uppercase">Nueva Contraseña</label>
              <div className="relative">
                <input 
                  type={showNew ? "text" : "password"} 
                  name="newPassword" 
                  required 
                  autoComplete="new-password"
                  value={formData.newPassword} 
                  onChange={handleChange} 
                  className="input-field pr-12" 
                  placeholder="Mínimo 8 caracteres (Mayús., Núm., Símb.)"
                />
                <EyeBtn 
                  show={showNew} 
                  onShow={() => setShowNew(true)} 
                  onHide={() => setShowNew(false)} 
                />
              </div>
            </div>

            {/* Confirmar Nueva Password */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-primary-400 uppercase">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <input 
                  type={showConfirm ? "text" : "password"} 
                  name="confirmPassword" 
                  required 
                  autoComplete="new-password"
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                  className="input-field pr-12" 
                  placeholder="Repita la nueva clave"
                />
                <EyeBtn 
                  show={showConfirm} 
                  onShow={() => setShowConfirm(true)} 
                  onHide={() => setShowConfirm(false)} 
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-4 font-bold">
              {loading ? 'Procesando...' : 'Actualizar y Volver a Ingresar'}
            </button>
          </form>
        </div>
      </div>
      <StatusBar /> 
    </div>
  );
};

export default ForcePasswordChange;
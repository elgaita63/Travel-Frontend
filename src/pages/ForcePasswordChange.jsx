import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Importado para las versiones
import api from '../utils/api';
import StatusBar from '../components/StatusBar'; 

const ForcePasswordChange = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { version } = useAuth(); // Obtenemos las versiones
  
  const userId = location.state?.userId;

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Datos de la agencia
  const agencyLogo = import.meta.env.VITE_AGENCY_LOGO;
  const agencyName = import.meta.env.VITE_AGENCY_NAME;

  // Redirigir si no hay userId en el estado (acceso directo inválido)
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-6 px-4 bg-dark-900">
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Header replicado del Login */}
        <div className="text-center mb-4">
          {agencyLogo && (
            <img 
              src={agencyLogo} 
              alt="Agency Logo" 
              className="mx-auto mb-6 max-w-[200px] h-auto"
            />
          )}
          <h1 className="text-4xl font-bold text-primary-400 mb-2">{agencyName}</h1>
          <h3 className="text-xl font-semibold text-primary-400">Actualización Obligatoria</h3>
          <p className="text-xs text-dark-400">{version}</p>
        </div>

        <div className="card-glass p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="notification border-error-500 text-error-400 p-2 text-sm">{error}</div>}
            {success && <div className="notification border-success-500 text-success-400 p-2 text-sm">{success}</div>}

            <div>
              <label className="block text-xs font-semibold text-primary-400 mb-2 uppercase">Contraseña Actual</label>
              <input 
                type="password" name="currentPassword" required 
                value={formData.currentPassword} onChange={handleChange} 
                className="input-field" placeholder="Ingrese su clave actual"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary-400 mb-2 uppercase">Nueva Contraseña</label>
              <input 
                type="password" name="newPassword" required 
                value={formData.newPassword} onChange={handleChange} 
                className="input-field" placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary-400 mb-2 uppercase">Confirmar Nueva Contraseña</label>
              <input 
                type="password" name="confirmPassword" required 
                value={formData.confirmPassword} onChange={handleChange} 
                className="input-field" placeholder="Repita la nueva clave"
              />
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
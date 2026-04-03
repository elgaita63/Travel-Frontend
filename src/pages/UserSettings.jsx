import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';

const UserSettings = () => {
  const { user, updateUser, isSeller } = useAuth();
  const { theme, toggleTheme, setLightTheme, setDarkTheme, applySystemTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    timezone: 'UTC',
    comision: '', 
    balanceARS: 0,
    balanceUSD: 0
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Handlers para el efecto "Hold to show"
  const handleShow = (field) => setShowPasswords(prev => ({ ...prev, [field]: true }));
  const handleHide = (field) => setShowPasswords(prev => ({ ...prev, [field]: false }));

  const tabs = [
    { id: 'profile', name: 'Perfil', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
    { id: 'security', name: 'Seguridad', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )}
  ];

  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        timezone: user.timezone || 'UTC',
        comision: user.comision || '', 
        balanceARS: user.balance?.ars || 0,
        balanceUSD: user.balance?.usd || 0
      });
    }
  }, [user]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/api/auth/profile', profileData);
      updateUser(response.data.data.user);
      showMessage('¡Perfil actualizado con éxito!', 'success');
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al actualizar el perfil.';
      showMessage(errorMsg, 'error');
    } finally { setLoading(false); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('Las nuevas contraseñas no coinciden.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.put('/api/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      showMessage('¡Contraseña actualizada con éxito!', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords({ current: false, new: false, confirm: false });
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al actualizar la contraseña.';
      showMessage(errorMsg, 'error');
    } finally { setLoading(false); }
  };

  const getBalanceColor = (amount) => {
    return parseFloat(amount || 0) < 0 ? 'text-error-400' : 'text-primary-400';
  };

  const formatBalance = (amount, symbol = '$') => {
    return `${symbol} ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const timezones = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Argentina/Buenos_Aires', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai'];

  const EyeBtn = ({ field, show }) => (
    <button
      type="button"
      onMouseDown={() => handleShow(field)}
      onMouseUp={() => handleHide(field)}
      onMouseLeave={() => handleHide(field)}
      onTouchStart={() => handleShow(field)}
      onTouchEnd={() => handleHide(field)}
      className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-400 hover:text-dark-100 transition-colors select-none"
    >
      {show ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.048 10.048 0 012.859-4.859M9.868 9.868A3 3 0 1014.132 14.132M18.143 18.143L19 19M3 3l1.5 1.5m1.5 1.5l1.5 1.5M21 21l-1.5-1.5m-1.5-1.5l-1.5-1.5" /></svg>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-dark-100 mb-2">Configuración de Usuario</h1>
        <p className="text-dark-300">Gestioná las preferencias de tu cuenta</p>
      </div>

      {message.text && (
        <div className={`notification ${message.type === 'success' ? 'border-success-500/30 text-success-400' : 'border-error-500/30 text-error-400'}`}>
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="card">
        <div className="border-b border-white/10">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${activeTab === tab.id ? 'border-primary-500 text-primary-400' : 'border-transparent text-dark-400'} py-4 border-b-2 font-medium flex items-center space-x-2`}>
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Nombre de Usuario</label>
                  <input 
                    type="text" 
                    value={profileData.username} 
                    className="input-field bg-dark-800/50 cursor-not-allowed text-dark-400 border-white/5" 
                    disabled 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={profileData.email} 
                    className="input-field bg-dark-800/50 cursor-not-allowed text-dark-400 border-white/5" 
                    disabled 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Nombre</label>
                  <input type="text" value={profileData.firstName} onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })} className="input-field" placeholder="Nombre" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Apellido</label>
                  <input type="text" value={profileData.lastName} onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })} className="input-field" placeholder="Apellido" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Comisión Asignada (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={profileData.comision} 
                    onChange={(e) => setProfileData({ ...profileData, comision: e.target.value })} 
                    className={`input-field ${isSeller ? 'bg-dark-800/50 cursor-not-allowed text-dark-400 border-white/5' : ''}`} 
                    placeholder="Ej: 5.50" 
                    disabled={isSeller}
                    readOnly={isSeller}
                  />
                </div>

                {isSeller && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10 mt-2">
                    <div>
                      <label className="block text-sm font-black text-cyan-400 mb-2 uppercase tracking-tight">Balance Vendedor (ARS)</label>
                      <input 
                        type="text" 
                        value={formatBalance(profileData.balanceARS, '$')} 
                        className={`input-field bg-dark-800/50 cursor-not-allowed font-black border-white/5 ${getBalanceColor(profileData.balanceARS)}`} 
                        disabled
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-green-400 mb-2 uppercase tracking-tight">Balance Vendedor (USD)</label>
                      <input 
                        type="text" 
                        value={formatBalance(profileData.balanceUSD, 'U$D')} 
                        className={`input-field bg-dark-800/50 cursor-not-allowed font-black border-white/5 ${getBalanceColor(profileData.balanceUSD)}`} 
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Zona Horaria</label>
                  <select value={profileData.timezone} onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })} className="input-field">
                    {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-6 border-t border-white/10 mt-6">
                <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Actualizando...' : 'Guardar Cambios'}</button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
              {/* Ajuste Gaita: Email como username oculto para disparar sugerencias de Chrome */}
              <input 
                type="text" 
                name="email" 
                value={profileData.email} 
                autoComplete="username" 
                style={{ display: 'none' }} 
                readOnly 
              />

              <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg text-xs text-primary-300 space-y-1">
                <p className="font-bold uppercase mb-1">Requisitos de seguridad:</p>
                <p>• Mínimo 8 caracteres, mayúscula, minúscula, número y símbolo</p>
                <p>• No puede ser igual a las últimas 5 utilizadas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">Contraseña Actual</label>
                <div className="relative">
                  <input 
                    type={showPasswords.current ? "text" : "password"} 
                    value={passwordData.currentPassword} 
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} 
                    className="input-field pr-10" 
                    placeholder="Ingresá tu contraseña actual" 
                    required 
                    autoComplete="current-password"
                  />
                  <EyeBtn field="current" show={showPasswords.current} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">Nueva Contraseña</label>
                <div className="relative">
                  <input 
                    type={showPasswords.new ? "text" : "password"} 
                    value={passwordData.newPassword} 
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                    className="input-field pr-10" 
                    placeholder="Ingresá tu nueva contraseña" 
                    required 
                    autoComplete="new-password"
                  />
                  <EyeBtn field="new" show={showPasswords.new} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <input 
                    type={showPasswords.confirm ? "text" : "password"} 
                    value={passwordData.confirmPassword} 
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                    className="input-field pr-10" 
                    placeholder="Repetí tu nueva contraseña" 
                    required 
                    autoComplete="new-password"
                  />
                  <EyeBtn field="confirm" show={showPasswords.confirm} />
                </div>
              </div>
              <div className="flex justify-end pt-6 border-t border-white/10 mt-6">
                <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Actualizando...' : 'Actualizar Contraseña'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
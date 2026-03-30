import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';

const UserSettings = () => {
  const { user, updateUser } = useAuth();
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
    comision: '' // Nuevo estado para comisión
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const tabs = [
    { id: 'profile', name: 'Profile', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
    { id: 'security', name: 'Security', icon: (
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
        comision: user.comision || '' // Cargamos el valor de la base
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
      showMessage('Profile updated successfully!', 'success');
    } catch (error) {
      showMessage('Failed to update profile.', 'error');
    } finally { setLoading(false); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('New passwords do not match.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.put('/api/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      showMessage('Password updated successfully!', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showMessage('Failed to update password.', 'error');
    } finally { setLoading(false); }
  };

  const timezones = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai'];

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-dark-100 mb-2">User Settings</h1>
        <p className="text-dark-300">Manage your account preferences</p>
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
                <input type="text" value={profileData.username} onChange={(e) => setProfileData({ ...profileData, username: e.target.value })} className="input-field" placeholder="Username" required />
                <input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} className="input-field" placeholder="Email" required />
                <input type="text" value={profileData.firstName} onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })} className="input-field" placeholder="First Name" />
                <input type="text" value={profileData.lastName} onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })} className="input-field" placeholder="Last Name" />
                
                {/* --- CAMPO DE COMISIÓN --- */}
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Comisión de Venta (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={profileData.comision} 
                    onChange={(e) => setProfileData({ ...profileData, comision: e.target.value })} 
                    className="input-field" 
                    placeholder="Ej: 5.50" 
                  />
                </div>
                {/* ------------------------- */}

                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Timezone</label>
                  <select value={profileData.timezone} onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })} className="input-field">
                    {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Updating...' : 'Update Profile'}</button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} className="input-field" placeholder="Current Password" required />
              <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="input-field" placeholder="New Password" required />
              <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="input-field" placeholder="Confirm New Password" required />
              <div className="flex justify-end">
                <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Updating...' : 'Update Password'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'seller',
    phone: '',
    timezone: 'UTC',
    comision: '', // Campo de comisión
    forcePasswordExpiration: false // Toggle de seguridad
  });

  useEffect(() => {
    if (isEditing) {
      fetchUser();
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        role: 'seller',
        phone: '',
        timezone: 'UTC',
        comision: '',
        forcePasswordExpiration: false
      });
    }
  }, [id, isEditing]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/users/${id}`);

      if (response.data.success) {
        const user = response.data.data.user;
        setFormData({
          username: user.username || '',
          email: user.email || '',
          password: '',
          confirmPassword: '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.role || 'seller',
          phone: user.phone || '',
          timezone: user.timezone || 'UTC',
          comision: user.comision || '', // Carga de comisión
          forcePasswordExpiration: false
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.username.trim() || !formData.email.trim()) {
      setError('Username and email are required');
      return false;
    }

    const needsPassword = !isEditing || formData.forcePasswordExpiration;

    if (needsPassword && !formData.password) {
      setError(formData.forcePasswordExpiration ? 'Password is required when forcing expiration' : 'Password is required for new users');
      return false;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const submitData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
        phone: formData.phone.trim(),
        timezone: formData.timezone,
        comision: formData.comision, // Envío de comisión
        forcePasswordExpiration: formData.forcePasswordExpiration // Envío de toggle
      };

      if (formData.password) submitData.password = formData.password;

      let response;
      if (isEditing) {
        response = await api.put(`/api/users/${id}`, submitData);
      } else {
        response = await api.post('/api/users', submitData);
      }

      if (response.data.success) {
        setSuccess(isEditing ? 'User updated successfully!' : 'User created successfully!');
        setTimeout(() => navigate('/users'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return <div className="p-8 text-center text-dark-300 font-medium">Loading user details...</div>;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold gradient-text mb-6 font-poppins">
            {isEditing ? 'Edit User' : 'Create New User'}
          </h1>
          <p className="text-dark-300">Update user information and security settings</p>
        </div>

        {error && <div className="notification border-error-500/30 text-error-400 p-4 mb-4">{error}</div>}
        {success && <div className="notification border-success-500/30 text-success-400 p-4 mb-4">{success}</div>}

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-dark-200 mb-4">Username *</label>
                <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-200 mb-4">Email Address *</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input-field" required />
              </div>
            </div>

            {/* SEGURIDAD: Toggle de Expiración Forzada */}
            {isEditing && (
              <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-primary-400 uppercase tracking-wider">Security Control</h4>
                    <p className="text-xs text-dark-300">Forcing expiration will require the user to change password at next login.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="forcePasswordExpiration"
                      checked={formData.forcePasswordExpiration}
                      onChange={handleInputChange}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-dark-200 mb-4">Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="input-field" placeholder="Enter new password" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-200 mb-4">Confirm Password</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className="input-field" placeholder="Confirm new password" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-dark-200 mb-4">First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-200 mb-4">Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="input-field" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-dark-200 mb-4">Role *</label>
                <select name="role" value={formData.role} onChange={handleInputChange} className="input-field">
                  <option value="seller">Seller</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                {/* CAMPO DE COMISIÓN INTEGRADO */}
                <label className="block text-sm font-semibold text-dark-200 mb-4">Comisión de Venta (%)</label>
                <input type="number" step="0.01" name="comision" value={formData.comision} onChange={handleInputChange} className="input-field" placeholder="Ej: 5.50" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-6 border-t border-white/10">
              <button type="button" onClick={() => navigate('/users')} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Processing...' : (isEditing ? 'Update User' : 'Create User')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserForm;
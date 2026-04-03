import React, { useState } from 'react';
import api from '../utils/api';

const EditUserModal = ({ user, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    role: user.role,
    comision: user.comision || '',
    forcePasswordExpiration: false,
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const submitData = { ...formData };
      if (!submitData.password) {
        delete submitData.password;
        delete submitData.confirmPassword;
      }

      const response = await api.put(`/api/users/${user.id || user._id}`, submitData);
      if (response.data.success) {
        onUpdate();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const EyeBtn = ({ show, onShow, onHide }) => (
    <button
      type="button"
      onMouseDown={onShow} onMouseUp={onHide} onMouseLeave={onHide}
      onTouchStart={onShow} onTouchEnd={onHide}
      className="absolute bottom-0 right-0 h-10 px-3 flex items-center text-dark-400 hover:text-primary-400 transition-colors select-none"
    >
      {show ? (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
      )}
    </button>
  );

  return (
    <div className="modal-backdrop">
      <div className="modal-content p-8">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold text-dark-100 mb-3 font-poppins">Editar Usuario</h3>
          <p className="text-dark-300">Actualizar información del usuario</p>
        </div>

        {error && <div className="notification border-error-500 text-error-400 p-2 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          <div className="grid grid-cols-2 gap-6">
            <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="input-field" placeholder="Usuario" required />
            <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input-field" placeholder="Email" required />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="input-field">
              <option value="seller">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
            <input type="number" value={formData.comision} onChange={(e) => setFormData({...formData, comision: e.target.value})} className="input-field" placeholder="Comisión %" />
          </div>

          <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20 flex items-center justify-between text-left">
            <div>
              <h4 className="text-sm font-bold text-primary-400 uppercase">Forzar Vencimiento</h4>
              <p className="text-xs text-dark-300">Obliga a cambiar clave al ingresar.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={formData.forcePasswordExpiration} onChange={(e) => setFormData({...formData, forcePasswordExpiration: e.target.checked})} className="sr-only peer" />
              <div className="w-11 h-6 bg-dark-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="relative text-left">
              <label className="block text-[10px] font-bold text-primary-400 mb-1 uppercase">Clave (Opcional)</label>
              <input type={showPass ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="input-field pr-10" autoComplete="new-password" />
              <EyeBtn show={showPass} onShow={() => setShowPass(true)} onHide={() => setShowPass(false)} />
            </div>
            <div className="relative text-left">
              <label className="block text-[10px] font-bold text-primary-400 mb-1 uppercase">Confirmar</label>
              <input type={showConfirm ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="input-field pr-10" autoComplete="new-password" />
              <EyeBtn show={showConfirm} onShow={() => setShowConfirm(true)} onHide={() => setShowConfirm(false)} />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : 'Actualizar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
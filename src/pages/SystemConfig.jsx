import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const SystemConfig = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Estado alineado con tu documento de Compass
  const [config, setConfig] = useState({
    max_concurrent_sessions: 1,
    failed_login_attempts: 5,
    session_timeout_seconds: 1800,
    maintenance_mode: false,
    expiration_seconds: {
      superadmin: 10000,
      admin: 20000,
      seller: 30000
    },
    config_version: 1,
    last_super_login_at: null,
    last_super_login_ip: ''
  });

  const fetchConfig = async () => {
    try {
      setFetching(true);
      const response = await api.get('/api/system/config');
      if (response.data.success && response.data.data) {
        setConfig(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      showMessage('Error al conectar con el motor del sistema', 'error');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Enviamos el objeto actualizando la versión de configuración automáticamente
      const updatedConfig = { 
        ...config, 
        config_version: (config.config_version || 0) + 1 
      };
      
      await api.put('/api/system/config', updatedConfig);
      setConfig(updatedConfig);
      showMessage('Motor actualizado. Nueva versión de configuración: ' + updatedConfig.config_version);
    } catch (error) {
      showMessage('Fallo en la escritura de base de datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user?.isSuper) {
    return (
      <div className="flex justify-center items-center h-64 text-error-400 text-xl font-bold font-poppins">
        ACCESO DENEGADO
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        <p className="text-dark-300 font-medium">Sincronizando con el motor central...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 animate-fade-in pb-20">
      {/* Encabezado */}
      <div className="text-center">
        <h1 className="text-4xl font-bold gradient-text mb-2 font-poppins">Parámetros Globales</h1>
        <div className="flex items-center justify-center space-x-4 text-sm">
          <span className="px-3 py-1 bg-dark-600 rounded-full border border-white/10 text-dark-300">
            Versión: <span className="text-primary-400 font-mono">{config.config_version}</span>
          </span>
          <span className="px-3 py-1 bg-dark-600 rounded-full border border-white/10 text-dark-300">
            ID: <span className="text-dark-400 font-mono">69cbe2b6...</span>
          </span>
        </div>
      </div>

      {message.text && (
        <div className={`max-w-3xl mx-auto notification ${message.type === 'error' ? 'bg-error-500/20 border-error-500' : 'bg-success-500/20 border-success-500'} border p-4 rounded-xl text-center shadow-2xl animate-bounce-short`}>
          <span className={message.type === 'error' ? 'text-error-400' : 'text-success-400 font-medium'}>
            {message.text}
          </span>
        </div>
      )}

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Principal - Formulario */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card p-8 shadow-2xl border-white/5">
            <form onSubmit={handleSave} className="space-y-10">
              
              {/* SESIONES Y SEGURIDAD */}
              <section>
                <div className="flex items-center space-x-3 mb-6 border-b border-white/10 pb-2">
                  <div className="p-2 bg-primary-500/20 rounded-lg">
                    <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-dark-100">Control de Accesos</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-dark-300">Sesiones Simultáneas Máximas</label>
                    <input
                      type="number"
                      value={config.max_concurrent_sessions}
                      onChange={(e) => setConfig({ ...config, max_concurrent_sessions: Number(e.target.value) })}
                      className="input-field font-mono text-primary-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-dark-300">Límite de Reintentos Fallidos</label>
                    <input
                      type="number"
                      value={config.failed_login_attempts}
                      onChange={(e) => setConfig({ ...config, failed_login_attempts: Number(e.target.value) })}
                      className="input-field font-mono text-primary-400"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-dark-300">Cierre de Sesión por Inactividad (Segundos)</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="number"
                        value={config.session_timeout_seconds}
                        onChange={(e) => setConfig({ ...config, session_timeout_seconds: Number(e.target.value) })}
                        className="input-field font-mono text-primary-400 w-1/2"
                      />
                      <span className="text-dark-400 text-xs italic">
                        ≈ {Math.floor(config.session_timeout_seconds / 60)} minutos
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* EXPIRACIÓN DE CLAVES */}
              <section>
                <div className="flex items-center space-x-3 mb-6 border-b border-white/10 pb-2">
                  <div className="p-2 bg-accent-500/20 rounded-lg">
                    <svg className="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-dark-100">Validez de Contraseñas</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-dark-400 uppercase">SuperAdmin</label>
                    <input
                      type="number"
                      value={config.expiration_seconds.superadmin}
                      onChange={(e) => setConfig({
                        ...config,
                        expiration_seconds: { ...config.expiration_seconds, superadmin: Number(e.target.value) }
                      })}
                      className="input-field text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-dark-400 uppercase">Admin</label>
                    <input
                      type="number"
                      value={config.expiration_seconds.admin}
                      onChange={(e) => setConfig({
                        ...config,
                        expiration_seconds: { ...config.expiration_seconds, admin: Number(e.target.value) }
                      })}
                      className="input-field text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-dark-400 uppercase">Vendedor</label>
                    <input
                      type="number"
                      value={config.expiration_seconds.seller}
                      onChange={(e) => setConfig({
                        ...config,
                        expiration_seconds: { ...config.expiration_seconds, seller: Number(e.target.value) }
                      })}
                      className="input-field text-sm"
                    />
                  </div>
                </div>
              </section>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full btn-primary py-4 text-lg font-bold shadow-xl flex items-center justify-center space-x-3 transition-all hover:scale-[1.01] active:scale-95"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>ESCRIBIENDO EN MONGO...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    <span>ACTUALIZAR MOTOR CENTRAL</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Columna Lateral - Info de Estado */}
        <div className="space-y-8">
          {/* MANTENIMIENTO */}
          <div className="card p-6 border-warning-500/20 bg-warning-500/5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-warning-400 uppercase text-xs tracking-widest">Modo Emergencia</h4>
              <div className={`h-2 w-2 rounded-full ${config.maintenance_mode ? 'bg-warning-500 animate-pulse' : 'bg-dark-500'}`}></div>
            </div>
            <p className="text-dark-300 text-sm mb-6">Activar el modo mantenimiento desconectará a todos los usuarios excepto al soporte.</p>
            <label className="relative flex items-center justify-between cursor-pointer group">
              <span className="text-dark-100 font-semibold">Inhibir Sistema</span>
              <input 
                type="checkbox" 
                checked={config.maintenance_mode}
                onChange={(e) => setConfig({ ...config, maintenance_mode: e.target.checked })}
                className="sr-only peer" 
              />
              <div className="w-14 h-7 bg-dark-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[26px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-warning-600 shadow-inner"></div>
            </label>
          </div>

          {/* AUDITORÍA SID */}
          <div className="card p-6 border-white/5 space-y-4">
            <h4 className="font-bold text-primary-400 uppercase text-xs tracking-widest">Auditoría SuperAdmin</h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-dark-400">Último Ingreso Soporte</p>
                <p className="text-sm text-dark-100 font-mono">
                  {config.last_super_login_at ? new Date(config.last_super_login_at).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-dark-400">Desde IP</p>
                <p className="text-sm text-dark-100 font-mono">{config.last_super_login_ip || 'N/A'}</p>
              </div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-dark-400">Último Cambio de Motor</p>
                <p className="text-sm text-dark-100 font-mono">
                  {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;
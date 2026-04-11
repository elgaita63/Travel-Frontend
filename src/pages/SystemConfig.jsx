import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

function applyMessagingVars(str, preview) {
  if (str == null || !preview) return str ?? '';
  return String(str)
    .replace(/\{\{AGENCY_NAME\}\}/gi, preview.agencyName || '')
    .replace(/\{\{CONTACT_EMAIL\}\}/gi, preview.contactEmail || '')
    .replace(/\{\{FROM_LINE\}\}/gi, preview.fromLine || '');
}

function digitsOnlyPhone(s) {
  return String(s || '').replace(/\D/g, '');
}

/** Mismo patrón visual que Perfil de usuario (`UserSettings.jsx`). */
const SYSTEM_CONFIG_TABS = [
  {
    id: 'config',
    name: 'Configuración',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    id: 'messaging',
    name: 'Prueba correo / WhatsApp',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    )
  }
];

/** Siempre días:hrs:min:seg (hrs/min/seg con 2 cifras). */
function formatSecondsAsDHMS(totalSeconds) {
  const n = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const days = Math.floor(n / 86400);
  const hours = Math.floor((n % 86400) / 3600);
  const mins = Math.floor((n % 3600) / 60);
  const secs = n % 60;
  return `${days}:${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function SecondsEquivalence({ value }) {
  return (
    <div className="mt-0.5 text-right">
      <div className="font-mono text-sm text-primary-300/90 tabular-nums tracking-tight">
        {formatSecondsAsDHMS(value)}
      </div>
      <div className="text-[10px] text-dark-500 leading-tight">días:hrs:mins:segs</div>
    </div>
  );
}

const inputNumericClass = 'input-field font-mono text-primary-400 max-w-xs text-right tabular-nums';
const inputNumericClassSm = 'input-field text-sm text-right tabular-nums';

function ToggleSwitch({ checked, onChange, id }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900 ${
        checked ? 'bg-primary-500' : 'bg-dark-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

const SystemConfig = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('config');
  const [msgPreview, setMsgPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('Prueba SYSCONFIG');
  const [emailBody, setEmailBody] = useState(
    'Hola,\n\nEsto es una prueba desde {{AGENCY_NAME}}.\nContacto configurado: {{CONTACT_EMAIL}}\nRemitente API: {{FROM_LINE}}\n'
  );
  const [waPhone, setWaPhone] = useState('');
  const [waBody, setWaBody] = useState(
    'Hola, prueba desde {{AGENCY_NAME}}. Email de contacto: {{CONTACT_EMAIL}}.'
  );
  const [emailSending, setEmailSending] = useState(false);

  const [config, setConfig] = useState({
    max_concurrent_sessions: 1,
    max_concurrent_sessions_enabled: false,
    failed_login_attempts: 5,
    failed_login_lock_enabled: false,
    session_timeout_seconds: 1800,
    session_expiration_by_timeout_enabled: false,
    password_expiration_policy_enabled: false,
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

  const messageTimerRef = useRef(null);
  const showMessage = useCallback((text, type = 'success') => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage({ text, type });
    messageTimerRef.current = setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  }, []);

  const fetchConfig = async () => {
    try {
      setFetching(true);
      const response = await api.get('/api/system/config');
      if (response.data.success && response.data.data) {
        const d = response.data.data;
        setConfig({
          ...d,
          session_expiration_by_timeout_enabled: !!d.session_expiration_by_timeout_enabled,
          max_concurrent_sessions_enabled: !!d.max_concurrent_sessions_enabled,
          password_expiration_policy_enabled: !!d.password_expiration_policy_enabled,
          failed_login_lock_enabled: !!d.failed_login_lock_enabled,
          session_timeout_seconds: Number(d.session_timeout_seconds) || 600,
          max_concurrent_sessions: Number(d.max_concurrent_sessions) || 5,
          failed_login_attempts: Number(d.failed_login_attempts) || 3,
          expiration_seconds: {
            superadmin: Number(d.expiration_seconds?.superadmin) || 2592000,
            admin: Number(d.expiration_seconds?.admin) || 2592000,
            seller: Number(d.expiration_seconds?.seller) || 2592000
          }
        });
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

  const loadMessagingPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const response = await api.get('/api/system/messaging-preview');
      if (response.data.success && response.data.data) {
        const d = response.data.data;
        setMsgPreview(d);
        if (d.whatsappTestPhone) {
          setWaPhone((prev) => prev || d.whatsappTestPhone);
        }
      }
    } catch (error) {
      console.error('messaging-preview', error);
      showMessage('No se pudo cargar la vista previa de correo', 'error');
    } finally {
      setPreviewLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    if (activeTab === 'messaging' && !msgPreview && !previewLoading) {
      loadMessagingPreview();
    }
  }, [activeTab, msgPreview, previewLoading, loadMessagingPreview]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
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

  const handleSendTestEmail = async () => {
    if (!emailTo?.trim()) {
      showMessage('Indicá un destinatario', 'error');
      return;
    }
    setEmailSending(true);
    try {
      await api.post('/api/system/test-email', {
        to: emailTo.trim(),
        subject: emailSubject,
        body: emailBody
      });
      showMessage('Correo de prueba enviado (mismo flujo que recibos / Resend).');
      setEmailModalOpen(false);
    } catch (error) {
      showMessage(error.response?.data?.message || error.message || 'Error al enviar', 'error');
    } finally {
      setEmailSending(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const digits = digitsOnlyPhone(waPhone);
    if (!digits) {
      showMessage('Indicá un teléfono con código de país (sin +)', 'error');
      return;
    }
    const text = encodeURIComponent(applyMessagingVars(waBody, msgPreview));
    window.open(`https://wa.me/${digits}?text=${text}`, '_blank', 'noopener,noreferrer');
    setWaModalOpen(false);
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
      <div className="text-center">
        <h1 className="text-4xl font-bold gradient-text mb-2 font-poppins">SYSCONFIG</h1>
        <div className="flex items-center justify-center space-x-4 text-sm">
          <span className="px-3 py-1 bg-dark-600 rounded-full border border-white/10 text-dark-300">
            Versión: <span className="text-primary-400 font-mono">{config.config_version}</span>
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto card overflow-hidden">
        <div className="border-b border-white/10">
          <nav className="flex flex-wrap gap-x-8 px-6">
            {SYSTEM_CONFIG_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-dark-400 hover:text-dark-200'
                } py-4 border-b-2 font-medium flex items-center space-x-2 transition-colors`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {message.text && (
        <div
          className={`max-w-3xl mx-auto notification ${
            message.type === 'error' ? 'bg-error-500/20 border-error-500' : 'bg-success-500/20 border-success-500'
          } border p-4 rounded-xl text-center shadow-2xl animate-bounce-short`}
        >
          <span className={message.type === 'error' ? 'text-error-400' : 'text-success-400 font-medium'}>
            {message.text}
          </span>
        </div>
      )}

      {activeTab === 'messaging' && (
        <div className="max-w-3xl mx-auto card p-8 shadow-2xl border-white/5 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-dark-100 mb-2">Mensajería de prueba</h2>
            <p className="text-sm text-dark-300">
              El correo usa Resend y las mismas variables de entorno que los envíos reales (remitente, sandbox, reintento).
              WhatsApp abre{' '}
              <span className="font-mono text-primary-300">wa.me</span> con el texto sustituido (no hay API de WhatsApp en
              el servidor).
            </p>
          </div>

          {previewLoading && (
            <div className="flex items-center gap-2 text-dark-300 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-400 border-t-transparent" />
              Cargando vista previa…
            </div>
          )}

          {msgPreview && (
            <div className="rounded-lg border border-white/10 bg-dark-800/40 p-4 space-y-2 text-sm">
              <p className="text-xs font-bold text-dark-400 uppercase tracking-wider">Valores actuales (servidor)</p>
              <p className="text-dark-200">
                <span className="text-dark-500">Agencia:</span>{' '}
                <span className="font-mono text-primary-200">{msgPreview.agencyName || '—'}</span>
              </p>
              <p className="text-dark-200">
                <span className="text-dark-500">Email contacto / from:</span>{' '}
                <span className="font-mono text-primary-200 break-all">{msgPreview.contactEmail || '—'}</span>
              </p>
              <p className="text-dark-200">
                <span className="text-dark-500">Línea From en envío:</span>{' '}
                <span className="font-mono text-primary-200 break-all">{msgPreview.fromLine || '—'}</span>
              </p>
              <p className="text-dark-200">
                <span className="text-dark-500">Resend API key:</span>{' '}
                {msgPreview.resendConfigured ? (
                  <span className="text-success-400">configurada</span>
                ) : (
                  <span className="text-error-400">no configurada</span>
                )}
                {msgPreview.resendSandboxSender && (
                  <span className="ml-2 text-xs text-amber-400">(sandbox forzado)</span>
                )}
              </p>
              <p className="text-xs text-dark-500 pt-2 border-t border-white/5">
                En asunto y cuerpo podés usar:{' '}
                <span className="font-mono text-primary-300">{(msgPreview.variableHints || []).join(' ')}</span>
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setEmailModalOpen(true)} className="btn-primary">
              Probar correo
            </button>
            <button type="button" onClick={() => setWaModalOpen(true)} className="btn-secondary border-primary-500/40">
              Probar WhatsApp (wa.me)
            </button>
            <button
              type="button"
              onClick={() => {
                setMsgPreview(null);
                loadMessagingPreview();
              }}
              className="btn-secondary text-sm border-white/10"
              disabled={previewLoading}
            >
              Actualizar vista previa
            </button>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="card p-8 shadow-2xl border-white/5">
            <form onSubmit={handleSave} className="space-y-10">
              <section>
                <div className="flex items-center space-x-3 mb-6 border-b border-white/10 pb-2">
                  <h3 className="text-xl font-semibold text-dark-100">Control de accesos</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 md:col-span-2 rounded-lg border border-white/10 bg-dark-800/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <label className="text-sm font-medium text-dark-200" htmlFor="sw-max-sessions">
                        Límite global de sesiones activas
                      </label>
                      <ToggleSwitch
                        id="sw-max-sessions"
                        checked={config.max_concurrent_sessions_enabled}
                        onChange={(v) => setConfig({ ...config, max_concurrent_sessions_enabled: v })}
                      />
                    </div>
                    <div className="ml-auto max-w-xs space-y-2">
                      <label className="text-sm font-medium text-dark-300">Cantidad máxima (sistema)</label>
                      <input
                        type="number"
                        min={1}
                        value={config.max_concurrent_sessions}
                        onChange={(e) => setConfig({ ...config, max_concurrent_sessions: Number(e.target.value) })}
                        className={inputNumericClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 md:col-span-2 rounded-lg border border-white/10 bg-dark-800/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <label className="text-sm font-medium text-dark-200" htmlFor="sw-failed-login">
                        Control por reintentos fallidos de clave
                      </label>
                      <ToggleSwitch
                        id="sw-failed-login"
                        checked={config.failed_login_lock_enabled}
                        onChange={(v) => setConfig({ ...config, failed_login_lock_enabled: v })}
                      />
                    </div>
                    <div className="ml-auto max-w-xs space-y-2">
                      <label className="text-sm font-medium text-dark-300">Máximo de intentos fallidos</label>
                      <input
                        type="number"
                        min={1}
                        value={config.failed_login_attempts}
                        onChange={(e) => setConfig({ ...config, failed_login_attempts: Number(e.target.value) })}
                        className={inputNumericClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 md:col-span-2 rounded-lg border border-white/10 bg-dark-800/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <label className="text-sm font-medium text-dark-200" htmlFor="sw-idle">
                        Expiración de sesión por inactividad (REMSEGS)
                      </label>
                      <ToggleSwitch
                        id="sw-idle"
                        checked={config.session_expiration_by_timeout_enabled}
                        onChange={(v) => setConfig({ ...config, session_expiration_by_timeout_enabled: v })}
                      />
                    </div>
                    <div className="ml-auto max-w-xs space-y-0">
                      <label className="mb-1 block text-sm font-medium text-dark-300">
                        Inactividad máxima (segundos)
                      </label>
                      <input
                        type="number"
                        min={60}
                        value={config.session_timeout_seconds}
                        onChange={(e) => setConfig({ ...config, session_timeout_seconds: Number(e.target.value) })}
                        className={inputNumericClass}
                      />
                      <SecondsEquivalence value={config.session_timeout_seconds} />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center space-x-3 mb-6 border-b border-white/10 pb-2">
                  <h3 className="text-xl font-semibold text-dark-100">Validez de contraseñas por rol</h3>
                </div>

                <div className="space-y-4 rounded-lg border border-white/10 bg-dark-800/30 p-4 mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <label className="text-sm font-medium text-dark-200" htmlFor="sw-pwd-expiry">
                      Control de antigüedad de clave (segundos por rol)
                    </label>
                    <ToggleSwitch
                      id="sw-pwd-expiry"
                      checked={config.password_expiration_policy_enabled}
                      onChange={(v) => setConfig({ ...config, password_expiration_policy_enabled: v })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-0">
                    <label className="mb-1 block text-xs font-bold text-dark-400 uppercase">SuperAdmin</label>
                    <div className="ml-auto w-full max-w-xs">
                      <input
                        type="number"
                        value={config.expiration_seconds.superadmin}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            expiration_seconds: { ...config.expiration_seconds, superadmin: Number(e.target.value) }
                          })
                        }
                        className={`${inputNumericClassSm} w-full`}
                      />
                      <SecondsEquivalence value={config.expiration_seconds.superadmin} />
                    </div>
                  </div>
                  <div className="space-y-0">
                    <label className="mb-1 block text-xs font-bold text-dark-400 uppercase">Admin</label>
                    <div className="ml-auto w-full max-w-xs">
                      <input
                        type="number"
                        value={config.expiration_seconds.admin}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            expiration_seconds: { ...config.expiration_seconds, admin: Number(e.target.value) }
                          })
                        }
                        className={`${inputNumericClassSm} w-full`}
                      />
                      <SecondsEquivalence value={config.expiration_seconds.admin} />
                    </div>
                  </div>
                  <div className="space-y-0">
                    <label className="mb-1 block text-xs font-bold text-dark-400 uppercase">Vendedor</label>
                    <div className="ml-auto w-full max-w-xs">
                      <input
                        type="number"
                        value={config.expiration_seconds.seller}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            expiration_seconds: { ...config.expiration_seconds, seller: Number(e.target.value) }
                          })
                        }
                        className={`${inputNumericClassSm} w-full`}
                      />
                      <SecondsEquivalence value={config.expiration_seconds.seller} />
                    </div>
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                      />
                    </svg>
                    <span>ACTUALIZAR MOTOR CENTRAL</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-8">
          <div className="card p-6 border-warning-500/20 bg-warning-500/5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-warning-400 uppercase text-xs tracking-widest">Modo emergencia</h4>
              <div
                className={`h-2 w-2 rounded-full ${config.maintenance_mode ? 'bg-warning-500 animate-pulse' : 'bg-dark-500'}`}
              ></div>
            </div>
            <label className="relative flex items-center justify-between cursor-pointer group">
              <span className="text-dark-100 font-semibold">Inhibir sistema</span>
              <input
                type="checkbox"
                checked={config.maintenance_mode}
                onChange={(e) => setConfig({ ...config, maintenance_mode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-dark-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[26px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-warning-600 shadow-inner"></div>
            </label>
          </div>

          <div className="card p-6 border-white/5 space-y-4">
            <h4 className="font-bold text-primary-400 uppercase text-xs tracking-widest">Auditoría SuperAdmin</h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-dark-400">Último ingreso soporte</p>
                <p className="text-sm text-dark-100 font-mono">
                  {config.last_super_login_at ? new Date(config.last_super_login_at).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-dark-400">IP</p>
                <p className="text-sm text-dark-100 font-mono">{config.last_super_login_ip || 'N/A'}</p>
              </div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-dark-400">Último cambio de motor</p>
                <p className="text-sm text-dark-100 font-mono">
                  {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {emailModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
        >
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-lg font-semibold text-dark-100">Probar envío de correo</h3>
            <p className="text-xs text-dark-500">
              Asunto y cuerpo admiten <span className="font-mono text-primary-300">{'{{AGENCY_NAME}}'}</span>,{' '}
              <span className="font-mono text-primary-300">{'{{CONTACT_EMAIL}}'}</span>,{' '}
              <span className="font-mono text-primary-300">{'{{FROM_LINE}}'}</span> (sustitución en el servidor).
            </p>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Para</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="input-field w-full"
                placeholder="destino@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Asunto</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Cuerpo (texto o HTML)</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
                className="input-field w-full font-mono text-sm"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEmailModalOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={emailSending}
                onClick={handleSendTestEmail}
              >
                {emailSending ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {waModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
        >
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-lg font-semibold text-dark-100">Probar WhatsApp</h3>
            <p className="text-xs text-dark-500">
              Se abre WhatsApp Web / app con el mensaje. Las mismas variables se reemplazan aquí con la vista previa
              cargada.
            </p>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Teléfono (código país, sin +)</label>
              <input
                type="text"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                className="input-field w-full font-mono"
                placeholder="5491123456789"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Mensaje</label>
              <textarea
                value={waBody}
                onChange={(e) => setWaBody(e.target.value)}
                rows={6}
                className="input-field w-full font-mono text-sm"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setWaModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleOpenWhatsApp}>
                Abrir wa.me
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemConfig;

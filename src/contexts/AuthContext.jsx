import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { apiConfig, FRONTEND_VERSION } from '../config/api';

const AuthContext = createContext();

const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

const applyIdlePolicy = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { enabled: false, idleSeconds: 600 };
  }
  const enabled = !!payload.enabled;
  const raw = Number(payload.idleSeconds);
  const idleSeconds = Math.max(60, Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 600);
  return { enabled, idleSeconds };
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(`V${FRONTEND_VERSION}`);

  const [sessionIdleEnabled, setSessionIdleEnabled] = useState(false);
  const [sessionIdleLimitSeconds, setSessionIdleLimitSeconds] = useState(600);
  /** null = política desactivada o sin sesión; número = segundos restantes de inactividad */
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  const deadlineRef = useRef(Date.now());
  const limitRef = useRef(600);
  const lastBumpRef = useRef(0);

  const ingestSessionIdle = useCallback((payload) => {
    const { enabled, idleSeconds } = applyIdlePolicy(payload);
    setSessionIdleEnabled(enabled);
    setSessionIdleLimitSeconds(idleSeconds);
    limitRef.current = idleSeconds;
    if (enabled) {
      deadlineRef.current = Date.now() + idleSeconds * 1000;
      setRemainingSeconds(idleSeconds);
    } else {
      setRemainingSeconds(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');

      try {
        const versionRes = await api.get('/api/system/version').catch(() => null);

        if (isMounted && versionRes?.data?.success) {
          const backendVersion = versionRes.data.version;
          setVersion(
            FRONTEND_VERSION === backendVersion
              ? `v${FRONTEND_VERSION}`
              : `F${FRONTEND_VERSION} B${backendVersion}`
          );
        }

        if (storedToken) {
          const response = await api.get(apiConfig.endpoints.auth.me);
          if (isMounted && response.data?.success) {
            const userData = response.data.data?.user || response.data.user;
            const sessionIdle = response.data.data?.sessionIdle;
            setUser(userData);
            setToken(storedToken);
            ingestSessionIdle(sessionIdle);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error inicializando sesión:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setRemainingSeconds(null);
          setSessionIdleEnabled(false);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();
    return () => {
      isMounted = false;
    };
  }, [ingestSessionIdle]);

  useEffect(() => {
    if (!token || !user || !sessionIdleEnabled) {
      return undefined;
    }

    const lim = Math.max(60, Number(sessionIdleLimitSeconds) || 600);
    limitRef.current = lim;
    deadlineRef.current = Date.now() + lim * 1000;
    setRemainingSeconds(lim);
    lastBumpRef.current = 0;

    const bump = () => {
      const now = Date.now();
      if (now - lastBumpRef.current < 250) return;
      lastBumpRef.current = now;
      deadlineRef.current = Date.now() + limitRef.current * 1000;
      setRemainingSeconds(limitRef.current);
    };

    const tick = () => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemainingSeconds(left);
    };

    tick();
    const id = setInterval(tick, 1000);
    IDLE_EVENTS.forEach((ev) => window.addEventListener(ev, bump, { passive: true }));

    return () => {
      clearInterval(id);
      IDLE_EVENTS.forEach((ev) => window.removeEventListener(ev, bump));
    };
  }, [token, user, sessionIdleEnabled, sessionIdleLimitSeconds]);

  useEffect(() => {
    if (!sessionIdleEnabled || !token || !user) return;
    if (remainingSeconds !== 0) return;
    localStorage.removeItem('token');
    localStorage.removeItem('admin_token_backup');
    setToken(null);
    setUser(null);
    setRemainingSeconds(null);
    setSessionIdleEnabled(false);
    window.location.assign('/login?reason=inactividad');
  }, [remainingSeconds, sessionIdleEnabled, token, user]);

  const login = async (email, password, options = {}) => {
    const forceLogin = !!options.forceLogin;
    try {
      const response = await api.post(apiConfig.endpoints.auth.login, {
        email,
        password,
        forceLogin
      });

      if (response.data?.hasActiveSession) {
        return {
          success: false,
          needsSessionConfirm: true,
          message:
            response.data.message ||
            'Ya hay una sesión activa. ¿Deseás cerrarla e ingresar desde aquí?'
        };
      }

      if (response.data?.requirePasswordChange) {
        return {
          success: true,
          requirePasswordChange: true,
          userId: response.data.data?.userId
        };
      }

      const responseData = response.data?.data || response.data;
      const newToken = responseData?.token;
      const userData = responseData?.user;
      const sessionIdle = responseData?.sessionIdle;

      if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(userData);
        ingestSessionIdle(sessionIdle);

        return {
          success: true,
          user: userData,
          data: responseData
        };
      }

      return { success: false, message: 'No se recibió un token de acceso válido' };
    } catch (error) {
      console.error('Login error detail:', error);
      const data = error.response?.data;
      if (error.response?.status === 403 && data?.systemSessionsExhausted) {
        return {
          success: false,
          systemSessionsExhausted: true,
          message:
            data.message ||
            'No hay plazas de sesión libres en el sistema. Intentá más tarde.'
        };
      }
      return {
        success: false,
        message: data?.message || 'Credenciales inválidas'
      };
    }
  };

  const impersonate = async (targetUserId) => {
    try {
      const response = await api.post('/api/auth/impersonate', { targetUserId });
      if (response.data?.success) {
        localStorage.setItem('admin_token_backup', token);
        const { token: newToken, user: newUser } = response.data.data;
        const sessionIdle = response.data.data?.sessionIdle;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
        ingestSessionIdle(sessionIdle);
        return { success: true };
      }
      return { success: false, message: response.data?.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al suplantar' };
    }
  };

  const stopImpersonating = () => {
    const backupToken = localStorage.getItem('admin_token_backup');
    if (backupToken) {
      localStorage.setItem('token', backupToken);
      localStorage.removeItem('admin_token_backup');
      window.location.href = '/admin-dashboard';
    }
  };

  const register = async (username, email, password, role, comision) => {
    try {
      const response = await api.post('/api/auth/register', {
        username,
        email,
        password,
        role,
        comision
      });

      if (response.data?.success) {
        return { success: true };
      }
      return { success: false, message: response.data?.message || 'Error al registrar' };
    } catch (error) {
      console.error('Register error detail:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error de conexión con el servidor'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin_token_backup');
    setToken(null);
    setUser(null);
    setRemainingSeconds(null);
    setSessionIdleEnabled(false);
  };

  const value = {
    token,
    user,
    loading,
    version,
    remainingSeconds,
    sessionIdleEnabled,
    sessionIdleLimitSeconds,
    /** @deprecated usar remainingSeconds; se mantiene por compatibilidad con código viejo */
    timeLeft: remainingSeconds ?? 0,
    login,
    register,
    logout,
    impersonate,
    stopImpersonating,
    updateUser: setUser,
    isImpersonating: !!localStorage.getItem('admin_token_backup'),
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin' || user?.isSuper,
    isSeller: user?.role === 'seller'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

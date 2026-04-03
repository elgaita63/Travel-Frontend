import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { apiConfig, FRONTEND_VERSION } from '../config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Inicializamos el token directamente del storage para evitar saltos de render
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(`V${FRONTEND_VERSION}`);
  const [timeLeft, setTimeLeft] = useState(1800); 

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      try {
        // 1. Carga de configuración inicial del sistema
        const [versionRes, configRes] = await Promise.all([
          api.get('/api/system/version').catch(() => null),
          api.get('/api/system/config').catch(() => null)
        ]);

        if (isMounted) {
          if (versionRes?.data?.success) {
            const backendVersion = versionRes.data.version;
            setVersion(FRONTEND_VERSION === backendVersion ? `v${FRONTEND_VERSION}` : `F${FRONTEND_VERSION} B${backendVersion}`);
          }
          if (configRes?.data?.success) {
            setTimeLeft(configRes.data.data.session_timeout_seconds);
          }
        }

        // 2. Validación de sesión existente
        if (storedToken) {
          const response = await api.get(apiConfig.endpoints.auth.me);
          if (isMounted && response.data?.success) {
            const userData = response.data.data?.user || response.data.user;
            setUser(userData);
            setToken(storedToken);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error inicializando sesión:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();
    return () => { isMounted = false; }; 
  }, []);

  const login = async (email, password) => {
    try {
      // Intento 1: Login normal
      let response = await api.post(apiConfig.endpoints.auth.login, { email, password });
      
      // CASO A: Sesión activa detectada (Concurrencia en el Back)
      if (response.data?.hasActiveSession) {
        console.warn('⚠️ Sesión activa en otra pantalla. Forzando ingreso...');
        // Intento 2: Forzamos el login (esto gatilla invalidateUserSessions en el back)
        response = await api.post(apiConfig.endpoints.auth.login, { 
          email, 
          password, 
          forceLogin: true 
        });
      }

      // CASO B: Cambio de contraseña obligatorio
      // AuthContext.jsx - Línea ~84
      if (response.data?.requirePasswordChange) {
        return { 
          success: true, 
          requirePasswordChange: true, 
          userId: response.data.data?.userId // Sacamos el ID afuera para que sea fácil de leer
        };
      }
      // CASO C: Login exitoso (Normal o Sid)
      const responseData = response.data?.data || response.data;
      const newToken = responseData?.token;
      const userData = responseData?.user;
      
      if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(userData);
        
        return { 
          success: true, 
          user: userData, 
          data: responseData 
        };
      }
      
      return { success: false, message: 'No se recibió un token de acceso válido' };

    } catch (error) {
      console.error('Login error detail:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Credenciales inválidas o error de servidor' 
      };
    }
  };

const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    // Al setear el usuario en nulo y el token en nulo, el ProtectedRoute
    // de tu App.jsx (o equivalente) detectará que ya no hay sesión y 
    // te redirigirá automáticamente a /login usando el enrutador de React,
    // sin hacer un hard-reload de la página y eliminando el pestañeo.
  };
  
  const value = {
    token,
    user,
    loading,
    version,
    timeLeft,
    login,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin' || user?.isSuper,
    isSeller: user?.role === 'seller'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
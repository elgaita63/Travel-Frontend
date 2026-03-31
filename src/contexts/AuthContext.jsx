import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { apiConfig, FRONTEND_VERSION } from '../config/api';

const AuthContext = createContext();

// Provider Component
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estado inicial preventivo
  const [version, setVersion] = useState(`V${FRONTEND_VERSION}`);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      try {
        const versionRes = await api.get('/api/system/version');
        if (versionRes.data.success) {
          const backendVersion = versionRes.data.version;
          
          // --- NUEVA LÓGICA DE COMPARACIÓN ---
          if (FRONTEND_VERSION === backendVersion) {
            // Si son iguales, solo una V y la versión
            setVersion(`v${FRONTEND_VERSION}`);
          } else {
            // Si son distintas, mantenemos el formato de diagnóstico
            setVersion(`F${FRONTEND_VERSION} B${backendVersion}`);
          }
          // ------------------------------------
        }
      } catch (vError) {
        console.error('Error fetching backend version:', vError);
        setVersion(`F${FRONTEND_VERSION} | B Error`);
      }

      if (storedToken) {
        setToken(storedToken);
        try {
          const response = await api.get(apiConfig.endpoints.auth.me);
          setUser(response.data.data.user);
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post(apiConfig.endpoints.auth.login, { email, password });
      
      const { requirePasswordChange } = response.data;
      const { token: newToken, user: userData } = response.data.data || {};

      if (!requirePasswordChange && newToken) {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
      }

      return { 
        success: true, 
        user: userData, 
        requirePasswordChange: !!requirePasswordChange, 
        data: response.data.data 
      };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      return { success: false, message };
    }
  };

  const register = async (username, email, password, role = 'seller') => {
    try {
      const response = await api.post(apiConfig.endpoints.auth.register, { username, email, password, role });
      const { token: newToken, user: userData } = response.data.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try { await api.post(apiConfig.endpoints.auth.logout); } 
    catch (error) { console.error('Logout API call failed:', error); } 
    finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
    }
  };

  const fetchUser = async () => {
    try {
      const response = await api.get(apiConfig.endpoints.auth.me);
      setUser(response.data.data.user);
      return { success: true, user: response.data.data.user };
    } catch (error) {
      logout();
      return { success: false, message: 'Failed to fetch user data' };
    }
  };

  const updateUser = (userData) => { setUser(userData); };

  const value = {
    token, user, loading, version, login, register, logout, fetchUser, updateUser,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    isSeller: user?.role === 'seller'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
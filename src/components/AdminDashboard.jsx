import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext'; // <--- AGREGADO
import { useSystemStats } from '../contexts/SystemStatsContext';
import { formatCurrencyCompact } from '../utils/formatNumbers';
import { t, getCurrentLanguage } from '../utils/i18n';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';
import CurrencyDisplay from './CurrencyDisplay';
import DatabaseValue from './DatabaseValue';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // <--- AGREGADO
  const { systemStats, businessStats, fetchSystemStats, fetchBusinessStats, refreshStats } = useSystemStats();
  const { formatCurrency, formatCurrencyJSX, formatCurrencyFullJSX } = useCurrencyFormat();

  // User Management State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    role: '',
    comision: '', // CORREGIDO: ahora coincide con la BD (comision en lugar de commission)
    forcePasswordExpiration: false,
    password: '',
    confirmPassword: ''
  });
  
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalUsers, setTotalUsers] = useState(0);

  // Recent Activity State
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityCurrentPage, setActivityCurrentPage] = useState(1);
  const [activityRowsPerPage, setActivityRowsPerPage] = useState(5);
  const [totalActivities, setTotalActivities] = useState(0);

  // System Management State
  const [systemHealth, setSystemHealth] = useState(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const [systemMessageType, setSystemMessageType] = useState('');

  // Language state
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());

  useEffect(() => {
    fetchAllData();
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(getCurrentLanguage());
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  // Effect for activity pagination
  useEffect(() => {
    if (!loading) {
      fetchRecentActivity();
    }
  }, [activityCurrentPage, activityRowsPerPage, loading]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const usersData = await fetchUsers();
      await fetchRecentActivity();
      await fetchSystemStats();
      await fetchBusinessStats(usersData);
    } catch (error) {
      setError('Error al cargar los datos del panel');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users?limit=100');
      if (response.data.success) {
        const usersData = response.data.data.users;
        setUsers(usersData);
        setTotalUsers(usersData.length);
        return usersData;
      }
      return [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  };


  const fetchRecentActivity = async () => {
    try {
      const response = await api.get(`/api/activity-logs?page=${activityCurrentPage}&limit=${activityRowsPerPage}`);
      
      if (response.data.success) {
        setRecentActivity(response.data.data.activities);
        setTotalActivities(response.data.data.pagination.totalCount);
      } else {
        setRecentActivity([]);
        setTotalActivities(0);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
      setTotalActivities(0);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowAdminPass(false);
    setShowAdminConfirm(false);
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
      comision: user.comision || '', // CORREGIDO: comision
      forcePasswordExpiration: false,
      password: '',
      confirmPassword: ''
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (editForm.forcePasswordExpiration) {
      if (!editForm.password || editForm.password !== editForm.confirmPassword) {
        setError('Las contraseñas no coinciden o están vacías.');
        return;
      }
    }
    try {
      await api.put(`/api/users/${editingUser.id}`, editForm);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      setError('Error al actualizar el usuario');
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('¿Estás seguro de que querés eliminar este usuario?')) {
      try {
        await api.delete(`/api/users/${userId}`);
        fetchUsers();
        refreshStats();
      } catch (error) {
        setError('Error al eliminar el usuario');
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); 
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const getTotalPages = () => {
    return Math.ceil(totalUsers / rowsPerPage);
  };

  const handleActivityRowsPerPageChange = (newRowsPerPage) => {
    setActivityRowsPerPage(newRowsPerPage);
    setActivityCurrentPage(1); 
  };

  const handleActivityPageChange = (newPage) => {
    setActivityCurrentPage(newPage);
  };

  const getActivityTotalPages = () => {
    return Math.ceil(totalActivities / activityRowsPerPage);
  };

  const getPaginatedUsers = () => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return users.slice(startIndex, endIndex);
  };

  // System Management Functions
  const showSystemMessage = (message, type = 'success') => {
    setSystemMessage(message);
    setSystemMessageType(type);
    setTimeout(() => {
      setSystemMessage('');
      setSystemMessageType('');
    }, 2500); 
  };

  const handleSystemHealthCheck = async () => {
    try {
      setSystemLoading(true);
      showSystemMessage('Iniciando chequeo de salud del sistema...', 'info');
      
      const response = await api.get('/api/system/health');
      
      if (response.data.success) {
        setSystemHealth(response.data.data);
        const healthData = response.data.data;
        const status = healthData.status === 'healthy' ? 'óptimo' : 'con problemas';
        showSystemMessage(
          `Chequeo completado: ${status.toUpperCase()}. Base de datos: ${healthData.database.status}, Colecciones: ${healthData.collections.found}/${healthData.collections.expected}`, 
          healthData.status === 'healthy' ? 'success' : 'warning'
        );
      }
    } catch (error) {
      console.error('System health check error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
      showSystemMessage(`Fallo en el chequeo del sistema: ${errorMsg}`, 'error');
    } finally {
      setSystemLoading(false);
    }
  };

  const handleBackupDatabase = async () => {
    if (!window.confirm('Esto creará un respaldo de toda la base de datos. ¿Querés continuar?')) {
      return;
    }
    
    try {
      setSystemLoading(true);
      showSystemMessage('Creando respaldo de la base de datos...', 'info');
      
      const response = await api.post('/api/system/backup');
      
      if (response.data.success) {
        const backupInfo = response.data.data;
        showSystemMessage(
          `Respaldo EXITOSO: Se creó ${backupInfo.backupFile} (${backupInfo.sizeFormatted}) a las ${new Date().toLocaleTimeString()}`, 
          'success'
        );
      }
    } catch (error) {
      console.error('Database backup error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
      showSystemMessage(`Fallo en el respaldo: ${errorMsg}`, 'error');
    } finally {
      setSystemLoading(false);
    }
  };


  const handleClearCache = async () => {
    if (!window.confirm('Esto limpiará los archivos temporales y la caché. ¿Querés continuar?')) {
      showSystemMessage('Limpieza de caché cancelada', 'info');
      return;
    }
    
    try {
      setSystemLoading(true);
      showSystemMessage('Limpiando caché del sistema...', 'info');
      
      const response = await api.post('/api/system/clear-cache');
      
      if (response.data.success) {
        const cacheInfo = response.data.data;
        showSystemMessage(
          `Limpieza EXITOSA: Se removieron ${cacheInfo.cleared.length} elementos a las ${new Date().toLocaleTimeString()}`, 
          'success'
        );
      }
    } catch (error) {
      console.error('Clear cache error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
      showSystemMessage(`Fallo al limpiar caché: ${errorMsg}`, 'error');
    } finally {
      setSystemLoading(false);
    }
  };

  const handleCloseSystemHealthReport = () => {
    setSystemHealth(null);
    showSystemMessage('Reporte de salud cerrado', 'info');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary-200 border-t-primary-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="icon-container">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>
        <p className="text-dark-300 text-lg font-medium ml-4">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl font-bold gradient-text mb-6 font-poppins">
            <CurrencyDisplay>Panel de Administración</CurrencyDisplay>
          </h1>
          <p className="text-xl text-dark-300 max-w-3xl mx-auto mb-8">
            <CurrencyDisplay>Gestión integral del negocio y administración del sistema</CurrencyDisplay>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="notification">
            <div className="flex items-center space-x-4">
              <div className="icon-container bg-error-500">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-error-400 font-medium text-lg">{error}</span>
            </div>
          </div>
        )}

        {/* System Message Display */}
        {systemMessage && (
          <div className="notification animate-fade-in-up">
            <div className="flex items-center space-x-4">
              <div className={`icon-container ${
                systemMessageType === 'success' ? 'bg-success-500' : 
                systemMessageType === 'error' ? 'bg-error-500' :
                systemMessageType === 'warning' ? 'bg-warning-500' :
                systemMessageType === 'info' ? 'bg-primary-500' : 'bg-dark-300'
              }`}>
                {systemMessageType === 'success' ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : systemMessageType === 'error' ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : systemMessageType === 'warning' ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <span className={`${
                systemMessageType === 'success' ? 'text-success-400' : 
                systemMessageType === 'error' ? 'text-error-400' :
                systemMessageType === 'warning' ? 'text-warning-400' :
                systemMessageType === 'info' ? 'text-primary-400' : 'text-dark-300'
              } font-medium text-lg`}>{systemMessage}</span>
            </div>
          </div>
        )}

        {/* Business Overview Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold text-dark-100 flex items-center">
              <div className="icon-container bg-primary-500 mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <CurrencyDisplay>Resumen del Negocio</CurrencyDisplay>
            </h3>
            <button
              onClick={async () => {
                await fetchAllData();
              }}
              disabled={loading}
              className="btn-secondary flex items-center space-x-2"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* USD Sales */}
            <div className="card-neon hover-lift p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="icon-container bg-success-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <span className="text-success-400 text-sm font-medium"><CurrencyDisplay>{t('usdSymbol')}</CurrencyDisplay></span>
              </div>
              <h4 className="text-lg font-semibold text-dark-100 mb-2"><CurrencyDisplay>Ventas en</CurrencyDisplay> <CurrencyDisplay>{t('usdSymbol')}</CurrencyDisplay></h4>
              <p className="text-3xl font-bold text-success-400">
                {loading ? (
                  <div className="animate-pulse bg-success-400/20 h-8 w-32 rounded"></div>
                ) : (
                  formatCurrencyFullJSX(businessStats.usdSales, 'USD', '...')
                )}
              </p>
              <p className="text-sm text-dark-400 mt-2"><CurrencyDisplay>{t('usdSymbol')}</CurrencyDisplay> <CurrencyDisplay>transacciones</CurrencyDisplay></p>
            </div>

            {/* ARS Sales */}
            <div className="card-neon hover-lift p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="icon-container bg-warning-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <span className="text-warning-400 text-sm font-medium"><CurrencyDisplay>{t('arsSymbol')}</CurrencyDisplay></span>
              </div>
              <h4 className="text-lg font-semibold text-dark-100 mb-2"><CurrencyDisplay>Ventas en</CurrencyDisplay> <CurrencyDisplay>{t('arsSymbol')}</CurrencyDisplay></h4>
              <p className="text-3xl font-bold text-warning-400">
                {loading ? (
                  <div className="animate-pulse bg-warning-400/20 h-8 w-32 rounded"></div>
                ) : (
                  formatCurrencyFullJSX(businessStats.arsSales, 'ARS', '...')
                )}
              </p>
              <p className="text-sm text-dark-400 mt-2"><CurrencyDisplay>{t('arsSymbol')}</CurrencyDisplay> <CurrencyDisplay>transacciones</CurrencyDisplay></p>
            </div>

            {/* Total Sales */}
            <div className="card hover-lift p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="icon-container bg-primary-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="text-primary-400 text-sm font-medium">Activas</span>
              </div>
              <h4 className="text-lg font-semibold text-dark-100 mb-2"><CurrencyDisplay>Ventas Totales</CurrencyDisplay></h4>
              <p className="text-3xl font-bold text-primary-400">
                {loading ? (
                  <div className="animate-pulse bg-primary-400/20 h-8 w-16 rounded"></div>
                ) : (
                  businessStats.totalSales
                )}
              </p>
              <p className="text-sm text-dark-400 mt-2">Transacciones completadas</p>
            </div>

            {/* Total Clients */}
            <div className="card hover-lift p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="icon-container bg-accent-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <span className="text-accent-400 text-sm font-medium">Creciendo</span>
              </div>
              <h4 className="text-lg font-semibold text-dark-100 mb-2"><CurrencyDisplay>Total de Pasajeros</CurrencyDisplay></h4>
              <p className="text-3xl font-bold text-accent-400">
                {loading ? (
                  <div className="animate-pulse bg-accent-400/20 h-8 w-16 rounded"></div>
                ) : (
                  businessStats.totalClients
                )}
              </p>
              <p className="text-sm text-dark-400 mt-2"><CurrencyDisplay>Pasajeros registrados</CurrencyDisplay></p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-glass p-6">
            <h4 className="text-xl font-semibold text-dark-100 mb-6"><CurrencyDisplay>Acciones Rápidas</CurrencyDisplay></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <button
                onClick={() => navigate('/clients')}
                className="group card hover-lift p-6 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="icon-container bg-accent-500 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-dark-100 group-hover:text-accent-400 transition-colors"><CurrencyDisplay>Gestionar Pasajeros</CurrencyDisplay></div>
                    <div className="text-xs text-dark-400"><CurrencyDisplay>Base de datos de pasajeros</CurrencyDisplay></div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/admin-insights')}
                className="group card hover-lift p-6 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="icon-container bg-success-500 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-dark-100 group-hover:text-success-400 transition-colors"><CurrencyDisplay>Estadísticas</CurrencyDisplay></div>
                    <div className="text-xs text-dark-400"><CurrencyDisplay>Análisis y reportes</CurrencyDisplay></div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/sales')}
                className="group card hover-lift p-6 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="icon-container bg-warning-500 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-dark-100 group-hover:text-warning-400 transition-colors">Ver Ventas</div>
                    <div className="text-xs text-dark-400">Todas las transacciones</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* System Analytics Section */}
        <div className="mb-12">
          <h3 className="text-3xl font-bold text-dark-100 mb-8 flex items-center">
            <div className="icon-container bg-warning-500 mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <CurrencyDisplay>Análisis del Sistema</CurrencyDisplay>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* System Uptime */}
            <div className="card hover-lift p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="icon-container bg-success-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-success-400 text-sm font-medium">Saludable</span>
              </div>
              <h4 className="text-lg font-semibold text-dark-100 mb-2"><CurrencyDisplay>Tiempo en línea</CurrencyDisplay></h4>
              <p className="text-3xl font-bold text-success-400">{systemStats.systemUptime}</p>
              <p className="text-sm text-dark-400 mt-2"><CurrencyDisplay>Últimos 30 días</CurrencyDisplay></p>
            </div>

            {/* Total Users */}
            <div className="card hover-lift p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="icon-container bg-primary-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <span className="text-primary-400 text-sm font-medium">Activo</span>
              </div>
              <h4 className="text-lg font-semibold text-dark-100 mb-2"><CurrencyDisplay>Total de Usuarios</CurrencyDisplay></h4>
              <p className="text-3xl font-bold text-primary-400">{systemStats.totalUsers}</p>
              <p className="text-sm text-dark-400 mt-2"><CurrencyDisplay>Usuarios registrados</CurrencyDisplay></p>
            </div>

            {/* Total Providers */}
            <div className="card hover-lift p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="icon-container bg-accent-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-accent-400 text-sm font-medium">Socios</span>
              </div>
              <h4 className="text-lg font-semibold text-dark-100 mb-2"><CurrencyDisplay>Total de Proveedores</CurrencyDisplay></h4>
              <p className="text-3xl font-bold text-accent-400">{systemStats.totalProviders}</p>
              <p className="text-sm text-dark-400 mt-2"><CurrencyDisplay>Proveedores de servicios</CurrencyDisplay></p>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="mb-12">
          <h3 className="text-3xl font-bold text-dark-100 mb-8 flex items-center">
            <div className="icon-container bg-accent-500 mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <CurrencyDisplay>Actividad Reciente</CurrencyDisplay>
          </h3>

          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h4 className="text-lg font-medium text-dark-100"><CurrencyDisplay>Registro de Actividad del Sistema</CurrencyDisplay></h4>
            </div>
            <div className="divide-y divide-white/10">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`icon-container ${activity.type === 'sale' ? 'bg-success-500' :
                          activity.type === 'client' ? 'bg-accent-500' :
                            'bg-primary-500'
                        }`}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark-100">{activity.user}</p>
                        <p className="text-sm text-dark-300">{activity.action}</p>
                      </div>
                    </div>
                    <div className="text-sm text-dark-400">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Activity Pagination Controls */}
            {totalActivities > 0 && (
              <div className="px-6 py-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  {/* Rows per page selector */}
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-dark-300">Filas por página:</span>
                    <select
                      value={activityRowsPerPage}
                      onChange={(e) => handleActivityRowsPerPageChange(Number(e.target.value))}
                      className="input-field text-sm py-1 px-2 w-16"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>

                  {/* Page info */}
                  <div className="text-sm text-dark-300">
                    Mostrando {((activityCurrentPage - 1) * activityRowsPerPage) + 1} a {Math.min(activityCurrentPage * activityRowsPerPage, totalActivities)} de {totalActivities} actividades
                  </div>

                  {/* Pagination buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleActivityPageChange(activityCurrentPage - 1)}
                      disabled={activityCurrentPage === 1}
                      className="btn-secondary text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-dark-300 px-2">
                      Página {activityCurrentPage} de {getActivityTotalPages()}
                    </span>
                    <button
                      onClick={() => handleActivityPageChange(activityCurrentPage + 1)}
                      disabled={activityCurrentPage === getActivityTotalPages()}
                      className="btn-secondary text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System Settings Section */}
        <div className="mb-12">
          <h3 className="text-3xl font-bold text-dark-100 mb-8 flex items-center">
            <div className="icon-container bg-warning-500 mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <CurrencyDisplay>Configuración del Sistema</CurrencyDisplay>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Management */}
            <div className="card hover-lift p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="icon-container bg-primary-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-dark-100"><CurrencyDisplay>Gestión de Base de Datos</CurrencyDisplay></h4>
                  <p className="text-sm text-dark-300"><CurrencyDisplay>Administrar operaciones de la base de datos</CurrencyDisplay></p>
                </div>
              </div>
              <div className="space-y-3">
                <button 
                  className="w-full btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleBackupDatabase}
                  disabled={systemLoading}
                >
                  <span className="flex items-center justify-center space-x-2">
                    {systemLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-200 border-t-primary-500"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                    <span>{systemLoading ? 'Respaldando...' : 'Respaldar Base de Datos'}</span>
                  </span>
                </button>
              </div>
            </div>

            {/* System Maintenance */}
            <div className="card hover-lift p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="icon-container bg-success-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-dark-100">Mantenimiento del Sistema</h4>
                  <p className="text-sm text-dark-300">Salud y mantenimiento del sistema</p>
                </div>
              </div>
              <div className="space-y-3">
                <button 
                  className="w-full btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSystemHealthCheck}
                  disabled={systemLoading}
                >
                  <span className="flex items-center justify-center space-x-2">
                    {systemLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-200 border-t-primary-500"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    <span>{systemLoading ? 'Revisando...' : 'Chequeo de Salud'}</span>
                  </span>
                </button>
                <button 
                  className="w-full btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleClearCache}
                  disabled={systemLoading}
                >
                  <span className="flex items-center justify-center space-x-2">
                    {systemLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-200 border-t-primary-500"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    <span>{systemLoading ? 'Limpiando...' : 'Limpiar Caché'}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* System Health Display */}
        {systemHealth && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-bold text-dark-100 flex items-center">
                <div className="icon-container bg-success-500 mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Reporte de Salud del Sistema
              </h3>
              <button
                onClick={handleCloseSystemHealthReport}
                className="btn-secondary text-sm px-4 py-2 flex items-center space-x-2 hover:bg-error-500/20 hover:border-error-500/50 transition-all duration-200"
                title="Cerrar Reporte"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cerrar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Database Status */}
              <div className="card hover-lift p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-dark-100">Base de Datos</h4>
                  <span className={`badge ${systemHealth.database.connected ? 'badge-success' : 'badge-error'}`}>
                    {systemHealth.database.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-dark-300">Colecciones:</span>
                    <span className="text-dark-100">{systemHealth.collections.found}/{systemHealth.collections.expected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-300">Estado:</span>
                    <span className={`${systemHealth.status === 'healthy' ? 'text-success-400' : 'text-error-400'}`}>
                      {systemHealth.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Collections Overview */}
              <div className="card hover-lift p-6">
                <h4 className="text-lg font-semibold text-dark-100 mb-4">Colecciones</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {Object.entries(systemHealth.collections.counts || {}).map(([collection, count]) => (
                    <div key={collection} className="flex justify-between">
                      <span className="text-dark-300 capitalize">{collection}:</span>
                      <span className="text-dark-100">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Info */}
              <div className="card hover-lift p-6">
                <h4 className="text-lg font-semibold text-dark-100 mb-4">Info del Sistema</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-dark-300">Tiempo activo:</span>
                    <span className="text-dark-100">{Math.floor(systemHealth.system.uptime / 3600)}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-300">Memoria:</span>
                    <span className="text-dark-100">{Math.round(systemHealth.system.memory.used / 1024 / 1024)}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-300">Node:</span>
                    <span className="text-dark-100">{systemHealth.system.nodeVersion}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Relationship Health */}
            {systemHealth.relationships && systemHealth.relationships.checks && (
              <div className="mt-6">
                <h4 className="text-xl font-semibold text-dark-100 mb-4">Salud de Relaciones</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systemHealth.relationships.checks.map((check, index) => (
                    <div key={index} className="card p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-dark-100 font-medium">{check.name}</span>
                        <span className={`badge ${check.status === 'healthy' ? 'badge-success' : 'badge-error'}`}>
                          {check.status}
                        </span>
                      </div>
                      {check.invalidReferences > 0 && (
                        <p className="text-error-400 text-sm mt-2">
                          {check.invalidReferences} referencias inválidas encontradas
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Management */}
        <div className="mb-12">
          <h3 className="text-3xl font-bold text-dark-100 mb-8 flex items-center">
            <div className="icon-container bg-primary-500 mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            Gestión de Usuarios
          </h3>

          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-dark-100">Usuarios del Sistema</h4>
                {/* CAMBIO FINAL: Solo el SuperAdmin (vos) ve este botón */}
                {user?.isSuper && (
                  <button
                    onClick={() => navigate('/users/new')}
                    className="btn-primary text-sm"
                  >
                    <span className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Agregar Usuario</span>
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {getPaginatedUsers().map((user) => (
                <div key={user.id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                        <DatabaseValue data-field="userInitial" className="text-lg font-bold text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </DatabaseValue>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-dark-100">
                          {user.username}
                        </div>
                        <div className="text-sm text-dark-300">{user.email}</div>
                        <div className="text-xs text-dark-400">
                          Creado: {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* --- NUEVO: Estética mejorada para los badges y comisiones --- */}
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-3">
                        <span className={`badge ${user.role === 'admin'
                            ? 'badge-primary'
                            : 'badge-success'
                          }`}>
                          {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                        </span>
                        
                        <span className="px-3 py-1 rounded-full bg-dark-600 border border-white/10 text-sm font-medium text-primary-400 shadow-sm">
                          Comisión: {user.comision || 0}%
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="btn-primary text-sm"
                        >
                          <span className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Editar</span>
                          </span>
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="btn-error text-sm"
                        >
                          <span className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Eliminar</span>
                          </span>
                        </button>
                      </div>
                    </div>
                    {/* --- FIN NUEVO --- */}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalUsers > 0 && (
              <div className="px-6 py-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  {/* Rows per page selector */}
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-dark-300">Filas por página:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                      className="input-field text-sm py-1 px-2 w-16"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>

                  {/* Page info */}
                  <div className="text-sm text-dark-300">
                    Mostrando {((currentPage - 1) * rowsPerPage) + 1} a {Math.min(currentPage * rowsPerPage, totalUsers)} de {totalUsers} usuarios
                  </div>

                  {/* Pagination buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="btn-secondary text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-dark-300 px-2">
                      Página {currentPage} de {getTotalPages()}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === getTotalPages()}
                      className="btn-secondary text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="modal-backdrop">
            <div className="modal-content p-8">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-dark-100 mb-3 font-poppins">Editar Usuario</h3>
                <p className="text-dark-300">Actualizar información del usuario</p>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold text-dark-200 mb-4">
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-200 mb-4">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-200 mb-4">
                    Rol
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="input-field"
                  >
                    <option value="seller">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-200 mb-4">
                    Comisión
                  </label>
                  <input
                    type="number"
                    value={editForm.comision}
                    onChange={(e) => setEditForm({ ...editForm, comision: e.target.value })}
                    className="input-field"
                    placeholder="Ej: 10"
                  />
                </div>

                <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-primary-400 uppercase tracking-wider">Forzar Vencimiento</h4>
                    <p className="text-xs text-dark-300">Obliga a cambiar la clave en el próximo ingreso.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editForm.forcePasswordExpiration}
                      onChange={(e) => setEditForm({ ...editForm, forcePasswordExpiration: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                {editForm.forcePasswordExpiration && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="relative">
                      <label className="block text-xs font-semibold text-primary-400 mb-2 uppercase">Nueva Clave</label>
                      <input
                        type={showAdminPass ? "text" : "password"}
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        className="input-field pr-10"
                        placeholder="Nueva Clave"
                        required={editForm.forcePasswordExpiration}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPass(!showAdminPass)}
                        className="absolute bottom-0 right-0 h-10 px-3 flex items-center text-dark-400 hover:text-primary-400 transition-colors"
                      >
                        {showAdminPass ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-primary-400 mb-2 uppercase">Confirmar</label>
                      <input
                        type={showAdminConfirm ? "text" : "password"}
                        value={editForm.confirmPassword}
                        onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                        className="input-field pr-10"
                        placeholder="Confirmar"
                        required={editForm.forcePasswordExpiration}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminConfirm(!showAdminConfirm)}
                        className="absolute bottom-0 right-0 h-10 px-3 flex items-center text-dark-400 hover:text-primary-400 transition-colors"
                      >
                        {showAdminConfirm ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Actualizar Usuario
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
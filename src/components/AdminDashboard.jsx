import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSystemStats } from '../contexts/SystemStatsContext';
import { t, getCurrentLanguage } from '../utils/i18n';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';
import DatabaseValue from './DatabaseValue';
import EditUserModal from './EditUserModal';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, impersonate } = useAuth();
  const { systemStats, businessStats, fetchSystemStats, fetchBusinessStats, refreshStats } = useSystemStats();
  const { formatCurrencyFullJSX } = useCurrencyFormat();

  // User Management State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Empezamos con 10 por defecto
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

  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(getCurrentLanguage());
    };
    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

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
    setRowsPerPage(parseInt(newRowsPerPage)); 
    setCurrentPage(1); 
  };
  
  const handlePageChange = (newPage) => { setCurrentPage(newPage); };
  const getTotalPages = () => Math.ceil(totalUsers / rowsPerPage);
  
  const handleActivityRowsPerPageChange = (newRowsPerPage) => { setActivityRowsPerPage(newRowsPerPage); setActivityCurrentPage(1); };
  const handleActivityPageChange = (newPage) => { setActivityCurrentPage(newPage); };
  const getActivityTotalPages = () => Math.ceil(totalActivities / activityRowsPerPage);
  
  const getPaginatedUsers = () => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return users.slice(startIndex, startIndex + rowsPerPage);
  };

  const showSystemMessage = (message, type = 'success') => {
    setSystemMessage(message); setSystemMessageType(type);
    setTimeout(() => { setSystemMessage(''); setSystemMessageType(''); }, 2500);
  };

  const handleSystemHealthCheck = async () => {
    try {
      setSystemLoading(true);
      showSystemMessage('Iniciando chequeo de salud...', 'info');
      const response = await api.get('/api/system/health');
      if (response.data.success) {
        setSystemHealth(response.data.data);
        showSystemMessage(`Chequeo completado.`, 'success');
      }
    } catch (error) {
      showSystemMessage(`Fallo en el chequeo: ${error.message}`, 'error');
    } finally { setSystemLoading(false); }
  };

  const handleBackupDatabase = async () => {
    if (!window.confirm('Esto creará un respaldo de toda la base de datos. ¿Querés continuar?')) return;
    try {
      setSystemLoading(true);
      showSystemMessage('Creando respaldo...', 'info');
      const response = await api.post('/api/system/backup');
      if (response.data.success) showSystemMessage(`Respaldo EXITOSO`, 'success');
    } catch (error) { showSystemMessage(`Fallo en el respaldo`, 'error'); }
    finally { setSystemLoading(false); }
  };

  const handleClearCache = async () => {
    if (!window.confirm('¿Limpiar caché del sistema?')) return;
    try {
      setSystemLoading(true);
      const response = await api.post('/api/system/clear-cache');
      if (response.data.success) showSystemMessage('Limpieza EXITOSA', 'success');
    } catch (error) { showSystemMessage('Fallo al limpiar caché', 'error'); }
    finally { setSystemLoading(false); }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-20 w-20 border-4 border-primary-500"></div></div>;

  return (
    <div className="min-h-screen">
      <div className="space-y-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold gradient-text mb-6 font-poppins">Panel de Administración</h1>
          <p className="text-xl text-dark-300 max-w-3xl mx-auto">Gestión integral del negocio y administración del sistema</p>
        </div>

        {/* Stats Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-neon hover-lift p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="icon-container bg-success-500"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg></div>
              <span className="text-success-400 text-sm font-medium">USD</span>
            </div>
            <h4 className="text-lg font-semibold text-dark-100 mb-2">Ventas USD</h4>
            <p className="text-3xl font-bold text-success-400">{formatCurrencyFullJSX(businessStats.usdSales, 'USD')}</p>
          </div>

          <div className="card-neon hover-lift p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="icon-container bg-warning-500"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg></div>
              <span className="text-warning-400 text-sm font-medium">ARS</span>
            </div>
            <h4 className="text-lg font-semibold text-dark-100 mb-2">Ventas ARS</h4>
            <p className="text-3xl font-bold text-warning-400">{formatCurrencyFullJSX(businessStats.arsSales, 'ARS')}</p>
          </div>

          <div className="card hover-lift p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="icon-container bg-primary-500"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
              <span className="text-primary-400 text-sm font-medium">Total</span>
            </div>
            <h4 className="text-lg font-semibold text-dark-100 mb-2">Ventas Totales</h4>
            <p className="text-3xl font-bold text-primary-400">{businessStats.totalSales}</p>
          </div>

          <div className="card hover-lift p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="icon-container bg-accent-500"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg></div>
              <span className="text-accent-400 text-sm font-medium">Pasajeros</span>
            </div>
            <h4 className="text-lg font-semibold text-dark-100 mb-2">Total Pasajeros</h4>
            <p className="text-3xl font-bold text-accent-400">{businessStats.totalClients}</p>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="card-glass p-6">
          <h4 className="text-xl font-semibold text-dark-100 mb-6">Acciones Rápidas</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => navigate('/clients')} className="group card hover-lift p-6 text-left flex items-center space-x-3">
              <div className="icon-container bg-accent-500 group-hover:scale-110 transition-transform"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg></div>
              <div><div className="text-sm font-semibold text-dark-100 group-hover:text-accent-400">Gestionar Pasajeros</div><div className="text-xs text-dark-400">Base de datos central</div></div>
            </button>
            <button onClick={() => navigate('/admin-insights')} className="group card hover-lift p-6 text-left flex items-center space-x-3">
              <div className="icon-container bg-success-500 group-hover:scale-110 transition-transform"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div>
              <div><div className="text-sm font-semibold text-dark-100 group-hover:text-success-400">Estadísticas</div><div className="text-xs text-dark-400">Análisis del negocio</div></div>
            </button>
            <button onClick={() => navigate('/sales')} className="group card hover-lift p-6 text-left flex items-center space-x-3">
              <div className="icon-container bg-warning-500 group-hover:scale-110 transition-transform"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
              <div><div className="text-sm font-semibold text-dark-100 group-hover:text-warning-400">Ver Ventas</div><div className="text-xs text-dark-400">Historial completo</div></div>
            </button>
          </div>
        </div>

        {/* Gestión de Usuarios Table */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold text-dark-100 flex items-center">
              <div className="icon-container bg-primary-500 mr-4"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg></div>
              Gestión de Usuarios
            </h3>
            {user?.isSuper && (
              <button 
                onClick={() => navigate('/register')} 
                className="btn-primary flex items-center space-x-2 px-6 py-2.5 rounded-xl shadow-lg shadow-primary-500/20 hover:scale-105 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="font-bold tracking-tight">NUEVO USUARIO</span>
              </button>
            )}
          </div>
          <div className="card overflow-hidden">
            <div className="flex px-6 py-3 bg-dark-700/50 border-b border-white/10 text-[11px] font-bold text-dark-400 uppercase tracking-widest">
              <div className="w-[30%]">Usuario</div>
              <div className="w-[15%] text-center">Rol</div>
              <div className="w-[10%] text-center">Comisión</div>
              <div className="w-[30%] text-center">Balances</div>
              <div className="w-[15%] text-right">Acciones</div>
            </div>
            <div className="divide-y divide-white/10">
              {getPaginatedUsers().map((userItem) => (
                <div key={userItem.id || userItem._id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="w-[30%] flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center font-bold text-white shadow-lg">{userItem.username.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="text-dark-100 font-semibold">{userItem.username}</div>
                        <div className="text-xs text-dark-400">{userItem.email}</div>
                      </div>
                    </div>
                    <div className="w-[15%] text-center">
                      <span className={`badge ${userItem.role === 'admin' ? 'badge-primary' : 'badge-success'}`}>{userItem.role === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                    </div>
                    <div className="w-[10%] text-center text-primary-400 font-medium">{userItem.comision || 0}%</div>
                    <div className="w-[30%] flex justify-center space-x-2 text-center">
                        <div className="px-2 py-1 bg-primary-500/10 rounded border border-primary-500/20 text-xs text-primary-300 font-mono">ARS: {formatCurrencyFullJSX(userItem.balance?.ars || 0, 'ARS')}</div>
                        <div className="px-2 py-1 bg-success-500/10 rounded border border-success-500/20 text-xs text-success-300 font-mono">USD: {formatCurrencyFullJSX(userItem.balance?.usd || 0, 'USD')}</div>
                    </div>
                    <div className="w-[15%] text-right space-x-2 flex items-center justify-end">
                    {user?.isSuper && (
                      <button 
                          onClick={async () => {
                            const res = await impersonate(userItem._id || userItem.id);
                            if (res.success) window.location.href = '/dashboard';
                            else alert(res.message);
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white transition-all duration-200 group"
                          title="Switch user"
                        >
                          <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          <span className="text-[11px] font-bold uppercase tracking-wider">Sw</span>
                        </button>
                    )}
{/* BOTÓN: EDITAR */}
<button 
  onClick={() => setEditingUser(userItem)} 
  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white transition-all duration-200 group"
  title="Editar Usuario"
>
  <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
  <span className="text-[11px] font-bold uppercase tracking-wider">Editar</span>
</button> 

{/* BOTÓN: BORRAR */}
<button 
  onClick={() => handleDeleteUser(userItem.id || userItem._id)} 
  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-error-500/10 border border-error-500/20 text-error-400 hover:bg-error-500 hover:text-white transition-all duration-200 group"
  title="Borrar Usuario"
>
  <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
  <span className="text-[11px] font-bold uppercase tracking-wider">Borrar</span>
</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* CONTROLES DE PAGINACIÓN Y FILAS */}
            <div className="px-6 py-4 bg-dark-700/30 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-xs text-dark-400 font-medium uppercase tracking-wider">Mostrar:</span>
                <select 
                  value={rowsPerPage} 
                  onChange={(e) => handleRowsPerPageChange(e.target.value)}
                  className="bg-dark-800 border border-white/10 text-dark-100 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-primary-500 transition-colors"
                >
                  {[5, 10, 20, 50, 100].map(val => (
                    <option key={val} value={val}>{val} usuarios</option>
                  ))}
                </select>
                <span className="text-xs text-dark-400">de {totalUsers} usuarios totales</span>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-dark-800 border border-white/10 text-dark-100 hover:bg-primary-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-xs font-bold text-primary-400 px-4">Página {currentPage} de {getTotalPages()}</span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                  disabled={currentPage === getTotalPages() || getTotalPages() === 0}
                  className="p-2 rounded-lg bg-dark-800 border border-white/10 text-dark-100 hover:bg-primary-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="mb-12">
          <h3 className="text-3xl font-bold text-dark-100 mb-8 flex items-center">
            <div className="icon-container bg-accent-500 mr-4"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            Actividad Reciente
          </h3>
          <div className="card overflow-hidden divide-y divide-white/10">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5">
                <div className="flex items-center space-x-4">
                  <div className="icon-container bg-primary-500/20 text-primary-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                  <div><p className="text-sm font-medium text-dark-100">{activity.user}</p><p className="text-xs text-dark-400">{activity.action}</p></div>
                </div>
                <div className="text-xs text-dark-500">{new Date(activity.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuración y Mantenimiento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="card p-6">
            <h4 className="text-xl font-bold text-dark-100 mb-6 flex items-center"><svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7" /></svg> Base de Datos</h4>
            <button onClick={handleBackupDatabase} disabled={systemLoading} className="w-full btn-secondary py-3 flex items-center justify-center space-x-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8" /></svg> <span>Respaldar DB</span></button>
          </div>
          <div className="card p-6">
            <h4 className="text-xl font-bold text-dark-100 mb-6 flex items-center"><svg className="w-5 h-5 mr-2 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4" /></svg> Mantenimiento</h4>
            <div className="space-y-3">
              <button onClick={handleSystemHealthCheck} disabled={systemLoading} className="w-full btn-secondary py-3">Chequeo de Salud</button>
              <button onClick={handleClearCache} disabled={systemLoading} className="w-full btn-secondary py-3">Limpiar Caché</button>
            </div>
          </div>
        </div>

        {/* Reporte de Salud Detallado */}
        {systemHealth && (
          <div className="card-glass p-8 mb-12 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-2xl font-bold text-success-400">Reporte de Salud</h4>
              <button onClick={() => setSystemHealth(null)} className="text-dark-400 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-dark-800 rounded-xl border border-white/5"><p className="text-xs text-dark-400 uppercase font-bold mb-1">Base de Datos</p><p className="text-lg text-success-400">{systemHealth.database.status}</p></div>
              <div className="p-4 bg-dark-800 rounded-xl border border-white/5"><p className="text-xs text-dark-400 uppercase font-bold mb-1">Memoria en Uso</p><p className="text-lg text-dark-100">{Math.round(systemHealth.system.memory.used / 1024 / 1024)} MB</p></div>
              <div className="p-4 bg-dark-800 rounded-xl border border-white/5"><p className="text-xs text-dark-400 uppercase font-bold mb-1">Uptime</p><p className="text-lg text-dark-100">{Math.floor(systemHealth.system.uptime / 3600)} horas</p></div>
            </div>
          </div>
        )}

        {/* MODAL modularizado */}
        {editingUser && (
          <EditUserModal 
            user={editingUser} 
            onClose={() => setEditingUser(null)} 
            onUpdate={fetchUsers} 
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
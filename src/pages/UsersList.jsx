import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useSystemStats } from '../contexts/SystemStatsContext';
import DatabaseValue from '../components/DatabaseValue';

const UsersList = () => {
  const navigate = useNavigate();
  const { refreshStats } = useSystemStats();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const roleOptions = [
    { value: '', label: 'Todos los Roles' },
    { value: 'admin', label: 'Administrador' },
    { value: 'seller', label: 'Vendedor' }
  ];

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Carga inicial
  useEffect(() => {
    fetchUsers(true);
  }, []);

  // Efecto para búsqueda y filtros
  useEffect(() => {
    fetchUsers(false);
  }, [currentPage, debouncedSearchTerm, roleFilter]);

  const fetchUsers = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }

      if (roleFilter) {
        params.append('role', roleFilter);
      }

      const response = await api.get(`/api/users?${params}`);

      if (response.data.success) {
        setUsers(response.data.data.users);
        setTotalPages(response.data.data.pages || 1);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al obtener usuarios');
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, roleFilter]);

  const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`¿Estás seguro de que querés eliminar al usuario "${username}"? Esta acción no se puede deshacer.`)) {
      try {
        await api.delete(`/api/users/${userId}`);
        fetchUsers();
        refreshStats();
        setError('');
      } catch (error) {
        setError(error.response?.data?.message || 'Error al eliminar usuario');
      }
    }
  };

  const handleEditUser = (userId) => {
    navigate(`/users/${userId}/edit`);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary-200 border-t-primary-500"></div>
          </div>
          <p className="text-dark-300 text-lg font-medium ml-4">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl font-bold gradient-text mb-6 font-poppins">
            Gestión de Usuarios
          </h1>
          <p className="text-xl text-dark-300 max-w-3xl mx-auto mb-8">
            Administración de cuentas, roles y permisos del sistema
          </p>
        </div>

        {/* Mensaje de Error */}
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

        {/* Búsqueda y Filtros */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-dark-200 mb-2">
                Buscar Usuarios
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre, email o usuario..."
                  className="input-field pl-10"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-200 mb-2">
                Filtrar por Rol
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input-field"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Usuarios */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-lg font-medium text-dark-100">Usuarios del Sistema</h3>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="text-xs text-primary-400 hover:text-white transition-colors uppercase tracking-widest font-bold"
            >
              ← Volver al Panel
            </button>
          </div>

          {searchLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-500"></div>
              <span className="ml-3 text-dark-300">Buscando...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-dark-100 mb-2">No se encontraron usuarios</h3>
              <p className="text-dark-300">
                {searchTerm || roleFilter ? 'Intentá ajustando los criterios de búsqueda.' : 'No hay usuarios registrados.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {users.map((user) => (
                <div key={user._id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg text-lg font-bold text-white">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
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

                    <div className="flex items-center space-x-4">
                      <span className={`badge ${
                        user.role === 'admin' 
                          ? 'badge-primary' 
                          : 'badge-success'
                      }`}>
                        {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                      </span>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditUser(user._id)}
                          className="btn-primary text-sm px-3 py-1"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user._id, user.username)}
                          className="btn-error text-sm px-3 py-1"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-sm text-dark-300">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersList;
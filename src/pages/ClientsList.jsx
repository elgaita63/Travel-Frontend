import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import DatabaseValue from '../components/DatabaseValue';
import { useAuth } from '../contexts/AuthContext';
import { downloadClientsCsv, downloadClientsXlsx } from '../utils/exportClients';

const EXPORT_PAGE_SIZE = 200;

const ClientsList = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalClients, setTotalClients] = useState(0);

  // Super assisted delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [salesCheckLoading, setSalesCheckLoading] = useState(false);
  const [salesCount, setSalesCount] = useState(null);
  const [replaceSearch, setReplaceSearch] = useState('');
  const [replaceOptions, setReplaceOptions] = useState([]);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replaceClientId, setReplaceClientId] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [basicDeleteModalOpen, setBasicDeleteModalOpen] = useState(false);
  const [basicDeleteTarget, setBasicDeleteTarget] = useState(null);
  const [basicDeleteBusy, setBasicDeleteBusy] = useState(false);
  const [basicSalesCheckLoading, setBasicSalesCheckLoading] = useState(false);
  const [basicSalesCount, setBasicSalesCount] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    setSalesCheckLoading(false);
    setSalesCount(null);
    setReplaceSearch('');
    setReplaceOptions([]);
    setReplaceLoading(false);
    setReplaceClientId('');
    setDeleteBusy(false);
  };

  const closeBasicDeleteModal = () => {
    setBasicDeleteModalOpen(false);
    setBasicDeleteTarget(null);
    setBasicDeleteBusy(false);
    setBasicSalesCheckLoading(false);
    setBasicSalesCount(null);
  };

  useEffect(() => {
    if (!basicDeleteModalOpen) return;
    if (!basicDeleteTarget?._id && !basicDeleteTarget?.id) return;
    if (!basicDeleteTarget?.isMainClient) return;

    const run = async () => {
      const rowId = basicDeleteTarget._id || basicDeleteTarget.id;
      setBasicSalesCheckLoading(true);
      setBasicSalesCount(null);
      try {
        const r = await api.get(`/api/clients/${rowId}/sales-count`);
        const c = r.data?.data?.salesCount ?? 0;
        setBasicSalesCount(c);
      } catch (e) {
        console.error('Error checking sales count (basic):', e);
        setError(e.response?.data?.message || 'Error al verificar ventas asociadas.');
        setBasicSalesCount(null);
      } finally {
        setBasicSalesCheckLoading(false);
      }
    };

    run();
  }, [basicDeleteModalOpen, basicDeleteTarget]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Initial load effect
  useEffect(() => {
    fetchClients(true);
  }, []);

  // Search and pagination effect
  useEffect(() => {
    // Always fetch clients when search term, page, or rows per page changes
    // This ensures that clearing the search (empty string) also triggers a fetch
    fetchClients(false);
  }, [currentPage, debouncedSearchTerm, rowsPerPage]);

  useEffect(() => {
    if (!deleteModalOpen) return;
    if (!deleteTarget?._id && !deleteTarget?.id) return;
    if (!user?.isSuper) return;
    if (!deleteTarget?.isMainClient) return;

    const run = async () => {
      const rowId = deleteTarget._id || deleteTarget.id;
      setSalesCheckLoading(true);
      setSalesCount(null);
      try {
        const r = await api.get(`/api/clients/${rowId}/sales-count`);
        const c = r.data?.data?.salesCount ?? 0;
        setSalesCount(c);
      } catch (e) {
        console.error('Error checking sales count:', e);
        setError(e.response?.data?.message || 'Error al verificar ventas asociadas.');
        setSalesCount(null);
      } finally {
        setSalesCheckLoading(false);
      }
    };

    run();
  }, [deleteModalOpen, deleteTarget, user?.isSuper]);

  useEffect(() => {
    if (!deleteModalOpen) return;
    if (!user?.isSuper) return;
    if (!deleteTarget?.isMainClient) return;
    if (!salesCount || salesCount <= 0) return;

    const run = async () => {
      setReplaceLoading(true);
      try {
        const r = await api.get('/api/clients', {
          params: {
            page: 1,
            limit: 20,
            isMainClient: true,
            search: replaceSearch || ''
          }
        });
        const list = r.data?.data?.clients || [];
        const oldId = deleteTarget._id || deleteTarget.id;
        setReplaceOptions(list.filter((c) => String(c._id || c.id) !== String(oldId)));
      } catch (e) {
        console.error('Error loading replacement clients:', e);
        setError(e.response?.data?.message || 'Error al cargar clientes para reemplazo.');
        setReplaceOptions([]);
      } finally {
        setReplaceLoading(false);
      }
    };

    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [deleteModalOpen, user?.isSuper, deleteTarget, salesCount, replaceSearch]);

  const fetchClients = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }
      
      const response = await api.get('/api/clients/all-passengers', {
        params: {
          page: currentPage,
          limit: rowsPerPage,
          search: debouncedSearchTerm,
          type: 'all'
        }
      });
      setClients(response.data.data.passengers || []);
      setTotalClients(response.data.data.total || 0);
      setTotalPages(response.data.data.pages || 1);
      setError('');
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Error al cargar los pasajeros. Por favor, intentá de nuevo.');
      setClients([]);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setSearchLoading(false);
      }
    }
  }, [currentPage, debouncedSearchTerm, rowsPerPage]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const fetchAllPassengersForExport = useCallback(async () => {
    const search = debouncedSearchTerm;
    const params = new URLSearchParams({
      page: '1',
      limit: String(EXPORT_PAGE_SIZE),
      search,
      type: 'all'
    });
    const first = await api.get(`/api/clients/all-passengers?${params}`);
    if (!first.data.success) {
      throw new Error(first.data.message || 'No se pudieron obtener los pasajeros');
    }
    const { pages } = first.data.data;
    let all = [...(first.data.data.passengers || [])];
    for (let page = 2; page <= pages; page++) {
      const p = new URLSearchParams({
        page: String(page),
        limit: String(EXPORT_PAGE_SIZE),
        search,
        type: 'all'
      });
      const r = await api.get(`/api/clients/all-passengers?${p}`);
      if (r.data.success) {
        all = all.concat(r.data.data.passengers || []);
      }
    }
    return all;
  }, [debouncedSearchTerm]);

  const handleExportClientsCsv = async () => {
    setExportBusy(true);
    try {
      const all = await fetchAllPassengersForExport();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadClientsCsv(`pasajeros-${stamp}.csv`, all);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || e.message || 'No se pudo exportar');
    } finally {
      setExportBusy(false);
    }
  };

  const handleExportClientsXlsx = async () => {
    setExportBusy(true);
    try {
      const all = await fetchAllPassengersForExport();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadClientsXlsx(`pasajeros-${stamp}.xlsx`, all);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || e.message || 'No se pudo exportar');
    } finally {
      setExportBusy(false);
    }
  };

  const handleClientClick = (clientId, client) => {
    // If it's a companion (Passenger record), navigate to the main client's details
    if (client && client.relationshipType === 'companion' && client.clientId) {
      navigate(`/clients/${client.clientId._id || client.clientId}`);
    } else {
      // If it's a main client, navigate to its details
      navigate(`/clients/${clientId}`);
    }
  };

  const handlePromoteCompanion = async (clientId) => {
    try {
      const response = await api.post(`/api/clients/${clientId}/promote`);
      if (response.data.success) {
        // Refresh the list
        fetchClients(false);
        setError(''); // Clear any previous errors
      }
    } catch (error) {
      console.error('Error promoting companion:', error);
      const errorMessage = error.response?.data?.message || 'Error al promover al acompañante. Por favor, intentá de nuevo.';
      setError(errorMessage);
    }
  };

  const handleDeletePassengerRow = async (row) => {
    if (!isAdmin) return;
    const rowId = row?._id || row?.id;
    if (!rowId) return;

    const isMain = !!row.isMainClient;
    const label = `${row.name || 'Pasajero'} ${row.surname || ''}`.trim();
    // Super: flujo asistido para titulares (chequeo de ventas + opción de reemplazo)
    if (user?.isSuper && isMain) {
      setError('');
      setDeleteTarget(row);
      setDeleteModalOpen(true);
      return;
    }

    // Admin (no-super) / companion: confirmación profesional via modal propio
    setError('');
    setBasicDeleteTarget(row);
    setBasicDeleteModalOpen(true);
  };

  const confirmBasicDelete = async () => {
    if (!basicDeleteTarget) return;
    const rowId = basicDeleteTarget._id || basicDeleteTarget.id;
    if (!rowId) return;
    const isMain = !!basicDeleteTarget.isMainClient;

    if (isMain && (basicSalesCount || 0) > 0) {
      setError('Este titular tiene ventas asociadas. Solo SUPERID puede reasignarlas y eliminar el cliente.');
      return;
    }

    try {
      setBasicDeleteBusy(true);
      setError('');
      if (isMain) {
        await api.delete(`/api/clients/${rowId}`);
      } else {
        await api.delete(`/api/passengers/${rowId}`);
      }
      closeBasicDeleteModal();
      fetchClients(false);
    } catch (err) {
      console.error('Error deleting passenger row:', err);
      setError(err.response?.data?.message || 'Error al eliminar el pasajero. Por favor, intentá de nuevo.');
    } finally {
      setBasicDeleteBusy(false);
    }
  };

  const confirmSuperDelete = async () => {
    if (!deleteTarget) return;
    const rowId = deleteTarget._id || deleteTarget.id;
    try {
      setDeleteBusy(true);
      setError('');

      if (!deleteTarget.isMainClient) {
        await api.delete(`/api/passengers/${rowId}`);
        closeDeleteModal();
        fetchClients(false);
        return;
      }

      if (!salesCount || salesCount <= 0) {
        await api.delete(`/api/clients/${rowId}`);
        closeDeleteModal();
        fetchClients(false);
        return;
      }

      if (!replaceClientId) {
        setError('Seleccioná un cliente reemplazo para reasignar las ventas antes de borrar.');
        return;
      }

      await api.post(`/api/clients/${rowId}/replace-in-sales`, { newClientId: replaceClientId });
      await api.delete(`/api/clients/${rowId}`);
      closeDeleteModal();
      fetchClients(false);
    } catch (e) {
      console.error('Super delete flow failed:', e);
      setError(e.response?.data?.message || 'Error en el proceso de borrado asistido.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
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
        <p className="text-dark-300 text-lg font-medium ml-4">Cargando pasajeros...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-12">
        {basicDeleteModalOpen && basicDeleteTarget && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-white/10 rounded-xl shadow-2xl w-full max-w-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-dark-100">Confirmar eliminación</h3>
                  <p className="text-sm text-dark-400 mt-1">
                    {basicDeleteTarget.isMainClient ? 'Pasajero titular' : 'Acompañante'}:{' '}
                    <span className="text-dark-200 font-medium">
                      {basicDeleteTarget.name} {basicDeleteTarget.surname}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeBasicDeleteModal}
                  className="text-dark-400 hover:text-dark-200"
                  disabled={basicDeleteBusy}
                  title="Cerrar"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="text-sm text-red-200 font-semibold">Esta acción no se puede deshacer</div>
                <p className="text-sm text-red-200/90 mt-1">
                  Se eliminará el registro seleccionado del sistema.
                </p>
              </div>

              {basicDeleteTarget.isMainClient && (
                <div className="mt-4 bg-dark-900/30 border border-white/10 rounded-lg p-4">
                  <div className="text-sm text-dark-200 font-medium mb-1">Verificación de ventas asociadas</div>
                  {basicSalesCheckLoading ? (
                    <div className="flex items-center gap-2 text-sm text-dark-300">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-200 border-t-primary-500"></div>
                      Buscando ventas…
                    </div>
                  ) : basicSalesCount != null ? (
                    <div className="text-sm text-dark-300">
                      Resultado: <span className="font-semibold text-dark-100">{basicSalesCount}</span> venta(s) asociada(s).
                    </div>
                  ) : (
                    <div className="text-sm text-dark-400">No se pudo verificar ventas.</div>
                  )}
                </div>
              )}

              {basicDeleteTarget.isMainClient && !basicSalesCheckLoading && (basicSalesCount || 0) > 0 && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="text-sm text-red-200 font-semibold">No se puede eliminar</div>
                  <p className="text-sm text-red-200/90 mt-1">
                    Este titular tiene ventas asociadas. Para evitar ventas huérfanas, solo SUPERID puede reasignarlas y eliminar el cliente.
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeBasicDeleteModal}
                  className="px-4 py-2 text-sm font-medium text-dark-300 bg-dark-700/50 border border-white/10 rounded-md"
                  disabled={basicDeleteBusy}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmBasicDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                  disabled={basicDeleteBusy || (basicDeleteTarget.isMainClient && !basicSalesCheckLoading && (basicSalesCount || 0) > 0)}
                >
                  {basicDeleteBusy ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteModalOpen && deleteTarget && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-dark-100">Borrado asistido (SUPERID)</h3>
                  <p className="text-sm text-dark-400 mt-1">
                    {deleteTarget.isMainClient ? 'Pasajero titular' : 'Acompañante'}:{' '}
                    <span className="text-dark-200 font-medium">
                      {deleteTarget.name} {deleteTarget.surname}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="text-dark-400 hover:text-dark-200"
                  disabled={deleteBusy || salesCheckLoading}
                  title="Cerrar"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {deleteTarget.isMainClient ? (
                  <div className="bg-dark-900/30 border border-white/10 rounded-lg p-4">
                    <div className="text-sm text-dark-200 font-medium mb-1">Verificación de ventas asociadas</div>
                    {salesCheckLoading ? (
                      <div className="flex items-center gap-2 text-sm text-dark-300">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-200 border-t-primary-500"></div>
                        Buscando ventas…
                      </div>
                    ) : salesCount != null ? (
                      <div className="text-sm text-dark-300">
                        Resultado: <span className="font-semibold text-dark-100">{salesCount}</span> venta(s) asociada(s).
                      </div>
                    ) : (
                      <div className="text-sm text-dark-400">No se pudo verificar ventas.</div>
                    )}
                  </div>
                ) : (
                  <div className="bg-dark-900/30 border border-white/10 rounded-lg p-4 text-sm text-dark-300">
                    Este registro es un acompañante. Se puede eliminar directamente.
                  </div>
                )}

                {deleteTarget.isMainClient && !salesCheckLoading && (salesCount || 0) > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="text-sm text-red-200 font-semibold">Atención</div>
                    <p className="text-sm text-red-200/90 mt-1">
                      Este titular está asociado a ventas. Para borrarlo, primero debés reasignar esas ventas a otro titular.
                    </p>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-dark-200 mb-2">Buscar titular reemplazo</label>
                        <input
                          type="text"
                          value={replaceSearch}
                          onChange={(e) => setReplaceSearch(e.target.value)}
                          className="input-field"
                          placeholder="Nombre, apellido o DNI…"
                          disabled={replaceLoading || deleteBusy}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-dark-200 mb-2">Titular reemplazo</label>
                        <select
                          value={replaceClientId}
                          onChange={(e) => setReplaceClientId(e.target.value)}
                          className="input-field"
                          disabled={replaceLoading || deleteBusy}
                        >
                          <option value="">Seleccionar…</option>
                          {replaceOptions.map((c) => (
                            <option key={c._id} value={c._id}>
                              {(c.name || '').trim()} {(c.surname || '').trim()} {c.dni ? `— ${c.dni}` : ''}
                            </option>
                          ))}
                        </select>
                        {replaceLoading && <div className="text-xs text-dark-400 mt-2">Cargando…</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="px-4 py-2 text-sm font-medium text-dark-300 bg-dark-700/50 border border-white/10 rounded-md"
                  disabled={deleteBusy}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmSuperDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                  disabled={
                    deleteBusy ||
                    (deleteTarget.isMainClient && salesCheckLoading) ||
                    (deleteTarget.isMainClient && (salesCount || 0) > 0 && !replaceClientId)
                  }
                >
                  {deleteBusy ? 'Procesando…' : (deleteTarget.isMainClient && (salesCount || 0) > 0 ? 'Reasignar y eliminar' : 'Eliminar')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modern Header */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl font-bold gradient-text mb-6 font-poppins">
            Gestión de Pasajeros
          </h1>
          <p className="text-L text-dark-300 max-w-3xl mx-auto">
            Administrá los registros de tus pasajeros, su información y toda la documentación de viaje.
          </p>
        </div>

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

        {/* Modern Search Section */}
        <div className="card-glass p-6">
          {searchLoading && (
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-200 border-t-primary-500 mr-2"></div>
              <span className="text-sm text-dark-300">Buscando...</span>
            </div>
          )}
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              {/* Search Input */}
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-semibold text-dark-200 mb-4">
                  Buscar Pasajeros
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={handleSearch}
                    placeholder="Buscar por nombre, DNI/CUIT, email o pasaporte..."
                    className="input-field pl-12"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Add New Client Button */}
              <div className="lg:ml-6 flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <button
                  onClick={() => navigate('/clients/new')}
                  className="btn-primary w-full lg:w-auto"
                >
                  <span className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Agregar pasajero titular</span>
                  </span>
                </button>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-dark-400 max-w-xl">
                Exportar todos los pasajeros que coinciden con la búsqueda actual (titulares y acompañantes), no solo esta página.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={exportBusy}
                  onClick={handleExportClientsCsv}
                  className="btn-secondary text-sm px-3 py-1.5 border-white/15"
                >
                  {exportBusy ? 'Exportando…' : 'CSV'}
                </button>
                <button
                  type="button"
                  disabled={exportBusy}
                  onClick={handleExportClientsXlsx}
                  className="btn-secondary text-sm px-3 py-1.5 border-primary-500/40 text-primary-300"
                >
                  {exportBusy ? 'Exportando…' : 'Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
                <h4 className="text-lg font-medium text-dark-100">Lista de Pasajeros</h4>
                <span className="text-sm text-dark-400 font-normal">
                  Clickear sobre el pasajero para ver detalles
                </span>
              </div>
            </div>
          </div>

          {clients.length === 0 ? (
            <div className="py-20 px-6">
              <div className="flex items-center justify-center mb-6">
                <div className="icon-container bg-accent-500 mr-4">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-semibold text-dark-100">
                  {searchTerm ? 'No se encontraron pasajeros' : 'Todavía no hay pasajeros'}
                </h3>
              </div>
              <div className="text-center">
                <p className="text-dark-300 mb-8 max-w-md mx-auto text-lg">
                  {searchTerm 
                    ? 'Intentá cambiar los términos de búsqueda o borrala para ver a todos los pasajeros.' 
                    : 'Empezá agregando tu primer pasajero para comenzar a gestionar los viajes.'
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => navigate('/clients/new')}
                    className="btn-primary"
                  >
                    Agregar primer pasajero titular
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-white/10">
                {clients.map((client) => (
                  <div
                    key={client._id || client.id}
                    role="button"
                    tabIndex={0}
                    className="px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => handleClientClick(client._id || client.id, client)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClientClick(client._id || client.id, client);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg">
                          <DatabaseValue data-field="passengerInitial" className="text-lg font-bold text-white">
                            {client.name?.charAt(0).toUpperCase() || 'C'}
                          </DatabaseValue>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-dark-100">
                            {client.name || 'Pasajero Desconocido'} {client.surname || ''}
                            {!client.isMainClient && (
                              <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                Acompañante
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-dark-300">
                            DNI: {client.dni || 'Sin DNI'} | {client.email || 'Sin email'}
                          </div>
                          <div className="text-xs text-dark-400">
                            Tel: {client.phone || 'Sin teléfono'} | Pasaporte: {client.passportNumber || 'Sin pasaporte'}
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center space-x-4"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <span className={`badge ${client.status === 'active' || !client.status
                            ? 'badge-success'
                            : 'badge-warning'
                          }`}>
                          {client.status === 'active' || !client.status ? 'Activo' : client.status}
                        </span>

                        <div className="flex space-x-2">
                          {!client.isMainClient && (
                            <button
                              type="button"
                              onClick={() => handlePromoteCompanion(client._id || client.id)}
                              className="btn-secondary text-sm"
                              title="Promover a Pasajero Titular"
                            >
                              <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                </svg>
                                <span>Promover</span>
                              </span>
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePassengerRow(client);
                              }}
                              className="btn-secondary text-sm text-red-300 hover:text-red-200 border border-red-500/30 hover:border-red-500/50 bg-red-500/10 hover:bg-red-500/15"
                              title="Eliminar (solo administración)"
                            >
                              <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m-4 0h14" />
                                </svg>
                                <span>Eliminar</span>
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {totalClients > 0 && (
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
                      Mostrando {((currentPage - 1) * rowsPerPage) + 1} a {Math.min(currentPage * rowsPerPage, totalClients)} de {totalClients} pasajeros
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
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="btn-secondary text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientsList;
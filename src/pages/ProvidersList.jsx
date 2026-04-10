import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import ProviderImportModal from '../components/ProviderImportModal';
import { downloadProvidersCsv, downloadProvidersXlsx } from '../utils/exportProviders';

const EXPORT_PAGE_SIZE = 500;

const ProvidersList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchProviders(true);
    isInitialLoad.current = false;
  }, []);

  useEffect(() => {
    if (!isInitialLoad.current) {
      fetchProviders(false);
    }
  }, [currentPage, debouncedSearchTerm, rowsPerPage]);


  const fetchProviders = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearchTerm
      });

      const response = await api.get(`/api/providers?${params}`);

      if (response.data.success) {
        setProviders(response.data.data.providers);
        setTotalPages(response.data.data.pages);
        setError('');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'No se pudieron cargar los proveedores');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [currentPage, debouncedSearchTerm, rowsPerPage]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };


  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  const handleProviderClick = (providerId) => {
    navigate(`/providers/${providerId}`);
  };

  const fetchAllProvidersForExport = useCallback(async () => {
    const search = debouncedSearchTerm;
    const first = await api.get(
      `/api/providers?page=1&limit=${EXPORT_PAGE_SIZE}&search=${encodeURIComponent(search)}`
    );
    if (!first.data.success) {
      throw new Error(first.data.message || 'No se pudieron obtener los proveedores');
    }
    const { pages } = first.data.data;
    let all = [...first.data.data.providers];
    for (let page = 2; page <= pages; page++) {
      const r = await api.get(
        `/api/providers?page=${page}&limit=${EXPORT_PAGE_SIZE}&search=${encodeURIComponent(search)}`
      );
      if (r.data.success) {
        all = all.concat(r.data.data.providers);
      }
    }
    return all;
  }, [debouncedSearchTerm]);

  const handleExportCsv = async () => {
    setExportBusy(true);
    try {
      const all = await fetchAllProvidersForExport();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadProvidersCsv(`proveedores-${stamp}.csv`, all);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || e.message || 'No se pudo exportar');
    } finally {
      setExportBusy(false);
    }
  };

  const handleExportXlsx = async () => {
    setExportBusy(true);
    try {
      const all = await fetchAllProvidersForExport();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadProvidersXlsx(`proveedores-${stamp}.xlsx`, all);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || e.message || 'No se pudo exportar');
    } finally {
      setExportBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary-200 border-t-primary-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="icon-container">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
        <p className="text-dark-300 text-lg font-medium ml-4">Cargando proveedores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-12">
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl font-bold gradient-text mb-6 font-poppins">
            Proveedores
          </h1>
          <p className="text-xl text-dark-300 max-w-3xl mx-auto mb-8">
            Gestioná proveedores de servicios y su información de contacto
          </p>
          </div>
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

        <div className="card-glass p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-semibold text-dark-200 mb-4">
                Buscar proveedores
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Nombre, email o teléfono..."
                className="input-field"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => navigate('/providers/new')}
                className="btn-primary w-full"
                style={{height: "52px"}}
              >
                Nuevo proveedor
              </button>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-dark-400 max-w-xl">
              Exportar todos los proveedores que coinciden con la búsqueda actual (no solo esta página).
            </p>
            <div className="flex flex-wrap gap-2">
              {user?.isSuper && (
                <button
                  type="button"
                  onClick={() => setImportModalOpen(true)}
                  className="btn-secondary text-sm px-3 py-1.5 border-primary-500/40 text-primary-300"
                >
                  Importar con IA
                </button>
              )}
              <button
                type="button"
                disabled={exportBusy}
                onClick={handleExportCsv}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
              >
                {exportBusy ? 'Exportando…' : 'CSV'}
              </button>
              <button
                type="button"
                disabled={exportBusy}
                onClick={handleExportXlsx}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
              >
                {exportBusy ? 'Exportando…' : 'Excel (.xlsx)'}
              </button>
            </div>
          </div>
        </div>

        <ProviderImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImported={() => fetchProviders(false)}
        />

        <div className="card overflow-hidden" style={{marginTop: "50px"}}>
          {providers.length === 0 ? (
            <div className="py-20 px-6">
              <div className="flex items-center justify-center mb-6">
                <div className="icon-container bg-primary-500 mr-4">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-3xl font-semibold text-dark-100">
                  {searchTerm ? 'No hay resultados' : 'Todavía no hay proveedores'}
                </h3>
              </div>
              <div className="text-center">
                <p className="text-dark-300 mb-8 max-w-md mx-auto text-lg">
                  {searchTerm ? 'Probá con otros términos de búsqueda' : 'Agregá el primer proveedor para empezar'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => navigate('/providers/new')}
                    className="btn-primary"
                  >
                    Agregar primer proveedor
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-hidden">
                <table className="w-full divide-y divide-white/10">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider w-1/5">
                        Proveedor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider w-1/5">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider w-1/6">
                        Teléfono
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider w-1/4">
                        Dirección
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider w-1/6">
                        Alta
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {providers.map((provider, index) => (
                      <tr
                        key={provider.id || provider._id || index}
                        onClick={() => handleProviderClick(provider.id || provider._id)}
                        className="table-row cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-dark-100">
                            {provider.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-dark-100">{provider.contactInfo?.email || 'Sin email'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-dark-100">{provider.contactInfo?.phone || 'Sin teléfono'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-dark-100 max-w-48 truncate">
                            {provider.contactInfo?.address ? 
                              `${provider.contactInfo.address.street || ''}, ${provider.contactInfo.address.city || ''}, ${provider.contactInfo.address.state || ''} ${provider.contactInfo.address.zipCode || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',') :
                              'Sin dirección'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-400">
                          {new Date(provider.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-dark-700 px-4 py-3 flex items-center justify-between border-t border-white/10 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-md text-dark-200 bg-dark-600 hover:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-md text-dark-200 bg-dark-600 hover:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div className="flex items-center space-x-6">
                    <p className="text-sm text-dark-300">
                      Página <span className="font-medium text-dark-100">{currentPage}</span> de{' '}
                      <span className="font-medium text-dark-100">{totalPages}</span>
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-dark-300">Filas por página:</span>
                      <div className="flex space-x-1">
                        {[5, 10, 20].map((count) => (
                          <button
                            key={count}
                            onClick={() => handleRowsPerPageChange(count)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              rowsPerPage === count
                                ? 'bg-primary-500 text-white'
                                : 'bg-dark-600 text-dark-200 hover:bg-dark-500'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-white/20 bg-dark-600 text-sm font-medium text-dark-300 hover:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-white/20 bg-dark-600 text-sm font-medium text-dark-300 hover:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
  );
};

export default ProvidersList;

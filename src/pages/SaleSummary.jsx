import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import PaymentsTable from '../components/PaymentsTable';
import ProfitChart from '../components/ProfitChart';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';
import CurrencyDisplay from '../components/CurrencyDisplay';
import { formatCurrencyCompact, formatWithWarning, formatCurrencyFull, getCurrencySymbol } from '../utils/formatNumbers';
import { formatDateOnlyLocal } from '../utils/dateDisplay';

// Component for individual provider cards with expandable details
const ProviderCard = ({ provider, serviceIndex, providerIndex, saleCurrency = 'USD' }) => {
  const [providerDetails, setProviderDetails] = useState(provider);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [errorProvider, setErrorProvider] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    const setupProviderDetails = () => {
      // Debug: Log the provider data to understand the structure
      console.log('ProviderCard - Raw provider data:', provider);
      console.log('ProviderCard - Provider keys:', Object.keys(provider));

      // Use populated provider data directly if available
      let providerName = 'Proveedor Desconocido';

      if (provider.providerId && typeof provider.providerId === 'object') {
        // Provider is populated from database (from providers array structure)
        providerName = provider.providerId.name || provider.providerId.destino || 'Proveedor Desconocido';
      } else if (provider.name) {
        // Provider name is directly available (already extracted)
        providerName = provider.name;
      } else if (typeof provider === 'object' && provider._id) {
        // Provider object might have name directly
        providerName = provider.name || 'Proveedor Desconocido';
      }

      // Extract documents - check multiple possible locations
      let documents = [];
      if (provider.documents && provider.documents.length > 0) {
        documents = provider.documents;
      } else if (provider.allDocuments && provider.allDocuments.length > 0) {
        documents = provider.allDocuments;
      }
      
      const providerDetails = {
        name: providerName,
        costProvider: provider.costProvider !== undefined && provider.costProvider !== null ? provider.costProvider : null,
        currency: provider.currency || saleCurrency,
        startDate: provider.startDate || provider.serviceDates?.startDate || null,
        endDate: provider.endDate || provider.serviceDates?.endDate || null,
        documents: documents
      };

      console.log('ProviderCard - Processed provider details:', providerDetails);
      console.log('ProviderCard - Cost provider value:', provider.costProvider);
      console.log('ProviderCard - Start date:', provider.startDate);
      console.log('ProviderCard - End date:', provider.endDate);
      console.log('ProviderCard - Documents:', provider.documents);
      setProviderDetails(providerDetails);
      setLoadingProvider(false);
    };

    setupProviderDetails();
  }, [provider, saleCurrency]);

  if (loadingProvider) return <p className="text-dark-300">Cargando proveedor...</p>;
  if (errorProvider) return <ErrorDisplay message={errorProvider} />;

  // File handling functions
  const handleOpenFile = (file) => {
    try {
      console.log('🔍 Attempting to open file:', {
        filename: file.filename || file.name,
        hasUrl: !!(file.url && file.url.trim() !== ''),
        hasFileObject: !!(file.fileObject && file.fileObject instanceof File),
        hasFile: !!(file.file && file.file instanceof File),
        fileObjectType: typeof file.fileObject,
        fileObjectKeys: file.fileObject ? Object.keys(file.fileObject) : 'no fileObject',
        fileType: typeof file.file,
        fileKeys: file.file ? Object.keys(file.file) : 'no file',
        allFileKeys: Object.keys(file)
      });
      
      console.log('🔍 Complete file object:', file);

      // Check if file has a URL (from server)
      if (file.url && file.url.trim() !== '') {
        console.log('✅ Opening file from URL:', file.url);
        window.open(file.url, '_blank');
      return;
    }

      // Check if file has a fileObject (from upload)
      if (file.fileObject && file.fileObject instanceof File) {
        console.log('✅ Opening file from fileObject');
        const url = URL.createObjectURL(file.fileObject);
        window.open(url, '_blank');
        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      
      // Check if file has a file property (alternative structure)
      if (file.file && file.file instanceof File) {
        console.log('✅ Opening file from file property');
        const url = URL.createObjectURL(file.file);
        window.open(url, '_blank');
        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      
      // Check if fileObject exists but is not a File (might be serialized)
      if (file.fileObject && typeof file.fileObject === 'object' && Object.keys(file.fileObject).length === 0) {
        console.log('⚠️ fileObject is empty object - file was serialized and lost');
        alert('El archivo se cargó pero los datos se perdieron durante el procesamiento. Por favor, re-cargue el archivo.');
        return;
      }
      
      // Check if file has empty URL (stored in database but not served)
      if (file.url === '') {
        console.log('⚠️ File has empty URL - needs server-side file serving implementation');
        alert('El archivo está en la base de datos pero no tiene una URL de acceso.');
        return;
      }
      
      // If no valid file source found, show error
      console.log('❌ No valid file source found');
      alert('Archivo no disponible: ' + (file.filename || file.name || 'Desconocido'));
    } catch (error) {
      console.error('Error opening file:', error);
      alert('Error al abrir el archivo: ' + error.message);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewDocuments = () => {
    setShowViewModal(true);
  };

  return (
    <>
      <div className="bg-dark-800/40 rounded-xl border border-white/5 overflow-hidden transition-all hover:border-white/10">
        <div className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-dark-100 uppercase tracking-tight leading-tight">
                  {providerDetails.name}
                </h4>
                <p className="text-xs text-dark-400 font-medium mt-0.5">SERVICIO {serviceIndex + 1} • PROVEEDOR {providerIndex + 1}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleViewDocuments}
                disabled={!providerDetails.documents || providerDetails.documents.length === 0}
                className={`inline-flex items-center justify-center w-8 h-8 transition-colors rounded-full ${
                  providerDetails.documents && providerDetails.documents.length > 0
                    ? 'text-primary-400 hover:bg-primary-500/10'
                    : 'text-gray-500 cursor-not-allowed'
                }`}
                title={
                  providerDetails.documents && providerDetails.documents.length > 0
                    ? `Ver ${providerDetails.documents.length} archivo(s)`
                    : 'No hay archivos cargados'
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-dark-900/40 p-3 rounded-lg border border-white/5">
              <p className="text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Costo</p>
              <div className="text-sm font-bold text-dark-100">
                {providerDetails.costProvider !== null ? (
                  <CurrencyDisplay>{getCurrencySymbol(providerDetails.currency)}{providerDetails.costProvider.toFixed(2)}</CurrencyDisplay>
                ) : (
                  <span className="text-dark-500">No definido</span>
                )}
              </div>
            </div>
            <div className="bg-dark-900/40 p-3 rounded-lg border border-white/5">
              <p className="text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Moneda</p>
              <div className="text-sm font-bold text-dark-100">{providerDetails.currency}</div>
            </div>
          </div>

          {(providerDetails.startDate || providerDetails.endDate) && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
              {providerDetails.startDate && (
                <div>
                  <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-widest mb-1">Fecha de Inicio</label>
                  <p className="text-xs text-dark-200 font-medium">
                    {formatDateOnlyLocal(providerDetails.startDate)}
                  </p>
                </div>
              )}
              {providerDetails.endDate && (
                <div>
                  <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-widest mb-1">Fecha de Fin</label>
                  <p className="text-xs text-dark-200 font-medium">
                    {formatDateOnlyLocal(providerDetails.endDate)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File View Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="bg-dark-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark-100">
                Archivos de {providerDetails.name}
              </h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-dark-400 hover:text-dark-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {providerDetails.documents && providerDetails.documents.length > 0 ? (
              <div className="space-y-3">
                {providerDetails.documents.map((file, index) => (
                  <div
                    key={index}
                    className="bg-dark-700/50 border border-white/10 rounded-lg p-4 hover:bg-dark-700/70 transition-colors cursor-pointer"
                    onClick={() => handleOpenFile(file)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {/* File Icon */}
                        <div className="flex-shrink-0">
                          {file.type && file.type.startsWith('image/') ? (
                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ) : (file.filename && file.filename.toLowerCase().endsWith('.pdf')) || (file.type && file.type.includes('pdf')) ? (
                            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : (file.filename && (file.filename.toLowerCase().includes('word') || file.filename.toLowerCase().includes('doc'))) || (file.type && (file.type.includes('word') || file.type.includes('document'))) ? (
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          ) : (file.filename && (file.filename.toLowerCase().includes('sheet') || file.filename.toLowerCase().includes('excel'))) || (file.type && (file.type.includes('sheet') || file.type.includes('excel'))) ? (
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          ) : (
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-dark-100 truncate">
                            {file.filename || file.name || `Documento ${index + 1}`}
                          </h4>
                          <div className="flex items-center space-x-4 text-xs text-dark-400">
                            {file.size && <span>{formatFileSize(file.size)}</span>}
                            {file.uploadDate && <span>{new Date(file.uploadDate).toLocaleDateString()}</span>}
                            <span className="capitalize">
                              {file.type ? file.type.split('/')[1] : (file.filename ? file.filename.split('.').pop() : 'archivo')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* View File Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFile(file);
                        }}
                        className="text-primary-400 hover:text-primary-300 p-1 ml-2"
                        title="Ver archivo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-dark-400">
                <svg className="w-12 h-12 mx-auto mb-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No hay archivos cargados para este proveedor.</p>
                <p className="text-sm mt-1">Los archivos pueden cargarse durante la configuración del servicio.</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-dark-300 hover:text-dark-100 border border-white/10 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Component to display individual provider with name fetching
const ProviderDisplay = ({ provider, providerIndex, saleCurrency }) => {
  const [providerName, setProviderName] = useState(provider.providerName || provider.name || 'Cargando...');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we don't have a provider name, try to fetch it
    if (!provider.providerName && !provider.name && provider.providerId) {
      fetchProviderName();
    }
  }, [provider.providerId]);

  const fetchProviderName = async () => {
    if (!provider.providerId) return;

    try {
      setLoading(true);
      const response = await api.get(`/api/providers/${provider.providerId}`);
      if (response.data.success) {
        setProviderName(response.data.data.provider.name);
      } else {
        setProviderName('Proveedor Desconocido');
      }
    } catch (error) {
      console.error('Error fetching provider name:', error);
      setProviderName('Proveedor Desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-dark-700/50 rounded-lg border border-white/10 w-full mx-0">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
        <span className="text-sm text-dark-100 font-medium flex-1 truncate">
          {loading ? 'Cargando...' : providerName}
        </span>
      </div>
      {provider.costProvider && (
        <span className="text-sm font-semibold text-blue-400 ml-4 flex-shrink-0">
          <CurrencyDisplay>{getCurrencySymbol(provider.currency || saleCurrency)}{provider.costProvider.toFixed(2)}</CurrencyDisplay>
        </span>
      )}
    </div>
  );
};

const SaleSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showServices, setShowServices] = useState(false);
  const [showProviders, setShowProviders] = useState(false);
  const [showPassengers, setShowPassengers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSale();
  }, [id]);

  // Refresh data when navigating back to this page (e.g., from Edit Sale page)
  useEffect(() => {
    fetchSale();
  }, [location.key, id]);

  // Check sale status when sale data is loaded
  useEffect(() => {
    if (sale && sale.clientBalance !== undefined) {
      // Check if sale should be automatically closed
      if (sale.clientBalance <= 0 && sale.status === 'open') {
        console.log('Sale should be closed - checking status...');
        checkSaleStatus();
      }
    }
  }, [sale]);

  const fetchSale = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors


      // Validate ObjectId format
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        setError('Formato de ID de venta inválido. El ID debe ser una cadena hexadecimal de 24 caracteres.');
        setLoading(false);
        return;
      }

      // Add cache-busting parameter to ensure fresh data
      const response = await api.get(`/api/sales/${id}?t=${Date.now()}`);

      if (response.data.success) {
        const saleData = response.data.data.sale;
        
        // Use the sale data as-is from the backend (totals should be correct)
        setSale(saleData);
      }
    } catch (error) {
      console.error('Error fetching sale:', error);

      if (error.response?.status === 404) {
        setError('La venta solicitada no fue encontrada. Esto podría significar que la venta fue eliminada, el ID es incorrecto o nunca existió.');
      } else if (error.response?.status === 401) {
        setError('No estás autorizado para ver esta venta. Por favor inicia sesión de nuevo o contacta a tu administrador.');
      } else if (error.response?.status === 403) {
        setError('Acceso denegado. No tienes permiso para ver esta venta. Contacta a tu administrador.');
      } else if (error.response?.status === 400) {
        setError('Formato de ID de venta inválido. El ID debe ser una cadena hexadecimal de 24 caracteres.');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        setError('Imposible conectar con el servidor. Por favor revisa tu conexión a internet.');
      } else if (error.code === 'ECONNREFUSED') {
        setError('El servidor no responde. Por favor revisa si el servidor está en línea e intenta de nuevo.');
      } else {
        setError('Ocurrió un error inesperado al cargar los detalles de la venta.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAdded = async () => {
    // Refresh sale data to get updated balances
    await fetchSale();
    
    // Check if status should be updated after payment
    if (sale && sale.clientBalance <= 0 && sale.status === 'open') {
      console.log('Payment added - checking if sale should be closed...');
      await checkSaleStatus();
    }
  };

  // Function to check and update sale status
  const checkSaleStatus = async () => {
    try {
      const response = await api.put(`/api/sales/${id}/check-status`);
      if (response.data.success) {
        const { sale: updatedSale, statusUpdate } = response.data.data;
        
        // Update the sale state with the latest data
        setSale(updatedSale);
        
        // Show notification if status changed
        if (statusUpdate.statusChanged) {
          console.log(`Sale status updated: ${statusUpdate.previousStatus} → ${statusUpdate.newStatus}`);
          // You could add a toast notification here if you have one
        }
        
        return statusUpdate;
      }
    } catch (error) {
      console.error('Error checking sale status:', error);
    }
    return null;
  };

  // Function to delete sale
  const handleDeleteSale = async () => {
    try {
      setIsDeleting(true);
      const response = await api.delete(`/api/sales/${id}`);
      
      if (response.data.success) {
        // Navigate back to sales list after successful deletion
        navigate('/sales');
      } else {
        console.error('Delete sale failed:', response.data.message);
        alert('Fallo al eliminar la venta. Por favor intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
      if (error.response?.data?.message) {
        alert(`Error al eliminar la venta: ${error.response.data.message}`);
      } else {
        alert('Ocurrió un error al eliminar la venta. Por favor intenta de nuevo.');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-500 text-yellow-900';
      case 'closed': return 'bg-green-500 text-green-900';
      case 'cancelled': return 'bg-red-500 text-red-900';
      default: return 'bg-gray-500 text-gray-900';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return '🔓';
      case 'closed': return '🔒';
      case 'cancelled': return '❌';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Cargando detalles de la venta..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl sm:text-6xl font-bold gradient-text mb-6 font-poppins">
              Venta No Encontrada
            </h1>
            <p className="text-xl text-dark-300 max-w-3xl mx-auto mb-8">
              La venta solicitada no pudo ser encontrada
            </p>
          </div>

          <div className="card p-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="icon-container bg-warning-500 mr-4">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-semibold text-dark-100">
                  Venta No Encontrada
                </h3>
              </div>
              <p className="text-dark-300 mb-6 max-w-md mx-auto text-lg">
                {error}
              </p>
              <p className="text-dark-400 mb-8 text-sm">
                ID de Venta: {id}
              </p>

              {/* Helpful suggestions */}
              <div className="bg-dark-600 rounded-lg p-6 mb-8 text-left">
                <h4 className="text-lg font-semibold text-dark-100 mb-4">Qué podés hacer:</h4>
                <ul className="space-y-2 text-dark-300">
                  <li className="flex items-start">
                    <span className="text-primary-400 mr-2">•</span>
                    <span>Verificar que el ID de la venta es correcto e intentar de nuevo</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-400 mr-2">•</span>
                    <span>Volver a la lista de ventas para explorar todas las ventas disponibles</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-400 mr-2">•</span>
                    <span>Crear una nueva venta si esta fue eliminada por accidente</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-400 mr-2">•</span>
                    <span>Contactar al soporte si crees que esto es un error</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/sales')}
                  className="btn-secondary"
                >
                  Volver a la Lista
                </button>
                <button
                  onClick={() => navigate('/sales/new')}
                  className="btn-secondary"
                >
                  Crear Nueva Venta
                </button>
                <button
                  onClick={fetchSale}
                  className="btn-primary"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-dark-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl sm:text-6xl font-bold gradient-text mb-6 font-poppins">
              Venta No Encontrada
            </h1>
            <p className="text-xl text-dark-300 max-w-3xl mx-auto mb-8">
              La venta solicitada no pudo ser encontrada
            </p>
          </div>

          <div className="card p-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="icon-container bg-warning-500 mr-4">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-semibold text-dark-100">
                  Venta No Encontrada
                </h3>
              </div>
              <p className="text-dark-300 mb-6 max-w-md mx-auto text-lg">
                La venta que buscas no existe o ha sido removida.
              </p>
              <p className="text-dark-400 mb-8 text-sm">
                ID de Venta: {id}
              </p>

              {/* Helpful suggestions */}
              <div className="bg-dark-600 rounded-lg p-6 mb-8 text-left">
                <h4 className="text-lg font-semibold text-dark-100 mb-4">Qué podés hacer:</h4>
                <ul className="space-y-2 text-dark-300">
                  <li className="flex items-start">
                    <span className="text-primary-400 mr-2">•</span>
                    <span>Verificar que el ID de la venta es correcto e intentar de nuevo</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-400 mr-2">•</span>
                    <span>Volver a la lista de ventas para explorar todas las ventas disponibles</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-400 mr-2">•</span>
                    <span>Crear una nueva venta si esta fue eliminada por accidente</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-400 mr-2">•</span>
                    <span>Contactar al soporte si crees que esto es un error</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/sales')}
                  className="btn-secondary"
                >
                  Volver a la Lista
                </button>
                <button
                  onClick={() => navigate('/sales/new')}
                  className="btn-secondary"
                >
                  Crear Nueva Venta
                </button>
                <button
                  onClick={fetchSale}
                  className="btn-primary"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const profitMargin = sale.totalSalePrice > 0 ? (sale.profit / sale.totalSalePrice) * 100 : 0;
  const sellerComisionPct = sale.createdBy?.comision || 0;
  const sellerComisionAmount = (sale.profit || 0) * (sellerComisionPct / 100);

  return (
    <div className="min-h-screen bg-dark-800 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-dark-100">Resumen de Venta</h1>
              <p className="text-dark-300 mt-2">ID de Venta: {sale.id}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={checkSaleStatus}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                title="Chequear y actualizar estatus de venta"
              >
                🔄 Chequear Estatus
              </button>
              <button
                onClick={() => navigate(`/sales/${sale.id}/edit`)}
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
                title="Editar Venta"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => navigate('/sales')}
                className="px-4 py-2 bg-dark-600 text-white rounded-md hover:bg-dark-700"
                title="Volver a Ventas"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                title="Eliminar Venta"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sale Information */}
            <div className="bg-dark-700 shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">Información de la Venta</h2>
              {sale.nombreVenta && (
                <div className="mb-4 pb-4 border-b border-white/10">
                  <label className="block text-sm font-medium text-dark-200">Nombre/Identificación del Viaje/Venta/Reserva</label>
                  <p className="text-dark-100 text-lg font-medium">{sale.nombreVenta}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200">Creado Por</label>
                  <p className="text-dark-100">{sale.createdBy?.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200">Fecha de Creación</label>
                  <p className="text-dark-100">{new Date(sale.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200">Última Actualización</label>
                  <p className="text-dark-100">{new Date(sale.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Passengers */}
            <div className="bg-dark-700 shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-dark-100">
                  Pasajeros ({sale.passengers.length})
                </h2>
                <button
                  onClick={() => setShowPassengers(!showPassengers)}
                  className="inline-flex items-center justify-center w-10 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
                >
                  {showPassengers ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
              {showPassengers && (
                <div className="space-y-4">
                  {sale.passengers.map((passengerSale, index) => {
                    const passengerData = passengerSale.passengerId || passengerSale;
                    if (passengerData) {
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div>
                            <h3 className="font-medium text-dark-100">
                              {passengerData?.name} {passengerData?.surname}
                              {passengerSale.isMainClient && (
                                <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                  Pasajero Principal
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-dark-300">
                              Email: {passengerData?.email || 'N/A'}
                            </p>
                            <p className="text-sm text-dark-300">
                              Teléfono: {passengerData?.phone || 'N/A'}
                            </p>
                            <p className="text-sm text-dark-400">
                              Pasaporte: {passengerData?.passportNumber || 'N/A'}
                            </p>
                            {passengerSale.notes && (
                              <p className="text-sm text-dark-400 mt-1">
                                Notas: {passengerSale.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>

            {/* Services */}
            <div className="bg-dark-700 shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-dark-100">
                  Servicios ({sale.services.length})
                </h2>
                <button
                  onClick={() => setShowServices(!showServices)}
                  className="inline-flex items-center justify-center w-10 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
                >
                  {showServices ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>

              {showServices && (
                <div className="space-y-4">
                  {sale.destination && sale.destination.city && (
                    <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-blue-100 font-medium">Ciudad: {sale.destination.city}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {(sale.services || []).map((serviceSale, index) => {
                      let serviceName = 'Unknown Service';
                      let serviceType = 'Unknown Type';
                      let serviceDescription = '';
                      let serviceNotes = '';
                      let serviceCost = null;
                      let serviceCurrency = serviceSale.currency || sale.saleCurrency;
                      let startDate = null;
                      let endDate = null;
                      
                      if (serviceSale.serviceName) {
                        serviceName = serviceSale.serviceName;
                      } else if (serviceSale.serviceId && typeof serviceSale.serviceId === 'object') {
                        serviceName = serviceSale.serviceId.destino || serviceSale.serviceId.title || 'Unknown Service';
                      }
                      
                      if (serviceSale.serviceTypeName) {
                        serviceType = serviceSale.serviceTypeName;
                      } else if (serviceSale.serviceTemplateId) {
                        if (typeof serviceSale.serviceTemplateId === 'object') {
                          serviceType = serviceSale.serviceTemplateId.name || serviceSale.serviceTemplateId.category || serviceSale.serviceTemplateId.serviceType?.name || 'Unknown Type';
                        } else {
                          serviceType = 'Unknown Type';
                        }
                      } else if (serviceSale.serviceId && typeof serviceSale.serviceId === 'object') {
                        serviceType = serviceSale.serviceId.typeId?.name || serviceSale.serviceId.category || serviceSale.serviceId.type || 'Unknown Type';
                      }
                      
                      if (serviceSale.serviceInfo) {
                        serviceDescription = serviceSale.serviceInfo;
                      } else if (serviceSale.serviceId && typeof serviceSale.serviceId === 'object') {
                        serviceDescription = serviceSale.serviceId.description || serviceSale.serviceId.destino || '';
                      }
                      
                      if (serviceDescription && serviceDescription.includes('undefined -')) {
                        serviceDescription = serviceDescription.replace('undefined -', '').trim();
                      }
                      if (serviceDescription === 'undefined' || serviceDescription === 'undefined -') {
                        serviceDescription = '';
                      }
                      
                      if (serviceSale.notes) {
                        serviceNotes = serviceSale.notes;
                      }
                      
                      if (serviceNotes && serviceNotes.includes('undefined -')) {
                        serviceNotes = serviceNotes.replace('undefined -', '').trim();
                      }
                      if (serviceNotes === 'undefined' || serviceNotes === 'undefined -') {
                        serviceNotes = '';
                      }
                      
                      if (serviceNotes && serviceNotes.startsWith('Service: ')) {
                        serviceNotes = serviceNotes.replace(/^Service: /, '').trim();
                      }
                      
                      serviceCost = serviceSale.costProvider !== null && serviceSale.costProvider !== undefined 
                        ? serviceSale.costProvider 
                        : (serviceSale.priceClient || serviceSale.originalAmount);
                      serviceCurrency = serviceSale.currency || serviceSale.originalCurrency || sale.saleCurrency;
                      
                      if (serviceSale.serviceDates) {
                        startDate = serviceSale.serviceDates.startDate;
                        endDate = serviceSale.serviceDates.endDate;
                      } else {
                        startDate = serviceSale.startDate || serviceSale.checkIn;
                        endDate = serviceSale.endDate || serviceSale.checkOut;
                      }

                      return (
                        <div key={index} className="bg-green-600/20 border border-green-500/30 rounded-lg p-4">
                          <div className="mb-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-lg font-bold text-green-200">Tipo: {serviceType}</span>
                                {serviceNotes && (
                                  <div className="mt-2">
                                    <span className="text-sm font-medium text-green-200">Notas: </span>
                                    <span className="text-sm text-green-100">
                                      {serviceNotes}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {serviceCost && (
                                <div className="text-right">
                                  <p className="text-lg font-semibold text-green-300">
                                    <CurrencyDisplay>{parseFloat(serviceCost).toFixed(2)} {getCurrencySymbol(serviceCurrency)}</CurrencyDisplay>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {(startDate || endDate) && (
                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-green-500/20">
                              {startDate && (
                                <div>
                                  <label className="block text-xs font-medium text-green-200">Fecha de Inicio</label>
                                  <p className="text-green-100 font-medium">
                                    {formatDateOnlyLocal(startDate)}
                                  </p>
                                </div>
                              )}
                              {endDate && (
                                <div>
                                  <label className="block text-xs font-medium text-green-200">Fecha de Fin</label>
                                  <p className="text-green-100 font-medium">
                                    {formatDateOnlyLocal(endDate)}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Providers Section */}
            <div className="bg-dark-700 shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-dark-100">
                  Proveedores ({(() => {
                    const seenProviders = new Set();
                    let providerCount = 0;

                    sale.services.forEach((serviceSale) => {
                      if (serviceSale.providers && serviceSale.providers.length > 0) {
                        serviceSale.providers.forEach((provider) => {
                          const providerKey = provider.providerId?._id || provider.providerId || provider._id;
                          if (!seenProviders.has(providerKey)) {
                            seenProviders.add(providerKey);
                            providerCount++;
                          }
                        });
                      }
                      else if (serviceSale.providerId && (!serviceSale.providers || serviceSale.providers.length === 0)) {
                        const providerKey = serviceSale.providerId?._id || serviceSale.providerId;
                        if (!seenProviders.has(providerKey)) {
                          seenProviders.add(providerKey);
                          providerCount++;
                        }
                      }
                    });

                    return providerCount;
                  })()})
                </h2>
                <button
                  onClick={() => setShowProviders(!showProviders)}
                  className="inline-flex items-center justify-center w-10 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
                >
                  {showProviders ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>

              {showProviders && (
                <div className="space-y-4">
                  {(() => {
                    const providerDataMap = new Map(); 

                    sale.services.forEach((serviceSale, serviceIndex) => {
                      if (serviceSale.providers && serviceSale.providers.length > 0) {
                        serviceSale.providers.forEach((provider, providerIndex) => {
                          const providerId = provider.providerId?._id || provider.providerId || provider._id;
                          const providerKey = providerId || 'unknown';

                          if (!providerDataMap.has(providerKey)) {
                            const providerObj = provider.providerId || provider;
                            providerDataMap.set(providerKey, {
                              ...providerObj,
                              uniqueKey: providerKey,
                              allDocuments: [], 
                              services: [] 
                            });
                          }

                          const providerData = providerDataMap.get(providerKey);
                          const documentsToAdd = provider.documents || provider.providerId?.documents || [];
                          if (documentsToAdd && documentsToAdd.length > 0) {
                            const validDocuments = documentsToAdd.filter(doc => doc && (doc.url || doc.filename || doc.name));
                            validDocuments.forEach(doc => {
                              const docUrl = doc.url || doc.filename || doc.name;
                              if (!providerData.allDocuments.some(existing => (existing.url || existing.filename || existing.name) === docUrl)) {
                                providerData.allDocuments.push(doc);
                              }
                            });
                          }
                          providerData.services.push({
                            serviceIndex,
                            serviceName: serviceSale.serviceName || 'Unknown Service',
                            documents: provider.documents || []
                          });
                        });
                      }
                      else if (serviceSale.providerId && (!serviceSale.providers || serviceSale.providers.length === 0)) {
                        const providerKey = serviceSale.providerId?._id || serviceSale.providerId;

                        if (!providerDataMap.has(providerKey)) {
                          const providerObj = serviceSale.providerId?._id ? serviceSale.providerId : { _id: providerKey };
                          providerDataMap.set(providerKey, {
                            ...providerObj,
                            uniqueKey: providerKey,
                            allDocuments: [],
                            services: []
                          });
                        }

                        const providerData = providerDataMap.get(providerKey);
                        if (serviceSale.documents && serviceSale.documents.length > 0) {
                          const validDocuments = serviceSale.documents.filter(doc => doc && (doc.url || doc.filename || doc.name));
                          validDocuments.forEach(doc => {
                            const docUrl = doc.url || doc.filename || doc.name;
                            if (!providerData.allDocuments.some(existing => (existing.url || existing.filename || existing.name) === docUrl)) {
                              providerData.allDocuments.push(doc);
                            }
                          });
                        }
                        providerData.services.push({
                          serviceIndex,
                          serviceName: serviceSale.serviceName || 'Unknown Service',
                          documents: serviceSale.documents || []
                        });
                      }
                    });

                    const allProviders = Array.from(providerDataMap.values()).map(provider => {
                      const providerObj = {
                        ...provider,
                        documents: provider.allDocuments || [] 
                      };
                      return providerObj;
                    });

                    return allProviders.map((provider) => (
                      <ProviderCard
                        key={provider.uniqueKey}
                        provider={provider}
                        serviceIndex={provider.services?.[0]?.serviceIndex || 0}
                        providerIndex={0}
                        saleCurrency={sale?.saleCurrency || 'USD'}
                      />
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-dark-700 shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">Notas</h2>
              <p className="text-dark-200">
                Venta con {sale.services?.length || 0} instancias de plantilla de servicio.
              </p>
            </div>

            {/* Payments */}
            <div className="bg-dark-700 shadow rounded-lg p-6">
              <PaymentsTable
                saleId={sale.id}
                sale={sale}
                onPaymentAdded={handlePaymentAdded}
                saleCurrency={sale.saleCurrency}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="bg-dark-700 shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">Resumen Financiero</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-300">Precio Total Venta:</span>
                  <span className="font-semibold text-dark-100">
                    <CurrencyDisplay>{formatCurrencyFull(sale.totalSalePrice || 0, sale.saleCurrency)}</CurrencyDisplay>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Costo Total:</span>
                  <span className="font-semibold text-dark-100">
                    <CurrencyDisplay>{formatCurrencyFull(sale.totalCost || 0, sale.saleCurrency)}</CurrencyDisplay>
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-dark-300">Ganancia:</span>
                    <span className={`font-bold text-lg ${(sale.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <CurrencyDisplay>{formatCurrencyFull(sale.profit || 0, sale.saleCurrency)}</CurrencyDisplay>
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-dark-300">Margen de Ganancia:</span>
                    <span className={`font-semibold ${(() => {
                      const margin = (sale.totalSalePrice || 0) > 0 ? ((sale.profit || 0) / (sale.totalSalePrice || 0)) * 100 : 0;
                      return margin >= 0 ? 'text-green-600' : 'text-red-600';
                    })()}`}>
                      {(() => {
                        const margin = (sale.totalSalePrice || 0) > 0 ? ((sale.profit || 0) / (sale.totalSalePrice || 0)) * 100 : 0;
                        return `${margin.toFixed(2)}%`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profit Chart */}
            <div className="bg-dark-700 shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">Análisis de Ganancias</h2>
              <ProfitChart sale={sale} />
              <div className="text-[10px] text-center font-bold text-dark-500 uppercase tracking-widest leading-relaxed mt-4">
                Leyenda: relación entre precio de venta, costo y ganancia bruta.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/95 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 bg-dark-800 border border-white/10 rounded-2xl shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-red-500/10 rounded-full text-red-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-dark-100 text-center mb-2 uppercase">Acción Irreversible</h2>
            <p className="text-dark-300 text-center mb-8 leading-relaxed">
              Estás a punto de eliminar permanentemente este registro de venta. Los datos de la venta incluyendo información de pasajeros, detalles de servicios, asignaciones de proveedores y registros de pagos asociados con esta venta serán eliminados. Nota: Las entidades subyacentes de proveedores, servicios y pasajeros permanecerán en el sistema.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleDeleteSale}
                disabled={isDeleting}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>ELIMINANDO...</span>
                  </>
                ) : (
                  <span>CONFIRMAR ELIMINACIÓN</span>
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="w-full py-4 bg-dark-700 hover:bg-dark-600 text-dark-100 font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
              >
                Cancelar / Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleSummary;
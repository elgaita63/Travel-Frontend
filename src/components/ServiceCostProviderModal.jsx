import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { providerTypeLabel } from '../utils/providerLabels';
import PassportImagePasteArea from './PassportImagePasteArea';

const ServiceCostProviderModal = ({ 
  isOpen, 
  onClose, 
  service, 
  onSave, 
  availableProviders = [],
  onProviderSearch,
  globalCurrency = 'USD',
  currencyLocked = false,
  getGlobalProviderCount = null,
  serviceId = null
}) => {
  const [serviceCost, setServiceCost] = useState(service?.cost || 0);
  const [serviceCurrency, setServiceCurrency] = useState(service?.currency || globalCurrency);
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [localProviderSearch, setLocalProviderSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [providerFiles, setProviderFiles] = useState({}); // Store files by provider ID
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingProvider, setViewingProvider] = useState(null);
  const [aiFile, setAiFile] = useState(null);
  const [aiPreviewUrl, setAiPreviewUrl] = useState('');
  const [aiExtracting, setAiExtracting] = useState(false);

  // Update currency when globalCurrency changes
  useEffect(() => {
    if (isOpen && globalCurrency) {
      console.log('🔄 ServiceCostProviderModal updating currency to:', globalCurrency);
      setServiceCurrency(globalCurrency);
    }
  }, [globalCurrency, isOpen]);

  // Initialize selected providers when modal opens
  useEffect(() => {
    if (isOpen && service) {
      setServiceCost(service.cost || 0);
      // For Cupo reservations, prioritize globalCurrency over service.currency
      const finalCurrency = currencyLocked ? globalCurrency : (service.currency || globalCurrency);
      console.log('🔄 ServiceCostProviderModal initializing currency:', {
        serviceCurrency: service.currency,
        globalCurrency,
        currencyLocked,
        finalCurrency
      });
      setServiceCurrency(finalCurrency);
      
      // Convert service.provider to array format
      let currentProviders = [];
      if (service.providers && service.providers.length > 0) {
        currentProviders = service.providers.map(p => {
          if (p.providerId) {
            return p.providerId;
          }
          return p;
        }).filter(Boolean);
      } else if (service.provider) {
        currentProviders = [service.provider];
      }
      
      setSelectedProviders(currentProviders);
      setLocalProviderSearch('');
      setError('');
      setAiFile(null);
      if (aiPreviewUrl) URL.revokeObjectURL(aiPreviewUrl);
      setAiPreviewUrl('');
    }
  }, [isOpen, service]);

  const applyAiFile = (file) => {
    if (!file) return;
    setAiFile(file);
    setError('');
    if (aiPreviewUrl) URL.revokeObjectURL(aiPreviewUrl);
    if (file.type && file.type.startsWith('image/')) {
      setAiPreviewUrl(URL.createObjectURL(file));
    } else {
      setAiPreviewUrl('');
    }
  };

  const handleExtractSupplierLiquidation = async () => {
    if (!aiFile) {
      toast.error('Subí o pegá una imagen de la liquidación/factura');
      return;
    }
    setAiExtracting(true);
    try {
      const fd = new FormData();
      fd.append('receipt', aiFile);
      const res = await api.post('/api/receipts/extract-supplier-liquidation', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || 'No se pudo extraer');
      }

      const d = res.data.data || {};
      if (typeof d.totalCost === 'number') setServiceCost(d.totalCost);
      if (d.currency) setServiceCurrency(String(d.currency).toUpperCase());

      // Si hay un solo proveedor seleccionado, aplicamos también commissionRate si viene.
      if (selectedProviders.length === 1 && d.commissionRate != null) {
        const pct = Number(d.commissionRate);
        if (Number.isFinite(pct)) {
          setSelectedProviders((prev) =>
            prev.map((p) => ({ ...p, commissionRate: Math.min(100, Math.max(0, pct)) }))
          );
        }
      }

      toast.success('Liquidación extraída. Revisá los datos antes de guardar.');
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'No se pudo extraer la liquidación';
      toast.error(msg);
    } finally {
      setAiExtracting(false);
    }
  };

  const handleProviderToggle = (provider) => {
    setSelectedProviders(prev => {
      // Count how many times this provider is currently selected in this modal
      const currentModalCount = prev.filter(p => p._id === provider._id).length;
      
      // Count how many times this provider is selected in other services (excluding current service)
      const otherServicesCount = getGlobalProviderCount ? getGlobalProviderCount(provider._id, serviceId) : 0;
      
      // Calculate what the real-time global count would be after adding one more
      const wouldBeGlobalCount = otherServicesCount + currentModalCount + 1;
      
      const maxSelections = 7;
      
      // Check if adding one more would exceed the global limit
      if (wouldBeGlobalCount > maxSelections) {
        // If already at limit, allow removing
        if (currentModalCount >= 7) {
          const providerIndex = prev.findIndex(p => p._id === provider._id);
          return prev.filter((_, index) => index !== providerIndex);
        }
        // Otherwise, don't allow adding more
        return prev;
      }
      
      // Check if provider is already selected in this modal
      if (currentModalCount >= 7) {
        // Provider is at maximum (7) in this modal, remove one instance
        const providerIndex = prev.findIndex(p => p._id === provider._id);
        return prev.filter((_, index) => index !== providerIndex);
      } else {
        // Add provider (up to 7 instances per provider globally, respecting other services)
        return [...prev, provider];
      }
    });
  };

  const removeProvider = (providerId) => {
    setSelectedProviders(prev => prev.filter(p => p._id !== providerId));
  };

  const handleSave = () => {
    // Service cost is now optional - default to 0 if not provided
    const finalServiceCost = serviceCost || 0;

    if (selectedProviders.length === 0) {
      setError('Elegí al menos un proveedor');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Add uploaded files to each provider
    const providersWithFiles = selectedProviders.map(provider => {
      const filesForProvider = providerFiles[provider._id] || [];
      return {
        ...provider,
        documents: filesForProvider.map(file => ({
          filename: file.name,
          name: file.name,
          size: file.size,
          type: 'other', // Use 'other' as default document type for uploaded files
          mimeType: file.type, // Store original MIME type separately
          url: file.url || '', // Use the URL from the upload response
          uploadDate: file.uploadDate,
          fileObject: file.file // Keep file object for immediate viewing
        }))
      };
    });

      const updatedService = {
        ...service,
        cost: finalServiceCost,
        currency: serviceCurrency,
        providers: providersWithFiles,
        provider: providersWithFiles[0] // Keep first provider for backward compatibility
      };

      console.log('🔄 ServiceCostProviderModal saving service:', {
        originalService: service,
        updatedService: updatedService,
        serviceId: service.id,
        serviceId2: service._id,
        serviceId3: service.serviceId,
        providerFiles: providerFiles
      });

      onSave(updatedService);
      onClose();
      toast.success('Costo y proveedores actualizados correctamente');
    } catch (error) {
      console.error('Error saving service:', error);
      setError('No se pudo guardar el servicio');
      toast.error('No se pudo guardar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSearchChange = (value) => {
    setLocalProviderSearch(value);
    if (onProviderSearch) {
      onProviderSearch(value);
    }
  };

  // File upload functionality
  const handleFileUpload = async (providerId, event) => {
    console.log('🔥 handleFileUpload called!', { providerId, files: event.target.files });
    
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    console.log('🚀 Starting file upload for provider:', providerId, 'Files:', files.length);

    // Upload files to backend
    const uploadedFiles = [];
    for (const file of files) {
      try {
        console.log('📤 Uploading file:', file.name, 'Size:', file.size);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('providerId', providerId);
        
        console.log('📤 FormData created, sending to /api/upload/provider-document');
        
        const response = await api.post('/api/upload/provider-document', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        console.log('📤 Upload response:', response.data);

        if (response.data.success) {
          console.log('✅ File uploaded successfully:', response.data.url);
          uploadedFiles.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: 'other',
            mimeType: file.type,
            url: response.data.url,
            filename: response.data.filename,
            uploadDate: new Date().toISOString()
          });
        } else {
          console.log('❌ Upload failed:', response.data.message);
          // Still add the file to state even if upload fails
          uploadedFiles.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: 'other',
            mimeType: file.type,
            file: file,
            uploadDate: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('❌ Error uploading file:', error);
        console.error('❌ Error response:', error.response?.data);
        // Still add the file to state even if upload fails
        uploadedFiles.push({
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: 'other',
          mimeType: file.type,
          file: file,
          uploadDate: new Date().toISOString()
        });
      }
    }

    console.log('📁 Final uploaded files:', uploadedFiles);

    setProviderFiles(prev => ({
      ...prev,
      [providerId]: [
        ...(prev[providerId] || []),
        ...uploadedFiles
      ]
    }));

    // Reset the input
    event.target.value = '';
  };

  // View files functionality
  const handleViewFiles = (provider) => {
    setViewingProvider(provider);
    setShowViewModal(true);
  };

  // Remove file functionality
  const handleRemoveFile = (providerId, fileId) => {
    setProviderFiles(prev => ({
      ...prev,
      [providerId]: prev[providerId]?.filter(file => file.id !== fileId) || []
    }));
  };

  // Open file functionality
  const handleOpenFile = (file) => {
    // If file has a URL (uploaded file from server), open it directly
    if (file.url) {
      window.open(file.url, '_blank');
    } 
    // If file has a file object (local file before upload), create object URL
    else if (file.file) {
      const url = URL.createObjectURL(file.file);
      window.open(url, '_blank');
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      console.error('File has no URL or file object:', file);
      toast.error('No se puede abrir el archivo: faltan datos');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-dark-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-dark-100">
            Costo y proveedor — {service?.serviceName || service?.serviceInfo || service?.name || 'Servicio'}
          </h3>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-dark-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Service Cost Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-dark-100">Costo del servicio</h4>
            
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Costo total del servicio
              </label>
              <input
                type="number"
                value={serviceCost}
                onChange={(e) => setServiceCost(parseFloat(e.target.value) || 0)}
                className="input-field w-full"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-dark-400 mt-1">
                Costo total del servicio (opcional; por defecto 0)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Moneda
              </label>
              <select
                value={serviceCurrency}
                onChange={(e) => setServiceCurrency(e.target.value)}
                className="input-field w-full"
                disabled={currencyLocked}
                style={{ 
                  opacity: currencyLocked ? 0.5 : 1,
                  cursor: currencyLocked ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
              <p className="text-xs text-dark-400 mt-1">
                {currencyLocked
                  ? `Moneda fijada en ${globalCurrency} para esta venta`
                  : 'Elegí la moneda de este servicio'
                }
              </p>
            </div>
          </div>

          {/* Provider Selection Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-dark-100">Proveedores del servicio</h4>
            <p className="text-sm text-dark-400">Elegí proveedores para este servicio (hasta 7)</p>

            {/* IA: extracción de liquidación/factura */}
            <div className="bg-dark-800/40 border border-white/10 rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h5 className="text-sm font-semibold text-dark-100">Liquidación / Factura (IA)</h5>
                  <p className="text-xs text-dark-400 mt-1">
                    Subí o pegá una imagen del comprobante para completar costo y moneda automáticamente.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExtractSupplierLiquidation}
                    disabled={aiExtracting || !aiFile}
                    className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
                  >
                    {aiExtracting ? 'Extrayendo…' : 'Extraer con IA'}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="file"
                      onChange={(e) => applyAiFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*,.pdf"
                    />
                    <button type="button" className="btn-secondary text-sm w-full py-2">
                      Subir archivo (imagen o PDF)
                    </button>
                  </div>
                  <PassportImagePasteArea onImageFile={applyAiFile} disabled={aiExtracting} />
                  <p className="text-[11px] text-dark-500">
                    Si el comprobante es PDF, para IA usá una captura (imagen). El PDF igual lo podés adjuntar como documento del proveedor.
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-dark-900/30 p-3">
                  <div className="text-xs text-dark-400 mb-2">Vista previa</div>
                  {aiPreviewUrl ? (
                    <img src={aiPreviewUrl} alt="Liquidación preview" className="w-full max-h-40 object-contain rounded" />
                  ) : (
                    <div className="text-xs text-dark-500">
                      {aiFile ? `Archivo: ${aiFile.name}` : 'Sin archivo seleccionado'}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Selected Providers */}
            {selectedProviders.length > 0 && (
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
                <h5 className="font-medium text-dark-100 mb-3">
                  Proveedores elegidos ({selectedProviders.length}/7)
                </h5>
                <div className="max-h-32 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-800">
                  {(() => {
                    // Group providers by ID and count instances
                    const providerGroups = {};
                    selectedProviders.forEach((provider, index) => {
                      if (!providerGroups[provider._id]) {
                        providerGroups[provider._id] = {
                          provider,
                          indices: []
                        };
                      }
                      providerGroups[provider._id].indices.push(index);
                    });

                    return Object.values(providerGroups).map(({ provider, indices }) => (
                      <div key={provider._id} className="bg-dark-700/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h6 className="font-medium text-dark-100">{provider.name}</h6>
                              <span className="bg-primary-500/20 text-primary-400 text-xs px-2 py-1 rounded-full">
                                {indices.length}x
                              </span>
                            </div>
                            <div className="text-sm text-dark-300">
                              {provider.type && <span>Tipo: {providerTypeLabel(provider.type)}</span>}
                              {provider.phone && <span className="ml-4">Tel.: {provider.phone}</span>}
                              {provider.email && <span className="ml-4">Email: {provider.email}</span>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Upload Icon */}
                            <div className="relative">
                              <input
                                type="file"
                                multiple
                                onChange={(e) => handleFileUpload(provider._id, e)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.xlsx,.xls"
                              />
                              <button
                                className="text-blue-400 hover:text-blue-300 p-1"
                                title="Subir documentos"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                              </button>
                            </div>
                            
                            {/* View Icon */}
                            <button
                              onClick={() => handleViewFiles(provider)}
                              className="text-green-400 hover:text-green-300 p-1"
                              title="Ver documentos"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            
                            {/* Remove Icon */}
                            <button
                              onClick={() => {
                                // Remove one instance of this provider
                                const providerIndex = selectedProviders.findIndex(p => p._id === provider._id);
                                setSelectedProviders(prev => prev.filter((_, index) => index !== providerIndex));
                              }}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Quitar una instancia"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Provider Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar proveedores…"
                value={localProviderSearch}
                onChange={(e) => handleProviderSearchChange(e.target.value)}
                className="input-field w-full pl-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Available Providers */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              <h5 className="text-sm font-medium text-dark-200">Proveedores disponibles</h5>
              {availableProviders.length === 0 ? (
                <div className="text-center py-4 text-dark-400">
                  <p>No hay proveedores. Probá ajustar la búsqueda.</p>
                </div>
              ) : (
                availableProviders
                  .filter(provider => {
                    if (localProviderSearch && localProviderSearch.trim()) {
                      const searchTerm = localProviderSearch.toLowerCase().trim();
                      const matchesName = provider.name?.toLowerCase().includes(searchTerm);
                      const matchesEmail = provider.email?.toLowerCase().includes(searchTerm);
                      const matchesType = provider.type?.toLowerCase().includes(searchTerm);
                      return matchesName || matchesEmail || matchesType;
                    }
                    return true;
                  })
                  .map((provider) => {
                    const selectedCount = selectedProviders.filter(p => p._id === provider._id).length;
                    const isSelected = selectedCount > 0;
                    
                    // Get global count from other services
                    const otherServicesCount = getGlobalProviderCount ? getGlobalProviderCount(provider._id, serviceId) : 0;
                    const realTimeGlobalCount = otherServicesCount + selectedCount;
                    const canSelectMore = realTimeGlobalCount < 7;
                    
                    return (
                      <div
                        key={provider._id}
                        onClick={() => canSelectMore ? handleProviderToggle(provider) : null}
                        className={`p-3 border rounded-lg transition-colors ${
                          !canSelectMore
                            ? 'opacity-50 cursor-not-allowed bg-dark-700/30 border-white/5'
                            : 'cursor-pointer border-white/10 hover:bg-dark-700/50'
                        } ${isSelected ? 'border-primary-500 bg-primary-500/10' : ''}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected 
                              ? 'border-primary-500 bg-primary-500' 
                              : 'border-dark-400'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h6 className="font-medium text-dark-100">{provider.name}</h6>
                              {isSelected && (
                                <span className="bg-primary-500/20 text-primary-400 text-xs px-2 py-1 rounded-full">
                                  {selectedCount}x
                                </span>
                              )}
                              {realTimeGlobalCount > 0 && (
                                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
                                  En la venta: {realTimeGlobalCount}/7
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-dark-300">
                              {provider.type && <span>Tipo: {providerTypeLabel(provider.type)}</span>}
                              {provider.phone && <span className="ml-4">Tel.: {provider.phone}</span>}
                              {provider.email && <span className="ml-4">Email: {provider.email}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 hover:text-dark-100 border border-white/10 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || selectedProviders.length === 0}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando…' : 'Listo'}
          </button>
        </div>
      </div>

      {/* File View Modal */}
      {showViewModal && viewingProvider && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="bg-dark-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark-100">
                Archivos de {viewingProvider.name}
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

            {providerFiles[viewingProvider._id] && providerFiles[viewingProvider._id].length > 0 ? (
              <div className="space-y-3">
                {providerFiles[viewingProvider._id].map((file) => (
                  <div
                    key={file.id}
                    className="bg-dark-700/50 border border-white/10 rounded-lg p-4 hover:bg-dark-700/70 transition-colors cursor-pointer"
                    onClick={() => handleOpenFile(file)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {/* File Icon */}
                        <div className="flex-shrink-0">
                          {(() => {
                            // Use mimeType if available (for uploaded files), otherwise use type
                            const fileType = file.mimeType || file.type || '';
                            const fileName = file.name || file.filename || '';
                            
                            if (fileType.startsWith('image/')) {
                              return (
                                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              );
                            } else if (fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
                              return (
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              );
                            } else if (fileType.includes('word') || fileType.includes('document') || fileName.toLowerCase().match(/\.(doc|docx)$/)) {
                              return (
                                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              );
                            } else if (fileType.includes('sheet') || fileType.includes('excel') || fileName.toLowerCase().match(/\.(xls|xlsx)$/)) {
                              return (
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              );
                            } else {
                              return (
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              );
                            }
                          })()}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-dark-100 truncate">
                            {file.name || file.filename || 'Archivo sin nombre'}
                          </h4>
                          <div className="flex items-center space-x-4 text-xs text-dark-400">
                            <span>{formatFileSize(file.size)}</span>
                            <span>{new Date(file.uploadDate || file.uploadedAt || Date.now()).toLocaleDateString()}</span>
                            <span className="capitalize">
                              {(file.mimeType || file.type || '').split('/')[1] || 
                               (file.name || file.filename || '').split('.').pop() || 
                               'file'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Remove File Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(viewingProvider._id, file.id);
                        }}
                        className="text-red-400 hover:text-red-300 p-1 ml-2"
                        title="Quitar archivo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                <p>Aún no hay archivos para este proveedor.</p>
                <p className="text-sm mt-1">Usá el ícono de subida para agregar archivos.</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-white/10">
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
    </div>
  );
};

export default ServiceCostProviderModal;

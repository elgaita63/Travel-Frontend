import React, { useState } from 'react';
import ServiceEntryModal from './ServiceEntryModal';
import DatabaseValue from './DatabaseValue';
import { CurrencySymbol } from '../utils/currencyJSX';

// Helper function to format providers display with quantities
const formatProvidersDisplay = (providers) => {
  if (!providers || providers.length === 0) return '';
  
  // Group providers by name and count occurrences
  const providerGroups = {};
  providers.forEach(provider => {
    const providerName = provider.name || provider.providerId?.name || 'Proveedor desconocido';
    providerGroups[providerName] = (providerGroups[providerName] || 0) + 1;
  });
  
  // Format as "Provider 1, Provider 2 * 2, Provider 3"
  return Object.entries(providerGroups)
    .map(([name, count]) => count > 1 ? `${name} * ${count}` : name)
    .join(', ');
};

const NewSaleWizardSteps = ({
  currentStep,
  // Service Template Data
  serviceTemplates,
  availableServiceTemplates,
  serviceTemplateInstances,
  serviceLoading,
  currentServiceTemplate,
  currentServiceInfo,
  currentServiceDates,
  currentServiceCost,
  currentServiceCurrency,
  currentServiceProvider,
  currentServiceProviders,
  addProviderToCurrentService,
  removeProviderFromCurrentService,
  // Destination Data
  destination,
  citySuggestions,
  countrySuggestions,
  // Passenger Data
  selectedPassengers,
  selectedCompanions,
  availablePassengers,
  availableCompanions,
  allForSelection,
  passengerSearch,
  companionSearch,
  passengerLoading,
  companionLoading,
  companionsFetched,
  // Provider Data
  availableProviders,
  providerSearch,
  providerLoading,
  expandedProviders,
  providerFormData,
  // Functions
  setCurrentStep,
  selectServiceTemplate,
  setCurrentServiceInfo,
  setCurrentServiceDates,
  setCurrentServiceCost,
  setCurrentServiceCurrency,
  setCurrentServiceProvider,
  setCurrentServiceProviders,
  addServiceInstance,
  removeServiceInstance,
  editServiceInstance,
  currentServiceInstance,
  setCurrentServiceInstance,
  setCurrentServiceTemplate,
  setDestination,
  searchCities,
  searchCountries,
  setCitySuggestions,
  setCountrySuggestions,
  togglePassengerSelection,
  removeSelectedPassenger,
  toggleCompanionSelection,
  removeSelectedCompanion,
  setPassengerSearch,
  setCompanionSearch,
  toggleProviderSelection,
  removeSelectedProvider,
  toggleProviderExpansion,
  updateProviderFormData,
  getProviderFormData,
  convertProviderAmountToUSD,
  handleProviderFileUpload,
  openFileModal,
  closeFileModal,
  openFile,
  showFileModal,
  selectedProviderFiles,
  // Service Template Modal
  showAddServiceTemplateModal,
  setShowAddServiceTemplateModal,
  onServiceTemplateAdded,
  // Service Type Modal
  showAddServiceTypeModal,
  setShowAddServiceTypeModal,
  onServiceTypeAdded,
  serviceTypes,
  // Service Template Search
  serviceTemplateSearch,
  setServiceTemplateSearch,
  // Service Instance Management
  updateServiceInstance,
  addProviderToService,
  removeProviderFromService,
  // Template Editing
  editingTemplate,
  setEditingTemplate,
  updateServiceTemplate,
  // Price per Passenger
  pricePerPassenger,
  setPricePerPassenger,
  passengerCurrency,
  setPassengerCurrency,
  passengerConvertedAmount,
  // Currency Consistency
  globalCurrency,
  currencyLocked,
  handleCurrencyChange,
  // Provider Search
  setProviderSearch,
  // Provider Cost Management
  updateProviderCost,
  updateProviderCurrency,
  // Cupo Context
  cupoContext,
  isCupoReservation,
  // Service Cost & Provider Modal
  openServiceCostProviderModal,
  closeServiceCostProviderModal,
  saveServiceCostAndProviders,
  // Nombre identificación venta (paso 7)
  nombreVenta,
  setNombreVenta,
  isEditMode = false
}) => {
  // State for service entry modal and service cards
  const [showServiceEntryModal, setShowServiceEntryModal] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState(null);
  const [serviceCards, setServiceCards] = useState([]);
  

  // Function to handle service type selection
  const selectServiceType = (serviceType) => {
    // Open service entry modal instead of directly adding
    setSelectedServiceType(serviceType);
    setShowServiceEntryModal(true);
  };

  // Function to handle service added from modal
  const handleServiceAdded = (serviceCard) => {
    // Add service card to the list
    setServiceCards(prev => [...prev, serviceCard]);
    
    // Also add to service template instances for compatibility
    const serviceInstance = {
      id: serviceCard.id,
      serviceTypeId: serviceCard.serviceTypeId,
      serviceTypeName: serviceCard.serviceTypeName,
      serviceName: serviceCard.serviceName || serviceCard.serviceTypeName, // Use serviceTypeName as fallback
      serviceInfo: serviceCard.serviceDescription,
      checkIn: currentServiceDates.checkIn || '',
      checkOut: currentServiceDates.checkOut || '',
      cost: 0,
      currency: 'USD',
      provider: null,
      providers: [],
      destination: { 
        city: destination.city || '', 
        country: destination.country || '' 
      },
      isServiceTypeOnly: true
    };
    
    addServiceInstance(serviceInstance);
    
    console.log('✅ Service added:', serviceCard);
  };

  // Function to remove service card
  const removeServiceCard = (serviceId) => {
    setServiceCards(prev => prev.filter(card => card.id !== serviceId));
    // Also remove from service template instances
    removeServiceInstance(serviceId);
  };


  return (
    <>
      {/* Step 1: Select Passengers & Companions */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-dark-800/70 border border-primary-500/25 rounded-xl p-5 text-left">
            <label htmlFor="nombreVenta-wizard-step1" className="block text-sm font-semibold text-dark-100 mb-2">
              Nombre / identificación del viaje, venta o reserva
            </label>
            <input
              id="nombreVenta-wizard-step1"
              type="text"
              value={nombreVenta || ''}
              onChange={(e) => setNombreVenta(e.target.value)}
              className="input-field w-full max-w-3xl border-primary-500/40 focus:border-primary-500"
              placeholder="Se sugiere según destino y servicios"
              maxLength={200}
              autoComplete="off"
            />
            <p className="text-xs text-dark-500 mt-2 leading-relaxed">
              Opcional: si no cargás un nombre acá, en el paso 7 se completará automáticamente según destino y servicios cuando corresponda; podés editarlo antes de{' '}
              {isEditMode ? 'guardar los cambios' : 'confirmar la venta'}.
            </p>
          </div>

          <h3 className="text-lg font-medium text-dark-100">Pasajeros y acompañantes</h3>
          <p className="text-sm text-dark-400">Elegí el titular y los acompañantes de esta venta</p>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar pasajeros por nombre, teléfono o pasaporte..."
              value={passengerSearch ?? ''}
              onChange={(e) => setPassengerSearch(e.target.value)}
              className="input-field w-full pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Selected Passengers */}
          {selectedPassengers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-md font-medium text-dark-100">Pasajeros seleccionados</h4>
              <div className="grid grid-cols-1 gap-3">
                {selectedPassengers.map((passenger) => (
                  <div key={passenger._id} className="bg-dark-700/50 border border-white/10 rounded-lg p-4 relative">
                    <button
                      onClick={() => removeSelectedPassenger(passenger._id)}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                    <h5 className="font-medium mb-2 text-dark-100">{passenger.name} {passenger.surname}</h5>
                    <div className="text-sm space-y-2 text-dark-300">
                      {passenger.phone && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{passenger.phone}</span>
                        </div>
                      )}
                      {passenger.passportNumber && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                          <span>{passenger.passportNumber}</span>
                        </div>
                      )}
                      {passenger.email && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{passenger.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Companions */}
          {selectedCompanions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-md font-medium text-dark-100">Acompañantes seleccionados</h4>
              <div className="grid grid-cols-1 gap-3">
                {selectedCompanions.map((companion) => (
                  <div key={companion._id} className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 relative">
                    <button
                      onClick={() => removeSelectedCompanion(companion._id)}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                    <h5 className="font-medium mb-2 text-dark-100">{companion.name} {companion.surname}</h5>
                    <div className="text-sm space-y-2 text-dark-300">
                      {companion.phone && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{companion.phone}</span>
                        </div>
                      )}
                      {companion.passportNumber && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                          <span>{companion.passportNumber}</span>
                        </div>
                      )}
                      {companion.email && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{companion.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Passengers */}
          <div className="space-y-3">
            <h4 className="text-md font-medium text-dark-100">
              Pasajeros disponibles {passengerLoading && <span className="text-sm text-dark-400">(cargando...)</span>}
            </h4>
            
            {selectedPassengers.length > 0 ? (
              <div className="text-center py-8 text-dark-400 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p>Ya elegiste al titular. Podés sumar más personas como acompañantes abajo.</p>
              </div>
            ) : availablePassengers.length === 0 && !passengerLoading ? (
              <div className="text-center py-8 text-dark-400">
                <p>No hay pasajeros con ese criterio. Probá otra búsqueda o registrá pasajeros primero.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {availablePassengers
                  .filter(passenger => 
                    !selectedPassengers.find(selected => selected._id === passenger._id) &&
                    !selectedCompanions.find(companion => companion._id === passenger._id)
                  )
                  .map((passenger) => (
                    <div
                      key={passenger._id}
                      onClick={() => togglePassengerSelection(passenger)}
                      className="rounded-lg p-4 transition-colors bg-dark-700/50 border border-white/10 cursor-pointer hover:bg-dark-600/50 hover:border-primary-500/30"
                    >
                      <h5 className="font-medium mb-2 text-dark-100">
                        {passenger.name} {passenger.surname}
                      </h5>
                      <div className="text-sm space-y-2 text-dark-300">
                        {passenger.phone && (
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{passenger.phone}</span>
                          </div>
                        )}
                        {passenger.passportNumber && (
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                            <span>{passenger.passportNumber}</span>
                          </div>
                        )}
                        {passenger.email && (
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>{passenger.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Available Companions */}
          <div className="space-y-3">
            <h4 className="text-md font-medium text-dark-100">
              Acompañantes disponibles {companionLoading && <span className="text-sm text-dark-400">(cargando...)</span>}
            </h4>
            
            {selectedPassengers.length === 0 && (
              <div className="text-center py-8 text-dark-400 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p>Primero elegí un pasajero titular para poder sumar acompañantes.</p>
              </div>
            )}
            
            {selectedPassengers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {allForSelection
                  .filter(person => 
                    // Exclude the primary passenger
                    !selectedPassengers.find(selected => selected._id === person._id) &&
                    // Exclude already selected companions
                    !selectedCompanions.find(selected => selected._id === person._id)
                  )
                  .map((person) => (
                    <div
                      key={person._id}
                      onClick={() => toggleCompanionSelection(person)}
                      className="rounded-lg p-4 transition-colors bg-dark-700/50 border border-white/10 cursor-pointer hover:bg-dark-600/50 hover:border-primary-500/30"
                    >
                      <h5 className="font-medium mb-2 text-dark-100">
                        {person.name} {person.surname}
                      </h5>
                      <div className="text-sm space-y-2 text-dark-300">
                        {person.phone && (
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{person.phone}</span>
                          </div>
                        )}
                        {person.passportNumber && (
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                            <span>{person.passportNumber}</span>
                          </div>
                        )}
                        {person.email && (
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>{person.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Price Per Passenger */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-dark-100">Precio por pasajero</h3>
          <p className="text-sm text-dark-400">Definí el precio por persona para esta venta</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Precio por pasajero *
              </label>
              <input
                type="number"
                value={pricePerPassenger}
                onChange={(e) => setPricePerPassenger(e.target.value)}
                className="input-field"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            <p className="text-xs text-dark-400 mt-1">
                Importe por cada pasajero (titular y acompañantes)
            </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Moneda *
              </label>
              <select
                value={passengerCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="input-field"
                disabled={isCupoReservation ? currencyLocked : (currencyLocked && currentStep > 2)}
                style={{ 
                  opacity: (isCupoReservation ? currencyLocked : (currencyLocked && currentStep > 2)) ? 0.5 : 1,
                  cursor: (isCupoReservation ? currencyLocked : (currencyLocked && currentStep > 2)) ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="USD" className="notranslate">
                  <CurrencySymbol currency="USD" />
                </option>
                <option value="ARS" className="notranslate">
                  <CurrencySymbol currency="ARS" />
                </option>
              </select>
              <p className="text-xs text-dark-400 mt-1">
                {isCupoReservation && currencyLocked
                  ? `Moneda fijada en ${globalCurrency} según el cupo (no se puede cambiar)`
                  : currencyLocked && currentStep > 2
                    ? `Moneda fijada en ${globalCurrency} para esta venta`
                    : 'Elegí la moneda del precio'
                }
                {/* Debug info */}
                {/* <br /> */}
                {/* <span className="text-xs text-gray-500">
                  Debug: currencyLocked={currencyLocked.toString()}, currentStep={currentStep}, disabled={currencyLocked && currentStep > 2}
                </span> */}
              </p>
            </div>
          </div>


          {/* Summary */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-300">
                <strong>Total para {selectedPassengers.length + selectedCompanions.length} {selectedPassengers.length + selectedCompanions.length === 1 ? 'persona' : 'personas'}:</strong> <CurrencySymbol currency={passengerCurrency} /> {pricePerPassenger || '0'} × {selectedPassengers.length + selectedCompanions.length} = <CurrencySymbol currency={passengerCurrency} /> {((parseFloat(pricePerPassenger) || 0) * (selectedPassengers.length + selectedCompanions.length)).toFixed(2)}
                <br />
                <span className="text-xs text-blue-200">
                  ({selectedPassengers.length} titular{selectedPassengers.length !== 1 ? 'es' : ''} + {selectedCompanions.length} acompañante{selectedCompanions.length !== 1 ? 's' : ''})
                </span>
                {currencyLocked && currentStep > 2 && (
                  <>
                    <br />
                    <span className="text-xs text-yellow-300">
                      🔒 Moneda fijada en {globalCurrency} para esta venta
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Select Service Template */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-dark-100">Tipo de servicio</h3>
              <p className="text-sm text-dark-400">Elegí y gestioná los tipos de servicio de la venta</p>
            </div>
            <button
              onClick={() => setShowAddServiceTypeModal(true)}
              className="text-xs text-primary-400 hover:text-primary-300 underline whitespace-nowrap"
            >
              + Nuevo tipo de servicio
            </button>
          </div>


          {/* Service Cards Section */}
          {serviceCards.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-md font-medium text-dark-100">Servicios agregados</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {serviceCards.map((serviceCard) => (
                  <div key={serviceCard.id} className="p-4 border rounded-lg bg-primary-500/10 border-primary-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-primary-400">
                        Tipo: <DatabaseValue data-field="serviceTypeName">{serviceCard.serviceTypeName}</DatabaseValue>
                      </p>
                      <button
                        onClick={() => removeServiceCard(serviceCard.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                        title="Quitar servicio"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-sm text-dark-300 line-clamp-2">
                      <DatabaseValue data-field="serviceDescription">{serviceCard.serviceDescription}</DatabaseValue>
                    </p>
                    <div className="mt-2">
                      <span className="text-xs text-primary-400 bg-primary-500/20 px-2 py-1 rounded">
                        Servicio
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Section */}
          <div className="space-y-3">
            <h4 className="text-md font-medium text-dark-100">
              Buscar y elegir tipos de servicio
            </h4>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar tipo de servicio por nombre..."
                value={serviceTemplateSearch || ''}
                onChange={(e) => setServiceTemplateSearch(e.target.value)}
                className="input-field w-full pl-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Available Service Types Section */}
          <div className="space-y-3">
            <h4 className="text-md font-medium text-dark-100">
              Tipos de servicio disponibles {serviceLoading && <span className="text-sm text-dark-400">(cargando...)</span>}
            </h4>
            
            {(() => {
              // Use serviceTypes instead of availableServiceTemplates
              const availableServiceTypes = serviceTypes || [];
              
              // Filter service types based on search term
              const filteredServiceTypes = availableServiceTypes.filter(serviceType => {
                if (serviceTemplateSearch && serviceTemplateSearch.trim()) {
                  const searchTerm = serviceTemplateSearch.toLowerCase().trim();
                  const matchesName = serviceType.name?.toLowerCase().includes(searchTerm);
                  
                  return matchesName;
                }
                
                return true; // Show all available service types
              });
              
              return filteredServiceTypes.length === 0 && !serviceLoading ? (
                <div className="text-center py-8 text-dark-400">
                  {serviceTemplateSearch && serviceTemplateSearch.trim() ? (
                    <div>
                      <p>No hay tipos que coincidan con «{serviceTemplateSearch}»</p>
                      <p className="text-sm mt-2">Probá otra búsqueda o agregá un tipo nuevo.</p>
                    </div>
                  ) : (
                    <p>No hay tipos de servicio cargados. Agregá uno para comenzar.</p>
                  )}
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {filteredServiceTypes.map((serviceType) => {
                  // Count how many times this service type has been selected
                  const selectionCount = serviceTemplateInstances.filter(instance => 
                    instance.serviceTypeId === serviceType._id || 
                    (instance.isServiceTypeOnly && instance.serviceTypeName === serviceType.name)
                  ).length;
                  const canSelectMore = selectionCount < 7;
                  
                  return (
                    <div 
                      key={serviceType._id} 
                      onClick={() => canSelectMore && selectServiceType(serviceType)}
                      className={`p-4 border rounded-lg bg-dark-700/50 border-white/10 ${canSelectMore ? 'hover:bg-dark-600/50 hover:border-primary-500/30 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="font-medium text-dark-100">{serviceType.name}</h5>
                          {selectionCount > 0 && (
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-primary-400 bg-primary-500/20 px-2 py-1 rounded">
                                Elegidos: {selectionCount}/7
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-dark-400 px-2 py-1 bg-dark-600/50 rounded">
                          Tipo de servicio
                        </span>
                        {!canSelectMore && (
                          <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded">
                            Máximo (7/7)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              );
            })()}
          </div>
        </div>
      )}



      {/* Step 4: Service Dates */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-dark-100">Fechas y ciudad</h3>
          <p className="text-sm text-dark-400">Fechas de entrada/salida y ciudad de destino del servicio</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Fecha entrada *
              </label>
              <input
                type="date"
                value={currentServiceDates.checkIn}
                onChange={(e) => setCurrentServiceDates(prev => ({ ...prev, checkIn: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Fecha salida *
              </label>
              <input
                type="date"
                value={currentServiceDates.checkOut}
                onChange={(e) => setCurrentServiceDates(prev => ({ ...prev, checkOut: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Ciudad *
              </label>
              <input
                type="text"
                value={destination.city}
                onChange={(e) => setDestination(prev => ({ ...prev, city: e.target.value }))}
                className="input-field"
                placeholder="Ciudad de destino"
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Service Cost & Provider */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-dark-100">Costo y proveedor</h3>
          <p className="text-sm text-dark-400">Indicá costo y proveedores para cada servicio</p>
          
          {/* Multiple Services Configuration */}
          {serviceTemplateInstances.map((service, index) => {
            console.log(`🔄 Rendering service ${index}:`, {
              id: service.id,
              _id: service._id,
              serviceId: service.serviceId,
              serviceName: service.serviceName,
              serviceInfo: service.serviceInfo,
              name: service.name,
              cost: service.cost,
              providers: service.providers?.length || 0
            });
            return (
            <div key={service._id || service.id || index} className="bg-dark-800/50 border border-white/10 rounded-lg p-6">
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-dark-700/30 rounded-lg p-4 transition-colors"
                onClick={() => openServiceCostProviderModal(service)}
              >
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-dark-100">
                    {index + 1}. {service.serviceName || service.serviceInfo || service.name || 'Servicio'}
                  </h4>
                  <div className="mt-2 flex items-center space-x-4">
                    {/* Display cost if set and greater than 0 */}
                    {service.cost > 0 && (
                      <div className="text-sm text-primary-400">
                        Costo: {service.currency === 'USD' ? 'U$' : service.currency === 'ARS' ? 'AR$' : service.currency} {service.cost}
                      </div>
                    )}
                    {/* Display providers with quantities if providers selected */}
                    {service.providers && service.providers.length > 0 && (
                      <div className="text-sm text-primary-400">
                        Proveedores: {formatProvidersDisplay(service.providers)}
                      </div>
                    )}
                    {service.provider && !service.providers && (
                      <div className="text-sm text-primary-400">
                        Proveedor: {service.provider.name}
                      </div>
                    )}
                    {/* Show status if no cost or providers set */}
                    {(!service.cost || service.cost <= 0) && (!service.providers || service.providers.length === 0) && !service.provider && (
                      <div className="text-sm text-dark-400">
                        Tocá para cargar costo y proveedores
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}



      {/* Step 6: Edit Services */}
      {currentStep === 6 && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-dark-100">Editar servicios</h3>
          <p className="text-sm text-dark-400">Revisá y ajustá los servicios elegidos</p>
          
          {/* Current Services Summary */}
          {serviceTemplateInstances.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-medium text-dark-100 mb-3 flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
                Servicios actuales ({serviceTemplateInstances.length})
            </h4>
            <div className="space-y-2">
                {serviceTemplateInstances.map((instance, index) => (
                  <div key={instance.id} className="text-sm text-dark-300 bg-dark-700/30 rounded p-2">
                    <span className="text-green-400 font-medium">•</span> {index + 1}. {instance.serviceName || instance.templateName}
                    <span className="text-dark-400 ml-2">({instance.serviceInfo})</span>
                    <span className="text-dark-400 ml-2">- {globalCurrency === 'USD' ? 'U$' : 'AR$'} {parseFloat(instance.cost || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Add Another Service */}
          {/* <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-6">
            <h4 className="font-medium text-dark-100 mb-4 flex items-center">
              <svg className="w-5 h-5 text-primary-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              Add Another Service
              </h4>
            <p className="text-sm text-dark-300 mb-4">
              You can add more services to create a comprehensive travel package. Each service can have different dates, destinations, and providers.
            </p>
            
                    <button
              onClick={() => {
                // Reset all form fields for new service
                setCurrentServiceInstance(null);
                setCurrentServiceTemplate(null);
                setCurrentServiceInfo('');
                setCurrentServiceDates({ checkIn: '', checkOut: '' });
                setCurrentServiceCost('');
                setCurrentServiceCurrency('USD');
                setCurrentServiceProvider(null);
                setCurrentServiceProviders([]);
                setDestination({ city: '', country: '' });
                // Navigate to step 4
                setCurrentStep(4);
              }}
              className="btn-primary flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Service
                    </button>
                  </div> */}

          {/* Service Management */}
          {serviceTemplateInstances.length > 0 && (
          <div className="space-y-4">
              <h4 className="text-md font-medium text-dark-100">Gestionar servicios</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {serviceTemplateInstances.map((instance, index) => (
                  <div key={instance.id} className="bg-dark-700/50 border border-white/10 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h5 className="font-medium text-dark-100 mb-1">
                          {index + 1}. {instance.serviceName || instance.templateName}
              </h5>
                        <p className="text-sm text-dark-300">{instance.serviceInfo}</p>
                </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => editServiceInstance(instance)}
                          className="text-blue-400 hover:text-blue-300 p-1"
                          title="Editar servicio"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                        </button>
                        <button
                          onClick={() => removeServiceInstance(instance.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Quitar servicio"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                        </button>
                            </div>
                    </div>
                    
                    <div className="text-xs text-dark-400 space-y-1">
                      <div><span className="text-primary-400">Fechas:</span> {instance.checkIn && instance.checkOut ? `${instance.checkIn} a ${instance.checkOut}` : 'Sin indicar'}</div>
                      <div><span className="text-primary-400">Destino:</span> {instance.destination?.city || instance.destination?.name || 'Sin indicar'}</div>
                      <div><span className="text-primary-400">Costo:</span> {globalCurrency === 'USD' ? 'U$' : 'AR$'} {parseFloat(instance.cost || 0).toFixed(2)}</div>
                      <div><span className="text-primary-400">Proveedores:</span> {(() => {
                        console.log(`🔍 Service ${instance.templateName} providers:`, instance.providers);
                        console.log(`🔍 Service ${instance.templateName} provider:`, instance.provider);
                        
                        if (instance.providers && instance.providers.length > 0) {
                          // Group providers by name and count occurrences
                          const providerCounts = {};
                          instance.providers.forEach(p => {
                            const providerName = p.name || p.providerId?.name || 'Proveedor desconocido';
                            providerCounts[providerName] = (providerCounts[providerName] || 0) + 1;
                          });
                          
                          // Format providers with counts
                          return Object.entries(providerCounts)
                            .map(([name, count]) => count > 1 ? `${name} × ${count}` : name)
                            .join(', ');
                        } else if (instance.provider?.name) {
                          return instance.provider.name;
                        } else {
                          return 'Ninguno';
                        }
                      })()}</div>
                        </div>
                      </div>
                    ))}
              </div>
                </div>
              )}
        </div>
      )}

      {/* Paso 7: Revisar y confirmar / guardar */}
      {currentStep === 7 && (
        <div className="space-y-8">
          <div className="bg-dark-800/70 border border-primary-500/25 rounded-xl p-5 text-left">
            <label htmlFor="nombreVenta" className="block text-sm font-semibold text-dark-100 mb-2">
              Nombre/Identificación del Viaje/Venta/Reserva
            </label>
            <input
              id="nombreVenta"
              type="text"
              value={nombreVenta || ''}
              onChange={(e) => setNombreVenta(e.target.value)}
              className="input-field w-full text-dark-100"
              placeholder="Se sugiere un texto según destinos y servicios cargados"
              maxLength={200}
              autoComplete="off"
            />
            <p className="text-xs text-dark-400 mt-2 leading-relaxed">
              Sugerencia: cargá una identificación para esta venta que incluya una palabra de una ciudad de destino relacionada al viaje.
            </p>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-bold text-dark-100 mb-2">
              {isEditMode ? 'Revisar y guardar venta' : 'Revisar y confirmar venta'}
            </h3>
            <p className="text-dark-400">
              {isEditMode
                ? 'Revisá todos los datos antes de guardar los cambios'
                : 'Revisá todos los datos antes de confirmar la venta'}
            </p>
          </div>
          
          {/* Service Instances Summary */}
          <div className="bg-gradient-to-r from-primary-900/20 to-primary-800/20 border border-primary-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-primary-200">Servicios ({serviceTemplateInstances.length})</h4>
              </div>
            </div>
            
            <div className="space-y-4">
              {serviceTemplateInstances.map((instance, index) => (
                <div key={instance.id} className="bg-dark-800/50 border border-primary-500/20 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-dark-100 mb-2">
                        {index + 1}. {instance.serviceName || instance.templateName} - {instance.serviceInfo}
                      </h5>
                      <div className="text-sm text-dark-300 space-y-1">
                        <div><span className="text-primary-400">Fechas:</span> {instance.checkIn} a {instance.checkOut}</div>
                        <div><span className="text-primary-400">Destino:</span> {instance.destination.city}</div>
                        {instance.cost && instance.cost > 0 && (
                        <div><span className="text-primary-400">Costo:</span> {globalCurrency === 'USD' ? 'U$' : 'AR$'} {parseFloat(instance.cost).toFixed(2)}</div>
                      )}
                        <div><span className="text-primary-400">Proveedor(es):</span> {(() => {
                          if (instance.providers && instance.providers.length > 0) {
                            // Group providers by name and count occurrences
                            const providerCounts = {};
                            instance.providers.forEach(p => {
                              const providerName = p.name || p.providerId?.name || 'Proveedor desconocido';
                              providerCounts[providerName] = (providerCounts[providerName] || 0) + 1;
                            });
                            
                            // Format providers with counts
                            return Object.entries(providerCounts)
                              .map(([name, count]) => count > 1 ? `${name} × ${count}` : name)
                              .join(', ');
                          } else if (instance.provider?.name) {
                            return instance.provider.name;
                          } else {
                            return 'Ninguno';
                          }
                        })()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Passengers Summary */}
          <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-blue-200">Pasajeros ({selectedPassengers.length + selectedCompanions.length})</h4>
              </div>
              {(() => {
                const totalPassengers = selectedPassengers.length + selectedCompanions.length;
                const passengerPrice = parseFloat(pricePerPassenger) || 0;
                const totalPassengerCost = passengerPrice * totalPassengers;
                
                return (
                  <div className="text-right">
                    <div className="text-sm text-blue-300 font-medium">
                      (<CurrencySymbol currency={passengerCurrency} /> {passengerPrice.toFixed(2)} × {totalPassengers}: <CurrencySymbol currency={passengerCurrency} /> {totalPassengerCost.toFixed(2)})
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="space-y-3">
              {selectedPassengers.map((passenger) => (
                <div key={passenger._id} className="bg-dark-800/50 border border-blue-500/20 rounded-lg p-3">
                  <h5 className="font-medium text-dark-100">{passenger.name} {passenger.surname}</h5>
                  <div className="text-sm text-dark-300">
                    {passenger.phone && <span>Tel.: {passenger.phone}</span>}
                    {passenger.passportNumber && <span className="ml-4">Pasaporte: {passenger.passportNumber}</span>}
                  </div>
                </div>
              ))}
              
              {selectedCompanions.map((companion) => (
                <div key={companion._id} className="bg-dark-800/50 border border-blue-500/20 rounded-lg p-3">
                  <h5 className="font-medium text-dark-100">{companion.name} {companion.surname}</h5>
                  <div className="text-sm text-dark-300">
                    {companion.phone && <span>Tel.: {companion.phone}</span>}
                    {companion.passportNumber && <span className="ml-4">Pasaporte: {companion.passportNumber}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Service Entry Modal */}
      <ServiceEntryModal
        isOpen={showServiceEntryModal}
        onClose={() => setShowServiceEntryModal(false)}
        serviceType={selectedServiceType}
        onServiceAdded={handleServiceAdded}
      />

    </>
  );
};

export default NewSaleWizardSteps;

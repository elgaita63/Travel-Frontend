import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import PassportImagePasteArea from './PassportImagePasteArea';

/** Categoría Flight en BD o nombre tipo "Aéreo" / "aereo" legacy */
const isFlightLikeService = (st) => {
  if (!st) return false;
  if (st.category === 'Flight') return true;
  if (typeof st.name === 'string' && /a[eé]reo/i.test(st.name)) return true;
  return false;
};

const ServiceEntryModal = ({ isOpen, onClose, serviceType, onServiceAdded }) => {
  const [serviceDescription, setServiceDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isFlight = isFlightLikeService(serviceType);
  const [flightImageFile, setFlightImageFile] = useState(null);
  const [flightPreviewUrl, setFlightPreviewUrl] = useState('');
  const [flightExtracting, setFlightExtracting] = useState(false);
  const [flightError, setFlightError] = useState('');

  useEffect(() => {
    if (!flightImageFile) {
      setFlightPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(flightImageFile);
    setFlightPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [flightImageFile]);

  const resetForm = () => {
    setServiceDescription('');
    setError('');
    setFlightImageFile(null);
    setFlightPreviewUrl('');
    setFlightExtracting(false);
    setFlightError('');
  };

  const applyFlightImage = (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      setFlightError('Usá una imagen (JPEG, PNG, GIF o WebP).');
      return;
    }
    setFlightError('');
    setFlightImageFile(file);
  };

  const handleExtractFlightDescription = async () => {
    if (!flightImageFile) {
      setFlightError('Subí o pegá una imagen del vuelo / itinerario.');
      return;
    }
    setFlightExtracting(true);
    setFlightError('');
    try {
      const fd = new FormData();
      fd.append('passportImage', flightImageFile);
      const res = await api.post('/api/service-types/flight-description-from-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success && res.data.data?.description) {
        const next = String(res.data.data.description).trim();
        setServiceDescription((prev) => {
          const p = prev?.trim();
          if (!p) return next;
          return `${p}\n\n${next}`;
        });
      } else {
        setFlightError(res.data?.message || 'No se pudo extraer la descripción');
      }
    } catch (e) {
      setFlightError(e.response?.data?.message || 'Error al extraer con IA');
    } finally {
      setFlightExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!serviceDescription?.trim()) {
      setError('La descripción del servicio es obligatoria');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const serviceCard = {
        id: `service_${serviceType._id}_${Date.now()}`,
        serviceTypeId: serviceType._id,
        serviceTypeName: serviceType.name,
        serviceDescription: serviceDescription.trim(),
        timestamp: new Date().toISOString()
      };

      if (onServiceAdded) {
        onServiceAdded(serviceCard);
      }

      resetForm();
      onClose();
    } catch (err) {
      console.error('Failed to create service:', err);
      setError('No se pudo crear el servicio');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-dark-800/95 backdrop-blur-md rounded-lg p-6 w-full max-w-lg mx-auto shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-dark-100">Datos del servicio</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-dark-400 hover:text-dark-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
            <h4 className="font-medium text-dark-100">Tipo de servicio: {serviceType?.name}</h4>
          </div>

          {isFlight && (
            <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-4 space-y-3">
              <div>
                <h5 className="text-sm font-semibold text-violet-200">Itinerario / vuelo (IA)</h5>
                <p className="text-xs text-dark-400 mt-1">
                  Subí o pegá una imagen del itinerario, e-ticket o confirmación. La IA completará la descripción abajo
                  (podés editarla después).
                </p>
              </div>

              {flightError && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/25 rounded text-amber-200 text-xs">
                  {flightError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => applyFlightImage(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={flightExtracting || loading}
                    />
                    <button
                      type="button"
                      className="btn-secondary text-sm w-full py-2 pointer-events-none"
                    >
                      Elegir imagen del vuelo
                    </button>
                  </div>
                  <PassportImagePasteArea
                    onImageFile={applyFlightImage}
                    disabled={flightExtracting || loading}
                  />
                  <button
                    type="button"
                    onClick={handleExtractFlightDescription}
                    disabled={flightExtracting || loading || !flightImageFile}
                    className="w-full px-3 py-2 text-sm font-medium rounded-md bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {flightExtracting ? 'Extrayendo…' : 'Extraer descripción con IA'}
                  </button>
                </div>
                <div className="rounded-lg border border-white/10 bg-dark-900/40 p-2 min-h-[120px]">
                  <div className="text-[11px] text-dark-500 mb-1">Vista previa</div>
                  {flightPreviewUrl ? (
                    <img
                      src={flightPreviewUrl}
                      alt="Itinerario"
                      className="w-full max-h-40 object-contain rounded"
                    />
                  ) : (
                    <p className="text-xs text-dark-500">Sin imagen</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="serviceDescription" className="block text-sm font-medium text-dark-200 mb-2">
              Descripción del servicio *
            </label>
            <textarea
              id="serviceDescription"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              className="input-field w-full min-h-[7rem] resize-y"
              placeholder={
                isFlight
                  ? 'Completá manualmente o usá IA con una imagen del itinerario arriba…'
                  : 'Descripción del servicio…'
              }
              required
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-dark-300 bg-dark-700 hover:bg-dark-600 border border-white/10 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || flightExtracting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Agregando…' : 'Agregar servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ServiceEntryModal;

import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { API_BASE_URL } from '../config/api';
import PassportImagePasteArea from './PassportImagePasteArea';

const formatApiError = (data) => {
  if (!data) return 'Error de red o respuesta vacía';
  if (data.message) return data.message;
  if (data.error) {
    if (Array.isArray(data.errors) && data.errors.length) {
      const parts = data.errors.map((e) => e.message || e.msg || JSON.stringify(e)).filter(Boolean);
      return parts.length ? `${data.error}: ${parts.join(' · ')}` : data.error;
    }
    return data.error;
  }
  return 'No se pudo completar la operación';
};

const SEAT_OPTIONS = [
  { value: 'window', label: 'Ventana' },
  { value: 'aisle', label: 'Pasillo' },
  { value: 'middle', label: 'Medio' },
  { value: 'no_preference', label: 'Sin preferencia' }
];

const MEAL_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'vegetarian', label: 'Vegetariano' },
  { value: 'vegan', label: 'Vegano' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'gluten_free', label: 'Sin gluten' },
  { value: 'no_preference', label: 'Sin preferencia' }
];

const VISA_STATUS_OPTIONS = [
  { value: 'not_required', label: 'No requiere' },
  { value: 'required', label: 'Requerido' },
  { value: 'applied', label: 'Solicitado' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'expired', label: 'Vencido' }
];

const PASSENGER_STATUS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'deceased', label: 'Fallecido' }
];

const PassengerForm = ({ clientId, onPassengerAdded, onCancel, showExistingPicker = true }) => {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    dni: '',
    email: '',
    phone: '',
    dob: '',
    passportNumber: '',
    nationality: '',
    expirationDate: '',
    gender: '',
    specialRequests: '',
    seatPreference: 'no_preference',
    mealPreference: 'no_preference',
    medicalInfo: '',
    frequentFlyerNumber: '',
    visaRequired: false,
    visaStatus: 'not_required',
    visaExpiryDate: '',
    visaNumber: '',
    status: 'active'
  });
  const [passportImage, setPassportImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [shouldSaveImage, setShouldSaveImage] = useState(false); // Switch SÍ/NO
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [existingSearch, setExistingSearch] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!showExistingPicker || !clientId) return undefined;
    const timer = setTimeout(async () => {
      try {
        setLoadingCandidates(true);
        const res = await api.get(`/api/clients/${clientId}/companion-candidates`, {
          params: { search: existingSearch, limit: 50 }
        });
        if (res.data?.success) setCandidates(res.data.data?.candidates || []);
      } catch (err) {
        console.error(err);
        setCandidates([]);
      } finally {
        setLoadingCandidates(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [existingSearch, clientId, showExistingPicker]);

  const linkExistingPassenger = async (c) => {
    setLinking(true);
    setError('');
    try {
      const res = await api.post(`/api/clients/${clientId}/passengers/from-existing`, {
        sourceClientId: c.id
      });
      if (res.data?.success && res.data.data?.passenger) {
        onPassengerAdded(res.data.data.passenger);
        setSuccess('¡Pasajero vinculado con éxito!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(formatApiError(res.data));
      }
    } catch (err) {
      setError(formatApiError(err.response?.data));
    } finally {
      setLinking(false);
    }
  };

  const handleChange = (e) => {
    const { name, type, checked } = e.target;
    let value = e.target.value;

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      setError('');
      if (validationErrors[name]) {
        setValidationErrors((prev) => ({ ...prev, [name]: '' }));
      }
      return;
    }

    if (name === 'dni') {
      value = value.replace(/\D/g, '');
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const applyPassportImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPassportImage(file);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) applyPassportImageFile(file);
  };

  const handleOpenAIExtraction = async () => {
    if (!passportImage) {
      setError('Subí una imagen con los datos del pasajero');
      return;
    }

    setOcrLoading(true);
    setError('');

    try {
      const uploadData = new FormData();
      uploadData.append('passportImage', passportImage);

      const response = await fetch(`${API_BASE_URL}/api/clients/ocr`, {
        method: 'POST',
        body: uploadData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        const extractedData = result.data.extractedData;
        
        setFormData(prev => ({
          ...prev,
          name: extractedData.name || prev.name,
          surname: extractedData.surname || prev.surname,
          passportNumber: extractedData.passportNumber || prev.passportNumber,
          dni: extractedData.dni || prev.dni,
          nationality: extractedData.nationality || prev.nationality,
          dob: extractedData.dob || prev.dob,
          expirationDate: extractedData.expirationDate || prev.expirationDate,
          email: extractedData.email || prev.email,
          phone: extractedData.phone || prev.phone,
          gender: extractedData.gender || prev.gender
        }));

        setSuccess(`Datos extraidos ! (confianza: ${result.data.confidence}%)`);
      } else {
        setError(result.message || 'Error al extraer datos de la imagen');
      }
    } catch (error) {
      setError('Error al extraer datos de la imagen');
    } finally {
      setOcrLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setValidationErrors({});

    try {
      // Validate required fields first
      if (!formData.name?.trim()) {
        setValidationErrors({ name: 'El Nombre es obligatorio' });
        setError('Por favor, completá todos los campos obligatorios');
        setLoading(false);
        return;
      }
      
      if (!formData.surname?.trim()) {
        setValidationErrors({ surname: 'El Apellido es obligatorio' });
        setError('Por favor, completá todos los campos obligatorios');
        setLoading(false);
        return;
      }
      
      const dniDigits = formData.dni.replace(/\D/g, '');
      const passportTrim = formData.passportNumber?.trim() || '';
      if (!dniDigits && !passportTrim) {
        setValidationErrors({ dni: 'Indicá DNI o pasaporte' });
        setError('Debés cargar DNI/CUIT o número de pasaporte (al menos uno)');
        setLoading(false);
        return;
      }

      // Clean up form data
      const cleanedFormData = {
        name: formData.name.trim(),
        surname: formData.surname.trim()
      };
      if (dniDigits.length >= 7) cleanedFormData.dni = dniDigits;
      if (passportTrim) cleanedFormData.passportNumber = passportTrim;
      
      if (formData.email?.trim()) cleanedFormData.email = formData.email.trim();
      if (formData.phone?.trim()) cleanedFormData.phone = formData.phone.trim();
      if (formData.dob) cleanedFormData.dob = new Date(formData.dob).toISOString().split('T')[0];
      if (formData.passportNumber?.trim()) cleanedFormData.passportNumber = formData.passportNumber.trim();
      if (formData.nationality?.trim()) cleanedFormData.nationality = formData.nationality.trim();
      if (formData.expirationDate) cleanedFormData.expirationDate = new Date(formData.expirationDate).toISOString().split('T')[0];
      if (formData.gender) cleanedFormData.gender = formData.gender;
      if (formData.specialRequests?.trim()) cleanedFormData.specialRequests = formData.specialRequests.trim();
      cleanedFormData.seatPreference = formData.seatPreference || 'no_preference';
      cleanedFormData.mealPreference = formData.mealPreference || 'no_preference';
      cleanedFormData.status = formData.status || 'active';
      if (formData.medicalInfo?.trim()) cleanedFormData.medicalInfo = formData.medicalInfo.trim();
      if (formData.frequentFlyerNumber?.trim()) cleanedFormData.frequentFlyerNumber = formData.frequentFlyerNumber.trim();

      if (cleanedFormData.dni && (cleanedFormData.dni.length < 7 || cleanedFormData.dni.length > 20)) {
        setValidationErrors({ dni: 'DNI debe tener entre 7 y 20 dígitos' });
        setError('Revisá el DNI o usá solo pasaporte');
        setLoading(false);
        return;
      }

      const visaInfoPayload = JSON.stringify({
        required: !!formData.visaRequired,
        status: formData.visaStatus || 'not_required',
        expiryDate: formData.visaExpiryDate || null,
        visaNumber: (formData.visaNumber || '').trim()
      });

      const finalPayload = new FormData();
      Object.keys(cleanedFormData).forEach((key) => {
        finalPayload.append(key, cleanedFormData[key]);
      });
      finalPayload.append('visaInfo', visaInfoPayload);

      // Lógica unificada con el Titular: Si el toggle está en SI, mandamos el archivo físico
      if (shouldSaveImage && passportImage) {
        finalPayload.append('passportImage', passportImage);
      }

      const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/passengers`, {
        method: 'POST',
        body: finalPayload,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        onPassengerAdded(responseData.data.passenger);
        setFormData({
          name: '',
          surname: '',
          dni: '',
          email: '',
          phone: '',
          dob: '',
          passportNumber: '',
          nationality: '',
          expirationDate: '',
          gender: '',
          specialRequests: '',
          seatPreference: 'no_preference',
          mealPreference: 'no_preference',
          medicalInfo: '',
          frequentFlyerNumber: '',
          visaRequired: false,
          visaStatus: 'not_required',
          visaExpiryDate: '',
          visaNumber: '',
          status: 'active'
        });
        setPassportImage(null);
        setImagePreview(null);
        setSuccess('¡Acompañante agregado con éxito!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(formatApiError(responseData));
      }
    } catch (error) {
      setError(error?.message || 'Error al agregar el acompañante');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-medium text-dark-100 mb-4">Agregar acompañante</h3>

      <h4 className="text-md font-medium text-dark-200 mb-3">Cargar datos nuevos</h4>
      <p className="text-xs text-dark-500 mb-3">DNI o pasaporte obligatorio (al menos uno). No afecta a otros titulares.</p>
      
      {error && (
        <div className="bg-error-500/10 border border-error-500/20 text-error-400 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-md mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Passport Image Upload */}
        <div className="card p-4">
          <h4 className="text-sm font-medium text-dark-400 mb-3">Extracción de Datos</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-dark-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500 file:text-white hover:file:bg-primary-600"
              />
              <PassportImagePasteArea onImageFile={applyPassportImageFile} disabled={ocrLoading} />
              
              {passportImage && (
                <button
                  type="button"
                  onClick={handleOpenAIExtraction}
                  disabled={ocrLoading}
                  className="mt-2 w-full btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {ocrLoading ? 'Procesando con OpenAI...' : 'Extraer Datos con OpenAI'}
                </button>
              )}
            </div>

            {imagePreview && (
              <div>
                <h5 className="text-sm font-medium text-dark-400 mb-2">Imagen Subida</h5>
                <img
                  src={imagePreview}
                  alt="Passport preview"
                  className="max-w-full h-32 object-contain border border-white/10 rounded"
                />
              </div>
            )}
          </div>
        </div>

        {/* Passenger Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={`input-field text-sm ${validationErrors.name ? 'border-red-500' : ''}`}
            />
            {validationErrors.name && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">
              Apellido *
            </label>
            <input
              type="text"
              name="surname"
              value={formData.surname}
              onChange={handleChange}
              required
              className={`input-field text-sm ${validationErrors.surname ? 'border-red-500' : ''}`}
            />
            {validationErrors.surname && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.surname}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">
              DNI/CUIT (si no cargás pasaporte)
            </label>
            <input
              type="text"
              name="dni"
              value={formData.dni}
              onChange={handleChange}
              placeholder="Solo números, 7–20 dígitos"
              maxLength={20}
              className={`input-field text-sm ${validationErrors.dni ? 'border-red-500' : ''}`}
            />
            {validationErrors.dni && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.dni}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`input-field text-sm ${validationErrors.email ? 'border-red-500' : ''}`}
            />
            {validationErrors.email && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+999"
              className={`input-field text-sm ${validationErrors.phone ? 'border-red-500' : ''}`}
            />
            {validationErrors.phone && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className={`input-field text-sm ${validationErrors.dob ? 'border-red-500' : ''}`}
            />
            {validationErrors.dob && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.dob}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">
              Género
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={`input-field text-sm ${validationErrors.gender ? 'border-red-500' : ''}`}
            >
              <option value="">Seleccionar Género</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="other">Otro</option>
            </select>
            {validationErrors.gender && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.gender}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">
              Número de pasaporte (si no cargás DNI)
            </label>
            <input
              type="text"
              name="passportNumber"
              value={formData.passportNumber}
              onChange={handleChange}
              className={`input-field text-sm ${validationErrors.passportNumber ? 'border-red-500' : ''}`}
            />
            {validationErrors.passportNumber && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.passportNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">
              Nacionalidad
            </label>
            <input
              type="text"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              className={`input-field text-sm ${validationErrors.nationality ? 'border-red-500' : ''}`}
            />
            {validationErrors.nationality && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.nationality}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">
              Fecha de Vencimiento
            </label>
            <input
              type="date"
              name="expirationDate"
              value={formData.expirationDate}
              onChange={handleChange}
              className={`input-field text-sm ${validationErrors.expirationDate ? 'border-red-500' : ''}`}
            />
            {validationErrors.expirationDate && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.expirationDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">Asiento</label>
            <select
              name="seatPreference"
              value={formData.seatPreference}
              onChange={handleChange}
              className="input-field text-sm"
            >
              {SEAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">Comida a bordo</label>
            <select
              name="mealPreference"
              value={formData.mealPreference}
              onChange={handleChange}
              className="input-field text-sm"
            >
              {MEAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">Nº programa de millas</label>
            <input
              type="text"
              name="frequentFlyerNumber"
              value={formData.frequentFlyerNumber}
              onChange={handleChange}
              className="input-field text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-dark-400 mb-1">Información médica</label>
            <textarea
              name="medicalInfo"
              value={formData.medicalInfo}
              onChange={handleChange}
              rows={2}
              placeholder="Alergias, medicación, condiciones relevantes para el viaje"
              className="input-field text-sm"
            />
          </div>

          <div className="md:col-span-2 rounded-lg border border-white/10 bg-dark-800/40 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-dark-200 cursor-pointer">
              <input type="checkbox" name="visaRequired" checked={formData.visaRequired} onChange={handleChange} className="rounded border-white/20" />
              Requiere visa para el destino
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1">Estado de la visa</label>
                <select name="visaStatus" value={formData.visaStatus} onChange={handleChange} className="input-field text-sm">
                  {VISA_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1">Vencimiento visa</label>
                <input type="date" name="visaExpiryDate" value={formData.visaExpiryDate} onChange={handleChange} className="input-field text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-dark-400 mb-1">Número de visa</label>
                <input type="text" name="visaNumber" value={formData.visaNumber} onChange={handleChange} className="input-field text-sm" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">Estado del registro</label>
            <select name="status" value={formData.status} onChange={handleChange} className="input-field text-sm">
              {PASSENGER_STATUS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Special Requests / Notes */}
        <div>
          <label className="block text-sm font-medium text-dark-400 mb-1">
            Pedidos Especiales / Notas
          </label>
          <textarea
            name="specialRequests"
            value={formData.specialRequests}
            onChange={handleChange}
            rows={3}
            placeholder="Restricciones alimentarias, condiciones médicas o de viaje..."
            className={`input-field text-sm ${validationErrors.specialRequests ? 'border-red-500' : ''}`}
          />
          {validationErrors.specialRequests && (
            <p className="text-red-400 text-xs mt-1">{validationErrors.specialRequests}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end items-center space-x-6 pt-4 border-t border-white/10">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-medium text-dark-300 uppercase">Guardar imagen: {shouldSaveImage ? 'SÍ' : 'NO'}</span>
            <button 
              type="button"
              onClick={() => setShouldSaveImage(!shouldSaveImage)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${shouldSaveImage ? 'bg-primary-600' : 'bg-dark-600'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${shouldSaveImage ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Agregando...' : 'Agregar Acompañante'}
          </button>
        </div>
      </form>

      {showExistingPicker && clientId ? (
        <div className="mt-8 p-4 rounded-lg border border-primary-500/30 bg-dark-800/40">
          <h4 className="text-sm font-semibold text-primary-300 mb-2">Segunda opción: copiar desde otro titular</h4>
          <p className="text-xs text-dark-400 mb-3">
            Solo aparecen <strong>otros titulares</strong> de la base. Se crea un acompañante nuevo con los mismos datos; no se desvincula a nadie de su grupo actual.
          </p>
          <input
            type="search"
            value={existingSearch}
            onChange={(e) => setExistingSearch(e.target.value)}
            placeholder="Buscar por nombre, apellido, DNI, pasaporte o email…"
            className="input-field text-sm w-full mb-3"
          />
          <div className="max-h-48 overflow-y-auto space-y-1 rounded border border-white/10">
            {loadingCandidates ? (
              <div className="p-3 text-sm text-dark-400">Buscando…</div>
            ) : candidates.length === 0 ? (
              <div className="p-3 text-sm text-dark-500">No hay coincidencias.</div>
            ) : (
              candidates.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm border-b border-white/5 hover:bg-white/5"
                >
                  <span className="text-dark-100">{c.label}</span>
                  <button
                    type="button"
                    disabled={linking}
                    onClick={() => linkExistingPassenger(c)}
                    className="btn-primary text-xs py-1 px-2 shrink-0 disabled:opacity-50"
                  >
                    {linking ? '…' : 'Copiar como acompañante'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

    </div>
  );
};

export default PassengerForm;
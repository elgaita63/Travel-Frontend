import React, { useState } from 'react';
import api from '../utils/api';
import { API_BASE_URL } from '../config/api';

const PassengerForm = ({ clientId, onPassengerAdded, onCancel }) => {
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
    specialRequests: ''
  });
  const [passportImage, setPassportImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [shouldSaveImage, setShouldSaveImage] = useState(false); // Switch SÍ/NO
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    let value = e.target.value;
    
    // For DNI field, only allow numbers
    if (e.target.name === 'dni') {
      value = value.replace(/\D/g, '');
    }
    
    setFormData({
      ...formData,
      [e.target.name]: value
    });
    setError('');
    // Clear validation error for this field when user starts typing
    if (validationErrors[e.target.name]) {
      setValidationErrors(prev => ({
        ...prev,
        [e.target.name]: ''
      }));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPassportImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
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
      
      if (!formData.dni?.trim()) {
        setValidationErrors({ dni: 'El DNI/CUIT es obligatorio' });
        setError('Por favor, completá todos los campos obligatorios');
        setLoading(false);
        return;
      }

      // Clean up form data
      const cleanedFormData = {
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        dni: formData.dni.replace(/\D/g, '')
      };
      
      if (formData.email?.trim()) cleanedFormData.email = formData.email.trim();
      if (formData.phone?.trim()) cleanedFormData.phone = formData.phone.trim();
      if (formData.dob) cleanedFormData.dob = new Date(formData.dob).toISOString().split('T')[0];
      if (formData.passportNumber?.trim()) cleanedFormData.passportNumber = formData.passportNumber.trim();
      if (formData.nationality?.trim()) cleanedFormData.nationality = formData.nationality.trim();
      if (formData.expirationDate) cleanedFormData.expirationDate = new Date(formData.expirationDate).toISOString().split('T')[0];
      if (formData.gender) cleanedFormData.gender = formData.gender;
      if (formData.specialRequests?.trim()) cleanedFormData.specialRequests = formData.specialRequests.trim();

      if (cleanedFormData.dni.length < 7 || cleanedFormData.dni.length > 20) {
        setValidationErrors({ dni: 'DNI must be between 7 and 20 characters' });
        setError('Por favor, ingresá un DNI válido');
        setLoading(false);
        return;
      }

      const finalPayload = new FormData();
      Object.keys(cleanedFormData).forEach(key => {
        finalPayload.append(key, cleanedFormData[key]);
      });

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
          name: '', surname: '', dni: '', email: '', phone: '', dob: '',
          passportNumber: '', nationality: '', expirationDate: '', gender: '', specialRequests: ''
        });
        setPassportImage(null);
        setImagePreview(null);
        setSuccess('¡Acompañante agregado con éxito!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(responseData.message || 'Error al agregar el acompañante');
      }
    } catch (error) {
      setError('Error al agregar el acompañante');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-medium text-dark-100 mb-4">Agregar Nuevo Acompañante</h3>
      
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
              {/* File Upload */}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-dark-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500 file:text-white hover:file:bg-primary-600"
              />
              
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
              DNI/CUIT *
            </label>
            <input
              type="text"
              name="dni"
              value={formData.dni}
              onChange={handleChange}
              required
              placeholder="Ingresá DNI/CUIT (solo números)"
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
              Número de Pasaporte
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

    </div>
  );
};

export default PassengerForm;
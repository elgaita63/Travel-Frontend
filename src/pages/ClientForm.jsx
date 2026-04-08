import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import PassengerForm from '../components/PassengerForm';
import PassportImagePasteArea from '../components/PassportImagePasteArea';

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

const genderLabel = (g) => {
  if (!g) return '—';
  const m = { male: 'Masculino', female: 'Femenino', other: 'Otro' };
  return m[g] || g;
};

const ClientForm = () => {
  const [formData, setFormData] = useState({
    name: '', surname: '', dni: '', dob: '', email: '', phone: '',
    passportNumber: '', nationality: '', expirationDate: '', gender: '',
    specialRequests: '', passportImage: '',
    addressStreet: '', addressCity: '', addressState: '', addressCountry: '', addressZipCode: '',
    emergencyName: '', emergencyPhone: '', emergencyRelationship: '',
    preferencesDietary: '', preferencesMedical: '',
    npEmail: true,
    npWhatsapp: true,
    npSms: false,
    npTripReminders: true,
    npReturnNotifications: true,
    npPassportExpiry: true,
    npMarketingEmails: false,
    status: 'active'
  });
  const [shouldSaveImage, setShouldSaveImage] = useState(false);
  const [passportImage, setPassportImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [createdClientId, setCreatedClientId] = useState(null);
  const [titularSummary, setTitularSummary] = useState(null);
  const [companionsLoaded, setCompanionsLoaded] = useState([]);
  const [showPassengerForm, setShowPassengerForm] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          ...result.data.extractedData
        }));
        setSuccess('Datos extraidos !');
      } else {
        setError(result.message || 'Error al extraer datos de la imagen');
      }
    } catch (err) {
      setError('Error al extraer datos de la imagen');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmitTitular = async (e) => {
    e.preventDefault();
    if (createdClientId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const dniDigits = (formData.dni || '').replace(/\D/g, '');
      const passportTrim = (formData.passportNumber || '').trim();
      if (!dniDigits && !passportTrim) {
        setError('Debés cargar DNI/CUIT o número de pasaporte (al menos uno)');
        setLoading(false);
        return;
      }
      const phoneTrim = (formData.phone || '').trim();
      const emailTrim = (formData.email || '').trim();
      if (!phoneTrim && !emailTrim) {
        setError('Debés cargar teléfono celular o email (al menos uno)');
        setLoading(false);
        return;
      }

      const finalPayload = new FormData();
      const { passportImage: _pi, ...rest } = formData;

      finalPayload.append('name', rest.name.trim());
      finalPayload.append('surname', rest.surname.trim());
      if (dniDigits) finalPayload.append('dni', dniDigits);
      if (passportTrim) finalPayload.append('passportNumber', passportTrim);
      if (rest.dob) finalPayload.append('dob', rest.dob);
      if (emailTrim) finalPayload.append('email', emailTrim);
      if (phoneTrim) finalPayload.append('phone', phoneTrim);
      if (rest.gender) finalPayload.append('gender', rest.gender);
      if (rest.nationality?.trim()) finalPayload.append('nationality', rest.nationality.trim());
      if (rest.expirationDate) finalPayload.append('expirationDate', rest.expirationDate);
      finalPayload.append(
        'preferences',
        JSON.stringify({
          dietary: rest.preferencesDietary?.trim() || '',
          medical: rest.preferencesMedical?.trim() || '',
          specialRequests: rest.specialRequests?.trim() || ''
        })
      );
      finalPayload.append(
        'address',
        JSON.stringify({
          street: rest.addressStreet?.trim() || '',
          city: rest.addressCity?.trim() || '',
          state: rest.addressState?.trim() || '',
          country: rest.addressCountry?.trim() || '',
          zipCode: rest.addressZipCode?.trim() || ''
        })
      );
      finalPayload.append(
        'emergencyContact',
        JSON.stringify({
          name: rest.emergencyName?.trim() || '',
          phone: rest.emergencyPhone?.trim() || '',
          relationship: rest.emergencyRelationship?.trim() || ''
        })
      );
      finalPayload.append(
        'notificationPreferences',
        JSON.stringify({
          email: !!rest.npEmail,
          whatsapp: !!rest.npWhatsapp,
          sms: !!rest.npSms,
          tripReminders: !!rest.npTripReminders,
          returnNotifications: !!rest.npReturnNotifications,
          passportExpiry: !!rest.npPassportExpiry,
          marketingEmails: !!rest.npMarketingEmails
        })
      );
      if (rest.status) finalPayload.append('status', rest.status);

      if (shouldSaveImage && passportImage) {
        finalPayload.append('passportImage', passportImage);
      }

      const response = await fetch(`${API_BASE_URL}/api/clients`, {
        method: 'POST',
        body: finalPayload,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        const client = responseData.data.client;
        const id = client._id || client.id;
        setCreatedClientId(id);
        setTitularSummary({
          name: client.name,
          surname: client.surname,
          dni: client.dni || '',
          passportNumber: client.passportNumber || '',
          email: client.email || '',
          phone: client.phone || '',
          nationality: client.nationality || '',
          gender: client.gender || ''
        });
        setSuccess('Pasajero titular registrado. Podés cargar acompañantes o finalizar cuando termines.');
      } else {
        setError(formatApiError(responseData));
      }
    } catch (err) {
      setError('Error al crear el pasajero titular');
    } finally {
      setLoading(false);
    }
  };

  const handlePassengerAdded = (newPassenger) => {
    setCompanionsLoaded(prev => [...prev, newPassenger]);
    setShowPassengerForm(false);
  };

  const handleFinish = () => {
    navigate('/clients');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-100">Agregar pasajero titular</h1>
        <p className="mt-1 text-sm text-dark-400">
          Obligatorio: <strong>DNI o pasaporte</strong> (al menos uno) y <strong>teléfono celular o email</strong> (al menos uno). Luego podés cargar acompañantes en esta misma pantalla.
        </p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-md mb-4">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-md mb-4">{success}</div>}

      {/* Lista de personas ya cargadas */}
      {(titularSummary || companionsLoaded.length > 0) && (
        <div className="card p-5 mb-6 border border-white/10">
          <h3 className="text-base font-semibold text-dark-200 uppercase tracking-wide mb-4">Personas cargadas</h3>
          <ul className="space-y-5 text-dark-100">
            {titularSummary && (
              <li className="border-b border-white/10 pb-4">
                <div className="text-lg font-bold text-primary-400 mb-2">Titular</div>
                <div className="text-xl font-semibold text-dark-100 mb-2">
                  {titularSummary.name} {titularSummary.surname}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-base text-dark-200">
                  <p><span className="text-dark-500">DNI: </span>{titularSummary.dni || '—'}</p>
                  <p><span className="text-dark-500">Pasaporte: </span>{titularSummary.passportNumber || '—'}</p>
                  <p><span className="text-dark-500">Género: </span>{genderLabel(titularSummary.gender)}</p>
                  <p><span className="text-dark-500">Nacionalidad: </span>{titularSummary.nationality || '—'}</p>
                  <p><span className="text-dark-500">Teléfono: </span>{titularSummary.phone || '—'}</p>
                  <p><span className="text-dark-500">Email: </span>{titularSummary.email || '—'}</p>
                </div>
              </li>
            )}
            {companionsLoaded.map((p) => (
              <li key={p._id || p.id} className="pl-3 border-l-4 border-primary-500/40 pb-4 border-b border-white/5 last:border-b-0">
                <div className="text-lg font-bold text-dark-300 mb-2">Acompañante</div>
                <div className="text-xl font-semibold text-dark-100 mb-2">
                  {p.name} {p.surname}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-base text-dark-200">
                  <p><span className="text-dark-500">DNI: </span>{p.dni || '—'}</p>
                  <p><span className="text-dark-500">Pasaporte: </span>{p.passportNumber || '—'}</p>
                  <p><span className="text-dark-500">Género: </span>{genderLabel(p.gender)}</p>
                  <p><span className="text-dark-500">Nacionalidad: </span>{p.nationality || '—'}</p>
                  <p><span className="text-dark-500">Teléfono: </span>{p.phone || '—'}</p>
                  <p><span className="text-dark-500">Email: </span>{p.email || '—'}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!createdClientId ? (
        <form onSubmit={handleSubmitTitular} className="space-y-6">
          <div className="bg-dark-700/50 p-6 rounded-lg border border-white/10">
            <h3 className="text-lg font-medium text-dark-100 mb-4">Imagen con datos del Pasajero</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">Subir Imagen</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-dark-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-400 hover:file:bg-primary-500/30"
                />
                <PassportImagePasteArea onImageFile={applyPassportImageFile} disabled={ocrLoading} />

                {passportImage && (
                  <button
                    type="button"
                    onClick={handleOpenAIExtraction}
                    disabled={ocrLoading}
                    className="mt-3 w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {ocrLoading ? 'Procesando con OpenAI...' : 'Extraer Datos con OpenAI'}
                  </button>
                )}
              </div>
              {imagePreview && (
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Vista Previa de la Imagen</label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-4">
                    <img src={imagePreview} alt="Preview" className="max-w-full h-48 object-contain mx-auto" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-dark-200">Nombre *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200">Apellido *</label>
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200">DNI/CUIT (si no cargás pasaporte)</label>
              <input
                type="text"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200">Fecha de Nacimiento</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200">Email (obligatorio si no hay teléfono)</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200">Teléfono celular (obligatorio si no hay email)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+549..."
                className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200">Género</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20"
              >
                <option value="">Seleccionar Género</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200">Número de pasaporte (si no cargás DNI)</label>
              <input
                type="text"
                name="passportNumber"
                value={formData.passportNumber}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200">Nacionalidad</label>
              <input
                type="text"
                name="nationality"
                value={formData.nationality}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200">Fecha de Vencimiento</label>
              <input
                type="date"
                name="expirationDate"
                value={formData.expirationDate}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20"
              />
            </div>
          </div>

          <div className="bg-dark-700/50 p-6 rounded-lg border border-white/10 space-y-4">
            <h3 className="text-lg font-medium text-dark-100">Dirección</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-dark-200">Calle y número</label>
                <input type="text" name="addressStreet" value={formData.addressStreet} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200">Ciudad</label>
                <input type="text" name="addressCity" value={formData.addressCity} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200">Provincia / Estado</label>
                <input type="text" name="addressState" value={formData.addressState} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200">País</label>
                <input type="text" name="addressCountry" value={formData.addressCountry} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200">Código postal</label>
                <input type="text" name="addressZipCode" value={formData.addressZipCode} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" />
              </div>
            </div>
          </div>

          <div className="bg-dark-700/50 p-6 rounded-lg border border-white/10 space-y-4">
            <h3 className="text-lg font-medium text-dark-100">Contacto de emergencia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-200">Nombre</label>
                <input type="text" name="emergencyName" value={formData.emergencyName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200">Teléfono</label>
                <input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-dark-200">Vínculo</label>
                <input type="text" name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleChange} placeholder="Ej. cónyuge, madre" className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" />
              </div>
            </div>
          </div>

          <div className="bg-dark-700/50 p-6 rounded-lg border border-white/10 space-y-4">
            <h3 className="text-lg font-medium text-dark-100">Preferencias</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-200">Dieta</label>
                <input type="text" name="preferencesDietary" value={formData.preferencesDietary} onChange={handleChange} placeholder="Vegetariano, sin gluten…" className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200">Información médica</label>
                <input type="text" name="preferencesMedical" value={formData.preferencesMedical} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-dark-200">Pedidos especiales / notas</label>
                <textarea name="specialRequests" value={formData.specialRequests} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" />
              </div>
            </div>
          </div>

          <div className="bg-dark-700/50 p-6 rounded-lg border border-white/10 space-y-4">
            <h3 className="text-lg font-medium text-dark-100">Notificaciones</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-dark-200">
              {[
                ['npEmail', 'Email'],
                ['npWhatsapp', 'WhatsApp'],
                ['npSms', 'SMS'],
                ['npTripReminders', 'Recordatorios de viaje'],
                ['npReturnNotifications', 'Avisos de regreso'],
                ['npPassportExpiry', 'Vencimiento de pasaporte'],
                ['npMarketingEmails', 'Marketing']
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name={key} checked={!!formData[key]} onChange={handleChange} className="rounded border-white/20" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-dark-700/50 p-6 rounded-lg border border-white/10">
            <label className="block text-sm font-medium text-dark-200 mb-2">Estado del registro</label>
            <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full max-w-md px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </div>

          <div className="flex justify-end items-center space-x-6 pt-6 border-t border-white/10">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-dark-300 uppercase">Guardar imagen: {shouldSaveImage ? 'SÍ' : 'NO'}</span>
              <button
                type="button"
                onClick={() => setShouldSaveImage(!shouldSaveImage)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${shouldSaveImage ? 'bg-primary-600' : 'bg-dark-600'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shouldSaveImage ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/clients')}
              className="px-4 py-2 text-sm font-medium text-dark-300 bg-dark-700/50 border border-white/10 rounded-md"
            >
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50">
              {loading ? 'Agregando...' : 'Agregar pasajero titular'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-dark-700/30 p-4 rounded-lg border border-white/10">
            <p className="text-sm text-dark-300">
              Datos del titular ya guardados. Usá <strong className="text-dark-100">Agregar acompañante</strong> para sumar personas al grupo. Cuando hayas cargado a todos, pulsá{' '}
              <strong className="text-dark-100">Finalizar y volver a la lista</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setShowPassengerForm((v) => !v)} className="btn-primary text-sm">
              {showPassengerForm ? 'Cerrar formulario de acompañante' : 'Agregar acompañante'}
            </button>
            <button type="button" onClick={handleFinish} className="btn-secondary text-sm">
              Finalizar y volver a la lista
            </button>
          </div>

          {showPassengerForm && (
            <PassengerForm
              clientId={createdClientId}
              onPassengerAdded={handlePassengerAdded}
              onCancel={() => setShowPassengerForm(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ClientForm;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import PassengerCard from '../components/PassengerCard';
import PassengerForm from '../components/PassengerForm';

const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
};

const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-AR') : '—');
const fmtDateOnly = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '—');

const genderEs = (g) => {
  if (!g) return '—';
  const m = { male: 'Masculino', female: 'Femenino', other: 'Otro' };
  return m[g] || g;
};

const statusEs = (s) => {
  const m = { active: 'Activo', inactive: 'Inactivo', blocked: 'Bloqueado' };
  return m[s] || fmt(s);
};

const emptyEditState = () => ({
  name: '',
  surname: '',
  dni: '',
  gender: '',
  email: '',
  phone: '',
  dob: '',
  passportNumber: '',
  nationality: '',
  expirationDate: '',
  status: 'active',
  address: {
    street: '',
    city: '',
    state: '',
    country: '',
    zipCode: ''
  },
  emergencyContact: {
    name: '',
    phone: '',
    relationship: ''
  },
  preferences: {
    dietary: '',
    medical: '',
    specialRequests: ''
  },
  notificationPreferences: {
    email: true,
    whatsapp: true,
    sms: false,
    tripReminders: true,
    returnNotifications: true,
    passportExpiry: true,
    marketingEmails: false
  }
});

const ClientDetails = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPassengerForm, setShowPassengerForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(emptyEditState);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [passportReplaceFile, setPassportReplaceFile] = useState(null);

  const openImageModal = async () => {
    try {
      const response = await api.get(`/api/clients/${clientId}/passport-image`);
      if (response.data.success) {
        setModalImageUrl(response.data.url);
        setShowImageModal(true);
      }
    } catch (err) {
      console.error('Error fetching signed URL:', err);
      alert('No se pudo cargar la imagen de forma segura.');
    }
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setModalImageUrl('');
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showImageModal) closeImageModal();
        else if (showEditModal) closeEditModal();
      }
    };
    if (showImageModal || showEditModal) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showImageModal, showEditModal]);

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/clients/${clientId}`);
      if (response.data.success) {
        setClient(response.data.data.client);
        setPassengers(response.data.data.passengers || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al obtener los datos del pasajero');
    } finally {
      setLoading(false);
    }
  };

  const handlePassengerAdded = (newPassenger) => {
    setPassengers((prev) => [newPassenger, ...prev]);
    setShowPassengerForm(false);
  };

  const handlePassengerUpdated = (updatedPassenger) => {
    setPassengers((prev) =>
      prev.map((p) => ((p._id || p.id) === (updatedPassenger._id || updatedPassenger.id) ? updatedPassenger : p))
    );
  };

  const handlePassengerDeleted = (passengerId) => {
    setPassengers((prev) => prev.filter((p) => (p._id || p.id) !== passengerId));
  };

  const openEditModal = () => {
    if (!client) return;
    const c = client;
    const dobStr = c.dob ? (typeof c.dob === 'string' ? c.dob.split('T')[0] : new Date(c.dob).toISOString().split('T')[0]) : '';
    const expStr = c.expirationDate
      ? (typeof c.expirationDate === 'string' ? c.expirationDate.split('T')[0] : new Date(c.expirationDate).toISOString().split('T')[0])
      : '';

    setEditFormData({
      name: c.name || '',
      surname: c.surname || '',
      dni: c.dni || '',
      gender: c.gender || '',
      email: c.email || '',
      phone: c.phone || '',
      dob: dobStr,
      passportNumber: c.passportNumber || '',
      nationality: c.nationality || '',
      expirationDate: expStr,
      status: c.status || 'active',
      address: {
        street: c.address?.street || '',
        city: c.address?.city || '',
        state: c.address?.state || '',
        country: c.address?.country || '',
        zipCode: c.address?.zipCode || ''
      },
      emergencyContact: {
        name: c.emergencyContact?.name || '',
        phone: c.emergencyContact?.phone || '',
        relationship: c.emergencyContact?.relationship || ''
      },
      preferences: {
        dietary: c.preferences?.dietary || '',
        medical: c.preferences?.medical || '',
        specialRequests: c.preferences?.specialRequests || ''
      },
      notificationPreferences: {
        email: c.notificationPreferences?.email !== false,
        whatsapp: c.notificationPreferences?.whatsapp !== false,
        sms: !!c.notificationPreferences?.sms,
        tripReminders: c.notificationPreferences?.tripReminders !== false,
        returnNotifications: c.notificationPreferences?.returnNotifications !== false,
        passportExpiry: c.notificationPreferences?.passportExpiry !== false,
        marketingEmails: !!c.notificationPreferences?.marketingEmails
      }
    });
    setPassportReplaceFile(null);
    setEditError('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditFormData(emptyEditState());
    setPassportReplaceFile(null);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    const v = type === 'checkbox' ? checked : value;
    if (name.startsWith('address.')) {
      const key = name.replace('address.', '');
      setEditFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [key]: value }
      }));
      return;
    }
    if (name.startsWith('emergencyContact.')) {
      const key = name.replace('emergencyContact.', '');
      setEditFormData((prev) => ({
        ...prev,
        emergencyContact: { ...prev.emergencyContact, [key]: value }
      }));
      return;
    }
    if (name.startsWith('preferences.')) {
      const key = name.replace('preferences.', '');
      setEditFormData((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, [key]: value }
      }));
      return;
    }
    setEditFormData((prev) => ({ ...prev, [name]: v }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      const payload = {
        name: editFormData.name,
        surname: editFormData.surname,
        dni: editFormData.dni || undefined,
        gender: editFormData.gender || undefined,
        email: editFormData.email || undefined,
        phone: editFormData.phone || undefined,
        dob: editFormData.dob || undefined,
        passportNumber: editFormData.passportNumber || undefined,
        nationality: editFormData.nationality || undefined,
        expirationDate: editFormData.expirationDate || undefined,
        status: editFormData.status,
        address: editFormData.address,
        emergencyContact: editFormData.emergencyContact,
        preferences: {
          dietary: editFormData.preferences.dietary,
          medical: editFormData.preferences.medical,
          specialRequests: editFormData.preferences.specialRequests
        },
        notificationPreferences: editFormData.notificationPreferences
      };

      if (passportReplaceFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, val]) => {
          if (val === undefined || val === null) return;
          if (typeof val === 'object') {
            fd.append(key, JSON.stringify(val));
          } else {
            fd.append(key, val);
          }
        });
        fd.append('passportImage', passportReplaceFile);
        const response = await api.put(`/api/clients/${clientId}`, fd, {
          transformRequest: [
            (data, headers) => {
              if (data instanceof FormData) {
                delete headers['Content-Type'];
              }
              return data;
            }
          ]
        });
        if (response.data.success) {
          setClient(response.data.data.client);
          closeEditModal();
        } else {
          setEditError(response.data.message || 'Error al guardar');
        }
      } else {
        const response = await api.put(`/api/clients/${clientId}`, payload);
        if (response.data.success) {
          setClient(response.data.data.client);
          closeEditModal();
        } else {
          setEditError(response.data.message || 'Error al guardar');
        }
      }
    } catch (err) {
      setEditError(err.response?.data?.message || err.response?.data?.error || 'Error al guardar los cambios');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500" />
      </div>
    );
  }
  if (error || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <div className="text-error-400 text-lg mb-4">{error || 'Pasajero no encontrado'}</div>
          <button type="button" onClick={() => navigate('/clients')} className="btn-primary">
            Volver
          </button>
        </div>
      </div>
    );
  }

  const np = client.notificationPreferences || {};
  const addr = client.address || {};
  const em = client.emergencyContact || {};
  const pref = client.preferences || {};

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <button
              type="button"
              onClick={() => navigate('/clients')}
              className="mb-4 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-base border-2 border-primary-400 text-primary-300 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 hover:from-slate-800 hover:via-blue-900 hover:to-slate-800 shadow-lg shadow-primary-900/40 transition-all"
            >
              ← Volver a Pasajeros
            </button>
            <h1 className="text-3xl font-bold text-dark-100">{client.fullName}</h1>
            <p className="text-dark-300 mt-2">Detalles del Pasajero y Acompañantes</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/sales/new', { state: { preSelectedPassenger: client } })}
            className="btn-primary self-start sm:self-center shrink-0"
          >
            Iniciar Venta
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="card p-6">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <h2 className="text-xl font-semibold text-dark-100">Información del Pasajero</h2>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary-500 bg-primary-500/15 text-primary-300 hover:bg-primary-500/25 font-semibold text-sm shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Editar
                </button>
              </div>

              <div className="space-y-5 text-sm">
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-2">Identificación</h3>
                  <dl className="grid gap-2">
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400 shrink-0">ID registro</dt><dd className="text-dark-100 break-all">{fmt(client._id)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Nombre</dt><dd className="text-dark-100">{fmt(client.name)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Apellido</dt><dd className="text-dark-100">{fmt(client.surname)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Nombre completo</dt><dd className="text-dark-100">{fmt(client.fullName)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">DNI / CUIT</dt><dd className="text-dark-100">{fmt(client.dni)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Género</dt><dd className="text-dark-100">{genderEs(client.gender)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Fecha de nacimiento</dt><dd className="text-dark-100">{fmtDateOnly(client.dob)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Edad</dt><dd className="text-dark-100">{client.age != null ? `${client.age} años` : '—'}</dd></div>
                  </dl>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-2">Contacto</h3>
                  <dl className="grid gap-2">
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Email</dt><dd className="text-dark-100 break-all">{fmt(client.email)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Teléfono</dt><dd className="text-dark-100">{fmt(client.phone)}</dd></div>
                  </dl>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-2">Documento de viaje</h3>
                  <dl className="grid gap-2">
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Nº Pasaporte</dt><dd className="text-dark-100">{fmt(client.passportNumber)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Nacionalidad</dt><dd className="text-dark-100">{fmt(client.nationality)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Vencimiento</dt><dd className="text-dark-100">{fmtDateOnly(client.expirationDate)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Pasaporte vigente</dt><dd><span className={`badge ${client.isPassportValid ? 'badge-success' : 'badge-error'}`}>{client.isPassportValid ? 'Sí' : 'No'}</span></dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Alerta vencimiento (30 días)</dt><dd className="text-dark-100">{client.passportExpiryWarning != null ? (client.passportExpiryWarning ? 'Sí' : 'No') : '—'}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Archivo imagen (servidor)</dt><dd className="text-dark-100 break-all text-xs">{fmt(client.passportImage)}</dd></div>
                  </dl>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-2">Dirección</h3>
                  <dl className="grid gap-2">
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Calle</dt><dd className="text-dark-100">{fmt(addr.street)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Ciudad</dt><dd className="text-dark-100">{fmt(addr.city)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Provincia / Estado</dt><dd className="text-dark-100">{fmt(addr.state)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">País</dt><dd className="text-dark-100">{fmt(addr.country)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">CP</dt><dd className="text-dark-100">{fmt(addr.zipCode)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Dirección formateada</dt><dd className="text-dark-100">{fmt(client.formattedAddress)}</dd></div>
                  </dl>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-2">Contacto de emergencia</h3>
                  <dl className="grid gap-2">
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Nombre</dt><dd className="text-dark-100">{fmt(em.name)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Teléfono</dt><dd className="text-dark-100">{fmt(em.phone)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Vínculo</dt><dd className="text-dark-100">{fmt(em.relationship)}</dd></div>
                  </dl>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-2">Preferencias</h3>
                  <dl className="grid gap-2">
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Dieta</dt><dd className="text-dark-100">{fmt(pref.dietary)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Médico</dt><dd className="text-dark-100">{fmt(pref.medical)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Pedidos especiales / notas</dt><dd className="text-dark-100 whitespace-pre-wrap">{fmt(pref.specialRequests)}</dd></div>
                  </dl>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-2">Notificaciones</h3>
                  <dl className="grid gap-2">
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Email</dt><dd className="text-dark-100">{fmt(np.email)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">WhatsApp</dt><dd className="text-dark-100">{fmt(np.whatsapp)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">SMS</dt><dd className="text-dark-100">{fmt(np.sms)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Recordatorios de viaje</dt><dd className="text-dark-100">{fmt(np.tripReminders)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Avisos de regreso</dt><dd className="text-dark-100">{fmt(np.returnNotifications)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Vencimiento pasaporte</dt><dd className="text-dark-100">{fmt(np.passportExpiry)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Marketing</dt><dd className="text-dark-100">{fmt(np.marketingEmails)}</dd></div>
                  </dl>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-2">Sistema</h3>
                  <dl className="grid gap-2">
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Estado</dt><dd className="text-dark-100">{statusEs(client.status)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Titular principal</dt><dd className="text-dark-100">{fmt(client.isMainClient)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">ID titular vinculado</dt><dd className="text-dark-100 break-all">{fmt(client.mainClientId)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Total gastado</dt><dd className="text-dark-100">{client.totalSpent != null ? client.totalSpent : '—'}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Último viaje</dt><dd className="text-dark-100">{fmtDateOnly(client.lastTripDate)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Creado</dt><dd className="text-dark-100">{fmtDate(client.createdAt)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Actualizado</dt><dd className="text-dark-100">{fmtDate(client.updatedAt)}</dd></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><dt className="text-dark-400">Creado por (usuario)</dt><dd className="text-dark-100 break-all">{fmt(client.createdBy)}</dd></div>
                  </dl>
                </section>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm font-medium text-dark-400">Ver imagen del pasaporte</span>
                {client.passportImage && client.passportImage.trim() !== '' ? (
                  <button
                    type="button"
                    onClick={() => openImageModal()}
                    className="text-primary-400 p-2"
                    title="Ver imagen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                ) : (
                  <span className="text-dark-500 text-sm">Sin imagen</span>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-dark-100">Acompañantes ({passengers.length})</h2>
                <button type="button" onClick={() => setShowPassengerForm(!showPassengerForm)} className="btn-primary text-sm">
                  Agregar
                </button>
              </div>
              {showPassengerForm && (
                <PassengerForm clientId={clientId} onPassengerAdded={handlePassengerAdded} onCancel={() => setShowPassengerForm(false)} />
              )}
              <div className="space-y-4 mt-4">
                {passengers.map((p) => (
                  <PassengerCard
                    key={p._id || p.id}
                    passenger={p}
                    onUpdate={handlePassengerUpdated}
                    onDelete={handlePassengerDeleted}
                    clientId={clientId}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={closeImageModal}>
          <button type="button" onClick={closeImageModal} className="absolute top-4 right-4 text-white p-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src={modalImageUrl} alt="Passport" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-lg border border-white/10 w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-dark-100 mb-6">Editar pasajero</h2>

              {editError && <div className="bg-error-500/10 border border-error-500/20 text-error-400 p-3 rounded mb-4">{editError}</div>}

              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-primary-400 mb-3">Datos principales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Nombre *</label>
                      <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} required className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Apellido *</label>
                      <input type="text" name="surname" value={editFormData.surname} onChange={handleEditChange} required className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">DNI / CUIT</label>
                      <input type="text" name="dni" value={editFormData.dni} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Género</label>
                      <select name="gender" value={editFormData.gender} onChange={handleEditChange} className="input-field text-sm w-full">
                        <option value="">—</option>
                        <option value="male">Masculino</option>
                        <option value="female">Femenino</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Email</label>
                      <input type="email" name="email" value={editFormData.email} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Teléfono</label>
                      <input type="tel" name="phone" value={editFormData.phone} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Fecha de nacimiento</label>
                      <input type="date" name="dob" value={editFormData.dob} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Nº Pasaporte</label>
                      <input type="text" name="passportNumber" value={editFormData.passportNumber} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Nacionalidad</label>
                      <input type="text" name="nationality" value={editFormData.nationality} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Vencimiento pasaporte</label>
                      <input type="date" name="expirationDate" value={editFormData.expirationDate} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Estado cuenta</label>
                      <select name="status" value={editFormData.status} onChange={handleEditChange} className="input-field text-sm w-full">
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                        <option value="blocked">Bloqueado</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-primary-400 mb-3">Dirección</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-dark-200 mb-1">Calle</label>
                      <input type="text" name="address.street" value={editFormData.address.street} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Ciudad</label>
                      <input type="text" name="address.city" value={editFormData.address.city} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Provincia / Estado</label>
                      <input type="text" name="address.state" value={editFormData.address.state} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">País</label>
                      <input type="text" name="address.country" value={editFormData.address.country} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Código postal</label>
                      <input type="text" name="address.zipCode" value={editFormData.address.zipCode} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-primary-400 mb-3">Emergencia</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Nombre contacto</label>
                      <input type="text" name="emergencyContact.name" value={editFormData.emergencyContact.name} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Teléfono</label>
                      <input type="tel" name="emergencyContact.phone" value={editFormData.emergencyContact.phone} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-dark-200 mb-1">Vínculo</label>
                      <input type="text" name="emergencyContact.relationship" value={editFormData.emergencyContact.relationship} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-primary-400 mb-3">Preferencias</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Dieta</label>
                      <input type="text" name="preferences.dietary" value={editFormData.preferences.dietary} onChange={handleEditChange} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Información médica</label>
                      <textarea name="preferences.medical" value={editFormData.preferences.medical} onChange={handleEditChange} rows={2} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Pedidos especiales / notas</label>
                      <textarea name="preferences.specialRequests" value={editFormData.preferences.specialRequests} onChange={handleEditChange} rows={3} className="input-field text-sm w-full" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-primary-400 mb-3">Notificaciones</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      [
                        ['email', 'Email'],
                        ['whatsapp', 'WhatsApp'],
                        ['sms', 'SMS'],
                        ['tripReminders', 'Recordatorios de viaje'],
                        ['returnNotifications', 'Avisos de regreso'],
                        ['passportExpiry', 'Vencimiento pasaporte'],
                        ['marketingEmails', 'Marketing']
                      ]
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-dark-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editFormData.notificationPreferences[key]}
                          onChange={(e) => {
                            setEditFormData((prev) => ({
                              ...prev,
                              notificationPreferences: { ...prev.notificationPreferences, [key]: e.target.checked }
                            }));
                          }}
                          className="rounded border-white/20"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-primary-400 mb-3">Reemplazar imagen de pasaporte</h3>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPassportReplaceFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-dark-300"
                  />
                  {passportReplaceFile && <p className="text-xs text-dark-400 mt-1">Archivo: {passportReplaceFile.name}</p>}
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                  <button type="button" onClick={closeEditModal} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" disabled={editLoading} className="btn-primary">
                    {editLoading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetails;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import PassengerCard from '../components/PassengerCard';
import PassengerForm from '../components/PassengerForm';
import PassportImagePasteArea from '../components/PassportImagePasteArea';
import { formatDateOnlyLocal } from '../utils/dateDisplay';

const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
};

const fmtDateOnly = (d) => (d != null && d !== '' ? formatDateOnlyLocal(d) : '—');

const genderEs = (g) => {
  if (!g) return '—';
  const m = { male: 'Masculino', female: 'Femenino', other: 'Otro' };
  return m[g] || g;
};

const statusEs = (s) => {
  const m = { active: 'Activo', inactive: 'Inactivo', blocked: 'Bloqueado' };
  return m[s] || fmt(s);
};

const saleStatusEs = (s) => {
  const m = { open: 'Abierta', closed: 'Cerrada', cancelled: 'Cancelada' };
  return m[s] || fmt(s);
};

const saleStatusBadgeClass = (s) => {
  switch (s) {
    case 'open':
      return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
    case 'closed':
      return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40';
    case 'cancelled':
      return 'bg-red-500/20 text-red-200 border-red-500/40';
    default:
      return 'bg-dark-600 text-dark-200 border-white/10';
  }
};

const formatSaleDestination = (d) => {
  if (!d || typeof d !== 'object') return '—';
  const parts = [d.name, d.city, d.country].filter((x) => x != null && String(x).trim() !== '');
  return parts.length ? parts.join(' · ') : '—';
};

const formatSaleMoney = (amount, currency = 'USD') => {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  const cur = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: cur === 'ARS' ? 'ARS' : 'USD',
      currencyDisplay: 'symbol',
      maximumFractionDigits: 2
    }).format(Number(amount));
  } catch {
    return `${cur} ${amount}`;
  }
};

/** Valor de texto “cargado” (no vacío). */
const loadedStr = (v) => v != null && String(v).trim() !== '';

const loadedDate = (v) => {
  if (v == null || v === '') return false;
  return !Number.isNaN(new Date(v).getTime());
};

const NP_DEFAULT = {
  email: true,
  whatsapp: true,
  sms: false,
  tripReminders: true,
  returnNotifications: true,
  passportExpiry: true,
  marketingEmails: false
};

const NP_LABELS = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  tripReminders: 'Recordatorios de viaje',
  returnNotifications: 'Avisos de regreso',
  passportExpiry: 'Vencimiento pasaporte',
  marketingEmails: 'Marketing'
};

const DetailRow = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:gap-2">
    <dt className="text-dark-400 shrink-0">{label}</dt>
    <dd className="text-dark-100 break-all whitespace-pre-wrap">{children}</dd>
  </div>
);

const DetailSection = ({ title, rows }) => {
  const list = rows.filter(Boolean);
  if (list.length === 0) return null;
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-2">{title}</h3>
      <dl className="grid gap-2">{list}</dl>
    </section>
  );
};

const emptyEditState = () => ({
  name: '',
  surname: '',
  dni: '',
  companyCuit: '',
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
  const [ventasPanelOpen, setVentasPanelOpen] = useState(false);
  const [clientSales, setClientSales] = useState([]);
  const [clientSalesLoading, setClientSalesLoading] = useState(false);
  const [clientSalesError, setClientSalesError] = useState('');

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

  useEffect(() => {
    if (!ventasPanelOpen || !clientId) return undefined;
    let cancelled = false;
    (async () => {
      setClientSalesLoading(true);
      setClientSalesError('');
      try {
        const res = await api.get(`/api/clients/${clientId}/sales`);
        if (!cancelled && res.data.success) {
          setClientSales(res.data.data.sales || []);
        }
      } catch (err) {
        if (!cancelled) {
          setClientSalesError(err.response?.data?.message || 'No se pudieron cargar las ventas');
        }
      } finally {
        if (!cancelled) setClientSalesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ventasPanelOpen, clientId]);

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
      companyCuit: c.companyCuit || '',
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
        companyCuit: editFormData.companyCuit || undefined,
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

  const composedName = [client.name, client.surname].filter((x) => loadedStr(x)).join(' ').trim();
  const showFullName =
    loadedStr(client.fullName) && client.fullName.trim().toLowerCase() !== composedName.toLowerCase();

  const hasPassportContext =
    loadedStr(client.passportNumber) ||
    loadedStr(client.nationality) ||
    loadedDate(client.expirationDate) ||
    loadedStr(client.passportImage);

  const notifDiffKeys = Object.keys(NP_DEFAULT).filter((k) => {
    const v = k in np && np[k] !== undefined ? np[k] : NP_DEFAULT[k];
    return v !== NP_DEFAULT[k];
  });
  const mainClientIdStr = client.mainClientId
    ? String(client.mainClientId._id ?? client.mainClientId).trim()
    : '';

  const identificationRows = [
    client._id ? <DetailRow key="id" label="ID registro">{fmt(client._id)}</DetailRow> : null,
    loadedStr(client.name) ? <DetailRow key="name" label="Nombre">{client.name}</DetailRow> : null,
    loadedStr(client.surname) ? <DetailRow key="surname" label="Apellido">{client.surname}</DetailRow> : null,
    showFullName ? <DetailRow key="fullName" label="Nombre completo">{client.fullName}</DetailRow> : null,
    loadedStr(client.dni) ? <DetailRow key="dni" label="DNI / CUIT">{client.dni}</DetailRow> : null,
    loadedStr(client.companyCuit) ? (
      <DetailRow key="companyCuit" label="CUIT empresa">{client.companyCuit}</DetailRow>
    ) : null,
    loadedStr(client.gender) ? <DetailRow key="gender" label="Género">{genderEs(client.gender)}</DetailRow> : null,
    loadedDate(client.dob) ? <DetailRow key="dob" label="Fecha de nacimiento">{fmtDateOnly(client.dob)}</DetailRow> : null,
    client.age != null && !Number.isNaN(Number(client.age)) ? (
      <DetailRow key="age" label="Edad">{`${client.age} años`}</DetailRow>
    ) : null
  ];

  const contactRows = [
    loadedStr(client.email) ? <DetailRow key="email" label="Email">{client.email}</DetailRow> : null,
    loadedStr(client.phone) ? <DetailRow key="phone" label="Teléfono">{client.phone}</DetailRow> : null
  ];

  const passportRows = [
    loadedStr(client.passportNumber) ? (
      <DetailRow key="passportNumber" label="Nº Pasaporte">{client.passportNumber}</DetailRow>
    ) : null,
    loadedStr(client.nationality) ? <DetailRow key="nationality" label="Nacionalidad">{client.nationality}</DetailRow> : null,
    loadedDate(client.expirationDate) ? (
      <DetailRow key="expirationDate" label="Vencimiento">{fmtDateOnly(client.expirationDate)}</DetailRow>
    ) : null,
    hasPassportContext && typeof client.isPassportValid === 'boolean' ? (
      <DetailRow key="isPassportValid" label="Pasaporte vigente">
        <span className={`badge ${client.isPassportValid ? 'badge-success' : 'badge-error'}`}>
          {client.isPassportValid ? 'Sí' : 'No'}
        </span>
      </DetailRow>
    ) : null,
    client.passportExpiryWarning != null ? (
      <DetailRow key="passportExpiryWarning" label="Alerta vencimiento (30 días)">
        {client.passportExpiryWarning ? 'Sí' : 'No'}
      </DetailRow>
    ) : null,
    loadedStr(client.passportImage) ? (
      <DetailRow key="passportImage" label="Archivo imagen (servidor)">
        <span className="text-xs break-all">{client.passportImage}</span>
      </DetailRow>
    ) : null
  ];

  const addressRows = [
    loadedStr(addr.street) ? <DetailRow key="street" label="Calle">{addr.street}</DetailRow> : null,
    loadedStr(addr.city) ? <DetailRow key="city" label="Ciudad">{addr.city}</DetailRow> : null,
    loadedStr(addr.state) ? <DetailRow key="state" label="Provincia / Estado">{addr.state}</DetailRow> : null,
    loadedStr(addr.country) ? <DetailRow key="country" label="País">{addr.country}</DetailRow> : null,
    loadedStr(addr.zipCode) ? <DetailRow key="zip" label="CP">{addr.zipCode}</DetailRow> : null,
    loadedStr(client.formattedAddress) ? (
      <DetailRow key="formattedAddress" label="Dirección formateada">{client.formattedAddress}</DetailRow>
    ) : null
  ];

  const emergencyRows = [
    loadedStr(em.name) ? <DetailRow key="emName" label="Nombre">{em.name}</DetailRow> : null,
    loadedStr(em.phone) ? <DetailRow key="emPhone" label="Teléfono">{em.phone}</DetailRow> : null,
    loadedStr(em.relationship) ? <DetailRow key="emRel" label="Vínculo">{em.relationship}</DetailRow> : null
  ];

  const prefRows = [
    loadedStr(pref.dietary) ? <DetailRow key="dietary" label="Dieta">{pref.dietary}</DetailRow> : null,
    loadedStr(pref.medical) ? <DetailRow key="medical" label="Médico">{pref.medical}</DetailRow> : null,
    loadedStr(pref.specialRequests) ? (
      <DetailRow key="specialRequests" label="Pedidos especiales / notas">{pref.specialRequests}</DetailRow>
    ) : null
  ];

  const notifRows = notifDiffKeys.map((k) => (
    <DetailRow key={k} label={NP_LABELS[k] || k}>
      {typeof np[k] === 'boolean' ? (np[k] ? 'Sí' : 'No') : fmt(np[k])}
    </DetailRow>
  ));

  const sistemaRows = [
    client.status ? <DetailRow key="status" label="Estado">{statusEs(client.status)}</DetailRow> : null,
    client.isMainClient === false ? (
      <DetailRow key="main" label="Titular principal">No (acompañante)</DetailRow>
    ) : null,
    loadedStr(mainClientIdStr) ? (
      <DetailRow key="mainClientId" label="ID titular vinculado">{mainClientIdStr}</DetailRow>
    ) : null,
    client.totalSpent != null && !Number.isNaN(Number(client.totalSpent)) ? (
      <DetailRow key="totalSpent" label="Total gastado">{String(client.totalSpent)}</DetailRow>
    ) : null,
    loadedDate(client.lastTripDate) ? (
      <DetailRow key="lastTrip" label="Último viaje">{fmtDateOnly(client.lastTripDate)}</DetailRow>
    ) : null
  ];

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
          <div className="flex flex-col gap-2 self-start sm:self-end shrink-0 w-full sm:w-auto sm:min-w-[200px]">
            <button
              type="button"
              onClick={() => navigate('/sales/new', { state: { preSelectedPassenger: client } })}
              className="btn-primary w-full"
            >
              Iniciar Venta
            </button>
            <button
              type="button"
              onClick={() => setVentasPanelOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-base w-full border-2 border-emerald-400/55 text-emerald-100 bg-emerald-500/18 hover:bg-emerald-500/28 shadow-md shadow-emerald-950/30 transition-all"
              aria-expanded={ventasPanelOpen}
            >
              Ventas realizadas
            </button>
          </div>
        </div>

        {ventasPanelOpen && (
          <div className="card p-6 mb-8 border border-emerald-500/20">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-dark-100">Ventas de este pasajero</h2>
              {clientSalesLoading && (
                <span className="text-sm text-dark-400">Cargando…</span>
              )}
            </div>
            {clientSalesError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-sm px-4 py-3 mb-4">{clientSalesError}</div>
            )}
            {!clientSalesLoading && !clientSalesError && clientSales.length === 0 && (
              <p className="text-dark-400 text-sm">No hay ventas registradas vinculadas a este pasajero.</p>
            )}
            {!clientSalesLoading && clientSales.length > 0 && (
              <ul className="divide-y divide-white/10">
                {clientSales.map((sale) => {
                  const sid = sale._id;
                  return (
                    <li key={sid}>
                      <button
                        type="button"
                        onClick={() => navigate(`/sales/${sid}`)}
                        className="w-full text-left py-4 px-1 rounded-lg hover:bg-white/5 transition-colors flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium text-dark-100 truncate">
                            {formatSaleDestination(sale.destination)}
                          </p>
                          <p className="text-sm text-dark-300">
                            <span className="text-dark-500">Nombre venta:</span>{' '}
                            {sale.nombreVenta ? String(sale.nombreVenta) : '—'}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-300">
                            <span>
                              <span className="text-dark-500">Total:</span>{' '}
                              {formatSaleMoney(sale.totalSalePrice, sale.saleCurrency)}
                            </span>
                            <span>
                              <span className="text-dark-500">Alta:</span> {fmtDateOnly(sale.createdAt)}
                            </span>
                            {sale.clientBalance != null && (
                              <span>
                                <span className="text-dark-500">Saldo cliente:</span>{' '}
                                {formatSaleMoney(sale.clientBalance, sale.saleCurrency)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${saleStatusBadgeClass(sale.status)}`}
                        >
                          {saleStatusEs(sale.status)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

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
                <DetailSection title="Identificación" rows={identificationRows} />
                <DetailSection title="Contacto" rows={contactRows} />
                <DetailSection title="Documento de viaje" rows={passportRows} />
                <DetailSection title="Dirección" rows={addressRows} />
                <DetailSection title="Contacto de emergencia" rows={emergencyRows} />
                <DetailSection title="Preferencias" rows={prefRows} />
                <DetailSection title="Notificaciones" rows={notifRows} />
                <DetailSection title="Sistema" rows={sistemaRows} />
              </div>

              {loadedStr(client.passportImage) && (
                <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
                  <span className="text-sm font-medium text-dark-400">Ver imagen del pasaporte</span>
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
                </div>
              )}
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
                      <label className="block text-sm font-medium text-dark-200 mb-1">CUIT empresa (opcional)</label>
                      <input type="text" name="companyCuit" value={editFormData.companyCuit} onChange={handleEditChange} className="input-field text-sm w-full" />
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
                  <div className="mt-3">
                    <PassportImagePasteArea
                      onImageFile={(file) => setPassportReplaceFile(file)}
                      disabled={editLoading}
                    />
                  </div>
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

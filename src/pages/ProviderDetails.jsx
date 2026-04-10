import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const PAYMENT_TERMS = [
  { value: 'immediate', label: 'Pago inmediato' },
  { value: 'net_15', label: 'Net 15 días' },
  { value: 'net_30', label: 'Net 30 días' },
  { value: 'net_45', label: 'Net 45 días' },
  { value: 'net_60', label: 'Net 60 días' }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'terminated', label: 'Terminado' }
];

const ADDRESS_FIELD_LABELS = {
  street: 'Calle y número',
  city: 'Ciudad',
  state: 'Provincia / estado',
  country: 'País',
  zipCode: 'Código postal'
};

const inputClass =
  'mt-1 block w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-dark-100 bg-dark-800/50';
const labelClass = 'block text-sm font-medium text-dark-200 mb-1';

const toDateInputValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const providerToForm = (p) => ({
  name: p.name || '',
  description: p.description || '',
  contactInfo: {
    phone: p.contactInfo?.phone || '',
    email: p.contactInfo?.email || '',
    website: p.contactInfo?.website || '',
    address: {
      street: p.contactInfo?.address?.street || '',
      city: p.contactInfo?.address?.city || '',
      state: p.contactInfo?.address?.state || '',
      country: p.contactInfo?.address?.country || '',
      zipCode: p.contactInfo?.address?.zipCode || ''
    }
  },
  rating: p.rating ?? 0,
  commissionRate: p.commissionRate ?? 10,
  paymentTerms: p.paymentTerms || 'net_30',
  status: p.status || 'active',
  contractStartDate: toDateInputValue(p.contractStartDate),
  contractEndDate: toDateInputValue(p.contractEndDate),
  specializations:
    Array.isArray(p.specializations) && p.specializations.length ? [...p.specializations] : [''],
  certifications:
    Array.isArray(p.certifications) && p.certifications.length
      ? p.certifications.map((c) => ({
          name: c.name || '',
          issuer: c.issuer || '',
          expiryDate: toDateInputValue(c.expiryDate)
        }))
      : [{ name: '', issuer: '', expiryDate: '' }],
  totalBookings: p.totalBookings ?? 0,
  totalRevenue: p.totalRevenue ?? 0
});

const ProviderDetails = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const fetchProvider = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/api/providers/${providerId}`);

      if (response.data.success) {
        const p = response.data.data.provider;
        setProvider(p);
        setFormData(providerToForm(p));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los datos del proveedor');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setSaveError('');
    if (name.startsWith('contactInfo.address.')) {
      const field = name.split('.')[2];
      setFormData((prev) => ({
        ...prev,
        contactInfo: {
          ...prev.contactInfo,
          address: { ...prev.contactInfo.address, [field]: value }
        }
      }));
    } else if (name.startsWith('contactInfo.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        contactInfo: { ...prev.contactInfo, [field]: value }
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const setSpecializationAt = (index, value) => {
    setFormData((prev) => {
      const next = [...prev.specializations];
      next[index] = value;
      return { ...prev, specializations: next };
    });
  };

  const addSpecialization = () => {
    setFormData((prev) => ({ ...prev, specializations: [...prev.specializations, ''] }));
  };

  const removeSpecialization = (index) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.filter((_, i) => i !== index)
    }));
  };

  const setCertAt = (index, field, value) => {
    setFormData((prev) => {
      const next = prev.certifications.map((c, i) => (i === index ? { ...c, [field]: value } : c));
      return { ...prev, certifications: next };
    });
  };

  const addCertification = () => {
    setFormData((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', issuer: '', expiryDate: '' }]
    }));
  };

  const removeCertification = (index) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const handleCancel = () => {
    if (provider) setFormData(providerToForm(provider));
    setSaveError('');
    setSaveSuccess('');
  };

  const buildPayload = () => {
    const specs = (formData.specializations || [])
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean);
    const certs = (formData.certifications || [])
      .filter((c) => (c.name && c.name.trim()) || (c.issuer && c.issuer.trim()))
      .map((c) => ({
        name: (c.name || '').trim(),
        issuer: (c.issuer || '').trim(),
        expiryDate: c.expiryDate || null
      }));

    return {
      name: formData.name.trim(),
      description: formData.description || '',
      contactInfo: {
        phone: formData.contactInfo?.phone || '',
        email: formData.contactInfo?.email || '',
        website: formData.contactInfo?.website || '',
        address: {
          street: formData.contactInfo?.address?.street || '',
          city: formData.contactInfo?.address?.city || '',
          state: formData.contactInfo?.address?.state || '',
          country: formData.contactInfo?.address?.country || '',
          zipCode: formData.contactInfo?.address?.zipCode || ''
        }
      },
      rating: Math.min(5, Math.max(0, parseFloat(formData.rating) || 0)),
      commissionRate: Math.min(100, Math.max(0, parseFloat(formData.commissionRate) || 0)),
      paymentTerms: formData.paymentTerms,
      status: formData.status,
      contractStartDate: formData.contractStartDate || null,
      contractEndDate: formData.contractEndDate || null,
      specializations: specs,
      certifications: certs,
      totalBookings: Math.max(0, parseInt(formData.totalBookings, 10) || 0),
      totalRevenue: Math.max(0, parseFloat(formData.totalRevenue) || 0)
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setSaveError('El nombre del proveedor es obligatorio');
      return;
    }
    if (formData.contactInfo?.phone?.length > 20) {
      setSaveError('El teléfono no puede superar 20 caracteres');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const payload = buildPayload();
      const response = await api.put(`/api/providers/${providerId}`, payload);
      if (response.data.success) {
        const updated = response.data.data.provider;
        setProvider(updated);
        setFormData(providerToForm(updated));
        setSaveSuccess('Cambios guardados correctamente');
        setTimeout(() => setSaveSuccess(''), 4000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'No se pudo guardar';
      setSaveError(typeof msg === 'string' ? msg : 'Error de validación');
    } finally {
      setSaving(false);
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
        <p className="text-dark-300 text-lg font-medium ml-4">Cargando proveedor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="notification">
          <div className="flex items-center space-x-4">
            <div className="icon-container bg-error-500">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-error-400 font-medium text-lg">{error}</span>
          </div>
          <div className="mt-4 flex space-x-4">
            <button type="button" onClick={() => navigate('/providers')} className="btn-secondary">
              Volver a proveedores
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!provider || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-3xl font-semibold text-dark-100 mb-4">Proveedor no encontrado</h3>
          <button type="button" onClick={() => navigate('/providers')} className="btn-primary">
            Volver a proveedores
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/providers')}
          className="flex items-center text-dark-300 hover:text-dark-100 mb-4 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a proveedores
        </button>
        <h1 className="text-2xl font-bold text-dark-100">Editar proveedor</h1>
        <p className="mt-1 text-sm text-dark-400">
          ID: <span className="font-mono text-dark-200">{provider.id || provider._id}</span>
          {' · '}
          Creado {new Date(provider.createdAt).toLocaleString()}
        </p>
      </div>

      {saveError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-md text-sm mb-6">{saveError}</div>
      )}
      {saveSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-3 rounded-md text-sm mb-6">{saveSuccess}</div>
      )}

      <form id="provider-edit-form" onSubmit={handleSave} className="space-y-8">
        <div className="card-glass p-6 space-y-8">
          <h2 className="text-xl font-semibold text-dark-100">Datos del proveedor</h2>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-dark-100">Datos generales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="name" className={labelClass}>
                  Nombre del proveedor *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFieldChange}
                  required
                  className={inputClass}
                  placeholder="Nombre comercial o razón social"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className={labelClass}>
                  Notas / descripción
                </label>
                <p className="text-sm text-dark-400 mb-1">Información adicional sobre el proveedor (opcional).</p>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFieldChange}
                  rows={3}
                  className={inputClass}
                  placeholder="Descripción, condiciones comerciales, observaciones..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-white/10">
            <h3 className="text-lg font-medium text-dark-100">Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contactInfo-phone" className={labelClass}>
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="contactInfo-phone"
                  name="contactInfo.phone"
                  value={formData.contactInfo.phone}
                  onChange={handleFieldChange}
                  className={inputClass}
                  placeholder="Teléfono"
                />
              </div>
              <div>
                <label htmlFor="contactInfo-email" className={labelClass}>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id="contactInfo-email"
                  name="contactInfo.email"
                  value={formData.contactInfo.email}
                  onChange={handleFieldChange}
                  className={inputClass}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="contactInfo-website" className={labelClass}>
                  Sitio web
                </label>
                <input
                  type="url"
                  id="contactInfo-website"
                  name="contactInfo.website"
                  value={formData.contactInfo.website}
                  onChange={handleFieldChange}
                  className={inputClass}
                  placeholder="https://ejemplo.com"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-white/10">
            <h3 className="text-lg font-medium text-dark-100">Dirección</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['street', 'city', 'state', 'country', 'zipCode'].map((field) => (
                <div key={field} className={field === 'street' ? 'md:col-span-2' : ''}>
                  <label htmlFor={`addr-${field}`} className={labelClass}>
                    {ADDRESS_FIELD_LABELS[field]}
                  </label>
                  <input
                    id={`addr-${field}`}
                    type="text"
                    name={`contactInfo.address.${field}`}
                    value={formData.contactInfo.address[field]}
                    onChange={handleFieldChange}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card-glass p-6">
          <h2 className="text-xl font-semibold text-dark-100 mb-4">Condiciones comerciales y contrato</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rating" className={labelClass}>
                Calificación (0–5)
              </label>
              <input
                id="rating"
                name="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formData.rating}
                onChange={handleFieldChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="commissionRate" className={labelClass}>
                Comisión (%)
              </label>
              <input
                id="commissionRate"
                name="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.commissionRate}
                onChange={handleFieldChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="paymentTerms" className={labelClass}>
                Condiciones de pago
              </label>
              <select
                id="paymentTerms"
                name="paymentTerms"
                value={formData.paymentTerms}
                onChange={handleFieldChange}
                className={inputClass}
              >
                {PAYMENT_TERMS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className={labelClass}>
                Estado
              </label>
              <select id="status" name="status" value={formData.status} onChange={handleFieldChange} className={inputClass}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="contractStartDate" className={labelClass}>
                Inicio de contrato
              </label>
              <input
                id="contractStartDate"
                name="contractStartDate"
                type="date"
                value={formData.contractStartDate}
                onChange={handleFieldChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="contractEndDate" className={labelClass}>
                Fin de contrato
              </label>
              <input
                id="contractEndDate"
                name="contractEndDate"
                type="date"
                value={formData.contractEndDate}
                onChange={handleFieldChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="totalBookings" className={labelClass}>
                Total reservas
              </label>
              <input
                id="totalBookings"
                name="totalBookings"
                type="number"
                min="0"
                value={formData.totalBookings}
                onChange={handleFieldChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="totalRevenue" className={labelClass}>
                Ingresos totales
              </label>
              <input
                id="totalRevenue"
                name="totalRevenue"
                type="number"
                min="0"
                step="0.01"
                value={formData.totalRevenue}
                onChange={handleFieldChange}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="card-glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-dark-100">Especializaciones</h2>
            <button type="button" onClick={addSpecialization} className="text-sm text-primary-400 hover:text-primary-300">
              + Agregar
            </button>
          </div>
          {formData.specializations.map((s, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                value={s}
                onChange={(e) => setSpecializationAt(index, e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="Especialización"
              />
              <button type="button" onClick={() => removeSpecialization(index)} className="text-red-400 px-2 text-sm self-center">
                Quitar
              </button>
            </div>
          ))}
        </div>

        <div className="card-glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-dark-100">Certificaciones</h2>
            <button type="button" onClick={addCertification} className="text-sm text-primary-400 hover:text-primary-300">
              + Agregar
            </button>
          </div>
          {formData.certifications.map((c, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3 border border-white/5 p-3 rounded">
              <input
                placeholder="Nombre"
                value={c.name}
                onChange={(e) => setCertAt(index, 'name', e.target.value)}
                className={inputClass}
              />
              <input
                placeholder="Emisor"
                value={c.issuer}
                onChange={(e) => setCertAt(index, 'issuer', e.target.value)}
                className={inputClass}
              />
              <input
                type="date"
                value={c.expiryDate}
                onChange={(e) => setCertAt(index, 'expiryDate', e.target.value)}
                className={inputClass}
              />
              <button type="button" onClick={() => removeCertification(index)} className="text-red-400 text-sm self-center">
                Quitar
              </button>
            </div>
          ))}
        </div>

        <div className="text-xs text-dark-500">
          Última actualización: {new Date(provider.updatedAt).toLocaleString()}
        </div>

        <div className="flex justify-end space-x-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-dark-300 bg-dark-700/50 hover:bg-dark-700 border border-white/10 rounded-md disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProviderDetails;

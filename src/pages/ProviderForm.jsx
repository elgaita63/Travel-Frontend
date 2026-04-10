import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const ProviderForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contactInfo: {
      phone: '',
      email: '',
      website: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      }
    },
    rating: 0,
    commissionRate: 10,
    paymentTerms: 'net_30',
    status: 'active',
    contractStartDate: '',
    contractEndDate: '',
    specializations: [''],
    certifications: [{ name: '', issuer: '', expiryDate: '' }],
    totalBookings: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const dismissError = () => {
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('contactInfo.address.')) {
      const addressField = name.split('.')[2];
      setFormData((prev) => ({
        ...prev,
        contactInfo: {
          ...prev.contactInfo,
          address: {
            ...prev.contactInfo.address,
            [addressField]: value
          }
        }
      }));
    } else if (name.startsWith('contactInfo.')) {
      const contactField = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        contactInfo: {
          ...prev.contactInfo,
          [contactField]: value
        }
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.contactInfo.phone.length > 20) {
      setError('El teléfono no puede superar 20 caracteres');
      setLoading(false);
      return;
    }

    try {
      const payload = buildPayload();
      const response = await api.post('/api/providers', payload);

      if (response.data.success) {
        setSuccess('Proveedor creado correctamente');
        setTimeout(() => {
          navigate('/providers');
        }, 2000);
      }
    } catch (error) {
      const errorResponse = error.response?.data;

      if (errorResponse?.message) {
        if (errorResponse.message.includes('email')) {
          setError('Ingresá un correo válido (incluí el dominio, ej. .com)');
        } else if (errorResponse.message.includes('phone')) {
          setError('Ingresá un número de teléfono válido');
        } else if (errorResponse.message.includes('name')) {
          setError('Ingresá un nombre de proveedor válido');
        } else if (errorResponse.message.includes('type')) {
          setError('Seleccioná un tipo de proveedor válido');
        } else if (errorResponse.message.includes('required')) {
          setError('Completá los campos obligatorios');
        } else {
          setError(errorResponse.message);
        }
      } else if (error.code === 'ECONNREFUSED') {
        setError('No se pudo conectar al servidor. Revisá tu conexión e intentá de nuevo.');
      } else if (error.response?.status === 400) {
        setError('Revisá los datos ingresados e intentá de nuevo.');
      } else if (error.response?.status === 401) {
        setError('No tenés autorización. Iniciá sesión de nuevo.');
      } else if (error.response?.status === 500) {
        setError('Error del servidor. Intentá más tarde o contactá soporte.');
      } else {
        setError('No se pudo crear el proveedor. Intentá de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-100">Nuevo proveedor</h1>
        <p className="mt-1 text-sm text-dark-400">
          Alta de un proveedor de servicios (hotel, aéreo, traslado, excursión, seguro, etc.)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
              <button
                type="button"
                onClick={dismissError}
                className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-full hover:bg-red-500/10"
                title="Cerrar"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-md">{success}</div>
        )}

        {/* Datos que ya se podían cargar: identificación + contacto (mismo estilo que edición) */}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Condiciones comerciales y contrato (alineado con edición) */}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
              <select id="status" name="status" value={formData.status} onChange={handleChange} className={inputClass}>
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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

        <div className="flex justify-end space-x-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => navigate('/providers')}
            className="px-4 py-2 text-sm font-medium text-dark-300 bg-dark-700/50 hover:bg-dark-700 border border-white/10 rounded-md"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando…' : 'Crear proveedor'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProviderForm;

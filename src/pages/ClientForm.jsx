import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { API_BASE_URL } from '../config/api';

// Companion Form Component
const CompanionForm = ({ onAddCompanion, onCancel, initialData = null, isEditing = false, onUpdateCompanion = null }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    surname: '',
    dni: '',
    dob: '',
    email: '',
    phone: '',
    passportNumber: '',
    nationality: '',
    expirationDate: '',
    gender: '',
    specialRequests: '',
    passportImage: ''
  });
  const [passportImage, setPassportImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [shouldSaveImage, setShouldSaveImage] = useState(false); // Default NO (apagado)
  const [ocrLoading, setOcrLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const validateName = (name, fieldName) => {
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!name) return `${fieldName} is required`;
    if (!nameRegex.test(name)) return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    if (name.length < 2) return `${fieldName} must be at least 2 characters long`;
    return '';
  };
  const validateDNI = (dni) => {
    if (!dni) return 'DNI/CUIT is required';
    if (dni.length < 7) return 'DNI/CUIT must be at least 7 characters long';
    if (dni.length > 20) return 'DNI/CUIT cannot exceed 20 characters';
    return '';
  };
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) return 'Your email format is incorrect.';
    return '';
  };
  const validatePhone = (phone) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^(\+?[1-9]\d{9,14})$/;
    if (!phoneRegex.test(cleanPhone)) return 'Incorrect phone format.';
    return '';
  };

  const validateForm = () => {
    const newErrors = {};
    newErrors.name = validateName(formData.name, 'First Name');
    newErrors.surname = validateName(formData.surname, 'Last Name');
    newErrors.dni = validateDNI(formData.dni);
    if (formData.email) newErrors.email = validateEmail(formData.email);
    if (formData.phone) newErrors.phone = validatePhone(formData.phone);
    Object.keys(newErrors).forEach(key => { if (!newErrors[key]) delete newErrors[key]; });
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPassportImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAIExtraction = async () => {
    if (!passportImage) {
      setErrors({ general: 'Please upload a passport image first' });
      return;
    }
    setOcrLoading(true);
    setErrors({});
    try {
      const uploadData = new FormData();
      uploadData.append('passportImage', passportImage);
      const response = await fetch(`${API_BASE_URL}/api/passengers/ocr`, {
        method: 'POST',
        body: uploadData,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          ...result.data.extractedData,
          passportImage: result.data.passportImage // Guardamos la URL de Supabase capturada
        }));
        setErrors({ success: `Passport data extracted! (confidence: ${result.data.confidence}%)` });
      } else {
        setErrors({ general: result.message || 'Failed to extract' });
      }
    } catch (error) {
      setErrors({ general: 'Failed to extract passport data.' });
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    try {
      // --- CIRUGÍA: Solo persiste la imagen si el tilde está activo ---
      const companionData = { 
        ...formData,
        passportImage: shouldSaveImage ? formData.passportImage : ''
      };
      
      if (isEditing && onUpdateCompanion) {
        onUpdateCompanion(companionData);
      } else {
        onAddCompanion(companionData);
      }
      onCancel();
    } catch (error) {
      setErrors({ general: 'Failed to add companion.' });
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-md font-medium text-dark-100 mb-4">{isEditing ? 'Edit Acompañante' : 'Add Acompañante'}</h4>
      {errors.general && <div className="bg-error-500/10 border border-error-500/20 text-error-400 px-4 py-3 rounded-md">{errors.general}</div>}
      {errors.success && <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-md">{errors.success}</div>}
      
      <div className="card p-4">
        <h4 className="text-sm font-medium text-dark-400 mb-3">Passport Data Extraction</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-dark-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500 file:text-white hover:file:bg-primary-600" />
            
            {/* --- CHECKBOX GUARDAR IMAGEN (Acompañante) --- */}
            <div className="flex items-center mt-2">
              <input 
                type="checkbox" 
                id="saveImageCompanion" 
                checked={shouldSaveImage} 
                onChange={(e) => setShouldSaveImage(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-white/20 rounded bg-dark-800/50"
              />
              <label htmlFor="saveImageCompanion" className="ml-2 block text-sm text-dark-200 cursor-pointer">
                ¿Guardar imagen?
              </label>
            </div>

            {passportImage && (
              <button type="button" onClick={handleOpenAIExtraction} disabled={ocrLoading} className="mt-2 w-full btn-primary text-sm disabled:opacity-50">
                {ocrLoading ? 'Processing with OpenAI...' : 'Extract Data with OpenAI'}
              </button>
            )}
          </div>
          {imagePreview && (
            <div>
              <h5 className="text-sm font-medium text-dark-400 mb-2">Uploaded Image</h5>
              <img src={imagePreview} alt="Preview" className="max-w-full h-32 object-contain border border-white/10 rounded" />
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-dark-200 mb-1">First Name *</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required className={`input-field text-sm ${errors.name ? 'border-red-500' : ''}`} /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Last Name *</label>
        <input type="text" name="surname" value={formData.surname} onChange={handleChange} required className={`input-field text-sm ${errors.surname ? 'border-red-500' : ''}`} /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">DNI/CUIT *</label>
        <input type="text" name="dni" value={formData.dni} onChange={handleChange} required className={`input-field text-sm ${errors.dni ? 'border-red-500' : ''}`} /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Date of Birth</label>
        <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="input-field text-sm" /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field text-sm" /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Phone Number</label>
        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+999" className="input-field text-sm" /></div>
      </div>
      <div><label className="block text-sm font-medium text-dark-200 mb-1">Special Requests / Notes</label>
      <textarea name="specialRequests" value={formData.specialRequests} onChange={handleChange} rows={3} placeholder="Dietary restrictions..." className="input-field text-sm" /></div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
        <button type="button" onClick={handleSubmit} className="btn-primary text-sm">{isEditing ? 'Update Acompañante' : 'Add Acompañante'}</button>
      </div>
    </div>
  );
};

// --- CLIENT FORM PRINCIPAL ---
const ClientForm = () => {
  const [formData, setFormData] = useState({
    name: '', surname: '', dni: '', dob: '', email: '', phone: '',
    passportNumber: '', nationality: '', expirationDate: '', gender: '',
    specialRequests: '', passportImage: ''
  });
  const [companions, setCompanions] = useState([]);
  const [showCompanionForm, setShowCompanionForm] = useState(false);
  const [shouldSaveImage, setShouldSaveImage] = useState(false); // Default NO (apagado)
  const [passportImage, setPassportImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const navigate = useNavigate();

  const validateForm = () => {
    const errors = {};
    if (!formData.name) errors.name = 'First Name is required';
    if (!formData.surname) errors.surname = 'Last Name is required';
    if (!formData.dni) errors.dni = 'DNI/CUIT is required';
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPassportImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAIExtraction = async () => {
    if (!passportImage) {
      setError('Please upload a passport image first');
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
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          ...result.data.extractedData,
          passportImage: result.data.passportImage // URL de Supabase capturada
        }));
        setSuccess(`Passport data extracted! (confidence: ${result.data.confidence}%)`);
      } else {
        setError(result.message || 'Failed to extract');
      }
    } catch (err) {
      setError('Failed to extract passport data.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Please correct the errors');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // --- CIRUGÍA: Solo persiste la imagen si el tilde está activo ---
      const clientPayload = {
        ...formData,
        passportImage: shouldSaveImage ? formData.passportImage : '',
        preferences: { specialRequests: formData.specialRequests || '' }
      };
      delete clientPayload.specialRequests;

      let response;
      if (companions.length > 0) {
        response = await api.post('/api/clients/bulk', {
          mainClient: clientPayload,
          companions: companions
        });
      } else {
        response = await api.post('/api/clients', clientPayload);
      }

      if (response.data.success) {
        setSuccess('Passenger created successfully!');
        setTimeout(() => navigate('/clients'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create passenger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-100">Add New Passenger</h1>
        <p className="mt-1 text-sm text-dark-400">Create a new passenger record with passport information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-md">{error}</div>}
        {success && <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-md">{success}</div>}

        <div className="bg-dark-700/50 p-6 rounded-lg border border-white/10">
          <h3 className="text-lg font-medium text-dark-100 mb-4">Passport Image</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">Upload Passport Image</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-dark-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-400 hover:file:bg-primary-500/30" />
              
              {/* --- CHECKBOX GUARDAR IMAGEN (Titular) --- */}
              <div className="flex items-center mt-3 mb-1">
                <input 
                  type="checkbox" 
                  id="saveImageMain" 
                  checked={shouldSaveImage} 
                  onChange={(e) => setShouldSaveImage(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-white/20 rounded bg-dark-800/50"
                />
                <label htmlFor="saveImageMain" className="ml-2 block text-sm text-dark-200 cursor-pointer">
                  ¿Guardar imagen?
                </label>
              </div>

              {passportImage && (
                <button type="button" onClick={handleOpenAIExtraction} disabled={ocrLoading} className="mt-3 w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                  {ocrLoading ? 'Processing with OpenAI...' : 'Extract Data with OpenAI'}
                </button>
              )}
            </div>
            {imagePreview && (
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">Image Preview</label>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-4">
                  <img src={imagePreview} alt="Preview" className="max-w-full h-48 object-contain mx-auto" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="block text-sm font-medium text-dark-200">First Name *</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm text-dark-100 bg-dark-800/50 ${validationErrors.name ? 'border-red-500' : 'border-white/20'}`} /></div>
          <div><label className="block text-sm font-medium text-dark-200">Last Name *</label>
          <input type="text" name="surname" value={formData.surname} onChange={handleChange} required className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm text-dark-100 bg-dark-800/50 ${validationErrors.surname ? 'border-red-500' : 'border-white/20'}`} /></div>
          <div><label className="block text-sm font-medium text-dark-200">DNI/CUIT *</label>
          <input type="text" name="dni" value={formData.dni} onChange={handleChange} required className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm text-dark-100 bg-dark-800/50 ${validationErrors.dni ? 'border-red-500' : 'border-white/20'}`} /></div>
          <div><label className="block text-sm font-medium text-dark-200">Date of Birth</label>
          <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm text-dark-100 bg-dark-800/50 border-white/20" /></div>
          <div><label className="block text-sm font-medium text-dark-200">Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm text-dark-100 bg-dark-800/50 border-white/20" /></div>
          <div><label className="block text-sm font-medium text-dark-200">Phone Number</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+999" className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm text-dark-100 bg-dark-800/50 border-white/20" /></div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-dark-100">Acompañantes</h3>
            <button type="button" onClick={() => setShowCompanionForm(!showCompanionForm)} className="btn-primary text-sm">{showCompanionForm ? 'Cancel' : 'Add Acompañante'}</button>
          </div>
          {showCompanionForm && (
            <div className="mb-6 p-4 bg-dark-700/50 rounded-lg border border-white/10">
              <CompanionForm onAddCompanion={(c) => { setCompanions(prev => [...prev, c]); setShowCompanionForm(false); }} onCancel={() => setShowCompanionForm(false)} />
            </div>
          )}
          {companions.length > 0 && (
            <div className="space-y-3">
              {companions.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg border border-white/10">
                  <div><span className="text-dark-100 font-medium">{c.name} {c.surname}</span><span className="text-dark-400 text-sm ml-2">DNI: {c.dni}</span></div>
                  <button type="button" onClick={() => setCompanions(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-white/10">
          <button type="button" onClick={() => navigate('/clients')} className="px-4 py-2 text-sm font-medium text-dark-300 bg-dark-700/50 border border-white/10 rounded-md">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Passenger'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
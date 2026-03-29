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
  const [shouldSaveImage, setShouldSaveImage] = useState(false); // Default NO
  const [ocrLoading, setOcrLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'First Name is required';
    if (!formData.surname) newErrors.surname = 'Last Name is required';
    if (!formData.dni) newErrors.dni = 'DNI/CUIT is required';
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
      const response = await fetch(`${API_BASE_URL}/api/clients/ocr`, {
        method: 'POST',
        body: uploadData,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          ...result.data.extractedData
        }));
        setErrors({ success: 'Passport data extracted!' });
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
    const companionData = { 
      ...formData,
      passportImage: shouldSaveImage ? passportImage : '' 
    };
    
    if (isEditing && onUpdateCompanion) {
      onUpdateCompanion(companionData);
    } else {
      onAddCompanion(companionData);
    }
    onCancel();
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
        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="input-field text-sm" /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Last Name *</label>
        <input type="text" name="surname" value={formData.surname} onChange={handleChange} required className="input-field text-sm" /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">DNI/CUIT *</label>
        <input type="text" name="dni" value={formData.dni} onChange={handleChange} required className="input-field text-sm" /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Date of Birth</label>
        <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="input-field text-sm" /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field text-sm" /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Phone Number</label>
        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+999" className="input-field text-sm" /></div>
        
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Gender</label>
        <select name="gender" value={formData.gender} onChange={handleChange} className="input-field text-sm">
          <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
        </select></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Passport Number</label>
        <input type="text" name="passportNumber" value={formData.passportNumber} onChange={handleChange} className="input-field text-sm" /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Nationality</label>
        <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="input-field text-sm" /></div>
        <div><label className="block text-sm font-medium text-dark-200 mb-1">Passport Expiration Date</label>
        <input type="date" name="expirationDate" value={formData.expirationDate} onChange={handleChange} className="input-field text-sm" /></div>
      </div>

      <div><label className="block text-sm font-medium text-dark-200 mb-1">Special Requests / Notes</label>
      <textarea name="specialRequests" value={formData.specialRequests} onChange={handleChange} rows={3} placeholder="Dietary restrictions..." className="input-field text-sm" /></div>
      
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
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
        <button type="button" onClick={handleSubmit} className="btn-primary text-sm">{isEditing ? 'Update Acompañante' : 'Add Acompañante'}</button>
      </div>
    </div>
  );
};

const ClientForm = () => {
  const [formData, setFormData] = useState({
    name: '', surname: '', dni: '', dob: '', email: '', phone: '',
    passportNumber: '', nationality: '', expirationDate: '', gender: '',
    specialRequests: '', passportImage: ''
  });
  const [companions, setCompanions] = useState([]);
  const [showCompanionForm, setShowCompanionForm] = useState(false);
  const [shouldSaveImage, setShouldSaveImage] = useState(false); // Default NO
  const [passportImage, setPassportImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const navigate = useNavigate();

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
          ...result.data.extractedData
        }));
        setSuccess('Passport data extracted!');
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
    setLoading(true);
    setError('');
    try {
      const finalPayload = new FormData();
      
      const { passportImage: _pi, ...dataToSubmit } = formData;

      Object.keys(dataToSubmit).forEach(key => {
        if (key === 'specialRequests') {
            finalPayload.append('preferences[specialRequests]', dataToSubmit[key] || '');
        } else {
            finalPayload.append(key, dataToSubmit[key]);
        }
      });

      if (shouldSaveImage && passportImage) {
        finalPayload.append('passportImage', passportImage);
      }

      if (companions.length > 0) {
        finalPayload.append('companions', JSON.stringify(companions));
      }

      // CAMBIO CLAVE: Usamos fetch nativo, igual que en el OCR que sabemos que funciona para mandar archivos físicos
      const response = await fetch(`${API_BASE_URL}/api/clients`, {
        method: 'POST',
        body: finalPayload,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        setSuccess('Passenger created successfully!');
        setTimeout(() => navigate('/clients'), 2000);
      } else {
        setError(responseData.message || 'Failed to create passenger');
      }
    } catch (err) {
      setError('Failed to create passenger');
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
          <h3 className="text-lg font-medium text-dark-100 mb-4">Imagen con datos del Pasajero</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">Upload Imagen</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-dark-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-400 hover:file:bg-primary-500/30" />
              
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
          <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" /></div>
          <div><label className="block text-sm font-medium text-dark-200">Last Name *</label>
          <input type="text" name="surname" value={formData.surname} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" /></div>
          <div><label className="block text-sm font-medium text-dark-200">DNI/CUIT *</label>
          <input type="text" name="dni" value={formData.dni} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" /></div>
          <div><label className="block text-sm font-medium text-dark-200">Date of Birth</label>
          <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" /></div>
          <div><label className="block text-sm font-medium text-dark-200">Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" /></div>
          <div><label className="block text-sm font-medium text-dark-200">Phone Number</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+999" className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" /></div>
          
          <div><label className="block text-sm font-medium text-dark-200">Gender</label>
          <select name="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20">
            <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </select></div>
          <div><label className="block text-sm font-medium text-dark-200">Passport Number</label>
          <input type="text" name="passportNumber" value={formData.passportNumber} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" /></div>
          <div><label className="block text-sm font-medium text-dark-200">Nationality</label>
          <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" /></div>
          <div><label className="block text-sm font-medium text-dark-200">Passport Expiration Date</label>
          <input type="date" name="expirationDate" value={formData.expirationDate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md text-dark-100 bg-dark-800/50 border-white/20" /></div>
        </div>

        <div className="flex justify-end items-center space-x-6 pt-6 border-t border-white/10">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-dark-300 uppercase">Guardar imagen: {shouldSaveImage ? 'SÍ' : 'NO'}</span>
            <button 
              type="button"
              onClick={() => setShouldSaveImage(!shouldSaveImage)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${shouldSaveImage ? 'bg-primary-600' : 'bg-dark-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shouldSaveImage ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

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
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUploadUrl } from '../utils/uploadUtils';
import PassengerCard from '../components/PassengerCard';
import PassengerForm from '../components/PassengerForm';

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
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // CAMBIO: Ahora pedimos la Signed URL al backend antes de abrir
  const openImageModal = async () => {
    try {
      const response = await api.get(`/api/clients/${clientId}/passport-image`);
      if (response.data.success) {
        setModalImageUrl(response.data.url);
        setShowImageModal(true);
      }
    } catch (err) {
      console.error("Error fetching signed URL:", err);
      alert("Could not load image securely.");
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
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch passenger data');
    } finally {
      setLoading(false);
    }
  };

  const handlePassengerAdded = (newPassenger) => {
    setPassengers(prev => [newPassenger, ...prev]);
    setShowPassengerForm(false);
  };

  const handlePassengerUpdated = (updatedPassenger) => {
    setPassengers(prev =>
      prev.map(p => (p._id || p.id) === (updatedPassenger._id || updatedPassenger.id) ? updatedPassenger : p)
    );
  };

  const handlePassengerDeleted = (passengerId) => {
    setPassengers(prev => prev.filter(p => (p._id || p.id) !== passengerId));
  };

  const openEditModal = () => {
    setEditFormData({
      name: client.name || '',
      surname: client.surname || '',
      email: client.email || '',
      phone: client.phone || '',
      dob: client.dob ? client.dob.split('T')[0] : '',
      passportNumber: client.passportNumber || '',
      nationality: client.nationality || '',
      expirationDate: client.expirationDate ? client.expirationDate.split('T')[0] : '',
      specialRequests: client.preferences?.specialRequests || ''
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditFormData({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const response = await api.put(`/api/clients/${clientId}`, editFormData);
      if (response.data.success) {
        setClient(response.data.data.client);
        closeEditModal();
      }
    } catch (error) {
      setEditError('Update failed');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div></div>;
  if (error || !client) return <div className="min-h-screen flex items-center justify-center text-center"><div><div className="text-error-400 text-lg mb-4">{error || 'Passenger not found'}</div><button onClick={() => navigate('/clients')} className="btn-primary">Back</button></div></div>;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button onClick={() => navigate('/clients')} className="text-primary-400 hover:text-primary-300 text-sm font-medium mb-4">← Back to Passengers</button>
            <h1 className="text-3xl font-bold text-dark-100">{client.fullName}</h1>
            <p className="text-dark-300 mt-2">Passenger Details and Acompañantes</p>
          </div>
          <button onClick={() => navigate('/sales/new', { state: { preSelectedPassenger: client } })} className="btn-primary">Proceed to Sale</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-dark-100">Passenger Information</h2>
                <button onClick={openEditModal} className="text-primary-400 p-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg></button>
              </div>
              <div className="space-y-4">
                <div><span className="text-sm font-medium text-dark-400">Full Name</span><p className="text-dark-100">{client.fullName}</p></div>
                <div><span className="text-sm font-medium text-dark-400">Email</span><p className="text-dark-100">{client.email || 'No email'}</p></div>
                <div><span className="text-sm font-medium text-dark-400">Phone</span><p className="text-dark-100">{client.phone || 'No phone'}</p></div>
                <div><span className="text-sm font-medium text-dark-400">Date of Birth</span><p className="text-dark-100">{client.dob ? new Date(client.dob).toLocaleDateString() : 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-dark-400">Passport Number</span><p className="text-dark-100">{client.passportNumber}</p></div>
                <div><span className="text-sm font-medium text-dark-400">Nationality</span><p className="text-dark-100">{client.nationality}</p></div>
                <div><span className="text-sm font-medium text-dark-400">Passport Status</span><span className={`ml-2 badge ${client.isPassportValid ? 'badge-success' : 'badge-error'}`}>{client.isPassportValid ? 'VALID' : 'EXPIRED'}</span></div>
                <div><span className="text-sm font-medium text-dark-400">Created</span><p className="text-dark-100">{new Date(client.createdAt).toLocaleDateString()}</p></div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm font-medium text-dark-400">Passport Image</span>
                {client.passportImage && client.passportImage.trim() !== '' ? (
                  <button
                    onClick={() => openImageModal()}
                    className="text-primary-400 p-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                ) : <span className="text-dark-500 text-sm">No image</span>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="card p-6">
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-semibold text-dark-100">Acompañantes ({passengers.length})</h2><button onClick={() => setShowPassengerForm(!showPassengerForm)} className="btn-primary text-sm">Add</button></div>
              {showPassengerForm && <PassengerForm clientId={clientId} onPassengerAdded={handlePassengerAdded} onCancel={() => setShowPassengerForm(false)} />}
              <div className="space-y-4 mt-4">
                {passengers.map(p => (
                  <PassengerCard key={p._id || p.id} passenger={p} onUpdate={handlePassengerUpdated} onDelete={handlePassengerDeleted} clientId={clientId} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={closeImageModal}>
          <button onClick={closeImageModal} className="absolute top-4 right-4 text-white p-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
          <img src={modalImageUrl} alt="Passport" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
};

export default ClientDetails;
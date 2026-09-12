import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { createBooking, getServices, getProviders } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const timeSlots = [
  'Morning (09:00 - 12:00)',
  'Afternoon (12:00 - 16:00)',
  'Evening (16:00 - 19:00)',
  'Emergency Immediate Dispatch'
];

const BookingModal = ({
  isOpen,
  onClose,
  initialService = null,
  initialProvider = null
}) => {
  const navigate = useNavigate();
  const { user, mongoUser } = useAuth();

  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState(initialService?._id || '');
  const [selectedProviderId, setSelectedProviderId] = useState(
    initialProvider?._id || initialProvider?.userId?._id || ''
  );

  // Address
  const [streetAddress, setStreetAddress] = useState('');
  const [unit, setUnit] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('CA');
  const [zipCode, setZipCode] = useState('');

  // Schedule
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [scheduledDate, setScheduledDate] = useState(getTomorrowString());
  const [timeSlot, setTimeSlot] = useState('Morning (09:00 - 12:00)');
  const [problemDescription, setProblemDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialService?._id) setSelectedServiceId(initialService._id);
    if (initialProvider?._id || initialProvider?.userId?._id) {
      setSelectedProviderId(initialProvider._id || initialProvider?.userId?._id);
    }
  }, [initialService, initialProvider]);

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [srvRes, provRes] = await Promise.all([
        getServices({ limit: 50 }),
        getProviders({ limit: 50 })
      ]);
      setServices(srvRes.data.services || []);
      setProviders(provRes.data.providers || []);
    } catch (err) {
      console.error('Failed to load services or providers list:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedServiceId || !selectedProviderId) {
      setError('Please select both a service and a provider.');
      return;
    }

    if (!streetAddress || !city || !zipCode) {
      setError('Please fill in your complete address (street, city, zip code).');
      return;
    }

    if (!problemDescription.trim()) {
      setError('Please describe the problem or service requirements.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        serviceId: selectedServiceId,
        providerId: selectedProviderId,
        address: {
          streetAddress,
          unit,
          city,
          state,
          zipCode
        },
        scheduledDate,
        preferredTimeSlot: timeSlot,
        problemDescription
      };

      const res = await createBooking(payload);
      const newBooking = res.data.booking;
      onClose();
      navigate(`/bookings/${newBooking._id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Service Appointment"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || loadingOptions}>
            {submitting ? 'Submitting Request...' : 'Confirm & Request Service'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Service & Provider Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Service *
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Service --</option>
              {services.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} (~${s.basePrice})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Verified Provider *
            </label>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Provider --</option>
              {providers.map((p) => (
                <option key={p._id} value={p.userId?._id || p._id}>
                  {p.businessName || p.userId?.name || 'Verified Pro'} (⭐ {p.rating || '5.0'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Preferred Date *
            </label>
            <input
              type="date"
              value={scheduledDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Preferred Time Window *
            </label>
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeSlots.map((ts) => (
                <option key={ts} value={ts}>
                  {ts}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Address */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Service Location Address
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input
                label="Street Address *"
                placeholder="123 Market St"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label="Apt/Unit"
                placeholder="Suite 4B"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Input
                label="City *"
                placeholder="San Francisco"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label="State *"
                placeholder="CA"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label="Zip Code *"
                placeholder="94103"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Problem Description */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Describe the Problem / Scope of Work *
          </label>
          <textarea
            rows={3}
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="Please detail symptoms, location of fixtures, urgency, or special instructions for the technician..."
            required
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Note: File attachment and image uploads will be enabled in an upcoming phase.
          </p>
        </div>
      </form>
    </Modal>
  );
};

export default BookingModal;

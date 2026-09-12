import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { createBooking, getServices, getProviders, getMyAddresses, saveAddress, classifyServiceRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const timeSlots = [
  'Morning (09:00 - 12:00)',
  'Afternoon (12:00 - 16:00)',
  'Evening (16:00 - 19:00)',
  'Emergency Immediate Dispatch'
];

const INDIAN_STATES = [
  'Karnataka',
  'Maharashtra',
  'Delhi NCR',
  'Tamil Nadu',
  'Telangana',
  'Gujarat',
  'Uttar Pradesh',
  'West Bengal',
  'Kerala',
  'Rajasthan',
  'Punjab',
  'Haryana',
  'Madhya Pradesh'
];

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

const BookingModal = ({
  isOpen,
  onClose,
  initialService = null,
  initialProvider = null
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressMode, setSelectedAddressMode] = useState('new'); // 'saved' or 'new'
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState(initialService?._id || '');
  const [selectedProviderId, setSelectedProviderId] = useState(
    initialProvider?._id || initialProvider?.userId?._id || ''
  );

  // Address fields
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [locality, setLocality] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('');
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [addressType, setAddressType] = useState('home');

  // Schedule
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [scheduledDate, setScheduledDate] = useState(getTomorrowString());
  const [timeSlot, setTimeSlot] = useState(''); // optional — empty means any available
  const [problemDescription, setProblemDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Phase 11: AI-Assisted Recommendation (Advisory Only)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');

  const handleAiAnalyze = async () => {
    if (!problemDescription.trim()) {
      setAiError('Please enter a brief problem description before analyzing.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const res = await classifyServiceRequest(problemDescription.trim());
      if (res.data?.success && res.data?.data) {
        setAiResult(res.data.data);
      } else {
        setAiError('AI recommendation currently unavailable. You may continue manually.');
      }
    } catch (err) {
      console.warn('AI analysis skipped, continuing manual workflow:', err);
      setAiError('AI assistant could not complete request. You can continue booking manually.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestedService = () => {
    if (!aiResult || !services.length) return;
    const matched = services.find(
      (s) =>
        (aiResult.suggestedService && s.name.toLowerCase().includes(aiResult.suggestedService.toLowerCase())) ||
        (aiResult.category === 'AC_REPAIR' && s.name.toLowerCase().includes('ac')) ||
        (aiResult.category === 'PLUMBING' && s.name.toLowerCase().includes('plumb')) ||
        (aiResult.category === 'ELECTRICAL' && s.name.toLowerCase().includes('electric')) ||
        (aiResult.category === 'RO_WATER_PURIFIER' && s.name.toLowerCase().includes('ro'))
    );
    if (matched) {
      setSelectedServiceId(matched._id);
    }
  };

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [srvRes, provRes] = await Promise.all([
        getServices({ limit: 50 }),
        getProviders({ limit: 50 })
      ]);
      setServices(srvRes.data.services || []);
      setProviders(provRes.data.providers || []);

      if (user) {
        try {
          const addrRes = await getMyAddresses();
          const addrs = addrRes.data.addresses || [];
          setSavedAddresses(addrs);
          if (addrs.length > 0) {
            setSelectedAddressMode('saved');
            setSelectedSavedAddressId(addrs[0]._id);
            applySavedAddress(addrs[0]);
          }
        } catch {
          // Non-critical if addresses fail
        }
      }
    } catch (err) {
      console.error('Failed to load services or providers list:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const applySavedAddress = (addr) => {
    if (!addr) return;
    setAddressLine1(addr.addressLine1 || addr.streetAddress || '');
    setAddressLine2(addr.addressLine2 || addr.unit || '');
    setLocality(addr.locality || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city || 'Bengaluru');
    setState(addr.state || 'Karnataka');
    setPincode(addr.pincode || addr.zipCode || '');
  };

  useEffect(() => {
    if (initialService?._id) setSelectedServiceId(initialService._id);
    if (initialProvider?._id || initialProvider?.userId?._id) {
      setSelectedProviderId(initialProvider._id || initialProvider?.userId?._id);
    }
  }, [initialService, initialProvider]);

  useEffect(() => {
    if (selectedServiceId && isOpen) {
      getProviders({ service: selectedServiceId })
        .then((res) => {
          const list = res?.data?.technicians || res?.data?.providers || [];
          setProviders(list);
          if (list.length > 0 && !list.some((p) => (p.userId?._id || p.id) === selectedProviderId)) {
            const firstId = list[0].userId?._id?.toString() || list[0].userId?.toString() || list[0].id?.toString() || '';
            setSelectedProviderId(firstId);
          }
        })
        .catch(console.error);
    }
  }, [selectedServiceId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen]);

  const handleSavedAddressChange = (addrId) => {
    setSelectedSavedAddressId(addrId);
    const chosen = savedAddresses.find((a) => a._id === addrId);
    if (chosen) {
      applySavedAddress(chosen);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedServiceId || !selectedProviderId) {
      setError('Please select both a service and a verified technician.');
      return;
    }

    const cleanPin = pincode.trim();
    if (!addressLine1.trim() || !city.trim() || !cleanPin) {
      setError('Please fill in Address Line 1, City, and 6-digit Pincode.');
      return;
    }

    if (!PINCODE_REGEX.test(cleanPin)) {
      setError('Please enter a valid 6-digit Indian PIN code (e.g. 560001, 560038).');
      return;
    }

    if (!problemDescription.trim()) {
      setError('Please describe the problem or scope of work required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const addressPayload = {
        addressLine1: addressLine1.trim(),
        streetAddress: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        unit: addressLine2.trim(),
        locality: locality.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: cleanPin,
        zipCode: cleanPin
      };

      // If customer wants to save new address to their profile
      if (selectedAddressMode === 'new' && saveToProfile) {
        try {
          await saveAddress({
            type: addressType,
            ...addressPayload
          });
        } catch (err) {
          console.error('Non-critical: could not persist address to profile:', err);
        }
      }

      const payload = {
        serviceId: selectedServiceId,
        technicianId: selectedProviderId,
        providerId: selectedProviderId,
        address: addressPayload,
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
      title="Request Local Service Appointment"
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
                  {s.name} (~₹{s.basePrice || s.estimatedPriceRange?.min || 299})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Verified Technician *
            </label>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Verified Technician --</option>
              {providers.map((p, idx) => {
                // Backend expects the User's _id (looked up via User.findById)
                const userObjId = p.userId?._id?.toString() || p.userId?.toString();
                const displayId = userObjId || p._id?.toString() || '';
                const techName = p.userId?.name ? `${p.userId.name} (${p.businessName || 'Technician'})` : (p.businessName || 'Verified Technician');
                return (
                  <option key={p._id || `tech-${idx}`} value={displayId}>
                    {techName} (⭐ {p.rating?.average?.toFixed(1) || '5.0'})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Preferred Date (IST) *
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
              Preferred Time Window <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Any available time --</option>
              {timeSlots.map((ts) => (
                <option key={ts} value={ts}>
                  {ts}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Saved Addresses / Address Selection */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              Service Address (India)
            </label>
            {savedAddresses.length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="addressMode"
                    checked={selectedAddressMode === 'saved'}
                    onChange={() => {
                      setSelectedAddressMode('saved');
                      const found = savedAddresses.find((a) => a._id === selectedSavedAddressId) || savedAddresses[0];
                      if (found) applySavedAddress(found);
                    }}
                  />
                  <span>Saved Address</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="addressMode"
                    checked={selectedAddressMode === 'new'}
                    onChange={() => {
                      setSelectedAddressMode('new');
                      setAddressLine1('');
                      setAddressLine2('');
                      setLocality('');
                      setLandmark('');
                      setPincode('');
                    }}
                  />
                  <span>+ New Address</span>
                </label>
              </div>
            )}
          </div>

          {selectedAddressMode === 'saved' && savedAddresses.length > 0 && (
            <div>
              <select
                value={selectedSavedAddressId}
                onChange={(e) => handleSavedAddressChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {savedAddresses.map((a) => (
                  <option key={a._id} value={a._id}>
                    [{a.type.toUpperCase()}] {a.addressLine1 || a.streetAddress}, {a.locality ? `${a.locality}, ` : ''}{a.city} - {a.pincode || a.zipCode}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Address Fields */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input
                  label="Flat, House No., Building, Street *"
                  placeholder="e.g. 42, 2nd Floor, Lotus Residency"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Floor / Unit (Optional)"
                  placeholder="e.g. Wing B"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Area / Locality / Sector"
                placeholder="e.g. Indiranagar / Koramangala"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
              />
              <Input
                label="Landmark (Optional)"
                placeholder="e.g. Near Metro Station / BDA Complex"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Input
                  label="City *"
                  placeholder="e.g. Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Input
                  label="Pincode (6 digits) *"
                  placeholder="e.g. 560001"
                  value={pincode}
                  maxLength={6}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            {selectedAddressMode === 'new' && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveToProfile}
                    onChange={(e) => setSaveToProfile(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Save this address to my account</span>
                </label>
                {saveToProfile && (
                  <select
                    value={addressType}
                    onChange={(e) => setAddressType(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="job_site">Job Site</option>
                    <option value="billing">Billing</option>
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Problem Description */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Describe the Problem / Scope of Work *
            </label>
            <button
              type="button"
              onClick={handleAiAnalyze}
              disabled={aiLoading}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
            >
              {aiLoading ? (
                <>
                  <span className="inline-block animate-spin text-[10px]">⚙️</span>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>AI Assist (Advisory)</span>
                </>
              )}
            </button>
          </div>
          <textarea
            rows={3}
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="e.g. My AC starts normally but after some time it makes a loud noise and doesn't cool..."
            required
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {aiError && (
            <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded flex justify-between items-center">
              <span>{aiError}</span>
              <button
                type="button"
                onClick={() => setAiError('')}
                className="text-amber-500 hover:text-amber-700 text-xs ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {aiResult && (
            <div className="mt-2 p-2.5 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-200 rounded-lg text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-indigo-950">
                  <span>✨ AI Recommendation (Advisory Only)</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      aiResult.urgency === 'HIGH'
                        ? 'bg-red-100 text-red-700'
                        : aiResult.urgency === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {aiResult.urgency} Urgency
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiResult(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="text-slate-700 text-[11px] leading-relaxed">
                <p>
                  <strong>Category:</strong> {aiResult.category} | <strong>Suggested:</strong>{' '}
                  {aiResult.suggestedService}
                </p>
                {aiResult.possibleAreas?.length > 0 && (
                  <p className="mt-0.5">
                    <strong>Possible inspection areas:</strong> {aiResult.possibleAreas.join(', ')}
                  </p>
                )}
                {aiResult.isAmbiguous && (
                  <p className="text-amber-700 mt-1 italic">
                    💡 Tip: {aiResult.clarificationPrompt}
                  </p>
                )}
              </div>

              <div className="pt-1 flex items-center justify-between border-t border-indigo-100 text-[10px] text-slate-500">
                <span className="italic">
                  Advisory only. Final diagnostics & prices are determined by verified technicians.
                </span>
                <button
                  type="button"
                  onClick={applyAiSuggestedService}
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-medium transition-colors"
                >
                  Apply Suggested Service
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400 mt-1">
            Pricing estimate is in Indian Rupees (₹). Payments will be collected in later phases.
          </p>
        </div>
      </form>
    </Modal>
  );
};

export default BookingModal;

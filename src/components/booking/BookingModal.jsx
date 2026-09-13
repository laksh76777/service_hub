import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import {
  createBooking,
  getServices,
  getProviders,
  getMyAddresses,
  saveAddress,
  classifyServiceRequest
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const TIME_SLOTS = [
  'Morning (09:00 - 12:00)',
  'Afternoon (12:00 - 16:00)',
  'Evening (16:00 - 19:00)',
  'Immediate / Emergency Window'
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

  // Wizard Step: 1 = Service, 2 = Technician, 3 = Problem, 4 = Location, 5 = Schedule, 6 = Confirm
  const [step, setStep] = useState(1);
  const [requestSuccess, setRequestSuccess] = useState(null); // { bookingId, technicianName }

  // Catalog data
  const [services, setServices] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Selections
  const [selectedService, setSelectedService] = useState(initialService || null);
  const [selectedTechnician, setSelectedTechnician] = useState(initialProvider || null);

  // Problem description
  const [problemDescription, setProblemDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Address
  const [selectedAddressMode, setSelectedAddressMode] = useState('saved'); // 'saved' or 'new'
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('');
  const [saveToProfile, setSaveToProfile] = useState(false);

  // Schedule
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const [scheduledDate, setScheduledDate] = useState(getTomorrowString());
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoadingOptions(true);
    try {
      const [sRes, tRes] = await Promise.all([
        getServices({ limit: 50 }).catch(() => ({ data: { services: [] } })),
        getProviders({ limit: 50 }).catch(() => ({ data: { technicians: [] } }))
      ]);

      const sList = sRes?.data?.services || [];
      const tList = tRes?.data?.technicians || tRes?.data?.providers || [];
      setServices(sList);
      setTechnicians(tList);

      if (user) {
        try {
          const aRes = await getMyAddresses();
          const addrs = aRes?.data?.addresses || [];
          setSavedAddresses(addrs);
          if (addrs.length > 0) {
            setSelectedAddressMode('saved');
            setSelectedAddressId(addrs[0]._id);
            populateAddressFields(addrs[0]);
          } else {
            setSelectedAddressMode('new');
          }
        } catch {
          setSelectedAddressMode('new');
        }
      }
    } catch (err) {
      console.error('Failed to load booking dependencies:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const populateAddressFields = (addr) => {
    if (!addr) return;
    setAddressLine1(addr.addressLine1 || addr.streetAddress || '');
    setAddressLine2(addr.addressLine2 || addr.unit || '');
    setLocality(addr.locality || '');
    setCity(addr.city || 'Bengaluru');
    setState(addr.state || 'Karnataka');
    setPincode(addr.pincode || addr.zipCode || '');
  };

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setRequestSuccess(null);
      setError('');
      loadData();
    }
  }, [isOpen]);

  // Handle pre-passed props
  useEffect(() => {
    if (initialService) {
      setSelectedService(initialService);
    }
    if (initialProvider) {
      setSelectedTechnician(initialProvider);
    }
  }, [initialService, initialProvider]);

  // When service changes, filter or fetch technicians for that service
  useEffect(() => {
    if (selectedService?._id && isOpen) {
      getProviders({ service: selectedService._id })
        .then((res) => {
          const list = res?.data?.technicians || res?.data?.providers || [];
          setTechnicians(list);
          if (list.length > 0 && !selectedTechnician) {
            setSelectedTechnician(list[0]);
          }
        })
        .catch(console.error);
    }
  }, [selectedService]);

  const handleAiAnalyze = async () => {
    if (!problemDescription.trim()) return;
    setAiLoading(true);
    try {
      const res = await classifyServiceRequest(problemDescription.trim());
      if (res.data?.success && res.data?.data) {
        setAiResult(res.data.data);
      }
    } catch {
      // Advisory only
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const techId =
      selectedTechnician?.userId?._id?.toString() ||
      selectedTechnician?.userId?.toString() ||
      selectedTechnician?.id?.toString() ||
      selectedTechnician?._id?.toString();

    if (!selectedService?._id || !techId) {
      setError('Service and technician are required.');
      return;
    }

    const cleanPin = pincode.trim();
    if (!addressLine1.trim() || !city.trim() || !cleanPin) {
      setError('Please provide complete service address details.');
      return;
    }

    if (!PINCODE_REGEX.test(cleanPin)) {
      setError('Please provide a valid 6-digit PIN code.');
      return;
    }

    if (!problemDescription.trim()) {
      setError('Please describe the problem.');
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
        city: city.trim(),
        state: state.trim(),
        pincode: cleanPin,
        zipCode: cleanPin
      };

      if (selectedAddressMode === 'new' && saveToProfile) {
        try {
          await saveAddress({ type: 'home', ...addressPayload });
        } catch {
          // non-critical
        }
      }

      const payload = {
        serviceId: selectedService._id,
        technicianId: techId,
        providerId: techId,
        address: addressPayload,
        scheduledDate,
        preferredTimeSlot: timeSlot,
        problemDescription: problemDescription.trim()
      };

      const res = await createBooking(payload);
      const newBooking = res.data.booking;
      const techName = selectedTechnician?.name || selectedTechnician?.businessName || 'the technician';

      setRequestSuccess({
        bookingId: newBooking._id,
        technicianName: techName
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={requestSuccess ? 'Request Confirmed' : 'Book a Home Service'}
      subtitle={
        requestSuccess
          ? 'Direct request dispatched'
          : `Step ${step} of 6 — ${
              ['Choose Service', 'Select Technician', 'Describe Problem', 'Service Location', 'Select Schedule', 'Confirm Request'][step - 1]
            }`
      }
    >
      {/* SUCCESS SCREEN (Requirement 20) */}
      {requestSuccess ? (
        <div className="text-center py-6 space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl font-bold mx-auto shadow-2xs">
            ✓
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Request Sent</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
              Your request has been sent directly to <span className="font-bold text-slate-900">{requestSuccess.technicianName}</span>. You will be notified once they accept.
            </p>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/bookings/${requestSuccess.bookingId}`);
              }}
            >
              View Booking Details →
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-1.5" role="alert">
              <span>⚠</span> {error}
            </div>
          )}

          {/* Stepper Dots */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            {[1, 2, 3, 4, 5, 6].map((st) => (
              <div
                key={st}
                className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold transition-all ${
                  step === st
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : step > st
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > st ? '✓' : st}
              </div>
            ))}
          </div>

          {/* STEP 1: SERVICE */}
          {step === 1 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Select Desired Service
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((srv) => (
                  <button
                    key={srv._id}
                    type="button"
                    onClick={() => setSelectedService(srv)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedService?._id === srv._id
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{srv.categoryId?.icon || '🛠️'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        ₹{srv.basePrice || srv.estimatedPriceRange?.min || 299}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-2">{srv.name}</div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{srv.description}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-3">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedService}
                  onClick={() => setStep(2)}
                >
                  Select Technician →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: TECHNICIAN */}
          {step === 2 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Choose Verified Technician for {selectedService?.name}
              </label>
              {technicians.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  No technicians currently registered for this trade.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {technicians.map((tech) => {
                    const techId = tech.userId?._id || tech.id || tech._id;
                    const isSelected = (selectedTechnician?.userId?._id || selectedTechnician?.id || selectedTechnician?._id) === techId;
                    return (
                      <button
                        key={techId}
                        type="button"
                        onClick={() => setSelectedTechnician(tech)}
                        className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm">
                            {(tech.name || tech.businessName || 'T')[0]}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{tech.name || tech.businessName}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Verified
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {tech.profession || 'Specialist'} • {tech.experience || 'Experienced'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-amber-500">★ {tech.rating?.average ? Number(tech.rating.average).toFixed(1) : '5.0'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-between pt-3">
                <Button variant="secondary" size="sm" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedTechnician}
                  onClick={() => setStep(3)}
                >
                  Describe Problem →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: PROBLEM */}
          {step === 3 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Describe Problem / Scope of Work
              </label>
              <textarea
                rows={4}
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="e.g. AC cooling stops after 15 minutes, leaking water from indoor unit..."
                className="w-full p-3 text-xs rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
                required
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleAiAnalyze}
                  disabled={aiLoading || !problemDescription.trim()}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 disabled:opacity-40 flex items-center gap-1"
                >
                  {aiLoading ? 'Analyzing scope...' : '✨ Get AI Diagnosis Tips (Advisory)'}
                </button>
              </div>

              {aiResult && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-blue-950">AI Scope Insight:</div>
                  <p className="text-slate-700 text-[11px]">{aiResult.suggestedService} — Urgency: {aiResult.urgency}</p>
                </div>
              )}

              <div className="flex justify-between pt-3">
                <Button variant="secondary" size="sm" onClick={() => setStep(2)}>
                  ← Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!problemDescription.trim()}
                  onClick={() => setStep(4)}
                >
                  Location →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: LOCATION */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  4. Service Address
                </label>
                {savedAddresses.length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={selectedAddressMode === 'saved'}
                        onChange={() => {
                          setSelectedAddressMode('saved');
                          populateAddressFields(savedAddresses[0]);
                        }}
                      />
                      <span>Saved</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={selectedAddressMode === 'new'}
                        onChange={() => {
                          setSelectedAddressMode('new');
                          setAddressLine1('');
                          setPincode('');
                        }}
                      />
                      <span>New</span>
                    </label>
                  </div>
                )}
              </div>

              {selectedAddressMode === 'saved' && savedAddresses.length > 0 && (
                <select
                  value={selectedAddressId}
                  onChange={(e) => {
                    setSelectedAddressId(e.target.value);
                    const found = savedAddresses.find((a) => a._id === e.target.value);
                    if (found) populateAddressFields(found);
                  }}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50"
                >
                  {savedAddresses.map((a) => (
                    <option key={a._id} value={a._id}>
                      [{a.type.toUpperCase()}] {a.addressLine1 || a.streetAddress}, {a.city} - {a.pincode}
                    </option>
                  ))}
                </select>
              )}

              <div className="space-y-2 text-xs">
                <Input
                  label="Street / Flat / House No. *"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. Flat 301, Lakeview Apts, 12th Main"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Area / Locality"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="e.g. Indiranagar"
                  />
                  <Input
                    label="City *"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">State *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Pincode (6-digits) *"
                    value={pincode}
                    maxLength={6}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="560038"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <Button variant="secondary" size="sm" onClick={() => setStep(3)}>
                  ← Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!addressLine1.trim() || !pincode.trim()}
                  onClick={() => setStep(5)}
                >
                  Schedule →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: SCHEDULE */}
          {step === 5 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                5. Schedule Preferred Date &amp; Arrival Window
              </label>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preferred Time Window *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTimeSlot(slot)}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold cursor-pointer ${
                          timeSlot === slot
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <Button variant="secondary" size="sm" onClick={() => setStep(4)}>
                  ← Back
                </Button>
                <Button variant="primary" size="sm" onClick={() => setStep(6)}>
                  Review &amp; Confirm →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: CONFIRM & BOOKING SUMMARY PANEL (Requirement 20) */}
          {step === 6 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                6. Review Booking Summary
              </label>

              {/* Exact Summary Panel: Service, Technician, Date, Time, Location */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                <div className="flex justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-400 font-medium">Service:</span>
                  <span className="font-bold text-slate-900">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-400 font-medium">Technician:</span>
                  <span className="font-bold text-slate-900">
                    {selectedTechnician?.name || selectedTechnician?.businessName}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-400 font-medium">Date:</span>
                  <span className="font-bold text-slate-900">{new Date(scheduledDate).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-400 font-medium">Time Window:</span>
                  <span className="font-bold text-slate-900">{timeSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Location:</span>
                  <span className="font-medium text-slate-700 text-right max-w-[240px]">
                    {addressLine1}, {locality ? `${locality}, ` : ''}{city} - {pincode}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                <strong>Upfront Guarantee:</strong> No money is charged now. Your technician will conduct diagnostic inspection and provide an itemized estimate for your approval before starting any repair work.
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="secondary" size="sm" onClick={() => setStep(5)} disabled={submitting}>
                  ← Back
                </Button>
                {/* Primary Action: Send Request */}
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSendRequest}
                  disabled={submitting}
                  className="font-bold shadow-md shadow-blue-500/20"
                >
                  {submitting ? 'Sending Request...' : 'Send Request'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default BookingModal;

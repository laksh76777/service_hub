import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import { getMyProviderProfile, updateMyProviderProfile } from '../services/api';

const ALL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const ProviderProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');

  // Service Area
  const [citiesInput, setCitiesInput] = useState('');
  const [zipCodesInput, setZipCodesInput] = useState('');
  const [radiusKm, setRadiusKm] = useState(25);

  // Availability
  const [selectedDays, setSelectedDays] = useState(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [emergencyServices, setEmergencyServices] = useState(false);
  const [noticeHours, setNoticeHours] = useState(24);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await getMyProviderProfile();
      if (res?.data?.profile) {
        const p = res.data.profile;
        setBusinessName(p.businessName || '');
        setBio(p.bio || '');
        setLicenseNumber(p.licenseNumber || '');
        setInsuranceProvider(p.insuranceDetails?.provider || '');
        setPolicyNumber(p.insuranceDetails?.policyNumber || '');

        setCitiesInput(p.serviceArea?.cities?.join(', ') || '');
        const existingPincodes = p.serviceArea?.pincodes?.length ? p.serviceArea.pincodes : p.serviceArea?.zipCodes;
        setZipCodesInput(existingPincodes?.join(', ') || '');
        setRadiusKm(p.serviceArea?.radiusKm || 25);

        if (p.availability?.days?.length) setSelectedDays(p.availability.days);
        if (p.availability?.workingHours?.start) setStartTime(p.availability.workingHours.start);
        if (p.availability?.workingHours?.end) setEndTime(p.availability.workingHours.end);
        setEmergencyServices(Boolean(p.availability?.emergencyServices));
        setNoticeHours(p.availability?.noticeHours || 24);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const cities = citiesInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const zipCodes = zipCodesInput
        .split(',')
        .map((z) => z.trim())
        .filter(Boolean);

      await updateMyProviderProfile({
        businessName,
        bio,
        licenseNumber,
        insuranceDetails: {
          provider: insuranceProvider,
          policyNumber: policyNumber
        },
        serviceArea: {
          cities,
          zipCodes,
          pincodes: zipCodes,
          radiusKm: Number(radiusKm)
        },
        availability: {
          days: selectedDays,
          workingHours: { start: startTime, end: endTime },
          emergencyServices,
          noticeHours: Number(noticeHours)
        }
      });

      setFeedback({
        type: 'success',
        message: 'Technician profile, service area, and working schedule updated successfully!'
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update profile.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading fullPage text="Loading profile configuration..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Profile Settings
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-2">Technician Profile</h1>
          <p className="text-slate-500 text-xs mt-1">
            Configure your trade credentials, geographic coverage zones, and working schedule.
          </p>
        </div>
        <Link to="/technician/dashboard">
          <Button variant="outline" size="sm">
            &larr; Back to Dashboard
          </Button>
        </Link>
      </div>

      {feedback.message && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs font-semibold border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Business Identity & Licensing */}
        <Card
          title="1. Business Identity & Credentials"
          subtitle="Customer-facing information and trade verification data"
        >
          <div className="space-y-4">
            <Input
              label="Business / Trade Name"
              placeholder="e.g. Sharma Electricals & AC Care"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Bio / Specialty
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Highlight your trade experience, verified technician team, warranties, and specialized equipment..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Contractor License / GSTIN / MSME Reg."
                placeholder="e.g. 29ABCDE1234F1Z5 or MSME-KR-03-00123"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                helperText="Required for Admin Verification"
              />

              <Input
                label="Commercial Insurance / Guarantee Provider"
                placeholder="e.g. ICICI Lombard, HDFC ERGO, National Insurance"
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Service Area & Dispatch Coverage */}
        <Card
          title="2. Geographic Service Area"
          subtitle="Specify where your team is available to travel for on-site trade work"
        >
          <div className="space-y-4">
            <Input
              label="Covered Municipalities / Localities (Comma-separated)"
              placeholder="e.g. Bengaluru, Indiranagar, Koramangala, Whitefield, HSR Layout"
              value={citiesInput}
              onChange={(e) => setCitiesInput(e.target.value)}
              helperText="Separate multiple localities with commas"
            />

            <Input
              label="Covered PIN Codes (6-digit, comma-separated)"
              placeholder="e.g. 560001, 560034, 560038, 560066"
              value={zipCodesInput}
              onChange={(e) => setZipCodesInput(e.target.value)}
              helperText="Customers can search providers by entering their 6-digit PIN code"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maximum Operating Radius ({radiusKm} km)
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>5 km (Local)</span>
                <span>50 km (Regional)</span>
                <span>100 km (Wide Metro)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 3: Availability & Operating Schedule */}
        <div id="availability">
          <Card
            title="3. Basic Availability & Hours"
            subtitle="Let clients know your working schedule and emergency availability"
          >
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Available Working Days
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Daily Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Input
                label="Daily End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  24/7 Emergency Dispatch Services
                </span>
                <span className="text-[11px] text-slate-500">
                  Highlight your profile for after-hours burst pipes, power failures, or urgent heating outages.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emergencyServices}
                  onChange={(e) => setEmergencyServices(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
          </div>
        </Card>
      </div>

        {/* Submit Bar */}
        <div className="flex justify-end gap-3 pt-4">
          <Link to="/technician/dashboard">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving Changes...' : 'Save Technician Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProviderProfilePage;

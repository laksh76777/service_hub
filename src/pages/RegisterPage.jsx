import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

const PROFESSIONS = [
  'AC Technician',
  'Plumber',
  'Electrician',
  'RO Water Purifier Specialist',
  'Home Appliance Technician',
  'Carpenter & Woodwork Specialist',
  'Painter & Waterproofing Expert',
  'Other Home Services Specialist'
];

const RegisterPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramRole = searchParams.get('role')?.toLowerCase();
  const initialRole = paramRole === 'technician' ? 'technician' : 'customer';

  const [role, setRole] = useState(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Technician-specific fields
  const [profession, setProfession] = useState('AC Technician');
  const [experienceYears, setExperienceYears] = useState('3');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register, isAuthenticated, mongoUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const currentParam = searchParams.get('role')?.toLowerCase();
    if (currentParam === 'technician' && role !== 'technician') {
      setRole('technician');
    } else if (currentParam === 'customer' && role !== 'customer') {
      setRole('customer');
    }
  }, [searchParams, role]);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setSearchParams({ role: newRole });
    setErrorMessage('');
  };

  useEffect(() => {
    if (isAuthenticated && mongoUser) {
      if (mongoUser.role === 'TECHNICIAN' || mongoUser.role === 'PROVIDER') {
        navigate('/technician/dashboard', { replace: true });
      } else if (mongoUser.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, mongoUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (role === 'technician') {
        await register(email, password, {
          name: fullName,
          role: 'TECHNICIAN',
          phone,
          profession,
          experience: `${experienceYears} years`,
          experienceYears: Number(experienceYears) || 1,
          businessName: businessName.trim() || `${fullName}'s Technical Services`,
          city: city.trim(),
          bio: bio.trim()
        });
        navigate('/technician/dashboard', {
          replace: true,
          state: { registered: true, pendingVerification: true }
        });
      } else {
        await register(email, password, {
          name: fullName,
          role: 'CUSTOMER',
          phone
        });
        navigate('/dashboard', {
          replace: true,
          state: { registered: true }
        });
      }
    } catch (err) {
      let msg = 'Failed to create account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use a stronger password.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <Card
          title={
            role === 'technician'
              ? 'Register as Verified Technician'
              : 'Create Customer Account'
          }
          subtitle={
            role === 'technician'
              ? 'Join our certified contractor network. Complete your trade background to receive customer requests.'
              : 'Join India’s transparent local home service network with verified work evidence and 30-day warranty.'
          }
        >
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span className="font-bold">Error:</span> {errorMessage}
            </div>
          )}

          {/* Explicit Role Separation Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Registration Flow:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleChange('customer')}
                className={`p-3.5 text-left rounded-xl border transition-all ${
                  role === 'customer'
                    ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-sm font-bold text-slate-900">👤 Customer Flow</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Request, verify, &amp; pay for home repairs</div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('technician')}
                className={`p-3.5 text-left rounded-xl border transition-all ${
                  role === 'technician'
                    ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-sm font-bold text-slate-900">🔧 Technician Flow</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Contractor providing on-site services</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Legal Name"
                type="text"
                placeholder={role === 'technician' ? 'e.g. Rahul Sharma' : 'e.g. Laksh Suthar'}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="Mobile Phone (+91)"
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password (min. 6 characters)"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Technician Dedicated Flow Fields */}
            {role === 'technician' && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 bg-slate-50/70 p-4 rounded-2xl border">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                  <span>🛠️</span> Technician Qualification &amp; Coverage Details
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Primary Profession / Trade
                    </label>
                    <select
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800"
                      required
                    >
                      {PROFESSIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Years of Field Experience
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="40"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      placeholder="e.g. 5"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Trade / Agency Name (Optional)"
                    type="text"
                    placeholder="e.g. CoolCare Solutions"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />

                  <Input
                    label="Operating City / Primary Zone"
                    type="text"
                    placeholder="e.g. Bengaluru, Indiranagar"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bio &amp; Background (Skills, Equipment, Certifications)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800 placeholder:text-slate-400"
                    placeholder="Describe your trade specialty, brands you service, and service guarantees..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>

                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  <strong>Verification Notice:</strong> Newly registered technician accounts are placed into{' '}
                  <span className="font-bold underline">PENDING</span> review. Platform administrators verify
                  qualifications before your profile appears in public customer listings.
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className={`w-full shadow-md ${
                  role === 'technician'
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                }`}
                disabled={loading}
              >
                {loading
                  ? 'Creating Account...'
                  : role === 'technician'
                  ? 'Submit Technician Application →'
                  : 'Complete Customer Registration →'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Sign in here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;

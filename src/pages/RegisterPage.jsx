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
  'Home Appliance Specialist'
];

const RegisterPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramRole = searchParams.get('role')?.toLowerCase();
  const initialRole = paramRole === 'technician' ? 'technician' : 'customer';

  const [role, setRole] = useState(initialRole);
  
  // Common Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Technician Specific Fields (Progressive Grouping)
  const [techStep, setTechStep] = useState(1); // 1: Personal, 2: Professional & Services, 3: Experience & Bio
  const [profession, setProfession] = useState('AC Technician');
  const [experienceYears, setExperienceYears] = useState('4');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [bio, setBio] = useState('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successState, setSuccessState] = useState(null); // { message, destination }

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
    setSearchParams({ role: newRole.toUpperCase() });
    setErrorMessage('');
    setTechStep(1);
  };

  const redirectParam = searchParams.get('redirect');

  useEffect(() => {
    if (isAuthenticated && mongoUser && !successState) {
      if (redirectParam) {
        navigate(redirectParam, { replace: true });
        return;
      }
      if (mongoUser.role === 'TECHNICIAN' || mongoUser.role === 'PROVIDER') {
        navigate('/technician/dashboard', { replace: true });
      } else if (mongoUser.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, mongoUser, navigate, successState, redirectParam]);

  const validateCustomerFields = () => {
    if (!fullName.trim()) return 'Please enter your full legal name.';
    if (!email.trim() || !email.includes('@')) return 'Please enter a valid email address.';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) return 'Please enter a valid 10-digit mobile phone number.';
    if (password.length < 6) return 'Password must be at least 6 characters long.';
    if (password !== confirmPassword) return 'Password and Confirm Password do not match.';
    return null;
  };

  const validateTechStep1 = () => {
    if (!fullName.trim()) return 'Please enter your full legal name.';
    if (!email.trim() || !email.includes('@')) return 'Please enter a valid email address.';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) return 'Please enter a valid 10-digit phone number.';
    if (password.length < 6) return 'Password must be at least 6 characters long.';
    if (password !== confirmPassword) return 'Password and Confirm Password do not match.';
    return null;
  };

  const validateTechStep2 = () => {
    if (!profession) return 'Please select your primary trade profession.';
    if (!city.trim()) return 'Please specify your primary city / operating area.';
    return null;
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    const valErr = validateCustomerFields();
    if (valErr) {
      setErrorMessage(valErr);
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      await register(email.trim(), password, {
        name: fullName.trim(),
        role: 'CUSTOMER',
        phone: phone.trim()
      });

      const dest = redirectParam || '/dashboard';
      setSuccessState({
        title: 'Account Created Successfully!',
        message: 'Welcome to ServiceHub. Your customer account is ready.',
        destination: dest
      });

      setTimeout(() => {
        navigate(dest, { replace: true });
      }, 1200);
    } catch (err) {
      let msg = 'Failed to create customer account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters with letters and numbers.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTechnicianSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await register(email.trim(), password, {
        name: fullName.trim(),
        role: 'TECHNICIAN',
        phone: phone.trim(),
        profession,
        experience: `${experienceYears} years`,
        experienceYears: Number(experienceYears) || 1,
        businessName: businessName.trim() || `${fullName.trim()}'s Technical Services`,
        city: city.trim(),
        bio: bio.trim()
      });

      setSuccessState({
        title: 'Profile Submitted for Verification',
        message: 'Your technician profile has been submitted for verification. Our operations team will review your qualifications.',
        destination: '/technician/dashboard'
      });

      setTimeout(() => {
        navigate('/technician/dashboard', {
          replace: true,
          state: { registered: true, pendingVerification: true }
        });
      }, 2000);
    } catch (err) {
      let msg = 'Failed to submit technician application.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  if (successState) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl font-bold mx-auto">
            ✓
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{successState.title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{successState.message}</p>
          <div className="pt-3">
            <Link to={successState.destination}>
              <Button variant="primary" size="md" className="w-full">
                Proceed to Dashboard →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <Card
          title={
            role === 'technician' ? 'Join ServiceHub as a Technician' : 'Create Customer Account'
          }
          subtitle={
            role === 'technician'
              ? 'Create your profile and get verified before receiving service requests.'
              : 'Sign up to request verified home service technicians with upfront digital estimates.'
          }
        >
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2" role="alert">
              <span className="font-bold">Error:</span> {errorMessage}
            </div>
          )}

          {/* Role Switching Tabs */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-slate-100/80 border border-slate-200">
              <button
                type="button"
                onClick={() => handleRoleChange('customer')}
                className={`py-2.5 px-4 text-xs font-bold rounded-xl transition-all ${
                  role === 'customer'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👤 Customer Registration
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('technician')}
                className={`py-2.5 px-4 text-xs font-bold rounded-xl transition-all ${
                  role === 'technician'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔧 Join as Technician
              </button>
            </div>
          </div>

          {/* CUSTOMER REGISTRATION FORM (Requirement 13) */}
          {role === 'customer' && (
            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <Input
                label="Full Legal Name"
                placeholder="e.g. Laksh Suthar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

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
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Minimum 6 characters"
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-slate-400 hover:text-slate-700 font-medium px-1 py-1"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  }
                />

                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  className="py-2.5 font-bold shadow-sm"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Complete Customer Registration'}
                </Button>
              </div>
            </form>
          )}

          {/* TECHNICIAN REGISTRATION FORM (Requirement 14: Progressive Grouping) */}
          {role === 'technician' && (
            <div className="space-y-5">
              {/* Stepper Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                <div className={`font-bold ${techStep >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                  1. Personal Details
                </div>
                <span className="text-slate-300">→</span>
                <div className={`font-bold ${techStep >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
                  2. Trade &amp; Services
                </div>
                <span className="text-slate-300">→</span>
                <div className={`font-bold ${techStep >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
                  3. Experience &amp; Bio
                </div>
              </div>

              {/* Step 1: Personal Info */}
              {techStep === 1 && (
                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

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
                      label="Create Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      helperText="Min. 6 characters"
                      required
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-xs text-slate-400 hover:text-slate-700 font-medium px-1"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      }
                    />

                    <Input
                      label="Confirm Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        const err = validateTechStep1();
                        if (err) {
                          setErrorMessage(err);
                          return;
                        }
                        setErrorMessage('');
                        setTechStep(2);
                      }}
                    >
                      Continue to Trade Information →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Professional Information & Services */}
              {techStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Primary Trade Profession *
                    </label>
                    <select
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-medium text-slate-800"
                      required
                    >
                      {PROFESSIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Business / Trade Name (Optional)"
                      placeholder="e.g. CoolCare Solutions"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />

                    <Input
                      label="Primary Operating City / Zone *"
                      placeholder="e.g. Bengaluru, Indiranagar"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="pt-2 flex justify-between">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setTechStep(1)}
                    >
                      ← Back
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        const err = validateTechStep2();
                        if (err) {
                          setErrorMessage(err);
                          return;
                        }
                        setErrorMessage('');
                        setTechStep(3);
                      }}
                    >
                      Continue to Experience &amp; Bio →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Experience & Bio & Submission */}
              {techStep === 3 && (
                <form onSubmit={handleTechnicianSubmit} className="space-y-4">
                  <Input
                    label="Years of Experience *"
                    type="number"
                    min="0"
                    max="40"
                    placeholder="e.g. 5"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    required
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Profile Bio (Certifications, Tools, Brands Serviced)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-normal text-slate-800 placeholder:text-slate-400"
                      placeholder="Describe your trade background and specialties..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>

                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed">
                    <strong>Notice:</strong> Your technician profile will be submitted for administrative verification. You will be able to configure specific service rates inside your dashboard once submitted.
                  </div>

                  <div className="pt-2 flex justify-between">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setTechStep(2)}
                      disabled={loading}
                    >
                      ← Back
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      {loading ? 'Submitting Application...' : 'Submit Technician Application'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;

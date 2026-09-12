import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [role, setRole] = useState('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, {
        name: fullName,
        role: role.toUpperCase(),
        phone,
        businessName: role === 'provider' ? businessName : undefined
      });
      navigate('/dashboard', {
        replace: true,
        state: { registered: true }
      });
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Card
          title="Create your ServiceHub account"
          subtitle="Join India's verified local home service and work verification network"
        >
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span className="font-bold">Error:</span> {errorMessage}
            </div>
          )}

          {/* Account Role Selector */}
          <div className="mb-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              I am registering as:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`p-3 text-left rounded-xl border transition-all ${
                  role === 'customer'
                    ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-sm font-bold text-slate-900">👤 Customer</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Book &amp; verify home repairs</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('provider')}
                className={`p-3 text-left rounded-xl border transition-all ${
                  role === 'provider'
                    ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-sm font-bold text-slate-900">🔧 Service Provider</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Technician / business pro</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Laksh Suthar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            {role === 'provider' && (
              <Input
                label="Registered Business / Enterprise Name"
                type="text"
                placeholder="e.g. CoolCare Air Conditioning Services"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            )}

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
              />
            </div>

            <Input
              label="Password (min. 6 characters)"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full shadow-md shadow-blue-500/20" disabled={loading}>
                {loading ? 'Creating Account...' : 'Complete Registration →'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Sign in to account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;

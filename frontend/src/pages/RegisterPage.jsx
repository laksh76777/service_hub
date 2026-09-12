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
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card
          title="Create your account"
          subtitle="Join ServiceHub as a client or verified service provider"
        >
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <span className="font-bold">Error:</span> {errorMessage}
            </div>
          )}

          {/* Account Role Selector */}
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              I am signing up as
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  role === 'customer'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setRole('provider')}
                className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  role === 'provider'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Service Provider
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Input
              label="Full Name"
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            {role === 'provider' && (
              <Input
                label="Business / Trade Name"
                placeholder="e.g. Apex Electric LLC"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Phone Number (Optional)"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : `Register as ${role === 'customer' ? 'Customer' : 'Provider'}`}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;

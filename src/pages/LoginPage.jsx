import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { getDemoAccounts } from '../services/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [demoAccounts, setDemoAccounts] = useState([
    { role: 'Admin', email: 'abc@gmail.com', label: '👑 Demo Admin', desc: 'Platform oversight & operations' },
    { role: 'Customer', email: 'laksh@gmail.com', label: '👤 Demo Customer', desc: 'Laksh Suthar (Indiranagar, Bengaluru)' },
    { role: 'Technician', email: 'ac@gmail.com', label: '❄️ AC Technician', desc: 'Rahul Sharma (CoolCare AC Solutions)' },
    { role: 'Technician', email: 'plumber@gmail.com', label: '🚰 Plumber', desc: 'Imran Khan (QuickFix Plumbing)' },
    { role: 'Technician', email: 'electrician@gmail.com', label: '⚡ Electrician', desc: 'Arjun Patel (PowerFix Electricals)' },
    { role: 'Technician', email: 'ro@gmail.com', label: '💧 RO Specialist', desc: 'Suresh Verma (PureFlow RO Systems)' },
    { role: 'Technician', email: 'appliance@gmail.com', label: '🧺 Appliance Specialist', desc: 'Vikram Singh (SmartCare Appliances)' }
  ]);

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const { login, resetPassword, isAuthenticated, mongoUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect') || location.state?.from?.pathname || null;
  const reasonParam = searchParams.get('reason');

  const [directLoggingEmail, setDirectLoggingEmail] = useState('');

  const getRoleDashboard = (role) => {
    const r = (role || '').toUpperCase();
    if (r === 'ADMIN') return '/admin/dashboard';
    if (r === 'TECHNICIAN' || r === 'PROVIDER') return '/technician/dashboard';
    return '/dashboard';
  };

  useEffect(() => {
    getDemoAccounts()
      .then((res) => {
        if (res?.data?.data?.accounts && res.data.data.accounts.length > 0) {
          setDemoAccounts(res.data.data.accounts);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated && mongoUser) {
      navigate(redirectParam || getRoleDashboard(mongoUser.role), { replace: true });
    }
  }, [isAuthenticated, mongoUser, navigate, redirectParam]);

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('123456');
    setErrorMessage('');
  };

  const handleDirectLogin = async (demoEmail, demoPassword = '123456') => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage('');
    setSuccessMessage('');
    setDirectLoggingEmail(demoEmail);
    setLoading(true);

    try {
      const { profile } = await login(demoEmail, demoPassword);
      const dest = redirectParam || getRoleDashboard(profile?.role || 'CUSTOMER');
      navigate(dest, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to sign in with demo account.');
    } finally {
      setLoading(false);
      setDirectLoggingEmail('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email address and password.');
      return;
    }

    setLoading(true);

    try {
      const { profile } = await login(email.trim(), password);
      const dest = redirectParam || getRoleDashboard(profile?.role || 'CUSTOMER');
      navigate(dest, { replace: true });
    } catch (err) {
      let msg = 'Failed to sign in. Please check your credentials.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        msg = 'Invalid email address or password.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please try again later or reset your password.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }
    setResetError('');
    setResetMessage('');
    setResetLoading(true);

    try {
      await resetPassword(resetEmail.trim());
      setResetMessage('Password reset link sent! Please check your inbox.');
    } catch (err) {
      let msg = 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No account exists with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.message) {
        msg = err.message;
      }
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left: Login Form */}
        <div className="md:col-span-7">
          <Card
            title={
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                  S
                </div>
                <span>ServiceHub Login</span>
              </div>
            }
            subtitle="Sign in to your account to manage bookings, jobs, or estimates."
          >
            {reasonParam === 'service_request' && (
              <div className="mb-5 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                <span className="text-base flex-shrink-0">🔐</span>
                <div className="space-y-1">
                  <p className="font-bold">Sign in to request home service</p>
                  <p className="text-blue-700">
                    Please sign in with your customer account, or use <strong>1-Click Demo Customer</strong> on the right to test immediately.
                  </p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2" role="alert">
                <span className="font-bold">Error:</span> {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setShowResetModal(true);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-slate-400 hover:text-slate-700 font-medium px-1 py-1 cursor-pointer select-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  }
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  className="py-2.5 shadow-sm text-sm font-bold cursor-pointer"
                  disabled={loading}
                >
                  {loading && !directLoggingEmail ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </form>

            {/* Links: Create Customer Account & Register as Technician */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <Link
                to={`/register?role=CUSTOMER${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`}
                className="text-blue-600 font-semibold hover:underline flex items-center gap-1.5"
              >
                <span>👤</span>
                <span>Create Customer Account</span>
              </Link>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <Link
                to="/register?role=TECHNICIAN"
                className="text-slate-700 font-semibold hover:text-blue-600 hover:underline flex items-center gap-1.5"
              >
                <span>🔧</span>
                <span>Register as Technician</span>
              </Link>
            </div>
          </Card>
        </div>

        {/* Right: 1-Click Demo Accounts */}
        <div className="md:col-span-5 p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">1-Click Demo Accounts</h3>
              <p className="text-[11px] text-slate-400">Click Log In to access instantly, or Autofill</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {demoAccounts.map((acc) => (
              <div
                key={acc.email}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-150 flex flex-col gap-1.5 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    {acc.label}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickFill(acc.email)}
                      className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                      title="Fill email and password into form"
                    >
                      Autofill
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleDirectLogin(acc.email)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-600 hover:bg-blue-500 active:scale-95 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {directLoggingEmail === acc.email ? 'Logging in...' : '⚡ Log In'}
                    </button>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{acc.email}</span>
                <span className="text-[10px] text-slate-500">{acc.desc}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 text-[10px] text-slate-400 flex items-center gap-1.5">
            <span>🔒</span>
            <span>Customer, Technician, and Admin roles tested with real backend auth.</span>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Password"
        subtitle="We will send a password reset link to your verified email."
      >
        <form onSubmit={handlePasswordReset} className="space-y-4">
          {resetError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {resetError}
            </div>
          )}

          {resetMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
              {resetMessage}
            </div>
          )}

          <Input
            label="Your Email Address"
            type="email"
            placeholder="you@example.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowResetModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={resetLoading}>
              {resetLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LoginPage;

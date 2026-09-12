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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [demoAccounts, setDemoAccounts] = useState([
    { role: 'Admin', email: 'abc@gmail.com', label: '👑 Demo Admin', desc: 'Platform oversight & moderation' },
    { role: 'Customer', email: 'laksh@gmail.com', label: '👤 Demo Customer', desc: 'Laksh Suthar (Indiranagar, Bengaluru)' },
    { role: 'Technician', email: 'ac@gmail.com', label: '❄️ AC Technician', desc: 'Rahul Sharma (CoolCare AC Solutions)' },
    { role: 'Technician', email: 'plumber@gmail.com', label: '🚰 Plumber', desc: 'Imran Khan (QuickFix Plumbing)' },
    { role: 'Technician', email: 'electrician@gmail.com', label: '⚡ Electrician', desc: 'Arjun Patel (PowerFix Electricals)' },
    { role: 'Technician', email: 'ro@gmail.com', label: '💧 RO Technician', desc: 'Suresh Verma (PureFlow RO Systems)' },
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

  const from = location.state?.from?.pathname || null;

  // Exact post-login role redirection
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
      .catch(() => {
        // Retain fallback demo accounts
      });
  }, []);

  useEffect(() => {
    if (isAuthenticated && mongoUser) {
      navigate(from || getRoleDashboard(mongoUser.role), { replace: true });
    }
  }, [isAuthenticated, mongoUser, navigate, from]);

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('123456');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const { profile } = await login(email, password);
      const dest = from || getRoleDashboard(profile?.role || 'CUSTOMER');
      navigate(dest, { replace: true });
    } catch (err) {
      let msg = 'Failed to sign in. Please check your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email address or password.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please try again later or reset your password.';
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
    if (!resetEmail) {
      setResetError('Please enter your email address.');
      return;
    }
    setResetError('');
    setResetMessage('');
    setResetLoading(true);

    try {
      await resetPassword(resetEmail);
      setResetMessage('Password reset link sent! Check your inbox.');
    } catch (err) {
      let msg = 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No user account found with this email address.';
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
            title="ServiceHub Login"
            subtitle="Sign in to manage your bookings, estimates, or service requests"
          >
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <span className="font-bold">Error:</span> {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setShowResetModal(true);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full shadow-md shadow-blue-500/20 text-sm font-bold py-2.5"
                  disabled={loading}
                >
                  {loading ? 'Logging In...' : 'Login'}
                </Button>
              </div>
            </form>

            {/* User-specified Links: Register as Customer & Register as Technician */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <Link
                to="/register?role=CUSTOMER"
                className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
              >
                <span>👤</span>
                <span>Register as Customer</span>
              </Link>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <Link
                to="/register?role=TECHNICIAN"
                className="text-slate-800 font-semibold hover:text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>🔧</span>
                <span>Register as Technician</span>
              </Link>
            </div>
          </Card>
        </div>

        {/* Right: 1-Click Demo Accounts */}
        <div className="md:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <div>
              <h3 className="text-sm font-bold text-white">1-Click Demo Accounts</h3>
              <p className="text-[11px] text-slate-400">Click any role to autofill and sign in</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickFill(acc.email)}
                className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 transition-all flex flex-col gap-0.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                    {acc.label}
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono">Autofill →</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{acc.email}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">{acc.desc}</span>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 text-[10px] text-slate-400 flex items-center gap-1.5">
            <span>🔒</span>
            <span>Customer, Technician, and Admin roles securely tested.</span>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Your Password"
      >
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <p className="text-sm text-slate-600">
            Enter your email address and we will send you a secure password reset link.
          </p>

          {resetError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {resetError}
            </div>
          )}

          {resetMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
              {resetMessage}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowResetModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={resetLoading}>
              {resetLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LoginPage;

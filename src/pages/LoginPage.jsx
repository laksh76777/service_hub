import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState('CUSTOMER'); // 'CUSTOMER' | 'TECHNICIAN' | 'ADMIN'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [directLoggingEmail, setDirectLoggingEmail] = useState('');

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
  const rawRedirect = searchParams.get('redirect') || location.state?.from?.pathname || null;
  const redirectParam = rawRedirect && !rawRedirect.startsWith('/login') && !rawRedirect.startsWith('/register') ? rawRedirect : null;
  const reasonParam = searchParams.get('reason');

  const DEMO_CREDENTIALS = [
    {
      role: 'ADMIN',
      email: 'abc@gmail.com',
      label: 'Platform Administrator',
      desc: 'Platform oversight, dispute resolution & audits',
      icon: '🛡️'
    },
    {
      role: 'CUSTOMER',
      email: 'laksh@gmail.com',
      label: 'Laksh Suthar (Customer)',
      desc: 'Browse services, book direct technicians & track jobs',
      icon: '👤'
    },
    {
      role: 'TECHNICIAN',
      email: 'ac@gmail.com',
      label: 'Rahul Sharma (AC Tech)',
      desc: 'CoolCare AC Solutions • 4.8★ Verified Partner',
      icon: '❄️'
    },
    {
      role: 'TECHNICIAN',
      email: 'plumber@gmail.com',
      label: 'Imran Khan (Plumber)',
      desc: 'QuickFix Plumbing • 4.7★ Verified Partner',
      icon: '🔧'
    },
    {
      role: 'TECHNICIAN',
      email: 'electrician@gmail.com',
      label: 'Arjun Patel (Electrician)',
      desc: 'PowerFix Electricals • 4.9★ Verified Partner',
      icon: '⚡'
    },
    {
      role: 'TECHNICIAN',
      email: 'ro@gmail.com',
      label: 'Suresh Verma (RO Purifier)',
      desc: 'PureFlow RO Systems • 4.8★ Verified Partner',
      icon: '💧'
    },
    {
      role: 'TECHNICIAN',
      email: 'appliance@gmail.com',
      label: 'Vikram Singh (Appliances)',
      desc: 'SmartCare Home Appliances • 4.8★ Verified Partner',
      icon: '🧺'
    }
  ];

  const getRoleDashboard = (role) => {
    const r = (role || '').toUpperCase();
    if (r === 'ADMIN') return '/admin/dashboard';
    if (r === 'TECHNICIAN' || r === 'PROVIDER') return '/technician/dashboard';
    return '/customer/dashboard';
  };

  // If already authenticated, route to appropriate dashboard
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

  const executeLogin = async (targetEmail, targetPassword) => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { profile } = await login(targetEmail, targetPassword);
      const actualRole = (profile?.role || 'CUSTOMER').toUpperCase();

      // Security Verification: Check if user attempted to log in under a role they do not possess
      if (selectedRole !== actualRole) {
        setSuccessMessage(
          `Signed in as ${profile?.name || actualRole}. Redirecting to your authorized ${actualRole} portal...`
        );
        setTimeout(() => {
          navigate(getRoleDashboard(actualRole), { replace: true });
        }, 900);
      } else {
        const dest = redirectParam || getRoleDashboard(actualRole);
        navigate(dest, { replace: true });
      }
    } catch (err) {
      console.error('Login failed:', err);
      let userFriendlyMsg = 'Invalid email or password. Please check your credentials.';
      if (err.code === 'auth/user-not-found' || err.message?.includes('user-not-found')) {
        userFriendlyMsg = 'No account found with this email. Please register first or use a demo account.';
      } else if (err.code === 'auth/wrong-password' || err.message?.includes('wrong-password')) {
        userFriendlyMsg = 'Incorrect password. Please try again or use password reset.';
      } else if (err.code === 'auth/too-many-requests') {
        userFriendlyMsg = 'Too many failed login attempts. Please wait a moment before trying again.';
      } else if (err.message) {
        userFriendlyMsg = err.message;
      }
      setErrorMessage(userFriendlyMsg);
    } finally {
      setLoading(false);
      setDirectLoggingEmail('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email address and password.');
      return;
    }
    executeLogin(email.trim(), password);
  };

  const handleDirectLogin = (demoEmail, demoPassword = '123456') => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setDirectLoggingEmail(demoEmail);
    executeLogin(demoEmail, demoPassword);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');

    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetMessage('Password reset email sent! Please check your inbox.');
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
        setResetMessage('');
      }, 3000);
    } catch (err) {
      setResetError(err.message || 'Failed to send password reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const filteredDemoAccounts = DEMO_CREDENTIALS.filter((a) => a.role === selectedRole);

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-sm group-hover:bg-blue-700 transition">
              S
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">
              Service<span className="text-blue-600">Hub</span>
            </span>
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In to Your Account</h2>
          <p className="mt-1 text-sm text-slate-600">
            One platform connecting customers directly with certified technicians
          </p>
        </div>

        {/* Reason Alert Banner if redirected */}
        {reasonParam === 'auth_required' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3.5 rounded-xl flex items-start gap-2.5">
            <span className="text-lg">🔒</span>
            <div>
              <div className="font-semibold">Authentication Required</div>
              <div>Please sign in to proceed with your booking request.</div>
            </div>
          </div>
        )}

        {/* Role Selector Tabs */}
        <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('CUSTOMER');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-lg transition text-center ${
              selectedRole === 'CUSTOMER'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('TECHNICIAN');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-lg transition text-center ${
              selectedRole === 'TECHNICIAN'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Technician
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('ADMIN');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-lg transition text-center ${
              selectedRole === 'ADMIN'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Administrator
          </button>
        </div>

        <Card className="p-6 sm:p-7 shadow-sm border border-slate-200 rounded-2xl bg-white">
          {errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl flex items-start gap-2">
              <span className="font-bold">&times;</span>
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-xl flex items-start gap-2">
              <span className="font-bold">&check;</span>
              <div>{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder={
                selectedRole === 'ADMIN'
                  ? 'abc@gmail.com'
                  : selectedRole === 'TECHNICIAN'
                  ? 'ac@gmail.com'
                  : 'laksh@gmail.com'
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowResetModal(true);
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant={
                selectedRole === 'ADMIN'
                  ? 'primary'
                  : selectedRole === 'TECHNICIAN'
                  ? 'success'
                  : 'primary'
              }
              className={`w-full py-2.5 text-sm font-semibold rounded-xl text-white ${
                selectedRole === 'TECHNICIAN'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : selectedRole === 'ADMIN'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              loading={loading && !directLoggingEmail}
            >
              Sign In as {selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}
            </Button>

            {/* Quick Registration Links */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                to="/register?role=customer"
                className="py-2 px-3 text-center text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
              >
                Register as Customer
              </Link>
              <Link
                to="/register?role=technician"
                className="py-2 px-3 text-center text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-800 transition"
              >
                Join as Technician
              </Link>
            </div>
          </form>

          {/* Role-Specific Quick Demo Fill Area */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2.5 flex items-center justify-between">
              <span>Demo Accounts ({selectedRole}):</span>
              <span className="text-[10px] font-normal text-slate-400">1-click instant login</span>
            </div>

            <div className="space-y-2">
              {filteredDemoAccounts.map((account) => (
                <div
                  key={account.email}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/40 transition flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                      <span>{account.icon}</span>
                      <span className="truncate">{account.label}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{account.desc}</div>
                    <div className="text-[11px] font-mono text-blue-600 mt-0.5">{account.email}</div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickFill(account.email)}
                      className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-white rounded border border-slate-200 transition"
                      title="Fill email and password into form"
                    >
                      Fill
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDirectLogin(account.email)}
                      disabled={loading}
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition disabled:opacity-50"
                      title="Sign in directly with this demo account"
                    >
                      {directLoggingEmail === account.email ? 'Logging in...' : 'Sign In'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Footer Navigation */}
        <div className="text-center text-xs text-slate-600 space-y-1">
          {selectedRole !== 'ADMIN' ? (
            <div>
              Don't have an account yet?{' '}
              <Link
                to={`/register?role=${selectedRole.toLowerCase()}`}
                className="font-semibold text-blue-600 hover:underline"
              >
                Register as a {selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}
              </Link>
            </div>
          ) : (
            <div className="text-slate-400 italic">
              Administrative accounts are provisioned via system security controls.
            </div>
          )}
          <div>
            <Link to="/" className="text-slate-500 hover:text-slate-800 transition">
              &larr; Return to ServiceHub Home
            </Link>
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
            Enter your registered email address below. We'll send you a secure link to reset your password.
          </p>

          {resetError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {resetError}
            </div>
          )}

          {resetMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg">
              {resetMessage}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowResetModal(false)}
              disabled={resetLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={resetLoading}>
              Send Reset Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LoginPage;

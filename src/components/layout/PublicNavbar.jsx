import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PublicNavbar = () => {
  const { isAuthenticated, role, user, mongoUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getDashboardPath = () => {
    if (role === 'ADMIN') return '/admin/dashboard';
    if (role === 'TECHNICIAN' || role === 'PROVIDER') return '/technician/dashboard';
    return '/customer/dashboard';
  };

  const getDashboardLabel = () => {
    if (role === 'ADMIN') return 'Admin Console';
    if (role === 'TECHNICIAN' || role === 'PROVIDER') return 'Technician Portal';
    return 'Customer Portal';
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleHashNav = (e, hashId) => {
    if (location.pathname === '/') {
      e.preventDefault();
      const el = document.getElementById(hashId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setMobileMenuOpen(false);
  };

  const displayName = mongoUser?.name || user?.displayName || user?.email?.split('@')[0] || 'Account';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-sm group-hover:bg-blue-700 transition">
              S
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 block leading-tight">
                Service<span className="text-blue-600">Hub</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-400 block -mt-0.5">
                Direct Services
              </span>
            </div>
          </Link>

          {/* Public Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <Link to="/" className="hover:text-blue-600 transition">
              Home
            </Link>
            <a
              href="/#how-it-works"
              onClick={(e) => handleHashNav(e, 'how-it-works')}
              className="hover:text-blue-600 transition cursor-pointer"
            >
              How It Works
            </a>
            <Link to="/services" className="hover:text-blue-600 transition">
              Services
            </Link>
            <a
              href="/#why-servicehub"
              onClick={(e) => handleHashNav(e, 'why-servicehub')}
              className="hover:text-blue-600 transition cursor-pointer"
            >
              Why ServiceHub
            </a>
            <Link to="/technicians" className="hover:text-blue-600 transition">
              Find Technicians
            </Link>
          </nav>

          {/* Right CTA Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={getDashboardPath()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
                >
                  <span>{getDashboardLabel()}</span>
                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded font-mono">
                    {role}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-red-600 transition cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            Home
          </Link>
          <a
            href="/#how-it-works"
            onClick={(e) => handleHashNav(e, 'how-it-works')}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            How It Works
          </a>
          <Link
            to="/services"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            Services
          </Link>
          <a
            href="/#why-servicehub"
            onClick={(e) => handleHashNav(e, 'why-servicehub')}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Why ServiceHub
          </a>
          <Link
            to="/technicians"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            Find Technicians
          </Link>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <div className="text-xs text-slate-500 px-3 font-medium">
                  Signed in as <span className="font-semibold text-slate-800">{displayName}</span> ({role})
                </div>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 text-white"
                >
                  {getDashboardLabel()}
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 text-white"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNavbar;

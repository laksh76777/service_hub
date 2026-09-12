import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../layout/NotificationBell';

const CITIES = ['Bengaluru', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Pune'];

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Bengaluru');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, mongoUser, isAuthenticated, logout } = useAuth();

  const isProviderOrAdmin = mongoUser?.role === 'PROVIDER' || mongoUser?.role === 'ADMIN';

  const navLinks = [
    { name: 'Services', path: '/services' },
    { name: 'Verified Providers', path: '/providers' },
    ...(isAuthenticated ? [{ name: 'Dashboard', path: '/dashboard' }] : []),
    ...(isProviderOrAdmin ? [{ name: 'Provider Cockpit', path: '/provider/dashboard' }] : [])
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const roleBadgeColor = {
    CUSTOMER: 'bg-blue-50 text-blue-700 border-blue-200',
    PROVIDER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-200'
  }[mongoUser?.role || 'CUSTOMER'] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <nav className="sticky top-0 z-40 glass-nav transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & City Selector */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-105 transition-transform">
                S
              </div>
              <div className="flex flex-col">
                <span className="text-slate-900 font-extrabold text-lg leading-tight tracking-tight">
                  Service<span className="text-blue-600">Hub</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  India Verified
                </span>
              </div>
            </Link>

            {/* City Quick Picker */}
            <div className="hidden lg:relative lg:block">
              <button
                type="button"
                onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors border border-slate-200"
              >
                <span className="text-blue-600">📍</span>
                <span>{selectedCity}</span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {cityDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-40 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Metro
                  </div>
                  {CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSelectedCity(c);
                        setCityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-blue-50 transition-colors flex items-center justify-between ${
                        selectedCity === c ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span>{c}</span>
                      {selectedCity === c && <span className="text-blue-600 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive(link.path)
                    ? 'text-blue-600 bg-blue-50/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Controls */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-white border border-slate-200 shadow-xs text-xs">
                  <div className="h-6 w-6 rounded-lg bg-blue-600/10 text-blue-600 font-bold flex items-center justify-center text-xs">
                    {(mongoUser?.name || user?.displayName || user?.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-slate-800 max-w-[120px] truncate">
                    {mongoUser?.name || user?.displayName || user?.email?.split('@')[0]}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${roleBadgeColor}`}>
                    {mongoUser?.role || 'CUSTOMER'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-bold text-slate-700 hover:text-blue-600 px-3 py-2 rounded-xl transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md hover-lift"
                >
                  Get Started →
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && <NotificationBell />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="md:hidden border-b border-slate-200 bg-white/98 backdrop-blur px-4 pt-3 pb-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase">Selected Metro</span>
            <span className="text-xs font-bold text-blue-600">📍 {selectedCity}</span>
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-xl text-sm font-semibold ${
                isActive(link.path) ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <div className="p-2.5 text-xs bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
                  <span className="font-semibold text-slate-800">
                    {mongoUser?.name || user?.email}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${roleBadgeColor}`}>
                    {mongoUser?.role || 'CUSTOMER'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-center py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-xs"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

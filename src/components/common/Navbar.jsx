import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../layout/NotificationBell';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, mongoUser, isAuthenticated, logout } = useAuth();

  const role = (mongoUser?.role || 'CUSTOMER').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isTechnician = role === 'TECHNICIAN' || role === 'PROVIDER';
  const isCustomer = role === 'CUSTOMER' && !isAdmin && !isTechnician;

  const isActive = (path) => {
    if (path.includes('#')) {
      return location.pathname + location.hash === path;
    }
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Role-Isolated Navigation Links (Strict Separation)
  const publicLinks = [
    { name: 'Services', path: '/services' },
    { name: 'How It Works', path: '/#how-it-works' }
  ];

  const customerLinks = [
    { name: 'Services', path: '/services' },
    { name: 'My Bookings', path: '/dashboard' }
  ];

  const technicianLinks = [
    { name: 'Dashboard', path: '/technician/dashboard' },
    { name: 'Requests', path: '/technician/dashboard#requests' },
    { name: 'My Jobs', path: '/technician/dashboard#jobs' },
    { name: 'Profile', path: '/technician/profile' }
  ];

  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Customers', path: '/admin/dashboard#customers' },
    { name: 'Technicians', path: '/admin/dashboard#technicians' },
    { name: 'Services', path: '/services' },
    { name: 'Bookings', path: '/admin/dashboard#bookings' },
    { name: 'Payments', path: '/admin/dashboard#payments' },
    { name: 'Reports', path: '/admin/dashboard#reports' }
  ];

  const currentNavLinks = !isAuthenticated
    ? publicLinks
    : isAdmin
    ? adminLinks
    : isTechnician
    ? technicianLinks
    : customerLinks;

  const roleBadgeStyle = {
    CUSTOMER: 'bg-blue-50 text-blue-700 border-blue-200',
    TECHNICIAN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PROVIDER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-200'
  }[role] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <nav className="sticky top-0 z-40 glass-nav transition-all duration-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          
          {/* ServiceHub Brand Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform duration-150">
                S
              </div>
              <span className="text-slate-900 font-black text-xl tracking-tight leading-none">
                Service<span className="text-blue-600">Hub</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
            {currentNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive(link.path)
                    ? 'text-blue-600 bg-blue-50/90 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Medium Screen Navigation (md to lg) */}
          <div className="hidden md:flex lg:hidden items-center space-x-1 overflow-x-auto no-scrollbar max-w-[40vw] py-1">
            {currentNavLinks.slice(0, 3).map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive(link.path)
                    ? 'text-blue-600 bg-blue-50 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Right Controls */}
          <div className="hidden md:flex items-center gap-2.5 flex-shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                {/* Notifications */}
                <NotificationBell />

                {/* Profile link for customer */}
                {isCustomer && (
                  <Link
                    to="/profile"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      location.pathname === '/profile'
                        ? 'text-blue-600 bg-blue-50 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Profile
                  </Link>
                )}

                {/* Profile link for technician */}
                {isTechnician && (
                  <Link
                    to="/technician/profile"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      location.pathname === '/technician/profile'
                        ? 'text-emerald-700 bg-emerald-50 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Profile
                  </Link>
                )}

                {/* User Info Badge */}
                <div className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs">
                  <div className="h-6 w-6 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs">
                    {(mongoUser?.name || user?.displayName || user?.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-slate-800 max-w-[110px] truncate">
                    {mongoUser?.name || user?.displayName || user?.email?.split('@')[0]}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${roleBadgeStyle}`}>
                    {role === 'PROVIDER' ? 'TECHNICIAN' : role}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
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
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold text-slate-700 hover:text-blue-600 px-3 py-2 rounded-xl transition-colors"
                >
                  Register
                </Link>
                <Link
                  to="/register?role=TECHNICIAN"
                  className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl transition-all shadow-xs"
                >
                  Join as Technician
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && <NotificationBell />}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="space-y-1">
            {currentNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive(link.path)
                    ? 'text-blue-600 bg-blue-50 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {isAuthenticated && isCustomer && (
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Profile
              </Link>
            )}

            {isAuthenticated && isTechnician && (
              <Link
                to="/technician/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Profile
              </Link>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <div className="p-3 text-xs bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
                  <span className="font-semibold text-slate-800 truncate mr-2">
                    {mongoUser?.name || user?.email}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex-shrink-0 ${roleBadgeStyle}`}>
                    {role === 'PROVIDER' ? 'TECHNICIAN' : role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-center py-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                  >
                    Register
                  </Link>
                </div>
                <Link
                  to="/register?role=TECHNICIAN"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
                >
                  Join as Technician
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

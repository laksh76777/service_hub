import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';

const TechnicianNavbar = () => {
  const { mongoUser, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navLinkClasses = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-semibold transition ${
      isActive
        ? 'text-emerald-700 bg-emerald-50'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  const displayName = mongoUser?.name || user?.displayName || 'Technician';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Technician Badge */}
          <div className="flex items-center gap-4">
            <Link to="/technician/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                T
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-tight">
                  Service<span className="text-emerald-600">Hub</span>
                </span>
                <span className="text-[10px] tracking-wider uppercase font-semibold text-emerald-700 block -mt-0.5">
                  Technician Portal
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5 ml-6">
              <NavLink to="/technician/dashboard" end className={navLinkClasses}>
                Dashboard
              </NavLink>
              <NavLink to="/technician/requests" className={navLinkClasses}>
                Job Requests
              </NavLink>
              <NavLink to="/technician/jobs" className={navLinkClasses}>
                Active Jobs
              </NavLink>
              <NavLink to="/technician/earnings" className={navLinkClasses}>
                Earnings
              </NavLink>
            </nav>
          </div>

          {/* Right Action Area */}
          <div className="hidden md:flex items-center gap-4">
            <NotificationBell />

            <div className="h-5 w-px bg-slate-200" />

            <Link
              to="/technician/profile"
              className="flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-slate-50 transition"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left text-xs">
                <div className="font-semibold text-slate-900 leading-tight">{displayName}</div>
                <div className="text-emerald-600 font-medium">Verified Partner</div>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <Link
            to="/technician/dashboard"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Dashboard
          </Link>
          <Link
            to="/technician/requests"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Job Requests
          </Link>
          <Link
            to="/technician/jobs"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Active Jobs
          </Link>
          <Link
            to="/technician/earnings"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Earnings
          </Link>
          <Link
            to="/technician/profile"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Profile & Trade Settings
          </Link>
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default TechnicianNavbar;

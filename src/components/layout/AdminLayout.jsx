import React, { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminLayout = () => {
  const { user, mongoUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { label: 'Overview', path: '/admin/dashboard', icon: '📊' },
    { label: 'Customers', path: '/admin/customers', icon: '👥' },
    { label: 'Technicians', path: '/admin/technicians', icon: '🛠️' },
    { label: 'Services', path: '/admin/services', icon: '📋' },
    { label: 'Bookings', path: '/admin/bookings', icon: '📅' },
    { label: 'Payments', path: '/admin/payments', icon: '💳' },
    { label: 'Invoices', path: '/admin/invoices', icon: '🧾' },
    { label: 'Reviews', path: '/admin/reviews', icon: '⭐' },
    { label: 'Disputes', path: '/admin/disputes', icon: '⚖️' },
    { label: 'Reports', path: '/admin/reports', icon: '📈' },
    { label: 'Admin Profile', path: '/admin/profile', icon: '🛡️' }
  ];

  const displayName = mongoUser?.name || user?.displayName || 'Administrator';

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans antialiased">
      {/* Top Admin Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link to="/admin/dashboard" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  A
                </div>
                <div>
                  <span className="font-extrabold text-lg tracking-tight text-white leading-tight">
                    Service<span className="text-purple-400">Hub</span>
                  </span>
                  <span className="text-[10px] tracking-wider uppercase font-semibold text-purple-400 block -mt-0.5">
                    Platform Administration
                  </span>
                </div>
              </Link>
            </div>

            {/* Admin Right Status */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2.5 text-xs text-right">
                <div>
                  <div className="font-semibold text-white">{displayName}</div>
                  <div className="text-purple-400 font-mono text-[10px]">abc@gmail.com</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-200 flex items-center justify-center font-bold text-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className="h-5 w-px bg-slate-800 hidden sm:block" />

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Admin Body: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-950 p-4 space-y-1 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 px-3 py-2">
            Management Navigation
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-64 bg-slate-950 border-r border-slate-800 p-4 space-y-1 z-10 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  Admin Console
                </span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  &times;
                </button>
              </div>
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin/dashboard'}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`
                  }
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Admin Minimal Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-2.5 text-center text-xs text-slate-500">
        <div className="px-4 flex items-center justify-between">
          <div>ServiceHub Admin Console &bull; Security Level: High</div>
          <div className="text-slate-600">Strict RBAC &bull; Direct Technician Operations</div>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;

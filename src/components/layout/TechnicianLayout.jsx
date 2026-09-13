import React from 'react';
import { Outlet } from 'react-router-dom';
import TechnicianNavbar from './TechnicianNavbar';

const TechnicianLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <TechnicianNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>ServiceHub &bull; Technician Workbench</div>
          <div className="text-slate-400">Direct bookings &bull; Transparent payouts &bull; Guaranteed payment protection</div>
        </div>
      </footer>
    </div>
  );
};

export default TechnicianLayout;

import React from 'react';
import { Outlet } from 'react-router-dom';
import CustomerNavbar from './CustomerNavbar';

const CustomerLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <CustomerNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>ServiceHub &copy; {new Date().getFullYear()} &bull; Customer Service Portal</div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Verified Workmanship</span>
            <span>&bull;</span>
            <span>Direct Technicians</span>
            <span>&bull;</span>
            <span>30-Day Warranty</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;

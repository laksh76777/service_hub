import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import Footer from '../common/Footer';

const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <PublicNavbar />
      <main className="flex-1 flex flex-col">
        {children || <Outlet />}
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;

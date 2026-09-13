import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import Footer from '../common/Footer';

/**
 * Public layout for ServiceHub.
 * Per Requirement 33: The large marketing footer exists ONLY on the public landing page (/).
 * Other public or informational pages do not inherit the oversized landing footer.
 */
const PublicLayout = ({ children }) => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <PublicNavbar />
      <main className="flex-1 flex flex-col">
        {children || <Outlet />}
      </main>
      {isLandingPage && <Footer />}
    </div>
  );
};

export default PublicLayout;

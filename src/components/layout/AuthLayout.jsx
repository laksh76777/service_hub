import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';

/**
 * Clean authentication layout for Login and Register pages.
 * Displays the clean top navigation and centered auth card WITHOUT the large landing footer.
 */
const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <PublicNavbar />
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="w-full max-w-4xl mx-auto">
          {children || <Outlet />}
        </div>
      </main>
      <div className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/80 bg-white/60">
        ServiceHub &bull; Secure Authentication Portal &bull; Verified Trade Network
      </div>
    </div>
  );
};

export default AuthLayout;

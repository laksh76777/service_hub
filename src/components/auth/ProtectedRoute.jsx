import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from '../common/Loading';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading fullPage text="Verifying session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const currentRole = (role || '').toUpperCase();
    const hasRole = allowedRoles.map((r) => r.toUpperCase()).includes(currentRole);
    if (!hasRole) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white p-6 rounded-xl border border-red-200 text-center shadow-sm">
            <div className="h-12 w-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
            <p className="text-sm text-slate-600 mb-6">
              Your account role ({role || 'NONE'}) does not have permission to view this section.
            </p>
            <a
              href={
                (role || '').toUpperCase() === 'ADMIN'
                  ? '/admin/dashboard'
                  : (role || '').toUpperCase() === 'TECHNICIAN'
                  ? '/technician/dashboard'
                  : '/customer/dashboard'
              }
              className="inline-block px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              Go to Your Dashboard &rarr;
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;

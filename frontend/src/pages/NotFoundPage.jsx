import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const NotFoundPage = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="h-16 w-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-2xl mb-4">
        404
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-600 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary">Return to Homepage</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;

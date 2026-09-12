import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [info, setInfo] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setInfo(`Phase 1 placeholder: Authentication with Firebase will be added in Phase 3.`);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card
          title="Sign in to ServiceHub"
          subtitle="Access your jobs, estimates, and provider profile"
        >
          {info && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Sign in as
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    role === 'customer'
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setRole('provider')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    role === 'provider'
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Service Provider
                </button>
              </div>
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full">
                Sign In ({role === 'customer' ? 'Customer' : 'Provider'})
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;

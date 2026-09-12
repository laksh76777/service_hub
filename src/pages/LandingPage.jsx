import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { checkApiHealth, checkDbHealth } from '../services/api';

const LandingPage = () => {
  const [backendStatus, setBackendStatus] = useState({ loading: true, message: '', error: false });
  const [dbStatus, setDbStatus] = useState({ loading: true, message: '', error: false });

  useEffect(() => {
    checkApiHealth()
      .then((data) => {
        setBackendStatus({ loading: false, message: data.message, error: false });
      })
      .catch((err) => {
        setBackendStatus({
          loading: false,
          message: 'Backend offline: ' + (err.message || 'Check server connection'),
          error: true
        });
      });

    checkDbHealth()
      .then((data) => {
        setDbStatus({
          loading: false,
          message: `MongoDB Atlas: ${data.database} (${data.name})`,
          error: false
        });
      })
      .catch((err) => {
        setDbStatus({
          loading: false,
          message: 'MongoDB disconnected',
          error: true
        });
      });
  }, []);

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 text-center">
        {/* Backend & DB health pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border shadow-sm bg-white">
            <span
              className={`h-2 w-2 rounded-full ${
                backendStatus.loading
                  ? 'bg-amber-400 animate-ping'
                  : backendStatus.error
                  ? 'bg-red-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="text-slate-600">
              {backendStatus.loading
                ? 'Checking API...'
                : backendStatus.message}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border shadow-sm bg-white">
            <span
              className={`h-2 w-2 rounded-full ${
                dbStatus.loading
                  ? 'bg-amber-400 animate-ping'
                  : dbStatus.error
                  ? 'bg-red-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="text-slate-600">
              {dbStatus.loading
                ? 'Checking Database...'
                : dbStatus.message}
            </span>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
          Local Service Booking &amp; <span className="text-blue-600">Work Verification</span>
        </h1>
        <p className="mt-5 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          The trusted platform where homeowners discover licensed professionals, review transparent estimates, approve changes in real-time, and verify completed jobs before payment.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link to="/services">
            <Button variant="primary" size="lg">Explore Services</Button>
          </Link>
          <Link to="/providers">
            <Button variant="outline" size="lg">Find Verified Providers</Button>
          </Link>
        </div>
      </section>

      {/* How it Works / Core Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How ServiceHub Protects Both Parties</h2>
          <p className="text-slate-500 mt-2 text-sm max-w-xl mx-auto">
            Engineered for real-world contractors and clients with transparent verification workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card
            title="1. Request & Inspection"
            subtitle="Transparent scope definition"
            className="hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-slate-600 leading-relaxed">
              Customers submit detailed service requests. Providers schedule an on-site or virtual inspection and generate an itemized estimate with materials and labor breakdown.
            </p>
          </Card>

          <Card
            title="2. Estimate Approval"
            subtitle="No unexpected surprises"
            className="hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-slate-600 leading-relaxed">
              Customers review estimates and approve or reject them line-by-line. Any additional scope discovered mid-job requires formal digital change-order approval.
            </p>
          </Card>

          <Card
            title="3. Work Verification & Warranty"
            subtitle="Proof of completed work"
            className="hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-slate-600 leading-relaxed">
              Providers upload before/after photos and inspection checklists upon completion. Customers verify the result, release payment, and access warranty coverage.
            </p>
          </Card>
        </div>
      </section>

      {/* Roles Section */}
      <section className="bg-slate-100/70 border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">For Customers</span>
              <h3 className="text-lg font-bold text-slate-900 mt-3 mb-2">Confidence on Every Job</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>✓ Discover vetted, verified local contractors</li>
                <li>✓ Approve estimates before work begins</li>
                <li>✓ Live milestone progress tracking</li>
                <li>✓ Warranty claims &amp; dispute mediation</li>
              </ul>
            </div>

            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">For Providers</span>
              <h3 className="text-lg font-bold text-slate-900 mt-3 mb-2">Professional Work Management</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>✓ Configure service offerings &amp; coverage areas</li>
                <li>✓ Build professional digital estimates</li>
                <li>✓ Request approvals for additional scope</li>
                <li>✓ Upload work evidence &amp; guarantee warranties</li>
              </ul>
            </div>

            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full">For Administrators</span>
              <h3 className="text-lg font-bold text-slate-900 mt-3 mb-2">Integrity &amp; Operations</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>✓ Provider license &amp; identity verification</li>
                <li>✓ Dispute arbitration workflows</li>
                <li>✓ Platform payment &amp; fee audit logs</li>
                <li>✓ Service catalog management</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

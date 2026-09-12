import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const AboutPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          About ServiceHub
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Find the right technician for your home service.
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          ServiceHub is a dedicated home-service platform engineered to eliminate surprise bills, unqualified workers, and uncertain warranties. We connect homeowners directly with certified, verified local trade professionals.
        </p>
      </div>

      {/* 3-Pillar Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
            1
          </div>
          <h3 className="text-lg font-bold text-slate-900">Direct Technician Selection</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            No middleman queues or randomized assignment. Customers inspect profiles, trade specialties, ratings, and experience before directly selecting their chosen technician.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">
            2
          </div>
          <h3 className="text-lg font-bold text-slate-900">Upfront Itemized Estimates</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Technicians provide transparent, line-item digital estimates after on-site inspection. Work never begins until the homeowner reviews and explicitly approves the estimate.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold">
            3
          </div>
          <h3 className="text-lg font-bold text-slate-900">Verified Work &amp; Warranty</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every completed service is backed by photo verification evidence, digital GST-compliant invoices, and an assured 30-day service warranty guaranteed by our platform.
          </p>
        </div>
      </div>

      {/* Canonical Services Covered */}
      <div className="p-8 rounded-3xl bg-slate-900 text-white space-y-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Five Core Trades</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">Specialized Home Services</h2>
          <p className="text-sm text-slate-400 mt-2">
            We focus exclusively on essential home maintenance trades where technical skill and reliability matter most.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { icon: '❄️', name: 'AC Repair', desc: 'Cooling, Jet Service & Gas' },
            { icon: '🚰', name: 'Plumbing', desc: 'Pipe Leaks, Valves & Taps' },
            { icon: '⚡', name: 'Electrical Repair', desc: 'Wiring, MCB & Short Circuits' },
            { icon: '💧', name: 'RO Repair', desc: 'Membrane, Filters & TDS' },
            { icon: '🧺', name: 'Appliance Repair', desc: 'Washers, Fridges & Ovens' }
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <span className="text-2xl mb-2">{item.icon}</span>
              <div>
                <h4 className="font-bold text-sm text-white">{item.name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Row */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link to="/services">
          <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-md shadow-blue-500/20">
            Find a Service
          </Button>
        </Link>
        <Link to="/register?role=TECHNICIAN">
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            Join as Technician
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default AboutPage;

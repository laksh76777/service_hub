import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { checkApiHealth, checkDbHealth } from '../services/api';

const POPULAR_CATEGORIES = [
  { name: 'AC Servicing & Repair', icon: '❄️', slug: 'ac-servicing-repair', price: '₹199', desc: 'Gas charging, deep jet cleaning, cooling coil repair' },
  { name: 'Plumbing & Leaks', icon: '🔧', slug: 'plumbing', price: '₹249', desc: 'Pipe blockage, mixer tap fixes, tank cleaning' },
  { name: 'Electrical & MCB', icon: '⚡', slug: 'electrical-repair', price: '₹249', desc: 'Short circuits, MCB tripping, ceiling fan installation' },
  { name: 'RO Water Purifier', icon: '💧', slug: 'ro-water-purifier', price: '₹649', desc: 'Filter change, TDS check, booster pump repair' },
  { name: 'Appliance Repair', icon: '🧺', slug: 'appliance-repair', price: '₹349', desc: 'Washing machine, geyser, refrigerator diagnosis' },
  { name: 'Electronics & TV', icon: '💻', slug: 'electronics-repair', price: '₹399', desc: 'Smart TV panel, motherboard, laptop servicing' }
];

const TRUST_STEPS = [
  {
    step: '01',
    title: 'Instant Booking & AI Classification',
    description: 'Describe your issue in plain language. Our AI assistant recommends the exact service category and probable areas to inspect without binding pricing.',
    icon: '✨'
  },
  {
    step: '02',
    title: 'Customer-Approved Estimates',
    description: 'Technicians inspect on-site and create formal digital estimates. Work only begins after you explicitly approve the line-items.',
    icon: '📝'
  },
  {
    step: '03',
    title: 'Two-Step OTP & Photo Evidence',
    description: 'Jobs start and finish with secure OTPs. Technicians upload before & after work evidence photos to verify task completion.',
    icon: '📸'
  },
  {
    step: '04',
    title: 'Guaranteed 30-Day Warranty',
    description: 'Receive GST-compliant digital invoices and a 30 to 60-day warranty certificate backed by platform dispute arbitration.',
    icon: '🛡️'
  }
];

const TESTIMONIALS = [
  {
    name: 'Pooja Sharma',
    city: 'Indiranagar, Bengaluru',
    rating: 5,
    service: 'Split AC Deep Foam Jet Servicing',
    comment: 'The technician showed me the digital estimate before touching anything. No hidden charges and cooling was restored within 45 minutes.'
  },
  {
    name: 'Karthik Raman',
    city: 'Koramangala, Bengaluru',
    rating: 5,
    service: 'Concealed House Wiring & MCB Fix',
    comment: 'The start OTP and work photo gallery gave me complete peace of mind while away at office. Super professional work.'
  },
  {
    name: 'Ananya Deshmukh',
    city: 'HSR Layout, Bengaluru',
    rating: 5,
    service: 'Tap Leakage & Valve Replacement',
    comment: 'Instant invoice download and a 30-day warranty certificate straight to my dashboard. Absolutely the future of local services in India.'
  }
];

const LandingPage = () => {
  const [backendStatus, setBackendStatus] = useState({ loading: true, message: '', error: false });
  const [dbStatus, setDbStatus] = useState({ loading: true, message: '', error: false });

  useEffect(() => {
    checkApiHealth()
      .then((data) => setBackendStatus({ loading: false, message: data.message || 'API Online', error: false }))
      .catch((err) => setBackendStatus({ loading: false, message: 'API Offline', error: true }));

    checkDbHealth()
      .then((data) => setDbStatus({ loading: false, message: `Atlas: ${data.database || 'servicehub'}`, error: false }))
      .catch(() => setDbStatus({ loading: false, message: 'DB Disconnected', error: true }));
  }, []);

  return (
    <div className="space-y-24 py-6">
      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 text-center">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Live Status Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200/90 shadow-xs mb-8">
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${backendStatus.error ? 'bg-red-400' : 'bg-emerald-400'}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${backendStatus.error ? 'bg-red-500' : 'bg-emerald-500'}`} />
          </span>
          <span className="text-slate-700">Verified Platform Operating in Bengaluru &amp; Metros</span>
          <span className="text-slate-300">|</span>
          <span className="text-blue-600 font-bold">100% Genuine Estimates</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight max-w-5xl mx-auto leading-[1.12]">
          Local Services You Can Trust,{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
            Verified Before You Pay.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
          The transparent Indian home service platform where you approve itemized digital estimates, verify work evidence photos, and validate completed jobs with OTPs before payment is finalized.
        </p>

        {/* Action Buttons */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link to="/services">
            <Button variant="primary" size="lg" className="shadow-lg shadow-blue-500/20 hover-lift">
              Book a Verified Service →
            </Button>
          </Link>
          <Link to="/providers">
            <Button variant="outline" size="lg" className="hover-lift">
              Browse Certified Technicians
            </Button>
          </Link>
        </div>

        {/* Metric Badges */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">4.8 / 5.0</div>
            <div className="text-xs text-slate-500 font-medium mt-1">⭐ Verified Customer Rating</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-2xl sm:text-3xl font-black text-blue-600">30 Days</div>
            <div className="text-xs text-slate-500 font-medium mt-1">🛡️ Service Warranty Guarantee</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">100%</div>
            <div className="text-xs text-slate-500 font-medium mt-1">🔒 Customer Approval First</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">2-Step OTP</div>
            <div className="text-xs text-slate-500 font-medium mt-1">📱 Arrival &amp; Completion Security</div>
          </div>
        </div>
      </section>

      {/* Popular Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Top Services</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Explore Popular Categories</h2>
          </div>
          <Link to="/services" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
            View all 20+ services →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {POPULAR_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              to={`/services?category=${cat.slug}`}
              className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500/50 shadow-xs hover-lift transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl p-3 bg-blue-50/70 rounded-2xl group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  Starts {cat.price}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {cat.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {cat.desc}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>Book Appointment</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How ServiceHub Works (4-Step Trust Pillars) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 text-white">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Built For Indian Homes</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">How ServiceHub Works</h2>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Eliminating surprise bills, phantom charges, and unverified repairs with end-to-end digital verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-4">
          {TRUST_STEPS.map((step) => (
            <div key={step.step} className="p-6 rounded-2xl bg-white/5 border border-white/10 relative hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{step.icon}</span>
                <span className="text-xl font-black text-white/30">{step.step}</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Customer Experiences</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Verified Customer Reviews</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover-lift">
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-3">
                  {'★'.repeat(t.rating)}
                  <span className="text-xs font-bold text-slate-400 ml-1">5.0</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">"{t.comment}"</p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-900">{t.name}</div>
                <div className="text-[11px] text-slate-400">{t.city}</div>
                <div className="text-[10px] text-blue-600 font-semibold mt-1">✓ Verified Booking: {t.service}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Infrastructure Status Pill */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-100 text-[11px] text-slate-500 border border-slate-200">
          <span className="font-semibold text-slate-700">Production Infrastructure:</span>
          <span>⚡ Node.js API ({backendStatus.message})</span>
          <span>•</span>
          <span>🍃 {dbStatus.message}</span>
          <span>•</span>
          <span>🔒 AES-256 / SHA-256 Webhooks</span>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

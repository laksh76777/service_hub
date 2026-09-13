import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { getServices } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Canonical fallback services matching backend seed data
const CANONICAL_SERVICES = [
  {
    id: 'ac-repair',
    name: 'AC Repair & Servicing',
    categoryName: 'Air Conditioning',
    icon: '❄️',
    description: 'Deep foam jet cleaning, diagnostic inspection, capacitor checks, refrigerant refill, and PCB repairs.',
    startingPrice: 499
  },
  {
    id: 'plumbing',
    name: 'Plumbing & Leak Repairs',
    categoryName: 'Plumbing',
    icon: '🚰',
    description: 'Pipe leak troubleshooting, mixer & bib cock installation, concealed line pressure testing, and drain clearing.',
    startingPrice: 299
  },
  {
    id: 'electrical-repair',
    name: 'Electrical Diagnostics & Wiring',
    categoryName: 'Electrical',
    icon: '⚡',
    description: 'Short circuit tracing, MCB replacement, load distribution, inverter connections, and switchgear maintenance.',
    startingPrice: 199
  },
  {
    id: 'ro-repair',
    name: 'RO Purifier Servicing',
    categoryName: 'Water Purification',
    icon: '💧',
    description: 'Complete multi-stage filter replacement, RO membrane testing, booster pump diagnostics, and TDS calibration.',
    startingPrice: 399
  },
  {
    id: 'appliance-repair',
    name: 'Home Appliance Repair',
    categoryName: 'Appliances',
    icon: '🧺',
    description: 'Washing machine spin/drain repairs, refrigerator compressor troubleshooting, and microwave diagnostics.',
    startingPrice: 349
  }
];

// Requirement 5: The Exact 10-Step Lifecycle matching backend
const TEN_LIFECYCLE_STEPS = [
  {
    number: '01',
    title: 'Choose Service',
    description: 'Browse verified trades: AC repair, plumbing, electrical, RO purifiers, and home appliances.',
    icon: '🔍'
  },
  {
    number: '02',
    title: 'Select Technician',
    description: 'Inspect verified technicians directly, reviewing their trade years, customer ratings, and active status.',
    icon: '👷'
  },
  {
    number: '03',
    title: 'Send Request',
    description: 'Describe the issue, specify your address locality, and choose your preferred date and arrival window.',
    icon: '📝'
  },
  {
    number: '04',
    title: 'Technician Accepts',
    description: 'Your chosen technician accepts the booking. Complete street address is securely unlocked.',
    icon: '🤝'
  },
  {
    number: '05',
    title: 'Inspection & Estimate',
    description: 'Technician conducts an on-site diagnostic inspection and submits an itemized digital estimate for parts and labor.',
    icon: '🔎'
  },
  {
    number: '06',
    title: 'Approve Estimate',
    description: 'Review transparent line items with zero hidden charges. Work never proceeds without your explicit approval.',
    icon: '✅'
  },
  {
    number: '07',
    title: 'Demo Payment',
    description: 'Pay safely through our simulated Demo Payment environment (UPI, Card, NetBanking) with zero real money charged.',
    icon: '💳'
  },
  {
    number: '08',
    title: 'Service Completed',
    description: 'Technician executes repairs with genuine parts, uploads work completion evidence, and signs off the job.',
    icon: '🛠️'
  },
  {
    number: '09',
    title: 'Invoice & Warranty',
    description: 'Authoritative tax invoice (INV-YYYY-XXXXXX) and an automatic 30-day workmanship warranty are generated.',
    icon: '🧾'
  },
  {
    number: '10',
    title: 'Review',
    description: 'Share feedback and rate the certified technician to maintain platform accountability.',
    icon: '⭐'
  }
];

// Requirement 3: Trust Pillars
const TRUST_PILLARS = [
  {
    icon: '🛡️',
    title: '100% Verified Technicians',
    description: 'Every trade professional undergoes manual administrative inspection of trade credentials, experience, and ID.'
  },
  {
    icon: '📋',
    title: 'Itemized Digital Quotes',
    description: 'Diagnostic inspection generates line-item estimates. No technician can begin work without your explicit digital consent.'
  },
  {
    icon: '💳',
    title: 'Simulated Demo Payments',
    description: 'Risk-free simulated checkout environment. Transparent fee structures with instant payment receipts.'
  },
  {
    icon: '📍',
    title: 'End-to-End Tracking',
    description: 'Live lifecycle timeline from initial request through acceptance, estimate, payment, repair, and invoice.'
  },
  {
    icon: '🧾',
    title: 'Authoritative Tax Invoices',
    description: 'Legitimate GST-compliant digital invoices reflecting customer-approved line items and authorized payment states.'
  },
  {
    icon: '✨',
    title: '30-Day Service Warranty',
    description: 'Guaranteed 30-day workmanship warranty. If the same issue recurs within 30 days, re-inspection is completely covered.'
  }
];

// Requirement 7: Certified Technicians preview
const CERTIFIED_TECHNICIANS = [
  {
    name: 'Rahul Sharma',
    profession: 'AC Technician',
    businessName: 'CoolCare AC Solutions',
    experience: '6+ Years Experience',
    rating: '4.8',
    jobs: '142 Completed Jobs',
    city: 'Bengaluru & Hyderabad',
    icon: '❄️'
  },
  {
    name: 'Imran Khan',
    profession: 'Plumber',
    businessName: 'QuickFix Plumbing Solutions',
    experience: '8+ Years Experience',
    rating: '4.9',
    jobs: '210 Completed Jobs',
    city: 'Bengaluru',
    icon: '🚰'
  },
  {
    name: 'Arjun Patel',
    profession: 'Electrician',
    businessName: 'PowerFix Electrical Services',
    experience: '7+ Years Experience',
    rating: '4.8',
    jobs: '185 Completed Jobs',
    city: 'Hyderabad',
    icon: '⚡'
  },
  {
    name: 'Suresh Verma',
    profession: 'RO Specialist',
    businessName: 'PureFlow RO Technologies',
    experience: '5+ Years Experience',
    rating: '4.9',
    jobs: '128 Completed Jobs',
    city: 'Bengaluru',
    icon: '💧'
  }
];

// Requirement 3: Verified Customer Testimonials
const VERIFIED_REVIEWS = [
  {
    name: 'Priya Narayanan',
    location: 'Indiranagar, Bengaluru',
    service: 'AC Inspection & Diagnostics',
    rating: 5,
    comment: 'The diagnostic estimate was shared right to my phone before Rahul started work. He fixed the rattling coil without trying to oversell new parts. Excellent 30-day warranty peace of mind!',
    date: 'Verified Booking'
  },
  {
    name: 'Rajesh S.',
    location: 'Gachibowli, Hyderabad',
    service: 'Concealed Pipe Leak Fix',
    rating: 5,
    comment: 'Imran arrived exactly during the morning slot. Transparent itemized breakdown for the copper tee fittings and labor. The digital invoice was generated automatically upon completion.',
    date: 'Verified Booking'
  },
  {
    name: 'Ananya Deshmukh',
    location: 'Koramangala, Bengaluru',
    service: 'MCB & Circuit Troubleshooting',
    rating: 5,
    comment: 'No surprise bills! I approved the estimate on the customer portal and paid via the simulated demo gateway. High trade expertise from Arjun.',
    date: 'Verified Booking'
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const [services, setServices] = useState(CANONICAL_SERVICES);
  const [servicesLoading, setServicesLoading] = useState(true);

  // Handle action click with proper auth routing
  const handleActionClick = (e, targetPath) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(targetPath)}&reason=service_request`);
    } else {
      navigate(targetPath);
    }
  };

  // Fetch real backend services on mount
  useEffect(() => {
    setServicesLoading(true);
    getServices({ limit: 6 })
      .then((res) => {
        const fetched = res?.data?.services || res?.data?.data?.services || [];
        if (fetched.length > 0) {
          const merged = fetched.slice(0, 6).map((s, idx) => {
            const canon = CANONICAL_SERVICES[idx % CANONICAL_SERVICES.length];
            return {
              _id: s._id,
              name: s.name,
              categoryName: s.categoryId?.name || canon.categoryName,
              icon: canon.icon || '🛠️',
              description: s.description || canon.description,
              startingPrice: s.estimatedPriceRange?.min || canon.startingPrice
            };
          });
          setServices(merged);
        } else {
          setServices(CANONICAL_SERVICES);
        }
      })
      .catch(() => {
        setServices(CANONICAL_SERVICES);
      })
      .finally(() => {
        setServicesLoading(false);
      });
  }, []);

  return (
    <div className="space-y-20 sm:space-y-28 pb-20">
      
      {/* ================================================================= */}
      {/* 1. HERO SECTION (Requirements 2, 4)                               */}
      {/* ================================================================= */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Top Trust Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 shadow-2xs mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700">Verified Technicians Network</span>
            <span className="text-slate-300">|</span>
            <span className="text-blue-600 font-bold">Upfront Digital Estimates</span>
          </div>

          {/* Canonical Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.12]">
            Reliable Home Services, <br />
            <span className="text-blue-600">From Request to Completion.</span>
          </h1>

          {/* 6-Stage Project Lifecycle Explanation */}
          <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Find certified technicians, request on-demand home service, receive an on-site diagnostic inspection, approve itemized digital estimates, and track verified completion with an automatic 30-day warranty.
          </p>

          {/* Primary & Secondary Call To Actions */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              className="px-8 py-3.5 text-sm sm:text-base font-bold shadow-md shadow-blue-500/20 hover:-translate-y-0.5 cursor-pointer"
              onClick={(e) => handleActionClick(e, '/services')}
            >
              Book a Service
            </Button>

            {!isAuthenticated ? (
              <Link to="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-3.5 text-sm sm:text-base font-bold border-slate-300 text-slate-800 hover:bg-slate-100 hover:-translate-y-0.5 cursor-pointer"
                >
                  Sign In
                </Button>
              </Link>
            ) : (
              <Link to={role === 'ADMIN' ? '/admin/dashboard' : role === 'TECHNICIAN' ? '/technician/dashboard' : '/customer/dashboard'}>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-3.5 text-sm sm:text-base font-bold border-slate-300 text-slate-800 hover:bg-slate-100 hover:-translate-y-0.5 cursor-pointer"
                >
                  Open Dashboard
                </Button>
              </Link>
            )}

            <Link to="/register?role=TECHNICIAN">
              <span className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 px-3 py-2 transition-colors cursor-pointer">
                Become a Technician →
              </span>
            </Link>
          </div>
        </div>

        {/* Live Booking Lifecycle Interactive Preview Card */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl">
                  ❄️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">AC Deep Foam Jet Servicing</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      BK-7299-7424
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Assigned: Rahul Sharma (CoolCare AC Solutions) • ★ 4.8 Verified</p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] text-slate-400 block font-medium">Digital Estimate Approved</span>
                <span className="text-lg font-black text-slate-900">₹849.00</span>
              </div>
            </div>

            {/* Stepper demonstration */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-emerald-600 font-bold block">✓ 01. Request Sent</span>
                <span className="text-[11px] text-slate-500">Morning window selected</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-emerald-600 font-bold block">✓ 02. Inspected</span>
                <span className="text-[11px] text-slate-500">Digital quote approved</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-blue-700 font-bold block">● 03. Work in Progress</span>
                <span className="text-[11px] text-blue-600">Simulated Demo Paid</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                <span className="text-slate-800 font-bold block">04. Invoiced &amp; Covered</span>
                <span className="text-[11px] text-slate-500">30-day warranty issued</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. HOW IT WORKS (Requirement 5: Exact 10 Backend Steps)            */}
      {/* ================================================================= */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Engineered For Transparency</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mt-1 tracking-tight">
            How ServiceHub Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Every booking progresses through our authoritative 10-step lifecycle to guarantee quality, safety, and price transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {TEN_LIFECYCLE_STEPS.map((s) => (
            <div
              key={s.number}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="h-8 w-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {s.number}
                  </span>
                  <span className="text-xl">{s.icon}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{s.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. POPULAR SERVICES (Requirement 6: Real Backend Services)         */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Catalog Offerings</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">Popular Services</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Select verified home repair or preventative maintenance services from our live catalog.
            </p>
          </div>
          <Link
            to="/services"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
          >
            <span>View all catalog services</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((srv, idx) => {
            const linkPath = srv._id ? `/services/${srv._id}` : '/services';
            return (
              <div
                key={srv.id || srv._id || idx}
                onClick={(e) => handleActionClick(e, linkPath)}
                role="button"
                tabIndex={0}
                className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl p-3 bg-blue-50/80 rounded-2xl group-hover:scale-105 transition-transform duration-150">
                      {srv.icon}
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                      Starts ₹{srv.startingPrice}
                    </span>
                  </div>
                  <div className="text-[11px] uppercase font-bold tracking-wider text-blue-600">
                    {srv.categoryName}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-0.5">
                    {srv.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {srv.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                  <span>Book Technician</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-150">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. WHY SERVICEHUB / TRUST PILLARS (Requirement 3)                  */}
      {/* ================================================================= */}
      <section id="why-servicehub" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white shadow-xl space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Customer Protection</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-2 tracking-tight">Why ServiceHub</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed">
              We eliminate unauthorized work, surprise bills, and unverified handymen with digital transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TRUST_PILLARS.map((pt, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-150 space-y-2.5"
              >
                <div className="text-2xl">{pt.icon}</div>
                <h3 className="text-sm font-bold text-white tracking-tight">{pt.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{pt.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 5. HOW TECHNICIAN MATCHING WORKS (Requirement 3)                   */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Direct Selection</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">How Technician Matching Works</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Choose your technician directly based on trade specializations, years of experience, and verified customer ratings.
            </p>
          </div>
          <Link
            to="/technicians"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
          >
            <span>Browse all verified technicians</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CERTIFIED_TECHNICIANS.map((tech, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-xl">
                    {tech.icon}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span>✓</span> Verified Partner
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{tech.name}</h3>
                <div className="text-xs font-semibold text-blue-600 mt-0.5">{tech.profession}</div>
                <div className="text-[11px] text-slate-400">{tech.businessName}</div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-medium text-slate-500">{tech.experience}</span>
                  <span className="text-amber-500 font-bold">★ {tech.rating}</span>
                </div>
              </div>

              <div className="mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold py-2 cursor-pointer"
                  onClick={(e) => handleActionClick(e, '/technicians')}
                >
                  Request Technician
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 6. TRANSPARENT ESTIMATE & DIAGNOSTIC INSPECTION (Requirement 3)    */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 shadow-xs grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Zero Hidden Charges</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Transparent Digital Estimates Before Work Begins
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Upon arrival, technicians carry out a systematic diagnostic inspection. They record their findings and prepare an itemized digital estimate breaking down labor, replacement parts, and materials.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-700 pt-2">
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Exact itemized parts and labor pricing calculated server-side</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Work cannot start until you digitally approve the estimate</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Option to request changes or cancel without surprise obligations</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimate Sample</span>
                <h4 className="text-xs font-bold text-slate-900">EST-2026-0042</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                PENDING APPROVAL
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Diagnostic Inspection &amp; Servicing</span>
                <span className="font-semibold text-slate-800">₹499.00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Dual Run Run-Capacitor 45/5 uF</span>
                <span className="font-semibold text-slate-800">₹850.00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Labor &amp; Testing Workmanship</span>
                <span className="font-semibold text-slate-800">₹350.00</span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-black text-slate-900">
                <span>Total Approved Quote:</span>
                <span className="text-blue-600">₹1,699.00</span>
              </div>
            </div>
            <div className="pt-2">
              <span className="w-full text-center block text-[11px] font-bold py-2 rounded-lg bg-emerald-600 text-white">
                ✓ Customer Approval Gate
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 7. SECURE DEMO PAYMENT EXPLANATION (Requirements 3, 18)            */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-3xl bg-amber-50/60 border border-amber-200 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                <span>⚠️</span>
                <span>SIMULATED DEMO PAYMENT ENVIRONMENT</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Simulated Payment Architecture (Demo Mode)
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                ServiceHub operates in an authoritative <strong>DEMO payment mode</strong>. You can test complete checkout flows via UPI, Credit/Debit Cards, and NetBanking with simulated successes or retries. <strong>No real money will ever be charged to your financial accounts.</strong>
              </p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs text-xs space-y-1.5 flex-shrink-0 w-full md:w-auto">
              <div className="font-bold text-slate-900">Platform Payment Guarantees:</div>
              <div className="text-slate-600 flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Authoritative server validation
              </div>
              <div className="text-slate-600 flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Zero live Razorpay credentials required
              </div>
              <div className="text-slate-600 flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Instant simulated GST invoice upon completion
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 8. 30-DAY WORKMANSHIP WARRANTY (Requirement 3)                     */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Guaranteed Protection</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Automatic 30-Day Workmanship Warranty
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every job completed by our verified technicians is backed by an authoritative 30-day warranty code. If the repaired defect recurs within 30 days, file an online warranty claim directly on your dashboard for an expedited re-inspection.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center w-full md:w-auto flex-shrink-0">
            <span className="text-3xl font-black text-emerald-700 block">30 DAYS</span>
            <span className="text-xs font-bold text-emerald-800 block mt-1">Workmanship Coverage</span>
            <span className="text-[11px] text-emerald-600 block mt-0.5">Free Re-Inspection Included</span>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 9. CUSTOMER REVIEWS & TESTIMONIALS (Requirement 3)                 */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Homeowner Experiences</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
            Verified Customer Reviews
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Read real feedback from homeowners across Bengaluru and Hyderabad.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VERIFIED_REVIEWS.map((rev, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:shadow-sm transition-shadow duration-150 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex text-amber-400 text-sm">
                    {'★'.repeat(rev.rating)}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {rev.date}
                  </span>
                </div>
                <p className="text-xs text-slate-600 italic leading-relaxed">
                  "{rev.comment}"
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-xs">
                <div className="font-bold text-slate-900">{rev.name}</div>
                <div className="text-[11px] text-slate-400">{rev.location}</div>
                <div className="text-[11px] font-semibold text-blue-600 mt-0.5">{rev.service}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 10. FINAL CALL TO ACTION (Requirements 2, 3)                       */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-blue-600 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Direct Home Repairs</span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Ready to experience transparent home service?
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
              Book certified AC, Plumbing, Electrical, RO, or Appliance services with upfront diagnostic estimates, simulated demo checkout, and automatic 30-day warranty coverage.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-shrink-0">
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto text-blue-700 font-bold bg-white hover:bg-blue-50 shadow-sm cursor-pointer"
              onClick={(e) => handleActionClick(e, '/services')}
            >
              Book a Service
            </Button>
            {!isAuthenticated ? (
              <Link to="/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-white border-white/40 hover:bg-white/10 font-bold cursor-pointer"
                >
                  Sign In
                </Button>
              </Link>
            ) : (
              <Link to="/customer/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-white border-white/40 hover:bg-white/10 font-bold cursor-pointer"
                >
                  Customer Portal
                </Button>
              </Link>
            )}
            <Link to="/register?role=TECHNICIAN" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-white border-white/40 hover:bg-white/10 font-bold cursor-pointer"
              >
                Become a Technician
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;

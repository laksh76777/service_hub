import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { getServices } from '../services/api';

const CANONICAL_SERVICES = [
  {
    id: 'ac-repair',
    name: 'AC Repair',
    icon: '❄️',
    description: 'Deep foam cleaning, cooling diagnostics, gas charging, and PCB circuit repairs.',
    startingPrice: 499
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: '🚰',
    description: 'Pipe leak repairs, bathroom fittings, tap replacements, and drainage unclogging.',
    startingPrice: 299
  },
  {
    id: 'electrical-repair',
    name: 'Electrical Repair',
    icon: '⚡',
    description: 'Short circuit troubleshooting, MCB replacement, fan & switchboard installation.',
    startingPrice: 199
  },
  {
    id: 'ro-repair',
    name: 'RO Repair',
    icon: '💧',
    description: 'Sediment & carbon filter replacement, RO membrane, pump diagnostics, and TDS calibration.',
    startingPrice: 399
  },
  {
    id: 'appliance-repair',
    name: 'Appliance Repair',
    icon: '🧺',
    description: 'Washing machines, microwave ovens, refrigerators, and mixer grinder servicing.',
    startingPrice: 349
  }
];

const ACTUAL_FLOW_STEPS = [
  {
    step: '01',
    title: 'Choose a Service',
    description: 'Select from AC repair, plumbing, electrical, RO purifier, or home appliances.'
  },
  {
    step: '02',
    title: 'Select a Technician',
    description: 'Browse verified, active technicians and inspect their trade experience and ratings.'
  },
  {
    step: '03',
    title: 'Send a Request',
    description: 'Describe your issue and choose your preferred date and arrival window.'
  },
  {
    step: '04',
    title: 'Technician Accepts',
    description: 'Your chosen technician accepts the booking. Your full address is safely unlocked.'
  },
  {
    step: '05',
    title: 'Get an Estimate',
    description: 'On-site diagnostic inspection followed by an itemized digital parts & labor estimate.'
  },
  {
    step: '06',
    title: 'Approve & Pay',
    description: 'Review the line-item estimate, approve with one click, and pay securely.'
  },
  {
    step: '07',
    title: 'Job Completed',
    description: 'Work completed with photo evidence, digital invoice, and active 30-day warranty.'
  }
];

const TRUST_PILLARS = [
  {
    icon: '🛡️',
    title: 'Verified Technicians',
    description: 'Every technician undergoes manual administrative review of trade experience and identity before receiving customer requests.'
  },
  {
    icon: '📋',
    title: 'Transparent Estimates',
    description: 'Detailed breakdown of labor, parts, and consumables before any work begins. Work never proceeds without your digital consent.'
  },
  {
    icon: '💳',
    title: 'Secure Payments',
    description: 'Authorized digital payment processing with instant payment receipts, transparent fee tracking, and zero hidden charges.'
  },
  {
    icon: '📍',
    title: 'Service Tracking',
    description: 'Real-time lifecycle tracking from initial request to technician arrival, diagnostic inspection, and final job sign-off.'
  },
  {
    icon: '🧾',
    title: 'Digital Invoices',
    description: 'Instantly download itemized tax invoices reflecting only customer-approved scope for complete record-keeping.'
  },
  {
    icon: '✨',
    title: 'Warranty Information',
    description: 'Platform workmanship warranty with free re-inspection on the same repair scope within the active warranty window.'
  }
];

const TRUSTED_TECHNICIANS = [
  {
    name: 'Rahul Sharma',
    profession: 'AC Technician',
    businessName: 'CoolCare AC Solutions',
    experience: '6 years experience',
    rating: '4.8',
    jobs: '142 completed jobs',
    trade: 'AC Repair',
    icon: '❄️'
  },
  {
    name: 'Imran Khan',
    profession: 'Plumber',
    businessName: 'QuickFix Plumbing',
    experience: '8 years experience',
    rating: '4.9',
    jobs: '210 completed jobs',
    trade: 'Plumbing',
    icon: '🚰'
  },
  {
    name: 'Arjun Patel',
    profession: 'Electrician',
    businessName: 'PowerFix Electricals',
    experience: '7 years experience',
    rating: '4.8',
    jobs: '185 completed jobs',
    trade: 'Electrical Repair',
    icon: '⚡'
  },
  {
    name: 'Suresh Verma',
    profession: 'RO Specialist',
    businessName: 'PureFlow RO Systems',
    experience: '5 years experience',
    rating: '4.9',
    jobs: '128 completed jobs',
    trade: 'RO Repair',
    icon: '💧'
  }
];

const LandingPage = () => {
  const [services, setServices] = useState(CANONICAL_SERVICES);

  useEffect(() => {
    getServices({ limit: 5 })
      .then((res) => {
        const fetched = res?.data?.services || res?.data?.data?.services || [];
        if (fetched.length > 0) {
          // Merge backend pricing with canonical metadata for icons
          const merged = CANONICAL_SERVICES.map((canon) => {
            const found = fetched.find((s) => s.slug === canon.id || s.name.toLowerCase().includes(canon.name.toLowerCase()));
            if (found) {
              return {
                ...canon,
                _id: found._id,
                name: found.name,
                description: found.description || canon.description,
                startingPrice: found.estimatedPriceRange?.min || found.basePrice || canon.startingPrice
              };
            }
            return canon;
          });
          setServices(merged);
        }
      })
      .catch(() => {
        setServices(CANONICAL_SERVICES);
      });
  }, []);

  return (
    <div className="space-y-20 sm:space-y-28 pb-20">
      
      {/* 1. HERO SECTION (Requirement 6) */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Trust badge pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 shadow-2xs mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700">Verified Trade Network</span>
            <span className="text-slate-300">|</span>
            <span className="text-blue-600 font-bold">Direct Technician Booking</span>
          </div>

          {/* Exact Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.12]">
            Find the right technician for your home service.
          </h1>

          {/* Exact Supporting Text */}
          <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Choose a service, select a technician, send a request, get the job completed.
          </p>

          {/* Exact CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/services">
              <Button
                variant="primary"
                size="lg"
                className="px-8 py-3.5 text-sm sm:text-base font-bold shadow-md shadow-blue-500/20 hover:-translate-y-0.5"
              >
                Find a Service
              </Button>
            </Link>
            <Link to="/register?role=TECHNICIAN">
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-3.5 text-sm sm:text-base font-bold border-slate-300 text-slate-800 hover:bg-slate-100 hover:-translate-y-0.5"
              >
                Join as Technician
              </Button>
            </Link>
          </div>
        </div>

        {/* Polished Visual Section: Live Booking Lifecycle Preview Card */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">
                  ❄️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">AC Deep Jet Servicing</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Booking
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Assigned: Rahul Sharma (CoolCare AC Solutions) • ★ 4.8</p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 block font-medium">Digital Estimate Approved</span>
                <span className="text-lg font-black text-slate-900">₹849</span>
              </div>
            </div>

            {/* Stepper demonstration */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-emerald-600 font-bold block">✓ 01. Request Sent</span>
                <span className="text-[11px] text-slate-500">Slot booked</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-emerald-600 font-bold block">✓ 02. Accepted</span>
                <span className="text-[11px] text-slate-500">Address unlocked</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-blue-700 font-bold block">● 03. Work in Progress</span>
                <span className="text-[11px] text-blue-600">Estimate approved</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 text-slate-400">
                <span className="font-bold block">04. Invoiced &amp; Warranty</span>
                <span className="text-[11px]">30-day coverage</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. POPULAR SERVICES (Requirement 8) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Five Core Trades</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">Popular Services</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Select what you need repaired or serviced in your home.
            </p>
          </div>
          <Link
            to="/services"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
          >
            <span>View all services</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((srv, idx) => {
            const linkPath = srv._id ? `/services/${srv._id}` : '/services';
            return (
              <Link
                key={srv.id || srv._id || idx}
                to={linkPath}
                className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group"
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
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {srv.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {srv.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                  <span>Find Technician</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-150">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. HOW IT WORKS (Requirement 9: Exact 7 Steps) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Clear Transparent Flow</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mt-1 tracking-tight">
            How It Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            The complete 7-step process engineered for quality and homeowner control.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ACTUAL_FLOW_STEPS.map((step) => (
            <div
              key={step.step}
              className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="h-8 w-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {step.step}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Step {step.step}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. WHY SERVICEHUB / TRUST SECTION (Requirement 10) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white shadow-xl space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Built On Trust</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-2 tracking-tight">Why ServiceHub</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed">
              Eliminating surprise bills, unauthorized repairs, and unverified handymen.
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

      {/* 5. TRUSTED TECHNICIANS SECTION (Requirement 7) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Certified Tradespeople</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">Trusted Technicians</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Select your certified technician directly based on experience, trade, and customer feedback.
            </p>
          </div>
          <Link
            to="/technicians"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
          >
            <span>View all technicians</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRUSTED_TECHNICIANS.map((tech, idx) => (
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
                    <span>✓</span> Verified
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

              <Link to="/services" className="mt-5">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold py-2">
                  Request Service
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 6. SIMPLE CTA (Requirement 7) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-blue-600 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Direct Home Repairs</span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Ready to find the right technician for your home?
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
              Book certified AC, Plumbing, Electrical, RO, or Appliance services with customer approval and 30-day warranty.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-shrink-0">
            <Link to="/services" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto text-blue-700 font-bold bg-white hover:bg-blue-50 shadow-sm"
              >
                Find a Service
              </Button>
            </Link>
            <Link to="/register?role=TECHNICIAN" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-white border-white/40 hover:bg-white/10 font-bold"
              >
                Join as Technician
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;

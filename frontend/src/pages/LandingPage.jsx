import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { getServices, getProviders } from '../services/api';

const CANONICAL_SERVICES = [
  {
    id: 'ac-repair',
    name: 'AC Repair',
    icon: '❄️',
    description: 'Deep foam jet servicing, gas charging, cooling diagnosis, and PCB repairs.',
    startingPrice: 499
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: '🚰',
    description: 'Pipe leak repairs, bathroom fittings, tap replacements, and drainage solutions.',
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
    description: 'Filter replacement, RO membrane repair, pump diagnostics, and TDS calibration.',
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
    step: 1,
    title: 'Choose a Service',
    description: 'Select what needs repair: AC, Plumbing, Electrical, RO, or Appliance Repair.'
  },
  {
    step: 2,
    title: 'Select a Technician',
    description: 'Browse verified, active technicians and inspect their trade experience and ratings.'
  },
  {
    step: 3,
    title: 'Send Request',
    description: 'Submit your issue description and preferred time slot directly to your chosen technician.'
  },
  {
    step: 4,
    title: 'Technician Accepts',
    description: 'Your chosen technician accepts your request. Your full address is safely unlocked.'
  },
  {
    step: 5,
    title: 'Get Estimate',
    description: 'On-site inspection with an upfront, itemized digital estimate before any work starts.'
  },
  {
    step: 6,
    title: 'Approve & Pay',
    description: 'Review the line-item estimate, approve with one click, and complete secure payment.'
  },
  {
    step: 7,
    title: 'Job Completed',
    description: 'Work completed with photo evidence, digital invoice, and a guaranteed 30-day warranty.'
  }
];

const WHY_POINTS = [
  {
    icon: '🎯',
    title: 'Direct Connection',
    description: 'Choose your specific technician directly. No anonymous queues or randomized middlemen.'
  },
  {
    icon: '📋',
    title: 'Customer Approval First',
    description: 'Technicians cannot start work without your explicit digital approval of the itemized estimate.'
  },
  {
    icon: '🧾',
    title: 'Upfront Itemized Estimates',
    description: 'Clear breakdown of parts and labor before tools touch your appliances. Zero surprise bills.'
  },
  {
    icon: '🛡️',
    title: 'Verified Professionals Only',
    description: 'Every technician undergoes manual administrative review and verification of trade experience.'
  },
  {
    icon: '🔒',
    title: 'Location Privacy Protection',
    description: 'Your street address remains masked until your chosen technician formally accepts your booking.'
  },
  {
    icon: '✨',
    title: '30-Day Platform Warranty',
    description: 'Guaranteed warranty coverage with free re-inspection if the same issue reoccurs within 30 days.'
  }
];

const FEATURED_TECHNICIANS = [
  {
    name: 'Rahul Sharma',
    profession: 'AC Technician',
    businessName: 'CoolCare AC Solutions',
    experience: '6 years',
    rating: 4.8,
    service: 'AC Repair',
    icon: '❄️'
  },
  {
    name: 'Imran Khan',
    profession: 'Plumber',
    businessName: 'QuickFix Plumbing',
    experience: '8 years',
    rating: 4.9,
    service: 'Plumbing',
    icon: '🚰'
  },
  {
    name: 'Arjun Patel',
    profession: 'Electrician',
    businessName: 'PowerFix Electricals',
    experience: '7 years',
    rating: 4.8,
    service: 'Electrical Repair',
    icon: '⚡'
  },
  {
    name: 'Suresh Verma',
    profession: 'RO Specialist',
    businessName: 'PureFlow RO Systems',
    experience: '5 years',
    rating: 4.9,
    service: 'RO Repair',
    icon: '💧'
  }
];

const LandingPage = () => {
  const [services, setServices] = useState([]);

  useEffect(() => {
    getServices({ limit: 6 })
      .then((res) => {
        const fetched = res?.data?.services || res?.data?.data?.services || [];
        if (fetched.length > 0) {
          setServices(fetched);
        } else {
          setServices(CANONICAL_SERVICES);
        }
      })
      .catch(() => {
        setServices(CANONICAL_SERVICES);
      });
  }, []);

  return (
    <div className="space-y-20 sm:space-y-28 pb-16">
      
      {/* 1. Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 text-center">
        {/* Subtle radial background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[500px] h-96 sm:h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Security badge pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200/90 shadow-2xs mb-8">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-700">Verified Local Home Services</span>
          <span className="text-slate-300">|</span>
          <span className="text-blue-600 font-bold">100% Customer-Approved Estimates</span>
        </div>

        {/* User-specified exact communication */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.12]">
          Find the right technician for your home service.
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
          Direct booking with certified, verified local technicians. Upfront itemized estimates, customer approval before work begins, and a guaranteed 30-day warranty on every job.
        </p>

        {/* User-specified Primary & Secondary CTAs */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/services">
            <Button
              variant="primary"
              size="lg"
              className="px-8 py-3.5 text-sm sm:text-base font-bold shadow-lg shadow-blue-500/20 hover-lift"
            >
              Find a Service
            </Button>
          </Link>
          <Link to="/register?role=TECHNICIAN">
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-3.5 text-sm sm:text-base font-bold border-slate-300 text-slate-800 hover:bg-slate-100 hover-lift"
            >
              Join as Technician
            </Button>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="text-2xl font-black text-slate-900">5 Core Trades</div>
            <div className="text-xs text-slate-500 font-medium mt-1">AC, Plumbing, Electrical, RO &amp; Appliances</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="text-2xl font-black text-blue-600">Zero Middlemen</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Direct customer-to-technician requests</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="text-2xl font-black text-emerald-600">100% Approved</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Work starts only upon your estimate approval</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="text-2xl font-black text-slate-900">30 Days</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Platform service warranty guarantee</div>
          </div>
        </div>
      </section>

      {/* 2. Popular Services Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Five Specialized Trades</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Popular Services</h2>
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
            const serviceId = srv._id || srv.id;
            const linkPath = srv._id ? `/services/${srv._id}` : '/services';
            const icon = srv.icon || srv.categoryId?.icon || '🛠️';
            const price = srv.estimatedPriceRange?.min || srv.startingPrice || 249;

            return (
              <Link
                key={serviceId || idx}
                to={linkPath}
                className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500/60 shadow-2xs hover-lift transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl p-3 bg-blue-50/80 rounded-2xl group-hover:scale-105 transition-transform">
                      {icon}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      Starts ₹{price}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {srv.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {srv.description || 'Verified local service by certified technicians.'}
                  </p>
                </div>
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                  <span>Find Technician</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. How It Works Section (The Actual 7-Step Flow) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">End-to-End Transparency</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mt-1 tracking-tight">
            How It Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            The 7-step transparent process engineered for homeowners and technicians.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ACTUAL_FLOW_STEPS.map((step) => (
            <div
              key={step.step}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="h-8 w-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {step.step}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Step 0{step.step}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Why ServiceHub Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Built On Trust &amp; Quality</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">Why ServiceHub</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-3 leading-relaxed">
            Eliminating surprise bills, unauthorized repairs, and unverified contractors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2 sm:px-6">
          {WHY_POINTS.map((pt, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors space-y-2"
            >
              <div className="text-2xl">{pt.icon}</div>
              <h3 className="text-sm font-bold text-white">{pt.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{pt.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Technicians Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Direct Requests</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Technicians</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Select your certified technician directly based on experience, profession, and ratings.
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
          {FEATURED_TECHNICIANS.map((tech, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-400 transition-all flex flex-col justify-between hover-lift"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
                    {tech.icon}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span>✓</span> Verified
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{tech.name}</h3>
                <div className="text-xs font-semibold text-blue-600 mt-0.5">{tech.profession}</div>
                <div className="text-[11px] text-slate-400">{tech.businessName}</div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Exp: <strong>{tech.experience}</strong></span>
                  <span className="text-amber-500 font-bold">★ {tech.rating}</span>
                </div>
              </div>

              <Link to="/services" className="mt-4">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold py-1.5">
                  Request Service
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Call to Action Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Get Started Today</span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Ready to find the right technician for your home?
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
              Book certified AC, Plumbing, Electrical, RO, or Appliance services with guaranteed customer approval and 30-day warranty.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-shrink-0">
            <Link to="/services" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto text-blue-700 font-bold bg-white hover:bg-blue-50 shadow-md"
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

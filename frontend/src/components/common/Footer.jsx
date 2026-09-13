import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 sm:gap-10">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2 group inline-flex">
              <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-xs">
                S
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                Service<span className="text-blue-400">Hub</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              India's transparent home-service platform connecting verified technicians with homeowners. Upfront digital estimates, customer approval before work begins, and a guaranteed 30-day service warranty.
            </p>
            <div className="text-[11px] text-slate-500 pt-1">
              © {new Date().getFullYear()} ServiceHub Technologies. All rights reserved.
            </div>
          </div>

          {/* Services */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Services</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/services" className="text-slate-400 hover:text-white transition-colors">
                  AC Repair &amp; Service
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-slate-400 hover:text-white transition-colors">
                  Plumbing Solutions
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-slate-400 hover:text-white transition-colors">
                  Electrical Works
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-slate-400 hover:text-white transition-colors">
                  RO Water Purifiers
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-slate-400 hover:text-white transition-colors">
                  Appliance Servicing
                </Link>
              </li>
            </ul>
          </div>

          {/* Customers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Customers</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/services" className="text-slate-400 hover:text-white transition-colors">
                  Book a Service
                </Link>
              </li>
              <li>
                <Link to="/technicians" className="text-slate-400 hover:text-white transition-colors">
                  Find Technicians
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
                  Customer Dashboard
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-slate-400 hover:text-white transition-colors">
                  Help &amp; FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Technicians */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Technicians</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/register?role=TECHNICIAN" className="text-slate-400 hover:text-white transition-colors">
                  Join as Technician
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-400 hover:text-white transition-colors">
                  Technician Login
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-slate-400 hover:text-white transition-colors">
                  Onboarding Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="text-slate-400 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;

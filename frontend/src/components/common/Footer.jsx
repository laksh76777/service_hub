import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 sm:gap-10">
          
          {/* Brand Col */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2 group inline-flex">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-xs">
                S
              </div>
              <span className="font-bold text-xl text-white">
                Service<span className="text-blue-400">Hub</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Find the right technician for your home service. Transparent digital estimates, customer approval before work, and 30-day warranty.
            </p>
            <div className="text-[11px] text-slate-500 pt-2">
              © {new Date().getFullYear()} ServiceHub India.
            </div>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="text-slate-400 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">
                  Contact
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
                  Browse Services
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-slate-400 hover:text-white transition-colors">
                  Help
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
                  Help
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
            <div className="pt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-emerald-400 border border-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Verified Trade Platform
              </span>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;

import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-xl text-white">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base">
                S
              </div>
              <span>Service<span className="text-blue-400">Hub</span></span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Transparent local service booking, estimate approval, and verifiable work tracking for homeowners and verified contractors.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/services" className="hover:text-white transition-colors">Browse Services</Link></li>
              <li><Link to="/providers" className="hover:text-white transition-colors">Find Providers</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Customer Portal</Link></li>
            </ul>
          </div>

          {/* Core Guarantees */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Pillars</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• Upfront Itemized Estimates</li>
              <li>• Photo-Verified Completion</li>
              <li>• Milestone-Based Invoicing</li>
              <li>• Warranty & Dispute Resolution</li>
            </ul>
          </div>

          {/* Legal / Status */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">System Status</h4>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Phase 1 Platform Active
            </div>
            <p className="text-xs text-slate-500 mt-4">
              © {new Date().getFullYear()} ServiceHub. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

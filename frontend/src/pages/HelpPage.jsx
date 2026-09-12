import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const FAQS = [
  {
    category: 'Customers',
    items: [
      {
        q: 'How does ServiceHub differ from other platforms?',
        a: 'On ServiceHub, you select your technician directly based on their verified profile, trade experience, and ratings. There are no middleman queues. Work begins only after you approve a transparent, itemized digital estimate.'
      },
      {
        q: 'How is my address kept private?',
        a: 'Before your chosen technician accepts your request, your street address is masked on the platform. The technician only sees your city and general area. Once they accept the request, your full address is unlocked for on-site arrival.'
      },
      {
        q: 'When do I pay for the service?',
        a: 'You never pay in advance. The technician inspects the issue on-site and provides an itemized estimate. Once you approve the estimate and the technician completes the work, you verify the work and complete payment.'
      },
      {
        q: 'What does the 30-Day Warranty cover?',
        a: 'All completed jobs are covered by a 30-day service warranty against recurring defects for the specific work performed. If the same issue reoccurs, we arrange a technician re-visit at zero additional labor cost.'
      }
    ]
  },
  {
    category: 'Technicians',
    items: [
      {
        q: 'How do I register as a ServiceHub Technician?',
        a: 'Click "Join as Technician" on the homepage or navigation bar. Fill out your legal name, contact details, trade profession, field experience, and service zone. Your application will be placed into review.'
      },
      {
        q: 'Why is my account status "PENDING" after registration?',
        a: 'All new technician accounts are reviewed by platform administrators to verify trade qualifications and background. Once approved, your status changes to VERIFIED and you become visible to customers.'
      },
      {
        q: 'Can I decline a service request?',
        a: 'Yes. If a request does not match your schedule or expertise, you can decline it. You are required to provide a brief reason so the customer understands and can choose another certified technician.'
      },
      {
        q: 'How do I submit an estimate?',
        a: 'After on-site inspection, you create an itemized estimate with labor and spare parts line items from your technician dashboard. The customer will review and approve it directly before you start work.'
      }
    ]
  }
];

const HelpPage = () => {
  const [activeCategory, setActiveCategory] = useState('Customers');
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const currentFaqs = FAQS.find((f) => f.category === activeCategory)?.items || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          Knowledge Base
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-slate-600 text-sm">
          Everything you need to know about booking, estimates, technician verification, and guarantees.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
          {FAQS.map((f) => (
            <button
              key={f.category}
              type="button"
              onClick={() => {
                setActiveCategory(f.category);
                setOpenFaq(null);
              }}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeCategory === f.category
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.category === 'Customers' ? '👤 For Customers' : '🔧 For Technicians'}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {currentFaqs.map((faq, idx) => {
          const isOpen = openFaq === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-white border border-slate-200 overflow-hidden transition-all shadow-xs"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors"
              >
                <span>{faq.q}</span>
                <span className="text-lg text-slate-400 font-mono">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Support Banner */}
      <div className="p-8 rounded-3xl bg-slate-900 text-white text-center space-y-4">
        <h3 className="text-xl font-bold">Still have questions?</h3>
        <p className="text-xs text-slate-300 max-w-md mx-auto">
          Our customer support team is available 7 days a week to help resolve inquiries or arbitrate service estimates.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/contact">
            <Button variant="primary" size="sm" className="shadow-xs">
              Contact Support
            </Button>
          </Link>
          <Link to="/services">
            <Button variant="outline" size="sm" className="border-slate-700 text-white hover:bg-slate-800">
              Browse Services
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;

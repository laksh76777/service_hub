import React from 'react';
import Card from '../components/common/Card';

const PrivacyPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          Trust &amp; Security
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-slate-500 text-xs">
          Last Updated: September 2026 | ServiceHub Platform Operations
        </p>
      </div>

      <Card>
        <div className="prose prose-slate max-w-none text-xs sm:text-sm space-y-6 text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Commitment to Privacy</h2>
            <p>
              ServiceHub ("we", "our", or "the platform") is dedicated to safeguarding the personal data of customers, technicians, and visitors. We process information strictly to facilitate direct home-service fulfillment, transparent digital estimates, and guaranteed warranty tracking.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Customer Address Privacy Protection</h2>
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 space-y-1">
              <span className="font-bold block">🔒 Strict Pre-Acceptance Masking:</span>
              <p className="text-xs text-blue-800">
                When you request a service, your precise street address and house/flat numbers remain completely masked to the requested technician while the request is in <code>REQUESTED</code> status. The technician only sees your city and general service zone. Only after the technician formally accepts your booking is your full address revealed for on-site navigation.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Customer Information:</strong> Full name, phone number, email address, service addresses, problem descriptions, and booking history.</li>
              <li><strong>Technician Information:</strong> Full legal name, contact details, trade profession, years of experience, trade business name, service coverage area, and government ID / verification records.</li>
              <li><strong>Transactional Data:</strong> Digital estimates, approvals, work completion evidence photos, payment confirmation tokens, and invoice details.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. How We Use Information</h2>
            <p>
              Information is used solely to authenticate accounts via Firebase, schedule on-site visits with your selected technician, generate itemized estimates, issue GST-compliant invoices, and validate 30-day warranty coverage. We do not sell personal information to third-party marketing brokers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">5. Data Retention &amp; Security</h2>
            <p>
              All communication and authentication tokens utilize industry-standard TLS encryption. MongoDB database records are protected with role-based access control (RBAC), ensuring customers and technicians can only access records relevant to their authorized bookings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">6. Contact Data Protection Officer</h2>
            <p>
              For inquiries regarding personal data deletion or privacy concerns, please contact our Data Protection Officer at <a href="mailto:privacy@servicehub.in" className="text-blue-600 font-bold hover:underline">privacy@servicehub.in</a>.
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
};

export default PrivacyPage;

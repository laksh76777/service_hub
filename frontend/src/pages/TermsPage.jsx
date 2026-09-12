import React from 'react';
import Card from '../components/common/Card';

const TermsPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          Platform Agreement
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Terms of Service
        </h1>
        <p className="text-slate-500 text-xs">
          Effective Date: September 2026 | ServiceHub Terms of Use
        </p>
      </div>

      <Card>
        <div className="prose prose-slate max-w-none text-xs sm:text-sm space-y-6 text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Overview &amp; Roles</h2>
            <p>
              ServiceHub provides a direct, verified technological platform connecting Homeowners ("Customers") with trade professionals ("Technicians"). The platform is overseen and moderated by Platform Administrators ("Admins"). By accessing or registering an account, you agree to these Terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Customer-Approved Estimates Policy</h2>
            <p>
              Technicians are prohibited from commencing work on-site until an upfront, itemized digital estimate is submitted through the platform and explicitly approved by the Customer. Customers are under no obligation to proceed if they do not approve the estimate.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Technician Verification &amp; Standards</h2>
            <p>
              All technicians on ServiceHub must maintain valid trade qualifications and undergo administrative verification before becoming eligible to receive service requests. Technicians must conduct services professionally and upload before/after work evidence where applicable.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. 30-Day Platform Warranty</h2>
            <p>
              Every completed service booking carries a 30-day service warranty for the specific scope of work described in the approved estimate. If an issue recurs within 30 days due to faulty workmanship, the Customer may request warranty inspection via their booking dashboard.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">5. Cancellations &amp; Rejections</h2>
            <p>
              Customers may cancel a service request prior to technician arrival. Technicians may decline a service request during the initial <code>REQUESTED</code> phase by providing a mandatory explanation reason.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">6. Dispute Arbitration</h2>
            <p>
              In the event of a disagreement regarding estimate items, work quality, or damages, either party may escalate the booking to Platform Administrators for binding mediation and resolution.
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
};

export default TermsPage;

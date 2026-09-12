import React, { useState } from 'react';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Customer',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          Support &amp; Inquiries
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          We're Here to Assist You
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Have questions about your booking, estimate, or technician verification? Contact our platform team directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Direct Support Channels</h3>
            
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-lg">📧</span>
                <div>
                  <div className="font-bold text-slate-800">Email Support</div>
                  <div className="text-slate-500 mt-0.5">support@servicehub.in</div>
                  <div className="text-[11px] text-blue-600 mt-1">Average response time: &lt; 2 hours</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-lg">📞</span>
                <div>
                  <div className="font-bold text-slate-800">Phone Hotline</div>
                  <div className="text-slate-500 mt-0.5">+91 (080) 4567-8900</div>
                  <div className="text-[11px] text-slate-400 mt-1">Mon - Sun: 8:00 AM - 9:00 PM IST</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-lg">📍</span>
                <div>
                  <div className="font-bold text-slate-800">Primary Hub</div>
                  <div className="text-slate-500 mt-0.5">100 Feet Road, Indiranagar, Bengaluru, KA 560038</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-3">
            <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Service Guarantee</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every job booked through ServiceHub includes our 30-day warranty and dispute arbitration. If any issue arises with a verified technician, our escalation team steps in immediately.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7">
          <Card title="Send Us a Message" subtitle="Fill out the form below and we will get back to you shortly">
            {submitted ? (
              <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-4xl">✅</span>
                <h3 className="text-base font-bold text-emerald-900">Message Received</h3>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  Thank you for reaching out. Our support desk has logged your inquiry and will follow up via email within 2 hours.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', role: 'Customer', subject: '', message: '' });
                  }}
                  className="mt-2"
                >
                  Send Another Inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Your Name"
                    type="text"
                    required
                    placeholder="e.g. Laksh Suthar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-800"
                    >
                      <option value="Customer">Homeowner / Customer</option>
                      <option value="Technician">Technician / Contractor</option>
                      <option value="Other">General Inquiry</option>
                    </select>
                  </div>

                  <Input
                    label="Subject"
                    type="text"
                    required
                    placeholder="e.g. Estimate question or booking issue"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
                  <textarea
                    rows={4}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-800 placeholder:text-slate-400"
                    placeholder="Please provide specific details including your booking reference if applicable..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full shadow-md shadow-blue-500/20" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Message →'}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;

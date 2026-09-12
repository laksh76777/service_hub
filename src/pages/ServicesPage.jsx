import React, { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';

const initialServices = [
  { id: '1', name: 'Plumbing Repair & Installation', category: 'Plumbing', avgEstimate: '$80 - $250', providersCount: 14, icon: '🔧' },
  { id: '2', name: 'Electrical Panel & Rewiring', category: 'Electrical', avgEstimate: '$120 - $400', providersCount: 9, icon: '⚡' },
  { id: '3', name: 'HVAC Seasonal Servicing & Repair', category: 'HVAC', avgEstimate: '$90 - $350', providersCount: 12, icon: '❄️' },
  { id: '4', name: 'Roof Inspection & Leak Repair', category: 'Roofing', avgEstimate: '$150 - $600', providersCount: 6, icon: '🏠' },
  { id: '5', name: 'Interior & Exterior Painting', category: 'Painting', avgEstimate: '$200 - $1200', providersCount: 18, icon: '🎨' },
  { id: '6', name: 'Carpentry & Cabinetry', category: 'Carpentry', avgEstimate: '$100 - $500', providersCount: 8, icon: '🪚' }
];

const ServicesPage = () => {
  const [services, setServices] = useState(initialServices);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState('');

  const categories = ['All', 'Plumbing', 'Electrical', 'HVAC', 'Roofing', 'Painting', 'Carpentry'];

  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter(s => s.category === selectedCategory);

  const handleOpenBooking = (service) => {
    setSelectedService(service);
    setRequestNotes('');
    setSubmittedMessage('');
    setBookingModalOpen(true);
  };

  const handleConfirmRequest = (e) => {
    e.preventDefault();
    setSubmittedMessage(`Request registered for "${selectedService.name}". In Phase 2 this will persist to MongoDB.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Explore Services</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Browse verified local home and commercial services with transparent estimate ranges.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Service Cards Grid */}
      {filteredServices.length === 0 ? (
        <EmptyState
          title="No services in this category"
          description="Try selecting another category or check back soon."
          actionLabel="Reset Category Filter"
          onAction={() => setSelectedCategory('All')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card
              key={service.id}
              title={
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{service.icon}</span>
                  <span className="text-base font-semibold">{service.name}</span>
                </div>
              }
              subtitle={`Category: ${service.category}`}
              footer={
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    {service.providersCount} Providers Active
                  </span>
                  <Button size="sm" variant="primary" onClick={() => handleOpenBooking(service)}>
                    Request Service
                  </Button>
                </div>
              }
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Estimate Range:</span>
                  <span className="font-semibold text-slate-800">{service.avgEstimate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Warranty:</span>
                  <span className="text-emerald-600 font-medium">Included (30-90 days)</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Request Modal Placeholder */}
      <Modal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        title={selectedService ? `Request ${selectedService.name}` : 'Request Service'}
        footer={
          submittedMessage ? (
            <Button variant="secondary" onClick={() => setBookingModalOpen(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setBookingModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleConfirmRequest}>Submit Request</Button>
            </>
          )
        }
      >
        {submittedMessage ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
            {submittedMessage}
          </div>
        ) : (
          <form onSubmit={handleConfirmRequest} className="space-y-4">
            <p className="text-xs text-slate-500">
              Fill in your requirement. A certified provider will review and prepare an estimate.
            </p>
            <Input
              label="Location / Zip Code"
              placeholder="e.g. 10001 or Downtown"
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Describe the problem or project
              </label>
              <textarea
                rows={3}
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="Explain what needs fixing, any existing damage, or special instructions..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                required
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ServicesPage;

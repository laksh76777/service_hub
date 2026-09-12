import React, { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';

const mockBookings = [
  {
    id: 'BK-1041',
    service: 'Plumbing Repair & Installation',
    provider: 'Precision Pipe & Drain Works',
    status: 'Estimate Pending',
    statusColor: 'bg-amber-100 text-amber-800',
    date: '2026-09-15',
    estimateTotal: '$180.00'
  },
  {
    id: 'BK-1039',
    service: 'Electrical Panel Rewiring',
    provider: 'Apex Heating & Cooling',
    status: 'Work In Progress',
    statusColor: 'bg-blue-100 text-blue-800',
    date: '2026-09-10',
    estimateTotal: '$320.00'
  }
];

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings] = useState(mockBookings);
  const [inspectBooking, setInspectBooking] = useState(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Track service bookings, review estimates, inspect verified work evidence, and manage warranties.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-6">
          {[
            { id: 'bookings', label: 'Active Bookings' },
            { id: 'estimates', label: 'Estimates & Approvals' },
            { id: 'verification', label: 'Work Verification' },
            { id: 'warranty', label: 'Warranties & Disputes' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bookings.map((b) => (
              <Card
                key={b.id}
                title={
                  <div className="flex items-center justify-between">
                    <span>{b.service}</span>
                  </div>
                }
                subtitle={`Reference ID: ${b.id}`}
                footer={
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Scheduled: {b.date}</span>
                    <Button size="sm" variant="outline" onClick={() => setInspectBooking(b)}>
                      View Timeline
                    </Button>
                  </div>
                }
              >
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Provider:</span>
                    <span className="font-medium text-slate-800">{b.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimate Total:</span>
                    <span className="font-semibold text-slate-900">{b.estimateTotal}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500">Status:</span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${b.statusColor}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'estimates' && (
        <Card title="Pending Estimates">
          <p className="text-sm text-slate-600 mb-4">
            In later phases, clients can review line-item breakdowns, approve scope, and authorize change orders online.
          </p>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            <div className="font-semibold text-slate-800">Job BK-1041: Plumbing Repair Estimate</div>
            <div className="text-slate-600 text-xs mt-1">Labor: $120 | Parts (Copper valve & fittings): $60 | Total: $180.00</div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="primary">Approve Estimate (Phase 2)</Button>
              <Button size="sm" variant="outline">Request Revision</Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'verification' && (
        <EmptyState
          title="No Work Verification Evidence Yet"
          description="When providers complete tasks, photo evidence and inspection checklists will appear here for customer sign-off."
        />
      )}

      {activeTab === 'warranty' && (
        <EmptyState
          title="No Active Warranty Claims"
          description="All completed jobs come with standard 30-90 day coverage. You can file claims or initiate dispute resolution here."
        />
      )}

      {/* Inspect Modal */}
      <Modal
        isOpen={!!inspectBooking}
        onClose={() => setInspectBooking(null)}
        title={inspectBooking ? `Job Details - ${inspectBooking.id}` : 'Details'}
        footer={
          <Button variant="secondary" onClick={() => setInspectBooking(null)}>Close</Button>
        }
      >
        {inspectBooking && (
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Service Required</div>
              <div className="font-semibold text-slate-800">{inspectBooking.service}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Provider</div>
              <div className="text-slate-800">{inspectBooking.provider}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Current Phase</div>
              <div className="text-slate-800">{inspectBooking.status}</div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-900 rounded-lg text-xs">
              Live tracking, GPS arrival notifications, and photo verification will be powered by Phase 2/4 backend models.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DashboardPage;

import React, { useState } from 'react';

const LIFECYCLE_STEPS = [
  { key: 'REQUESTED', label: 'Requested', desc: 'Customer submitted request' },
  { key: 'ACCEPTED', label: 'Accepted', desc: 'Provider confirmed request' },
  { key: 'SCHEDULED', label: 'Scheduled', desc: 'Arrival window set' },
  { key: 'TECHNICIAN_ARRIVED', label: 'Arrived', desc: 'Technician on-site' },
  { key: 'IN_PROGRESS', label: 'In Progress', desc: 'Work actively underway' },
  { key: 'COMPLETION_PENDING', label: 'Review Pending', desc: 'Work finished, pending signoff' },
  { key: 'CUSTOMER_VERIFIED', label: 'Verified', desc: 'Customer approved work' },
  { key: 'COMPLETED', label: 'Completed', desc: 'Booking finalized' }
];

const BookingTimeline = ({ currentStatus, statusHistory = [] }) => {
  const [showFullHistory, setShowFullHistory] = useState(false);

  const isCancelled = currentStatus.includes('CANCELLED');
  const isDisputed = currentStatus === 'DISPUTED';

  const currentIndex = LIFECYCLE_STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Service Progress Pipeline</h3>
          <p className="text-xs text-slate-500">Live lifecycle tracking validated by state machine</p>
        </div>
        {isCancelled && (
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
            {currentStatus}
          </span>
        )}
        {isDisputed && (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full animate-pulse">
            DISPUTED - UNDER REVIEW
          </span>
        )}
      </div>

      {/* Visual Stepper */}
      {!isCancelled && (
        <div className="relative my-6">
          <div className="hidden md:flex items-center justify-between relative z-10">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPast = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              return (
                <div key={step.key} className="flex flex-col items-center text-center max-w-[90px]">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isPast
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md animate-pulse'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`mt-2 text-[11px] font-semibold ${
                      isCurrent
                        ? 'text-blue-600 font-bold'
                        : isPast
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar background line */}
          <div className="hidden md:block absolute top-4 left-6 right-6 h-0.5 bg-slate-200 z-0">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${
                  currentIndex <= 0
                    ? 0
                    : (currentIndex / (LIFECYCLE_STEPS.length - 1)) * 100
                }%`
              }}
            />
          </div>

          {/* Mobile simple view */}
          <div className="md:hidden flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 block">Current Stage:</span>
              <span className="text-sm font-bold text-blue-600">{currentStatus}</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Step {currentIndex + 1} of {LIFECYCLE_STEPS.length}
            </span>
          </div>
        </div>
      )}

      {/* Audit Event History */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Transition Audit Trail ({statusHistory.length} events)
          </h4>
          <button
            onClick={() => setShowFullHistory(!showFullHistory)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            {showFullHistory ? 'Collapse' : 'Expand Full History'}
          </button>
        </div>

        <div className="space-y-3">
          {(showFullHistory ? statusHistory : statusHistory.slice(-2)).map((hist, i) => (
            <div
              key={hist._id || i}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    {hist.previousStatus ? `${hist.previousStatus} → ` : ''}
                    <span className="text-blue-600">{hist.newStatus}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(hist.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-slate-600 mt-0.5">
                  <span className="font-medium text-slate-700">
                    {hist.actor?.name || 'Actor'} ({hist.actor?.role || 'SYSTEM'})
                  </span>
                  {hist.reason && <span className="text-slate-500"> — "{hist.reason}"</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookingTimeline;

import React, { useState } from 'react';

// Exact 8-stage lifecycle from requirement 21:
const STATUS_LIFECYCLE_STAGES = [
  { id: 1, key: 'REQUEST_SENT', label: 'Request Sent', statuses: ['REQUESTED'] },
  { id: 2, key: 'ACCEPTED', label: 'Accepted', statuses: ['ACCEPTED', 'SCHEDULED'] },
  { id: 3, key: 'INSPECTION', label: 'Inspection', statuses: ['INSPECTION', 'ESTIMATE_PENDING'] },
  { id: 4, key: 'ESTIMATE', label: 'Estimate', statuses: ['ESTIMATE_SUBMITTED', 'ESTIMATE_APPROVED'] },
  { id: 5, key: 'PAYMENT', label: 'Payment', statuses: ['PAYMENT_PENDING', 'PAYMENT_SUCCESS'] },
  { id: 6, key: 'WORK_IN_PROGRESS', label: 'Work in Progress', statuses: ['WORK_IN_PROGRESS'] },
  { id: 7, key: 'COMPLETED', label: 'Completed', statuses: ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED'] },
  { id: 8, key: 'INVOICE', label: 'Invoice', statuses: ['INVOICED', 'COMPLETED'] }
];

const BookingTimeline = ({ currentStatus, statusHistory = [] }) => {
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const isRejected = currentStatus === 'REJECTED';
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus?.includes('CANCELLED');

  // Map backend status to 1-8 stage index
  const getCurrentStageIndex = () => {
    for (let i = 0; i < STATUS_LIFECYCLE_STAGES.length; i++) {
      if (STATUS_LIFECYCLE_STAGES[i].statuses.includes(currentStatus)) {
        return i;
      }
    }
    return 0;
  };

  const currentStageIdx = getCurrentStageIndex();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Service Lifecycle Tracker</h3>
          <p className="text-xs text-slate-500">Real-time status updates verified through ServiceHub state machine</p>
        </div>

        <div>
          {isRejected && (
            <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full border border-rose-200">
              ✕ Request Declined
            </span>
          )}
          {isCancelled && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
              Cancelled
            </span>
          )}
          {!isRejected && !isCancelled && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
              ● Stage: {STATUS_LIFECYCLE_STAGES[currentStageIdx]?.label || currentStatus}
            </span>
          )}
        </div>
      </div>

      {/* 8-Stage Visual Timeline */}
      {!isRejected && !isCancelled && (
        <div className="relative py-2">
          {/* Desktop & Tablet Progress Bar */}
          <div className="hidden md:flex items-center justify-between relative z-10">
            {STATUS_LIFECYCLE_STAGES.map((stg, idx) => {
              const isCompleted = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              const isFuture = idx > currentStageIdx;

              return (
                <div key={stg.key} className="flex flex-col items-center text-center max-w-[100px]">
                  {/* Circle Indicator */}
                  <div
                    className={`h-9 w-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-105'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isCompleted ? '✓' : stg.id}
                  </div>

                  {/* Stage Label */}
                  <span
                    className={`mt-2.5 text-[11px] leading-tight font-semibold ${
                      isCurrent
                        ? 'text-blue-600 font-extrabold'
                        : isCompleted
                        ? 'text-slate-800 font-bold'
                        : 'text-slate-400 font-medium'
                    }`}
                  >
                    {stg.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Background Connecting Line */}
          <div className="hidden md:block absolute top-6.5 left-8 right-8 h-0.5 bg-slate-200 z-0">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${(currentStageIdx / (STATUS_LIFECYCLE_STAGES.length - 1)) * 100}%`
              }}
            />
          </div>

          {/* Mobile Linear Stepper */}
          <div className="md:hidden space-y-2">
            <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-blue-50/70 border border-blue-200">
              <span className="font-bold text-blue-950">
                Stage {currentStageIdx + 1} of 8: {STATUS_LIFECYCLE_STAGES[currentStageIdx]?.label}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded-md">
                Active
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${((currentStageIdx + 1) / 8) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Audit History Dropdown / Expander */}
      {statusHistory?.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400">
              Verification Audit Trail ({statusHistory.length} events)
            </span>
            <button
              type="button"
              onClick={() => setShowAuditTrail(!showAuditTrail)}
              className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
            >
              {showAuditTrail ? 'Hide Log' : 'Show Full Log'}
            </button>
          </div>

          <div className="space-y-2 mt-3">
            {(showAuditTrail ? statusHistory : statusHistory.slice(-2)).map((ev, i) => (
              <div
                key={ev._id || i}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-slate-800">
                    {ev.previousStatus ? `${ev.previousStatus.replace(/_/g, ' ')} → ` : ''}
                    <span className="text-blue-600 font-extrabold">{ev.newStatus.replace(/_/g, ' ')}</span>
                  </div>
                  {ev.reason && (
                    <div className="text-slate-500 text-[11px] mt-0.5 italic">"{ev.reason}"</div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1">
                    Actor: {ev.actor?.name || 'System'} ({ev.actor?.role || 'SYSTEM'})
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(ev.timestamp).toLocaleDateString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingTimeline;

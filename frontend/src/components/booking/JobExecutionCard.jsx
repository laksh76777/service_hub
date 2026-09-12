import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { verifyBookingOtp, updateJobExecution } from '../../services/api';

const JobExecutionCard = ({ booking, isCustomer, isProvider, isAdmin, onBookingUpdated }) => {
  const [arrivalOtpInput, setArrivalOtpInput] = useState('');
  const [completionOtpInput, setCompletionOtpInput] = useState('');
  const [verifyingArrival, setVerifyingArrival] = useState(false);
  const [verifyingCompletion, setVerifyingCompletion] = useState(false);

  // Job notes & parts editing
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState(booking.jobExecution?.inspectionNotes || '');
  const [problemIdentified, setProblemIdentified] = useState(booking.jobExecution?.problemIdentified || '');
  const [requiredWork, setRequiredWork] = useState(booking.jobExecution?.requiredWork || '');
  const [workNotes, setWorkNotes] = useState(booking.jobExecution?.workNotes || '');
  const [parts, setParts] = useState(
    booking.jobExecution?.partsUsed && booking.jobExecution.partsUsed.length > 0
      ? booking.jobExecution.partsUsed
      : []
  );
  const [savingJob, setSavingJob] = useState(false);

  // Part adding temp state
  const [newPartName, setNewPartName] = useState('');
  const [newPartQty, setNewPartQty] = useState(1);
  const [newPartCost, setNewPartCost] = useState('');

  const status = booking.status;
  const startOtp = booking.startOtp;
  const completionOtp = booking.completionOtp;
  const execution = booking.jobExecution || {};

  const handleVerifyArrival = async (e) => {
    e.preventDefault();
    if (!arrivalOtpInput.trim() || arrivalOtpInput.trim().length !== 6) {
      alert('Please enter the 6-digit OTP provided by customer.');
      return;
    }

    setVerifyingArrival(true);
    try {
      const res = await verifyBookingOtp(booking._id, {
        type: 'ARRIVAL',
        otp: arrivalOtpInput.trim()
      });
      alert(res.message || 'Arrival OTP verified successfully!');
      setArrivalOtpInput('');
      if (onBookingUpdated) onBookingUpdated(res.booking);
    } catch (err) {
      alert(err.message || 'Invalid arrival OTP. Please ask customer to re-check.');
    } finally {
      setVerifyingArrival(false);
    }
  };

  const handleVerifyCompletion = async (e) => {
    e.preventDefault();
    if (!completionOtpInput.trim() || completionOtpInput.trim().length !== 6) {
      alert('Please enter the 6-digit completion OTP.');
      return;
    }

    setVerifyingCompletion(true);
    try {
      const res = await verifyBookingOtp(booking._id, {
        type: 'COMPLETION',
        otp: completionOtpInput.trim()
      });
      alert(res.message || 'Completion OTP verified successfully! Job completed.');
      setCompletionOtpInput('');
      if (onBookingUpdated) onBookingUpdated(res.booking);
    } catch (err) {
      alert(err.message || 'Invalid completion OTP.');
    } finally {
      setVerifyingCompletion(false);
    }
  };

  const handleAddPart = () => {
    if (!newPartName.trim()) {
      alert('Please enter part name.');
      return;
    }
    const cost = parseFloat(newPartCost) || 0;
    const qty = parseInt(newPartQty, 10) || 1;

    setParts((prev) => [...prev, { name: newPartName.trim(), quantity: qty, cost }]);
    setNewPartName('');
    setNewPartQty(1);
    setNewPartCost('');
  };

  const handleRemovePart = (index) => {
    setParts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveJobExecution = async () => {
    setSavingJob(true);
    try {
      const res = await updateJobExecution(booking._id, {
        inspectionNotes,
        workNotes,
        partsUsed: parts
      });
      alert('Job execution details saved successfully!');
      setIsEditingJob(false);
      if (onBookingUpdated) onBookingUpdated(res.booking);
    } catch (err) {
      alert(err.message || 'Failed to save job execution details.');
    } finally {
      setSavingJob(false);
    }
  };

  const partsTotal = (execution.partsUsed || []).reduce(
    (acc, p) => acc + (p.cost || 0) * (p.quantity || 1),
    0
  );

  return (
    <div className="space-y-6">
      {/* 1. Customer OTP Display Banners */}
      {(isCustomer || isAdmin) && (
        <>
          {status === 'SCHEDULED' && startOtp?.code && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg border border-blue-400/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-white/20 rounded-full mb-1">
                    Arrival Verification
                  </span>
                  <h4 className="text-base font-bold">Technician Arrival OTP</h4>
                  <p className="text-xs text-blue-100 mt-0.5">
                    Share this code with your technician when they arrive at your service address.
                  </p>
                </div>
                <div className="bg-white text-gray-900 px-6 py-3 rounded-xl font-mono text-2xl font-black tracking-widest shadow-inner select-all">
                  {startOtp.code}
                </div>
              </div>
            </div>
          )}

          {status === 'COMPLETION_PENDING' && completionOtp?.code && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg border border-emerald-400/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-white/20 rounded-full mb-1">
                    Completion Sign-Off
                  </span>
                  <h4 className="text-base font-bold">Work Completion OTP</h4>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Inspect the completed work and share this code with technician, or verify directly.
                  </p>
                </div>
                <div className="bg-white text-emerald-900 px-6 py-3 rounded-xl font-mono text-2xl font-black tracking-widest shadow-inner select-all">
                  {completionOtp.code}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 2. Provider OTP Verification Cards */}
      {(isProvider || isAdmin) && (
        <>
          {status === 'SCHEDULED' && (
            <Card className="p-6 border-2 border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>📍</span> Verify Customer Arrival OTP
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Arrived at customer's location? Ask them for the 6-digit OTP shown on their screen to check in.
                  </p>
                </div>
                <form onSubmit={handleVerifyArrival} className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-digit OTP"
                    value={arrivalOtpInput}
                    onChange={(e) => setArrivalOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-36 text-center font-mono text-lg font-bold tracking-widest px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <Button type="submit" variant="primary" size="sm" loading={verifyingArrival}>
                    Check In
                  </Button>
                </form>
              </div>
            </Card>
          )}

          {status === 'COMPLETION_PENDING' && (
            <Card className="p-6 border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>✅</span> Verify Customer Completion OTP
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Ask customer for the 6-digit completion OTP after they inspect and approve the work.
                  </p>
                </div>
                <form onSubmit={handleVerifyCompletion} className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-digit OTP"
                    value={completionOtpInput}
                    onChange={(e) => setCompletionOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-36 text-center font-mono text-lg font-bold tracking-widest px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <Button type="submit" variant="primary" size="sm" loading={verifyingCompletion}>
                    Verify Completion
                  </Button>
                </form>
              </div>
            </Card>
          )}
        </>
      )}

      {/* 3. Job Execution & Diagnostics Details */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>🔧</span> Job Execution & Diagnosis
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Field diagnostic notes, inspection findings, problem identified, and required work scope.
            </p>
          </div>
          {(isProvider || isAdmin) && ['INSPECTION', 'ESTIMATE_PENDING', 'ESTIMATE_SUBMITTED', 'WORK_IN_PROGRESS', 'TECHNICIAN_ARRIVED', 'IN_PROGRESS'].includes(status) && !isEditingJob && (
            <Button size="sm" variant="outline" onClick={() => setIsEditingJob(true)}>
              Edit Notes & Parts
            </Button>
          )}
        </div>

        {isEditingJob ? (
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Inspection Notes
              </label>
              <textarea
                rows={2}
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="Observed general wear and tear, noise during operation..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Problem Identified
                </label>
                <input
                  type="text"
                  value={problemIdentified}
                  onChange={(e) => setProblemIdentified(e.target.value)}
                  placeholder="e.g. Refrigerant leak at flare joint, faulty start capacitor"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Required Work Scope
                </label>
                <input
                  type="text"
                  value={requiredWork}
                  onChange={(e) => setRequiredWork(e.target.value)}
                  placeholder="e.g. Brazing joint repair, pressure testing, gas top-up"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Work Carried Out / Solution
              </label>
              <textarea
                rows={2}
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="High-pressure jet wash, flaring re-done, vacuumed and topped up R32 gas..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Parts List Builder */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Parts & Consumables Used
              </label>

              {parts.length > 0 && (
                <div className="space-y-2 mb-3">
                  {parts.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs"
                    >
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{p.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">Qty: {p.quantity}</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          ₹{p.cost * p.quantity} (₹{p.cost} ea)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePart(idx)}
                          className="text-red-500 hover:text-red-700 font-bold ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Part name (e.g. Copper Flare Nut)"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  className="sm:col-span-6 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={newPartQty}
                  onChange={(e) => setNewPartQty(e.target.value)}
                  className="sm:col-span-2 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-center"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Cost (₹)"
                  value={newPartCost}
                  onChange={(e) => setNewPartCost(e.target.value)}
                  className="sm:col-span-2 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-right"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPart}
                  className="sm:col-span-2 text-xs py-1"
                >
                  + Add
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={savingJob}
                onClick={() => setIsEditingJob(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={savingJob}
                onClick={handleSaveJobExecution}
              >
                Save Job Details
              </Button>
            </div>
          </div>
        ) : (
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <span className="text-[11px] font-bold uppercase text-gray-400">
                  Inspection Notes
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                  {execution.inspectionNotes || 'No inspection notes logged yet.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <span className="text-[11px] font-bold uppercase text-gray-400">
                  Problem Identified
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                  {execution.problemIdentified || 'Pending diagnosis.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <span className="text-[11px] font-bold uppercase text-gray-400">
                  Required Work Scope
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                  {execution.requiredWork || 'Pending scope definition.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <span className="text-[11px] font-bold uppercase text-gray-400">
                  Work Notes
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                  {execution.workNotes || 'No work execution notes logged yet.'}
                </p>
              </div>
            </div>

            {/* Parts Table */}
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 block mb-2">
                Parts & Consumables Installed
              </span>

              {execution.partsUsed && execution.partsUsed.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Part Description</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                      {execution.partsUsed.map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium">{p.name}</td>
                          <td className="py-2 px-3 text-center">{p.quantity}</td>
                          <td className="py-2 px-3 text-right">₹{p.cost}</td>
                          <td className="py-2 px-3 text-right font-semibold">
                            ₹{p.cost * p.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-800/40 border-t border-gray-200 dark:border-gray-700">
                      <tr>
                        <td colSpan={3} className="py-2 px-3 font-bold text-right text-gray-600">
                          Total Parts Amount:
                        </td>
                        <td className="py-2 px-3 font-bold text-right text-blue-600 dark:text-blue-400">
                          ₹{partsTotal}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No extra parts or consumables reported.</p>
              )}
            </div>

            {/* Timestamps audit */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500">
              <div>
                <span className="block text-gray-400">Arrived</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {execution.technicianArrivedAt
                    ? new Date(execution.technicianArrivedAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Pending'}
                </span>
              </div>
              <div>
                <span className="block text-gray-400">Started</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {execution.workStartedAt
                    ? new Date(execution.workStartedAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Pending'}
                </span>
              </div>
              <div>
                <span className="block text-gray-400">Done Pending</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {execution.completionPendingAt
                    ? new Date(execution.completionPendingAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Pending'}
                </span>
              </div>
              <div>
                <span className="block text-gray-400">Completed</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {execution.completedAt
                    ? new Date(execution.completedAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default JobExecutionCard;

import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import {
  getBookingDispute,
  createDispute,
  respondToDispute,
  resolveDispute
} from '../../services/api';

const DisputeCard = ({ booking, isCustomer, isProvider, isAdmin, onDisputeUpdated }) => {
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);

  // Form states
  const [reason, setReason] = useState('QUALITY_OF_WORK');
  const [description, setDescription] = useState('');
  const [providerMessage, setProviderMessage] = useState('');
  const [resolutionType, setResolutionType] = useState('REWORK');
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDispute = async () => {
    if (!booking?._id) return;
    try {
      setLoading(true);
      const res = await getBookingDispute(booking._id);
      setDispute(res.data || null);
    } catch (err) {
      setDispute(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispute();
  }, [booking?._id]);

  const handleCreateDispute = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createDispute({
        bookingId: booking._id,
        reason,
        description
      });
      setCreateModalOpen(false);
      setDescription('');
      await fetchDispute();
      if (onDisputeUpdated) onDisputeUpdated();
    } catch (err) {
      alert(err.message || 'Failed to raise dispute.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondDispute = async (e) => {
    e.preventDefault();
    if (!dispute?._id) return;
    setActionLoading(true);
    try {
      await respondToDispute(dispute._id, { message: providerMessage });
      setRespondModalOpen(false);
      setProviderMessage('');
      await fetchDispute();
      if (onDisputeUpdated) onDisputeUpdated();
    } catch (err) {
      alert(err.message || 'Failed to submit response.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    if (!dispute?._id) return;
    setActionLoading(true);
    try {
      await resolveDispute(dispute._id, {
        status: resolutionStatus,
        resolutionType,
        resolutionNotes,
        refundAmount
      });
      setResolveModalOpen(false);
      await fetchDispute();
      if (onDisputeUpdated) onDisputeUpdated();
    } catch (err) {
      alert(err.message || 'Failed to resolve dispute.');
    } finally {
      setActionLoading(false);
    }
  };

  const isClosed = dispute && ['RESOLVED', 'REJECTED', 'CANCELLED'].includes(dispute.status);

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>⚖️</span> Dispute Resolution & Mediation
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Formal mediation and customer protection for service or billing disagreements.
          </p>
        </div>

        {/* Action button in header */}
        {!dispute && isCustomer && (
          <Button
            size="sm"
            variant="outline"
            className="text-rose-600 border-rose-300 hover:bg-rose-50"
            onClick={() => setCreateModalOpen(true)}
          >
            Raise Dispute
          </Button>
        )}

        {dispute && !isClosed && (
          <div className="flex items-center gap-2">
            {isProvider && !dispute.providerResponse?.message && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setRespondModalOpen(true)}
              >
                Submit Response
              </Button>
            )}

            {isAdmin && (
              <Button
                size="sm"
                variant="primary"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setResolveModalOpen(true)}
              >
                Arbitrate Dispute
              </Button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500">Checking dispute status...</div>
      ) : !dispute ? (
        <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 mt-4">
          <div className="text-3xl mb-1">⚖️</div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No active disputes.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            If work quality or charges do not align with verified estimates, customers can initiate formal arbitration.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4 text-xs">
          {/* Dispute Header */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Case Reference</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                {dispute.disputeNumber}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Reason</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {dispute.reason.replace(/_/g, ' ')}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
              <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                dispute.status === 'RESOLVED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : dispute.status === 'OPEN'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {dispute.status}
              </span>
            </div>
          </div>

          {/* Description & Response */}
          <div className="space-y-2">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <strong className="text-slate-800 dark:text-slate-200 block mb-1">Customer Statement:</strong>
              <p className="text-slate-600 dark:text-slate-400">{dispute.description}</p>
            </div>

            {dispute.providerResponse?.message && (
              <div className="bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <div className="flex justify-between items-center mb-1">
                  <strong className="text-blue-900 dark:text-blue-300">Provider Response:</strong>
                  <span className="text-[10px] text-blue-500">
                    {new Date(dispute.providerResponse.respondedAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <p className="text-blue-800 dark:text-blue-200">{dispute.providerResponse.message}</p>
              </div>
            )}

            {dispute.resolutionType && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <strong className="text-emerald-900 dark:text-emerald-300 block mb-1">
                  Arbitration Settlement: {dispute.resolutionType}
                </strong>
                <p className="text-emerald-800 dark:text-emerald-200">{dispute.resolutionNotes}</p>
              </div>
            )}
          </div>

          {/* Audit Trail Timeline */}
          {dispute.auditHistory?.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                Mediation Audit History ({dispute.auditHistory.length})
              </h4>
              <div className="space-y-2">
                {dispute.auditHistory.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-[11px]"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {step.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-400">
                        {new Date(step.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      <strong>Actor:</strong> {step.actor?.role} ({step.actor?.name || 'User'})
                    </p>
                    {step.note && (
                      <p className="text-slate-500 mt-0.5 italic">"{step.note}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raise Dispute Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Raise Formal Dispute"
      >
        <form onSubmit={handleCreateDispute} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason for Dispute</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="QUALITY_OF_WORK">Quality of Work (Defective or Substandard)</option>
              <option value="INCOMPLETE_WORK">Incomplete Work (Unfinished tasks)</option>
              <option value="BILLING_DISCREPANCY">Billing Discrepancy (Unapproved charges)</option>
              <option value="DAMAGE_CAUSED">Damage Caused to Property</option>
              <option value="UNPROFESSIONAL_CONDUCT">Unprofessional Conduct</option>
              <option value="OTHER">Other Reason</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Detailed Explanation *</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Explain the specific issue and what resolution you expect..."
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={actionLoading} type="submit" className="bg-rose-600 hover:bg-rose-700">
              Submit Dispute
            </Button>
          </div>
        </form>
      </Modal>

      {/* Provider Response Modal */}
      <Modal
        isOpen={respondModalOpen}
        onClose={() => setRespondModalOpen(false)}
        title="Submit Provider Response"
      >
        <form onSubmit={handleRespondDispute} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Formal Statement / Offer *</label>
            <textarea
              rows={4}
              value={providerMessage}
              onChange={(e) => setProviderMessage(e.target.value)}
              required
              placeholder="Explain actions you are willing to take (e.g. rework, clarification)..."
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRespondModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={actionLoading} type="submit">
              Submit Response
            </Button>
          </div>
        </form>
      </Modal>

      {/* Admin Resolve Modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Admin Arbitration & Resolution"
      >
        <form onSubmit={handleResolveDispute} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Final Status</label>
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="RESOLVED">RESOLVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Resolution Decision</label>
            <select
              value={resolutionType}
              onChange={(e) => setResolutionType(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="REWORK">REWORK (Provider must fix work at zero charge)</option>
              <option value="FULL_REFUND">FULL REFUND</option>
              <option value="PARTIAL_REFUND">PARTIAL REFUND</option>
              <option value="NO_ACTION">NO ACTION (Dispute dismissed)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Arbitration Notes *</label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              required
              placeholder="Provide binding justification for platform records..."
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={actionLoading} type="submit">
              Finalize Resolution
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};

export default DisputeCard;

import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import {
  getBookingWarranty,
  createWarranty,
  createWarrantyClaim,
  updateWarrantyClaimStatus
} from '../../services/api';

const WarrantyCard = ({ booking, isCustomer, isProvider, isAdmin }) => {
  const [warrantyData, setWarrantyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);

  // Form states
  const [durationDays, setDurationDays] = useState(30);
  const [terms, setTerms] = useState('Standard workmanship warranty covering repair defects.');
  const [claimDesc, setClaimDesc] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeClaimId, setActiveClaimId] = useState(null);
  const [resolveDetails, setResolveDetails] = useState('');
  const [selectedClaimStatus, setSelectedClaimStatus] = useState('RESOLVED');

  const fetchWarranty = async () => {
    if (!booking?._id) return;
    try {
      setLoading(true);
      const res = await getBookingWarranty(booking._id);
      setWarrantyData(res.data || null);
    } catch (err) {
      setWarrantyData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarranty();
  }, [booking?._id]);

  const handleAssignWarranty = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createWarranty({
        bookingId: booking._id,
        durationDays,
        terms
      });
      setAssignModalOpen(false);
      await fetchWarranty();
    } catch (err) {
      alert(err.message || 'Failed to assign warranty.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileClaim = async (e) => {
    e.preventDefault();
    if (!warrantyData?.warranty?._id) return;
    setActionLoading(true);
    try {
      await createWarrantyClaim(warrantyData.warranty._id, {
        description: claimDesc,
        evidenceFiles: evidenceUrl ? [evidenceUrl] : []
      });
      setClaimModalOpen(false);
      setClaimDesc('');
      setEvidenceUrl('');
      await fetchWarranty();
    } catch (err) {
      alert(err.message || 'Failed to file claim.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveClaim = async (e) => {
    e.preventDefault();
    if (!activeClaimId) return;
    setActionLoading(true);
    try {
      await updateWarrantyClaimStatus(activeClaimId, {
        status: selectedClaimStatus,
        resolutionDetails: resolveDetails
      });
      setResolveModalOpen(false);
      setResolveDetails('');
      await fetchWarranty();
    } catch (err) {
      alert(err.message || 'Failed to update claim status.');
    } finally {
      setActionLoading(false);
    }
  };

  const warranty = warrantyData?.warranty;
  const claims = warrantyData?.claims || [];

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🛡️</span> Service Warranty & Claims
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Post-service workmanship coverage and warranty claim settlement.
          </p>
        </div>

        {/* Action button in header */}
        {!warranty && (isProvider || isCustomer || isAdmin) && ['CUSTOMER_VERIFIED', 'CUSTOMER_CONFIRMED', 'WORK_COMPLETED', 'INVOICED', 'COMPLETED'].includes(booking?.status) && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setAssignModalOpen(true)}
          >
            + Activate Warranty
          </Button>
        )}

        {warranty && warranty.status === 'ACTIVE' && isCustomer && (
          <Button
            size="sm"
            variant="outline"
            className="text-amber-600 border-amber-300 hover:bg-amber-50"
            onClick={() => setClaimModalOpen(true)}
          >
            File Warranty Claim
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500">Checking warranty status...</div>
      ) : !warranty ? (
        <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 mt-4">
          <div className="text-3xl mb-1">🛡️</div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No warranty assigned yet.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Workmanship warranty coverage is activated upon verified service completion.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Warranty Summary Header */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Warranty Code</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {warranty.warrantyCode}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Warranty Period</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {warranty.warrantyPeriod || `${warranty.durationDays} Days`}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Start Date</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {new Date(warranty.startDate).toLocaleDateString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">End Date</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {new Date(warranty.endDate).toLocaleDateString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Service & Booking</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {warranty.serviceId?.name || booking.serviceId?.name || 'Service'} ({booking.bookingNumber})
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
              <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                warranty.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : warranty.status === 'CLAIMED'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {warranty.status}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Warranty Terms:</span>
            {warranty.terms}
          </div>

          {/* Claims History */}
          {claims.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Warranty Claims ({claims.length})
              </h4>
              <div className="space-y-2">
                {claims.map((claim) => (
                  <div
                    key={claim._id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {claim.claimNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(claim.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        claim.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : claim.status === 'SUBMITTED'
                          ? 'bg-blue-100 text-blue-800'
                          : claim.status === 'UNDER_REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {claim.status}
                      </span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Issue:</strong> {claim.description}
                    </p>

                    {claim.resolutionDetails && (
                      <div className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded text-[11px]">
                        <strong>Resolution:</strong> {claim.resolutionDetails}
                      </div>
                    )}

                    {(isProvider || isAdmin) && claim.status !== 'RESOLVED' && claim.status !== 'REJECTED' && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => {
                            setActiveClaimId(claim._id);
                            setResolveModalOpen(true);
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Update Claim / Resolve →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Warranty Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Service Warranty Terms"
      >
        <form onSubmit={handleAssignWarranty} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Warranty Duration</label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value={30}>30 Days (Standard)</option>
              <option value={60}>60 Days (Extended)</option>
              <option value={90}>90 Days (Quarterly)</option>
              <option value={180}>180 Days (Half Year)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Warranty Coverage Terms</label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              required
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={actionLoading} type="submit">
              Save Warranty
            </Button>
          </div>
        </form>
      </Modal>

      {/* File Warranty Claim Modal */}
      <Modal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        title="File Warranty Claim"
      >
        <form onSubmit={handleFileClaim} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Describe the Issue *</label>
            <textarea
              rows={3}
              value={claimDesc}
              onChange={(e) => setClaimDesc(e.target.value)}
              required
              placeholder="Explain the recurrence of problem or defective workmanship..."
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Evidence URL (Optional)</label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://... photo or video link"
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setClaimModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={actionLoading} type="submit">
              Submit Claim
            </Button>
          </div>
        </form>
      </Modal>

      {/* Resolve Claim Modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Update Warranty Claim Status"
      >
        <form onSubmit={handleResolveClaim} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Status</label>
            <select
              value={selectedClaimStatus}
              onChange={(e) => setSelectedClaimStatus(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Resolution Details / Notes</label>
            <textarea
              rows={3}
              value={resolveDetails}
              onChange={(e) => setResolveDetails(e.target.value)}
              placeholder="Detail actions taken or reason for decision..."
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={actionLoading} type="submit">
              Confirm Update
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};

export default WarrantyCard;

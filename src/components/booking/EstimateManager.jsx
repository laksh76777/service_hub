import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { createEstimate, getBookingEstimates, approveEstimate, rejectEstimate } from '../../services/api';

const ITEM_TYPES = [
  { value: 'LABOUR', label: 'Labour / Work' },
  { value: 'PART', label: 'Part / Component' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'OTHER', label: 'Other / Consumable' }
];

const EstimateManager = ({ bookingId, isCustomer, isProvider, isAdmin, onBookingUpdated }) => {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Estimate Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdditionalWork, setIsAdditionalWork] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { description: '', type: 'SERVICE', quantity: 1, unitPrice: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Rejection Modal
  const [rejectModal, setRejectModal] = useState({ isOpen: false, estimateId: null, reason: '' });
  const [rejecting, setRejecting] = useState(false);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const res = await getBookingEstimates(bookingId);
      setEstimates(res.estimates || []);
    } catch (err) {
      console.error('Failed to load estimates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchEstimates();
    }
  }, [bookingId]);

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      { description: '', type: 'PART', quantity: 1, unitPrice: '' }
    ]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Live preview calculation
  const subtotalPreview = items.reduce((sum, it) => {
    const qty = parseInt(it.quantity, 10) || 0;
    const rate = parseFloat(it.unitPrice) || 0;
    return sum + qty * rate;
  }, 0);
  const taxPreview = Math.round(subtotalPreview * 0.18 * 100) / 100;
  const totalPreview = Math.round((subtotalPreview + taxPreview) * 100) / 100;

  const handleCreateEstimate = async (e) => {
    e.preventDefault();

    const validItems = items
      .filter((it) => it.description.trim() && parseFloat(it.unitPrice) >= 0)
      .map((it) => ({
        description: it.description.trim(),
        type: it.type,
        quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
        unitPrice: Math.max(0, parseFloat(it.unitPrice) || 0)
      }));

    if (validItems.length === 0) {
      alert('Please add at least one line item with description and price.');
      return;
    }

    setSubmitting(true);
    try {
      await createEstimate(bookingId, {
        items: validItems,
        isAdditionalWork,
        notes: notes.trim()
      });
      alert(
        isAdditionalWork
          ? 'Additional work estimate submitted to customer.'
          : 'Job estimate submitted to customer.'
      );
      setIsModalOpen(false);
      setItems([{ description: '', type: 'SERVICE', quantity: 1, unitPrice: '' }]);
      setNotes('');
      setIsAdditionalWork(false);
      await fetchEstimates();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      alert(err.message || 'Failed to create estimate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (estimateId) => {
    if (!window.confirm('Approve this estimate and authorize the service scope?')) return;
    try {
      const res = await approveEstimate(estimateId);
      alert(res.message || 'Estimate approved successfully.');
      await fetchEstimates();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      alert(err.message || 'Failed to approve estimate.');
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      const res = await rejectEstimate(rejectModal.estimateId, {
        reason: rejectModal.reason.trim()
      });
      alert(res.message || 'Estimate rejected.');
      setRejectModal({ isOpen: false, estimateId: null, reason: '' });
      await fetchEstimates();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      alert(err.message || 'Failed to reject estimate.');
    } finally {
      setRejecting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            ✓ Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            ✕ Rejected
          </span>
        );
      case 'PENDING_CUSTOMER':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse">
            ⏳ Pending Customer Approval
          </span>
        );
      case 'SUPERSEDED':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            Superseded
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            {status}
          </span>
        );
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📋</span> Estimates & Scope Approvals
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Transparent price estimates with customer approval protection. Never billed without consent.
          </p>
        </div>
        {(isProvider || isAdmin) && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAdditionalWork(true);
                setIsModalOpen(true);
              }}
              className="text-xs border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50"
            >
              + Extra Work Estimate
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setIsAdditionalWork(false);
                setIsModalOpen(true);
              }}
              className="text-xs"
            >
              + Create Estimate
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading estimates...</div>
      ) : estimates.length === 0 ? (
        <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 mt-4">
          <div className="text-3xl mb-1">📝</div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No estimates created yet.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            The technician will prepare an estimate after diagnosing the service requirements.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {estimates.map((est) => (
            <div
              key={est._id}
              className={`p-4 rounded-xl border transition-all ${
                est.status === 'APPROVED'
                  ? 'border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/60 dark:bg-emerald-950/10'
                  : est.status === 'REJECTED'
                  ? 'border-rose-200 bg-rose-50/20 dark:border-rose-900/60 dark:bg-rose-950/10 opacity-75'
                  : est.status === 'PENDING_CUSTOMER'
                  ? 'border-amber-300 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10 shadow-sm'
                  : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-700/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                    {est.estimateNumber}
                  </span>
                  {est.isAdditionalWork && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white uppercase tracking-wider">
                      Additional Work (On-Site)
                    </span>
                  )}
                  {getStatusBadge(est.status)}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(est.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {/* Items Table */}
              <div className="py-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-1.5">Description</th>
                      <th className="pb-1.5 text-center">Type</th>
                      <th className="pb-1.5 text-center">Qty</th>
                      <th className="pb-1.5 text-right">Unit Rate</th>
                      <th className="pb-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                    {est.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 pr-2 font-medium">{it.description}</td>
                        <td className="py-1.5 px-2 text-center text-[10px] uppercase text-gray-400">
                          {it.type}
                        </td>
                        <td className="py-1.5 px-2 text-center">{it.quantity}</td>
                        <td className="py-1.5 px-2 text-right">₹{it.unitPrice}</td>
                        <td className="py-1.5 pl-2 text-right font-bold text-gray-900 dark:text-white">
                          ₹{it.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown & Notes */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                <div className="text-gray-500 dark:text-gray-400 max-w-sm">
                  {est.notes && <p className="italic">"{est.notes}"</p>}
                  {est.rejectionReason && (
                    <p className="text-rose-600 dark:text-rose-400 font-medium mt-1">
                      Rejection Reason: {est.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="text-right space-y-0.5 ml-auto">
                  <div className="text-gray-500">
                    Subtotal: <span className="font-semibold text-gray-800 dark:text-gray-200">₹{est.subtotal}</span>
                  </div>
                  <div className="text-gray-500">
                    GST (18%): <span className="font-semibold text-gray-800 dark:text-gray-200">₹{est.taxes || est.tax}</span>
                  </div>
                  <div className="text-sm font-black text-gray-900 dark:text-white pt-1">
                    Estimate Total: <span className="text-blue-600 dark:text-blue-400">₹{est.total}</span>
                  </div>
                </div>
              </div>

              {/* Customer Approval Actions */}
              {(isCustomer || isAdmin) && est.status === 'PENDING_CUSTOMER' && (
                <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() => setRejectModal({ isOpen: true, estimateId: est._id, reason: '' })}
                  >
                    Reject Estimate
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApprove(est._id)}
                  >
                    Approve Estimate
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Estimate Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={isAdditionalWork ? 'Create Additional Work Estimate' : 'Create Job Estimate'}
      >
        <form onSubmit={handleCreateEstimate} className="space-y-4">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <input
              type="checkbox"
              id="additionalWorkCb"
              checked={isAdditionalWork}
              onChange={(e) => setIsAdditionalWork(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="additionalWorkCb" className="text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
              Mark as Additional Work (Scope discovered during on-site visit)
            </label>
          </div>

          {/* Dynamic Item Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                Estimate Line Items
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 text-xs"
                >
                  <input
                    type="text"
                    required
                    placeholder="Description (e.g. Copper flare nut)"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="sm:col-span-5 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                  <select
                    value={item.type}
                    onChange={(e) => handleItemChange(idx, 'type', e.target.value)}
                    className="sm:col-span-3 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    {ITEM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="sm:col-span-1 px-1.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Rate (₹)"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    disabled={items.length === 1}
                    className="sm:col-span-1 text-red-500 hover:text-red-700 font-bold disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Scope / Diagnostic Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Found damaged capacitor needing replacement..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>

          {/* Pricing Preview Box */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/60 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{subtotalPreview}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300 mt-1">
              <span>Estimated GST (18%):</span>
              <span className="font-semibold">₹{taxPreview}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-2 border-t border-blue-200 dark:border-blue-800 mt-2">
              <span>Total Estimate:</span>
              <span className="text-blue-600 dark:text-blue-400">₹{totalPreview}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              {submitting ? 'Submitting...' : 'Send Estimate to Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, estimateId: null, reason: '' })}
        title="Reject Estimate"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Please provide an optional reason for rejecting this estimate so the technician can adjust the scope or clarify.
          </p>
          <textarea
            rows={3}
            value={rejectModal.reason}
            onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
            placeholder="e.g. Price too high, will repair later..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModal({ isOpen: false, estimateId: null, reason: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              loading={rejecting}
              onClick={handleReject}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default EstimateManager;

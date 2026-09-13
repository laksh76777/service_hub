import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { createEstimate, getBookingEstimates, approveEstimate, rejectEstimate } from '../../services/api';

const ITEM_TYPES = [
  { value: 'SERVICE', label: 'Service' },
  { value: 'PART', label: 'Part / Component' },
  { value: 'LABOUR', label: 'Labour / Work' },
  { value: 'OTHER', label: 'Other / Consumable' }
];

const EstimateManager = ({ bookingId, isCustomer, isProvider, isAdmin, onBookingUpdated, bookingInspectionNotes, serviceName }) => {
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

  // Rejection / Change Request Modal
  const [rejectModal, setRejectModal] = useState({ isOpen: false, estimateId: null, reason: '' });
  const [rejecting, setRejecting] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const res = await getBookingEstimates(bookingId);
      setEstimates(res.data?.estimates || res.estimates || []);
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

  // Authoritative server-side calculations mirrored in preview
  const subtotalPreview = items.reduce((sum, it) => {
    const qty = parseInt(it.quantity, 10);
    const rate = parseFloat(it.unitPrice);
    if (!isNaN(qty) && qty > 0 && !isNaN(rate) && rate >= 0) {
      return sum + Math.round(qty * rate * 100) / 100;
    }
    return sum;
  }, 0);
  const totalPreview = subtotalPreview;

  const handleCreateEstimate = async (e) => {
    e.preventDefault();

    // Strict validation before submit
    if (!items || items.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description || !item.description.trim()) {
        alert(`Item #${i + 1} is missing a description.`);
        return;
      }
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        alert(`Item #${i + 1} (${item.description}) must have a quantity greater than 0.`);
        return;
      }
      const price = parseFloat(item.unitPrice);
      if (isNaN(price) || price < 0) {
        alert(`Item #${i + 1} (${item.description}) cannot have a negative price.`);
        return;
      }
    }

    const payloadItems = items.map((it) => ({
      description: it.description.trim(),
      type: it.type,
      quantity: parseInt(it.quantity, 10),
      unitPrice: parseFloat(it.unitPrice)
    }));

    setSubmitting(true);
    try {
      await createEstimate(bookingId, {
        items: payloadItems,
        isAdditionalWork,
        notes: notes.trim(),
        inspectionNotes: bookingInspectionNotes || ''
      });
      alert(
        isAdditionalWork
          ? 'Additional work estimate submitted to customer.'
          : 'Service estimate submitted to customer.'
      );
      setIsModalOpen(false);
      setItems([{ description: '', type: 'SERVICE', quantity: 1, unitPrice: '' }]);
      setNotes('');
      setIsAdditionalWork(false);
      await fetchEstimates();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create estimate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (estimateId) => {
    if (!window.confirm('Approve this estimate for ₹' + (estimates.find(e => e._id === estimateId)?.total || '') + '? Booking will become ready for payment.')) return;
    setApprovingId(estimateId);
    try {
      const res = await approveEstimate(estimateId);
      alert(res.data?.message || res.message || 'Estimate approved successfully.');
      await fetchEstimates();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to approve estimate.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      const res = await rejectEstimate(rejectModal.estimateId, {
        reason: rejectModal.reason.trim()
      });
      alert(res.data?.message || res.message || 'Estimate revision requested.');
      setRejectModal({ isOpen: false, estimateId: null, reason: '' });
      await fetchEstimates();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to request changes on estimate.');
    } finally {
      setRejecting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
            ✓ Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800">
            ✕ Changes Requested
          </span>
        );
      case 'PENDING_CUSTOMER':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 animate-pulse">
            ⏳ Awaiting Customer Approval
          </span>
        );
      case 'SUPERSEDED':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-gray-100 text-gray-600">
            Superseded
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
            {status}
          </span>
        );
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>📋</span> Service Estimate
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Transparent line-item breakdown calculated in Indian Rupees (₹). Authoritative customer approval required before billing.
          </p>
        </div>
        {(isProvider || isAdmin) && (
          <div className="flex items-center gap-2">
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
        <div className="py-8 text-center text-sm text-gray-500">Loading estimate details...</div>
      ) : estimates.length === 0 ? (
        <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-4">
          <div className="text-3xl mb-1">📝</div>
          <p className="text-sm font-medium text-gray-700">
            No estimate created yet.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            The technician will diagnose the issue on-site and create a line-item estimate for customer review.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {estimates.map((est) => (
            <div
              key={est._id}
              className={`p-4 rounded-xl border transition-all ${
                est.status === 'APPROVED'
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : est.status === 'REJECTED'
                  ? 'border-rose-200 bg-rose-50/20 opacity-80'
                  : est.status === 'PENDING_CUSTOMER'
                  ? 'border-amber-300 bg-amber-50/40 shadow-xs'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-gray-900">
                    {est.estimateNumber}
                  </span>
                  {est.isAdditionalWork && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white uppercase tracking-wider">
                      Additional Work
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
                    <tr className="text-[10px] uppercase text-gray-400 font-bold border-b border-gray-100">
                      <th className="pb-1.5">Description</th>
                      <th className="pb-1.5 text-center">Type</th>
                      <th className="pb-1.5 text-center">Qty</th>
                      <th className="pb-1.5 text-right">Unit Price</th>
                      <th className="pb-1.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {est.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-2 font-medium text-slate-800">{it.description}</td>
                        <td className="py-2 px-2 text-center text-[10px] uppercase text-gray-400">
                          {it.type}
                        </td>
                        <td className="py-2 px-2 text-center font-semibold">{it.quantity}</td>
                        <td className="py-2 px-2 text-right">₹{it.unitPrice?.toLocaleString('en-IN')}</td>
                        <td className="py-2 pl-2 text-right font-bold text-gray-900">
                          ₹{(it.amount || it.subtotal || it.quantity * it.unitPrice)?.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown & Notes */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-gray-100 text-xs">
                <div className="text-gray-500 max-w-sm">
                  {est.inspectionSummary && (
                    <p className="text-slate-600 mb-1">
                      <span className="font-semibold text-slate-700">Inspection:</span> {est.inspectionSummary}
                    </p>
                  )}
                  {est.notes && <p className="italic">"{est.notes}"</p>}
                  {est.rejectionReason && (
                    <p className="text-rose-600 font-medium mt-1">
                      Customer Feedback: {est.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="text-right space-y-0.5 ml-auto">
                  <div className="text-gray-500">
                    Subtotal: <span className="font-semibold text-gray-800">₹{est.subtotal?.toLocaleString('en-IN')}</span>
                  </div>
                  {(est.taxes > 0 || est.tax > 0) && (
                    <div className="text-gray-500">
                      Taxes: <span className="font-semibold text-gray-800">₹{(est.taxes || est.tax)?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {est.discount > 0 && (
                    <div className="text-emerald-600">
                      Discount: <span className="font-semibold">-₹{est.discount?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="text-base font-black text-slate-900 pt-1 border-t border-gray-100">
                    Total: <span className="text-blue-600">₹{est.total?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Customer Approval Actions */}
              {(isCustomer || isAdmin) && est.status === 'PENDING_CUSTOMER' && (
                <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-200">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                    disabled={approvingId === est._id}
                    onClick={() => setRejectModal({ isOpen: true, estimateId: est._id, reason: '' })}
                  >
                    Request Changes
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={approvingId === est._id}
                    onClick={() => handleApprove(est._id)}
                  >
                    {approvingId === est._id ? 'Approving...' : 'Approve Estimate'}
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
        title={isAdditionalWork ? 'Create Additional Work Estimate' : 'Create Service Estimate'}
      >
        <form onSubmit={handleCreateEstimate} className="space-y-4">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
            <input
              type="checkbox"
              id="additionalWorkCb"
              checked={isAdditionalWork}
              onChange={(e) => setIsAdditionalWork(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="additionalWorkCb" className="text-xs font-semibold text-gray-800 cursor-pointer">
              Mark as Additional Work (Scope discovered during on-site visit)
            </label>
          </div>

          {/* Dynamic Item Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Estimate Line Items *
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                + Add Line Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs"
                >
                  <input
                    type="text"
                    required
                    placeholder="Description (e.g. AC Servicing, Capacitor replacement)"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="sm:col-span-5 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={item.type}
                    onChange={(e) => handleItemChange(idx, 'type', e.target.value)}
                    className="sm:col-span-3 px-2 py-1.5 rounded-lg border border-gray-300 bg-white"
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
                    className="sm:col-span-1 px-1.5 py-1.5 rounded-lg border border-gray-300 bg-white text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="Price (₹)"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-right"
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Technician Estimate Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Capacitor weak, includes replacement and filter cleaning..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white"
            />
          </div>

          {/* Pricing Preview Box */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{subtotalPreview.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-blue-200 mt-2">
              <span>Authoritative Total (₹):</span>
              <span className="text-blue-600">₹{totalPreview.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Estimate'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rejection / Request Changes Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => !rejecting && setRejectModal({ isOpen: false, estimateId: null, reason: '' })}
        title="Request Changes to Estimate"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Please share what changes or clarifications you require. The technician will receive this message and submit a revised estimate.
          </p>
          <textarea
            rows={3}
            value={rejectModal.reason}
            onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
            placeholder="e.g. Please clarify the service charge or check if part can be repaired..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={rejecting}
              onClick={() => setRejectModal({ isOpen: false, estimateId: null, reason: '' })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={rejecting}
              disabled={rejecting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleReject}
            >
              {rejecting ? 'Sending...' : 'Send Request to Technician'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default EstimateManager;

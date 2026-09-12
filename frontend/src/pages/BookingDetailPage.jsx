import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBookingById, updateBookingStatus, rescheduleBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';
import BookingTimeline from '../components/booking/BookingTimeline';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

const BookingDetailPage = () => {
  const { id } = useParams();
  const { mongoUser } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  // Action modal states
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    targetStatus: '',
    title: '',
    prompt: '',
    requireReason: false,
    reasonPlaceholder: ''
  });
  const [reasonInput, setReasonInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Reschedule modal states
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('Morning (09:00 - 12:00)');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const res = await getBookingById(id);
      setBooking(res.data.booking);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load booking.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const isCustomer =
    booking?.customerId?._id?.toString() === mongoUser?._id?.toString() ||
    mongoUser?.role === 'CUSTOMER';
  const isProvider =
    booking?.providerId?._id?.toString() === mongoUser?._id?.toString() ||
    mongoUser?.role === 'PROVIDER';
  const isAdmin = mongoUser?.role === 'ADMIN';

  const handleOpenAction = (targetStatus, title, prompt, requireReason = false, reasonPlaceholder = '') => {
    setActionModal({
      isOpen: true,
      targetStatus,
      title,
      prompt,
      requireReason,
      reasonPlaceholder
    });
    setReasonInput('');
  };

  const handleExecuteStatusTransition = async () => {
    if (actionModal.requireReason && !reasonInput.trim()) {
      alert('Please provide a reason to continue.');
      return;
    }

    setActionLoading(true);
    setActionNotice('');
    try {
      const res = await updateBookingStatus(id, {
        status: actionModal.targetStatus,
        reason: reasonInput.trim()
      });
      setBooking(res.data.booking);
      setActionNotice(res.data.message || `Status updated to ${actionModal.targetStatus}`);
      setActionModal({ isOpen: false, targetStatus: '', title: '', prompt: '', requireReason: false, reasonPlaceholder: '' });
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Transition rejected by state machine.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteReschedule = async (e) => {
    e.preventDefault();
    if (!newDate) {
      alert('Please pick a date.');
      return;
    }

    setRescheduleLoading(true);
    try {
      const res = await rescheduleBooking(id, {
        newScheduledDate: newDate,
        newTimeSlot,
        reason: rescheduleReason
      });
      setBooking(res.data.booking);
      setActionNotice('Booking successfully rescheduled.');
      setIsRescheduleOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Reschedule failed.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-600">Loading booking record...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
          <h2 className="text-lg font-bold text-red-800">Booking Access Error</h2>
          <p className="text-xs text-red-600 mt-2">{error || 'Booking not found.'}</p>
          <div className="mt-4">
            <Link to="/dashboard">
              <Button size="sm" variant="primary">Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (st) => {
    switch (st) {
      case 'REQUESTED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ACCEPTED':
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'TECHNICIAN_ARRIVED':
      case 'IN_PROGRESS':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'COMPLETION_PENDING':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'CUSTOMER_VERIFIED':
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CANCELLED_BY_CUSTOMER':
      case 'CANCELLED_BY_PROVIDER':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'DISPUTED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb navigation */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/dashboard" className="hover:text-blue-600">Dashboard</Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">{booking.bookingNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-xs font-black uppercase rounded-full border ${getStatusColor(booking.status)}`}>
            {booking.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {actionNotice && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>✓ {actionNotice}</span>
          <button onClick={() => setActionNotice('')} className="text-emerald-600 hover:text-emerald-900">×</button>
        </div>
      )}

      {/* Main Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Service Request Order</span>
          <h1 className="text-2xl font-black text-slate-900 mt-0.5">
            {booking.serviceId?.name || 'Service Appointment'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Order Reference: <span className="font-mono font-bold text-slate-700">{booking.bookingNumber}</span> | Created on {new Date(booking.createdAt).toLocaleDateString('en-IN')}
          </p>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Provider specific actions */}
          {(isProvider || isAdmin) && (
            <>
              {booking.status === 'REQUESTED' && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenAction('ACCEPTED', 'Accept Service Request', 'Are you ready to accept this customer job and proceed to scheduling?')}
                  >
                    Accept Request
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => handleOpenAction('CANCELLED_BY_PROVIDER', 'Decline Request', 'Provide a brief reason for declining this request:', true, 'e.g. Fully booked on requested date, outside immediate zone')}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setNewDate(new Date(booking.scheduledDate).toISOString().split('T')[0]);
                      setIsRescheduleOpen(true);
                    }}
                  >
                    Propose Different Time
                  </Button>
                </>
              )}

              {booking.status === 'ACCEPTED' && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenAction('SCHEDULED', 'Confirm Schedule', 'Confirm this appointment time slot with the customer?')}
                  >
                    Confirm Schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewDate(new Date(booking.scheduledDate).toISOString().split('T')[0]);
                      setIsRescheduleOpen(true);
                    }}
                  >
                    Reschedule
                  </Button>
                </>
              )}

              {booking.status === 'SCHEDULED' && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenAction('TECHNICIAN_ARRIVED', 'Mark Arrived on Site', 'Check in to notify the customer that technician has arrived at the property?')}
                  >
                    Check In (Arrived)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewDate(new Date(booking.scheduledDate).toISOString().split('T')[0]);
                      setIsRescheduleOpen(true);
                    }}
                  >
                    Reschedule
                  </Button>
                </>
              )}

              {booking.status === 'TECHNICIAN_ARRIVED' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleOpenAction('IN_PROGRESS', 'Start Work', 'Commence work on this service order?')}
                >
                  Start Work (In Progress)
                </Button>
              )}

              {booking.status === 'IN_PROGRESS' && (
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleOpenAction('COMPLETION_PENDING', 'Submit for Customer Verification', 'Have you completed the job scope and are ready for customer inspection/sign-off?')}
                >
                  Submit for Customer Sign-off
                </Button>
              )}
            </>
          )}

          {/* Customer specific actions */}
          {(isCustomer || isAdmin) && (
            <>
              {['REQUESTED', 'ACCEPTED', 'SCHEDULED'].includes(booking.status) && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => handleOpenAction('CANCELLED_BY_CUSTOMER', 'Cancel Service Booking', 'Please let us know why you wish to cancel:', true, 'e.g. Problem already resolved, scheduling conflict')}
                  >
                    Cancel Booking
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setNewDate(new Date(booking.scheduledDate).toISOString().split('T')[0]);
                      setIsRescheduleOpen(true);
                    }}
                  >
                    Request Reschedule
                  </Button>
                </>
              )}

              {booking.status === 'COMPLETION_PENDING' && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleOpenAction('CUSTOMER_VERIFIED', 'Verify & Approve Work', 'Verify that the technician completed the service satisfactorily to your standards?')}
                  >
                    Verify & Approve Work
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() => handleOpenAction('DISPUTED', 'Report Dispute / Quality Issue', 'Please describe the problem with the completed work:', true, 'e.g. Leak persists, cleanup incomplete')}
                  >
                    Report Issue / Dispute
                  </Button>
                </>
              )}

              {booking.status === 'CUSTOMER_VERIFIED' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleOpenAction('COMPLETED', 'Finalize Service Order', 'Complete and finalize this booking record?')}
                >
                  Finalize (Completed)
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Interactive Timeline */}
      <div className="mb-6">
        <BookingTimeline currentStatus={booking.status} statusHistory={booking.statusHistory || []} />
      </div>

      {/* Detail Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Service & Location */}
        <div className="md:col-span-2 space-y-6">
          <Card title="Job Details & Scope of Work">
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase block mb-1">Problem Description</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-sm whitespace-pre-wrap">
                  {booking.problemDescription}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Scheduled Date</span>
                  <span className="text-sm font-bold text-slate-800">
                    {new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block">Time Slot</span>
                  <span className="text-sm font-bold text-slate-800">
                    {booking.preferredTimeSlot || 'Standard Working Hours'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-bold uppercase block mb-1">Job Site Address</span>
                <p className="text-sm font-semibold text-slate-800">
                  {booking.address?.addressLine1 || booking.address?.streetAddress}
                  {booking.address?.addressLine2 || booking.address?.unit ? `, ${booking.address.addressLine2 || booking.address.unit}` : ''}
                </p>
                {booking.address?.locality && (
                  <p className="text-slate-600 font-medium">Area / Locality: {booking.address.locality}</p>
                )}
                {booking.address?.landmark && (
                  <p className="text-slate-500 text-xs">Landmark: {booking.address.landmark}</p>
                )}
                <p className="text-slate-600">
                  {booking.address?.city}, {booking.address?.state} - {booking.address?.pincode || booking.address?.zipCode}
                </p>
              </div>
            </div>
          </Card>

          {/* Reschedule history log if any */}
          {booking.rescheduleHistory?.length > 0 && (
            <Card title="Reschedule History">
              <div className="space-y-2 text-xs">
                {booking.rescheduleHistory.map((r, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="font-bold text-slate-800">
                      Rescheduled to {new Date(r.newDate).toLocaleDateString('en-IN')} ({r.newTimeSlot})
                    </span>
                    <p className="text-slate-500 mt-0.5">
                      Updated by {r.role} on {new Date(r.timestamp).toLocaleDateString('en-IN')}
                      {r.reason ? ` — Note: "${r.reason}"` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right 1 Col: Parties Involved & Pricing */}
        <div className="space-y-6">
          <Card title="Assigned Contractor">
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-900 text-sm">
                {booking.providerId?.name || 'Verified Provider'}
              </div>
              <p className="text-slate-500">{booking.providerId?.email}</p>
              {booking.providerId?.phone && (
                <p className="text-slate-600 font-medium">📞 {booking.providerId.phone}</p>
              )}
              <div className="pt-2">
                <Link to={`/providers/${booking.providerId?._id}`}>
                  <span className="text-xs text-blue-600 font-bold hover:underline">
                    View Public Profile →
                  </span>
                </Link>
              </div>
            </div>
          </Card>

          <Card title="Customer">
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-900 text-sm">
                {booking.customerId?.name || 'Customer'}
              </div>
              <p className="text-slate-500">{booking.customerId?.email}</p>
              {booking.customerId?.phone && (
                <p className="text-slate-600 font-medium">📞 {booking.customerId.phone}</p>
              )}
            </div>
          </Card>

          <Card title="Estimated Pricing">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Service Base / Estimate:</span>
                <span className="text-base font-black text-slate-900">
                  ₹{booking.pricing?.estimatedTotal || 0}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Final total and invoices are generated upon customer work sign-off. Payments will be implemented in the next phase.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Action Transition Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        title={actionModal.title}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => setActionModal({ ...actionModal, isOpen: false })}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteStatusTransition}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Confirm Action'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">{actionModal.prompt}</p>
          {actionModal.requireReason && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reason / Explanation *
              </label>
              <textarea
                rows={3}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder={actionModal.reasonPlaceholder || 'Provide details...'}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        title="Reschedule Service Appointment"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExecuteReschedule} disabled={rescheduleLoading}>
              {rescheduleLoading ? 'Updating...' : 'Save New Schedule'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleExecuteReschedule} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Date *</label>
            <input
              type="date"
              value={newDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Time Slot</label>
            <select
              value={newTimeSlot}
              onChange={(e) => setNewTimeSlot(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Morning (09:00 - 12:00)">Morning (09:00 - 12:00)</option>
              <option value="Afternoon (12:00 - 16:00)">Afternoon (12:00 - 16:00)</option>
              <option value="Evening (16:00 - 19:00)">Evening (16:00 - 19:00)</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason for Rescheduling</label>
            <input
              type="text"
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="e.g. Customer requested morning window, weather delay"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BookingDetailPage;

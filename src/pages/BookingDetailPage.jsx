import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBookingById, updateBookingStatus, rescheduleBooking, startInspection, saveInspection } from '../services/api';
import { useAuth } from '../context/AuthContext';
import BookingTimeline from '../components/booking/BookingTimeline';
import JobExecutionCard from '../components/booking/JobExecutionCard';
import WorkEvidenceGallery from '../components/booking/WorkEvidenceGallery';
import EstimateManager from '../components/booking/EstimateManager';
import InvoiceCard from '../components/booking/InvoiceCard';
import PaymentHistoryCard from '../components/booking/PaymentHistoryCard';
import WarrantyCard from '../components/booking/WarrantyCard';
import DisputeCard from '../components/booking/DisputeCard';
import ReviewCard from '../components/booking/ReviewCard';
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

  // Phase 5 Inspection Form States
  const [inspectionForm, setInspectionForm] = useState({
    observedIssue: '',
    inspectionNotes: '',
    requiredWork: '',
    partsRequired: '',
    additionalNotes: ''
  });
  const [savingInspection, setSavingInspection] = useState(false);
  const [startingInspection, setStartingInspection] = useState(false);

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

  useEffect(() => {
    if (booking) {
      setInspectionForm({
        observedIssue: booking.inspection?.observedIssue || booking.jobExecution?.observedIssue || booking.jobExecution?.problemIdentified || '',
        inspectionNotes: booking.inspection?.inspectionNotes || booking.jobExecution?.inspectionNotes || '',
        requiredWork: booking.inspection?.requiredWork || booking.jobExecution?.requiredWork || '',
        partsRequired: booking.inspection?.partsRequired || booking.jobExecution?.partsRequired || '',
        additionalNotes: booking.inspection?.additionalNotes || booking.jobExecution?.additionalNotes || ''
      });
    }
  }, [booking]);

  const handleStartInspection = async () => {
    setStartingInspection(true);
    try {
      const res = await startInspection(id);
      setBooking(res.data.booking);
      setActionNotice('Diagnostic inspection started. Record your findings below.');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to start inspection.');
    } finally {
      setStartingInspection(false);
    }
  };

  const handleSaveInspection = async (e) => {
    e?.preventDefault();
    setSavingInspection(true);
    try {
      const res = await saveInspection(id, inspectionForm);
      setBooking(res.data.booking);
      setActionNotice('Inspection findings recorded successfully.');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to save inspection findings.');
    } finally {
      setSavingInspection(false);
    }
  };

  const isCustomer =
    booking?.customerId?._id?.toString() === mongoUser?._id?.toString() ||
    booking?.customerId?.toString() === mongoUser?._id?.toString();
  const isTechnician =
    booking?.technicianId?._id?.toString() === mongoUser?._id?.toString() ||
    booking?.providerId?._id?.toString() === mongoUser?._id?.toString() ||
    booking?.technicianId?.toString() === mongoUser?._id?.toString() ||
    booking?.providerId?.toString() === mongoUser?._id?.toString();
  const isProvider = isTechnician;
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
            <Link to={mongoUser?.role === 'TECHNICIAN' || mongoUser?.role === 'PROVIDER' ? "/technician/dashboard" : mongoUser?.role === 'ADMIN' ? "/admin/dashboard" : "/customer/dashboard"}>
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
      case 'INSPECTION':
      case 'ESTIMATE_PENDING':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'ESTIMATE_SUBMITTED':
      case 'ESTIMATE_APPROVED':
        return 'bg-violet-100 text-violet-800 border-violet-300';
      case 'PAYMENT_PENDING':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'PAYMENT_SUCCESS':
      case 'WORK_IN_PROGRESS':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'WORK_COMPLETED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'CUSTOMER_CONFIRMED':
      case 'INVOICED':
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'REJECTED':
      case 'CANCELLED':
      case 'CANCELLED_BY_CUSTOMER':
      case 'CANCELLED_BY_PROVIDER':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const renderStateBannerAndActions = () => {
    const techName = booking.technicianId?.name || booking.providerId?.name || 'Assigned Technician';
    const amount = booking.pricing?.finalTotal || booking.pricing?.estimatedTotal || 0;

    switch (booking.status) {
      case 'REQUESTED':
        return (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div>
              <div className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <span>⏳</span> Waiting for technician response
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                {isCustomer
                  ? `Your request was sent directly to ${techName}. You will be notified once they accept.`
                  : `Customer ${booking.customerId?.name || ''} requested service. Please review and respond.`}
              </p>
            </div>
            <div className="flex gap-2">
              {(isTechnician || isAdmin) && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => handleOpenAction('REJECTED', 'Reject Service Request', 'Please provide a mandatory reason for declining this request:', true, 'e.g. Fully booked, outside service area')}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenAction('ACCEPTED', 'Accept Service Request', `Accept this service request and unlock customer full address?`)}
                  >
                    Accept
                  </Button>
                </>
              )}
              {isCustomer && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => handleOpenAction('CANCELLED', 'Cancel Request', 'Please state reason for cancellation:', true)}
                >
                  Cancel Request
                </Button>
              )}
            </div>
          </div>
        );

      case 'ACCEPTED':
        return (
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div>
              <div className="text-sm font-bold text-blue-900 flex items-center gap-2">
                <span>✓</span> Technician accepted your request
              </div>
              <p className="text-xs text-blue-700 mt-0.5">
                {isCustomer
                  ? `${techName} accepted your request. Full service location unlocked for on-site visit.`
                  : `You accepted this booking. Full customer location is unlocked. Start diagnostic inspection when ready.`}
              </p>
            </div>
            <div className="flex gap-2">
              {isTechnician && (
                <Button
                  size="sm"
                  variant="primary"
                  loading={startingInspection}
                  disabled={startingInspection}
                  onClick={handleStartInspection}
                >
                  {startingInspection ? 'Starting...' : 'Start Inspection'}
                </Button>
              )}
            </div>
          </div>
        );

      case 'REJECTED':
        return (
          <div className="p-5 rounded-2xl bg-red-50 border border-red-200 mb-6 shadow-sm">
            <div className="text-sm font-bold text-red-900 flex items-center gap-2">
              <span>✕</span> Request Declined by Technician
            </div>
            <p className="text-xs text-red-700 mt-1">
              Reason provided: <span className="font-semibold italic">"{booking.rejectionReason || 'Technician unavailable at requested slot'}"</span>
            </p>
            {isCustomer && (
              <div className="mt-3">
                <Link to="/services">
                  <Button size="sm" variant="primary">
                    Find Another Technician &rarr;
                  </Button>
                </Link>
              </div>
            )}
          </div>
        );

      case 'SCHEDULED':
        return (
          <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div>
              <div className="text-sm font-bold text-indigo-900">
                📅 Appointment Confirmed
              </div>
              <p className="text-xs text-indigo-700 mt-0.5">
                Scheduled for {new Date(booking.scheduledDate).toLocaleDateString('en-IN')} ({booking.preferredTimeSlot || 'Standard hours'}).
              </p>
            </div>
            {isTechnician && (
              <Button
                size="sm"
                variant="primary"
                loading={startingInspection}
                disabled={startingInspection}
                onClick={handleStartInspection}
              >
                {startingInspection ? 'Starting...' : 'Start Inspection'}
              </Button>
            )}
          </div>
        );

      case 'INSPECTION':
        return (
          <div className="p-5 rounded-2xl bg-cyan-50 border border-cyan-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div>
              <div className="text-sm font-bold text-cyan-900 flex items-center gap-2">
                <span>🔍</span> Technician is inspecting the service
              </div>
              <p className="text-xs text-cyan-700 mt-0.5">
                {isCustomer
                  ? `${techName} is conducting on-site diagnostic inspection.`
                  : 'Diagnostic inspection underway. Record findings below and create an estimate.'}
              </p>
            </div>
            {isTechnician && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  const estElem = document.getElementById('estimate-manager-section');
                  if (estElem) estElem.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Create Estimate &darr;
              </Button>
            )}
          </div>
        );

      case 'ESTIMATE_PENDING':
        return (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div>
              <div className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <span>📝</span> Estimate Pending / Changes Requested
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                {isCustomer
                  ? 'Technician is revising scope and pricing per your requested changes.'
                  : 'Customer requested changes or estimate is pending. Create and submit revised estimate below.'}
              </p>
            </div>
            {isTechnician && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  const estElem = document.getElementById('estimate-manager-section');
                  if (estElem) estElem.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Submit Revised Estimate &darr;
              </Button>
            )}
          </div>
        );

      case 'ESTIMATE_SUBMITTED':
        return (
          <div className="p-5 rounded-2xl bg-violet-50 border border-violet-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div>
              <div className="text-sm font-bold text-violet-900 flex items-center gap-2">
                <span>📋</span> Estimate Available
              </div>
              <p className="text-xs text-violet-700 mt-0.5">
                {isCustomer
                  ? `${techName} submitted an estimate. Please review line items and approve or request changes below.`
                  : 'Estimate submitted to customer. Waiting for customer approval.'}
              </p>
            </div>
            {isCustomer && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  const estElem = document.getElementById('estimate-manager-section');
                  if (estElem) estElem.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Review Estimate &darr;
              </Button>
            )}
          </div>
        );

      case 'ESTIMATE_APPROVED':
      case 'PAYMENT_PENDING':
        return (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div>
              <div className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <span>💳</span> Payment Required
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Approved estimate total: <span className="font-extrabold text-sm text-slate-900">₹{amount}</span>. Please complete payment to authorize service execution.
              </p>
            </div>
            {isCustomer && (
              <Link to={`/customer/bookings/${booking._id}/payment`}>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold whitespace-nowrap shadow-sm shadow-emerald-600/20"
                >
                  Proceed to Payment &rarr;
                </Button>
              </Link>
            )}
          </div>
        );

      case 'PAYMENT_SUCCESS':
        return (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div>
              <div className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span className="text-emerald-600 font-bold text-base">✓</span> Payment Successful
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Payment verified in DEMO mode. Service authorized. Amount: <span className="font-bold text-slate-900">₹{amount}</span>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200">
                Demo Settled
              </div>
              {(isTechnician || isAdmin) && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleOpenAction('WORK_IN_PROGRESS', 'Start Work', 'Commence work on this service order?')}
                >
                  Start Work (In Progress)
                </Button>
              )}
            </div>
          </div>
        );

      case 'WORK_IN_PROGRESS':
        return (
          <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div>
              <div className="text-sm font-bold text-indigo-900">
                ⚡ Work in Progress
              </div>
              <p className="text-xs text-indigo-700 mt-0.5">
                {isCustomer
                  ? 'Technician is actively working on your repair.'
                  : 'Perform service work. Click below once complete.'}
              </p>
            </div>
            {(isTechnician || isAdmin) && (
              <Button
                size="sm"
                variant="primary"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => handleOpenAction('WORK_COMPLETED', 'Submit Work Completed', 'Have you finished all work scope?')}
              >
                Mark Work Completed
              </Button>
            )}
          </div>
        );

      case 'WORK_COMPLETED':
        return (
          <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div>
              <div className="text-sm font-bold text-purple-900">
                🏁 Work Completed
              </div>
              <p className="text-xs text-purple-700 mt-0.5">
                {isCustomer
                  ? 'Technician completed the repair. Please inspect and confirm.'
                  : 'Work submitted. Awaiting customer confirmation.'}
              </p>
            </div>
            {isCustomer && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleOpenAction('CUSTOMER_CONFIRMED', 'Confirm Completion', 'Confirm that service was completed to your satisfaction?')}
                >
                  Confirm Completion
                </Button>
              </div>
            )}
          </div>
        );

      case 'CUSTOMER_CONFIRMED':
        return (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div>
              <div className="text-sm font-bold text-emerald-900">
                ✓ Customer Confirmed Completion
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Work confirmed! Generate final invoice.
              </p>
            </div>
            {(isTechnician || isAdmin) && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleOpenAction('INVOICED', 'Generate Final Invoice', 'Generate formal tax invoice and activate customer warranty?')}
              >
                Generate Final Invoice
              </Button>
            )}
          </div>
        );

      case 'INVOICED':
      case 'COMPLETED':
        return (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 mb-6 shadow-sm">
            <div className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <span>🎉</span> Service Invoiced & Completed
            </div>
            <p className="text-xs text-emerald-700 mt-0.5">
              Official invoice and 30-day service warranty protection are active below.
            </p>
          </div>
        );

      case 'CANCELLED':
        return (
          <div className="p-5 rounded-2xl bg-slate-100 border border-slate-300 text-slate-700 mb-6 shadow-sm">
            <div className="text-sm font-bold">Booking Cancelled</div>
            <p className="text-xs text-slate-500 mt-0.5">This service booking was cancelled.</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb navigation */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to={isTechnician ? "/technician/dashboard" : isAdmin ? "/admin/dashboard" : "/customer/dashboard"} className="hover:text-blue-600">Dashboard</Link>
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

      {/* Main Top Header: Service, Technician, Current Status */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Service Booking</span>
            <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${getStatusColor(booking.status)}`}>
              {booking.status.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {booking.serviceId?.name || 'Service Appointment'}
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Assigned Technician: <span className="font-bold text-slate-900">{booking.technicianId?.name || booking.providerId?.name || 'Verified Pro'}</span>
            <span className="text-slate-300 mx-2">|</span>
            Order Reference: <span className="font-mono font-bold text-slate-700">{booking.bookingNumber}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Reschedule button allowed during early stages */}
          {['REQUESTED', 'ACCEPTED', 'SCHEDULED'].includes(booking.status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNewDate(new Date(booking.scheduledDate).toISOString().split('T')[0]);
                setIsRescheduleOpen(true);
              }}
            >
              Reschedule Date/Time
            </Button>
          )}
        </div>
      </div>

      {/* State-Driven Status & Action Banner */}
      {renderStateBannerAndActions()}

      {/* Interactive Timeline */}
      <div className="mb-6">
        <BookingTimeline currentStatus={booking.status} statusHistory={booking.statusHistory || []} />
      </div>

      {/* Phase 6: Job Execution & Customer/Technician OTP Verification */}
      <div className="mb-6">
        <JobExecutionCard
          booking={booking}
          isCustomer={isCustomer}
          isProvider={isProvider}
          isAdmin={isAdmin}
          onBookingUpdated={(updated) => setBooking(updated)}
        />
      </div>

      {/* Detail Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Service & Location & GridFS Work Evidence */}
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

          {/* Phase 5: Diagnostic Inspection & Findings */}
          <Card title="Diagnostic Inspection & Findings">
            <div className="space-y-4 text-xs">
              {/* Customer Problem Description - Immutable & clearly distinct */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 font-bold uppercase block text-[10px] mb-1 tracking-wider">
                  Customer's Problem Description (Original — Unchanged)
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  "{booking.problemDescription}"
                </p>
              </div>

              {/* Technician Diagnostic Form (Active for assigned technician in ACCEPTED or INSPECTION) */}
              {isTechnician && ['ACCEPTED', 'INSPECTION', 'ESTIMATE_PENDING'].includes(booking.status) && (
                <div className="p-4 bg-cyan-50/60 border border-cyan-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-950 uppercase tracking-wide">
                      🔍 Technician Inspection Form
                    </span>
                    {booking.status === 'ACCEPTED' && (
                      <Button
                        size="xs"
                        variant="primary"
                        loading={startingInspection}
                        disabled={startingInspection}
                        onClick={handleStartInspection}
                      >
                        Start Inspection First
                      </Button>
                    )}
                  </div>

                  <form onSubmit={handleSaveInspection} className="space-y-3 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Observed Issue *
                      </label>
                      <input
                        type="text"
                        required
                        value={inspectionForm.observedIssue}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, observedIssue: e.target.value })}
                        placeholder="e.g. Outdoor unit capacitor is weak."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Inspection Notes *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={inspectionForm.inspectionNotes}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionNotes: e.target.value })}
                        placeholder="e.g. AC runs normally but cooling performance is poor."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Required Work *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={inspectionForm.requiredWork}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, requiredWork: e.target.value })}
                        placeholder="e.g. Replace capacitor and clean filters."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Parts Required
                        </label>
                        <input
                          type="text"
                          value={inspectionForm.partsRequired}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, partsRequired: e.target.value })}
                          placeholder="e.g. 1 × AC capacitor"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Additional Notes
                        </label>
                        <input
                          type="text"
                          value={inspectionForm.additionalNotes}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, additionalNotes: e.target.value })}
                          placeholder="e.g. Unit should be tested after replacement."
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        size="sm"
                        variant="primary"
                        loading={savingInspection}
                        disabled={savingInspection}
                      >
                        {savingInspection ? 'Saving...' : 'Save Inspection Findings'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Recorded Diagnostic Findings (Visible to Customer, Technician & Admin) */}
              {(booking.inspection?.observedIssue || booking.inspection?.inspectionNotes || booking.jobExecution?.observedIssue || booking.jobExecution?.inspectionNotes) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900">
                      Technician Diagnostic Findings
                    </span>
                    {(booking.inspection?.inspectedAt || booking.jobExecution?.inspectedAt) && (
                      <span className="text-[11px] text-slate-400">
                        {new Date(booking.inspection?.inspectedAt || booking.jobExecution?.inspectedAt).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 font-bold uppercase block text-[10px]">Observed Issue</span>
                      <p className="text-xs font-semibold text-slate-800">
                        {booking.inspection?.observedIssue || booking.jobExecution?.observedIssue || booking.jobExecution?.problemIdentified || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase block text-[10px]">Parts Required</span>
                      <p className="text-xs font-semibold text-slate-800">
                        {booking.inspection?.partsRequired || booking.jobExecution?.partsRequired || 'None specified'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Inspection Notes</span>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {booking.inspection?.inspectionNotes || booking.jobExecution?.inspectionNotes || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Required Work</span>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {booking.inspection?.requiredWork || booking.jobExecution?.requiredWork || 'N/A'}
                    </p>
                  </div>

                  {(booking.inspection?.additionalNotes || booking.jobExecution?.additionalNotes) && (
                    <div>
                      <span className="text-slate-400 font-bold uppercase block text-[10px]">Additional Notes</span>
                      <p className="text-xs text-slate-600 italic">
                        {booking.inspection?.additionalNotes || booking.jobExecution?.additionalNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Phase 7: Estimates & Scope Approvals */}
          <div id="estimate-manager-section">
            <EstimateManager
              bookingId={booking._id}
              isCustomer={isCustomer}
              isProvider={isTechnician}
              isAdmin={isAdmin}
              onBookingUpdated={fetchBooking}
              bookingInspectionNotes={booking.jobExecution?.inspectionNotes || booking.notes || ''}
              serviceName={booking.serviceId?.name || ''}
            />
          </div>

          {/* Phase 6: MongoDB GridFS Work Evidence Gallery */}
          <WorkEvidenceGallery
            bookingId={booking._id}
            canUpload={isCustomer || isTechnician || isAdmin}
            canDelete={isTechnician || isAdmin}
          />

          {/* Phase 7: Final Tax Invoice & PDF Download */}
          <InvoiceCard
            booking={booking}
            isCustomer={isCustomer}
            isProvider={isTechnician}
            isAdmin={isAdmin}
            onInvoiceCreated={fetchBooking}
          />

          {/* Phase 8: Demo Payment Gateway Transactions & Reconciliation */}
          <PaymentHistoryCard
            bookingId={booking._id}
            refreshTrigger={booking.status}
          />

          {/* Phase 9: Service Warranty & Claims */}
          <WarrantyCard
            booking={booking}
            isCustomer={isCustomer}
            isProvider={isTechnician}
            isAdmin={isAdmin}
          />

          {/* Phase 9: Verified Service Review */}
          <ReviewCard
            booking={booking}
            isCustomer={isCustomer}
          />

          {/* Phase 9: Dispute Resolution & Mediation */}
          <DisputeCard
            booking={booking}
            isCustomer={isCustomer}
            isProvider={isTechnician}
            isAdmin={isAdmin}
            onDisputeUpdated={fetchBooking}
          />

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
          <Card title="Assigned Technician">
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-900 text-sm">
                {booking.technicianId?.name || booking.providerId?.name || 'Verified Technician'}
              </div>
              <p className="text-slate-500">{booking.technicianId?.email || booking.providerId?.email}</p>
              {(booking.technicianId?.phone || booking.providerId?.phone) && (
                <p className="text-slate-600 font-medium">📞 {booking.technicianId?.phone || booking.providerId?.phone}</p>
              )}
              <div className="pt-2">
                <Link to={`/technicians/${booking.technicianId?._id || booking.providerId?._id}`}>
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

          <Card title="Pricing & Payment Status">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">
                  {booking.pricing?.isPaid || booking.status === 'COMPLETED' ? 'Total Settled:' : 'Service Base / Estimate:'}
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  ₹{booking.pricing?.finalTotal || booking.pricing?.estimatedTotal || 0}
                </span>
              </div>

              {booking.pricing?.isPaid || booking.status === 'COMPLETED' ? (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-between text-[11px]">
                  <span>✓ Paid in Full</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">DEMO GATEWAY</span>
                </div>
              ) : (
                <>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 text-[11px]">
                    Invoice is compiled from approved estimates upon verification.
                  </div>
                  {isCustomer && ['CUSTOMER_VERIFIED', 'COMPLETION_PENDING'].includes(booking.status) && (
                    <Link
                      to={`/checkout/${booking._id}`}
                      className="block w-full py-2 px-3 text-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      💳 Checkout & Pay (Demo)
                    </Link>
                  )}
                </>
              )}
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

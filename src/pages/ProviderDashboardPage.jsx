import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  getMyProviderProfile,
  getBookings,
  updateBookingStatus
} from '../services/api';

const ProviderDashboardPage = () => {
  const { user, mongoUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingNotice, setBookingNotice] = useState('');
  const [rejectModal, setRejectModal] = useState({ isOpen: false, bookingId: '', reason: '' });

  const loadTechnicianData = async () => {
    setLoading(true);
    try {
      const res = await getMyProviderProfile();
      if (res?.data?.profile) {
        setProfile(res.data.profile);
      }
    } catch (err) {
      console.error('Failed to load technician profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await getBookings({ limit: 50 });
      if (res?.data?.bookings) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Failed to load technician bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (mongoUser) {
      loadTechnicianData();
      loadBookings();
    }
  }, [mongoUser]);

  const handleQuickStatusTransition = async (bookingId, targetStatus, reason = '') => {
    try {
      setBookingNotice('');
      const res = await updateBookingStatus(bookingId, { status: targetStatus, reason });
      setBookingNotice(res.data.message || `Booking status updated to ${targetStatus}`);
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update booking status.');
    }
  };

  if (loading) {
    return <Loading fullPage text="Loading technician workspace..." />;
  }

  const verificationStatus = profile?.status || 'PENDING';

  // Categorize jobs
  const incomingRequests = bookings.filter((b) => b.status === 'REQUESTED');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysJobs = bookings.filter((b) => {
    if (!['ACCEPTED', 'SCHEDULED', 'INSPECTION', 'WORK_IN_PROGRESS'].includes(b.status)) return false;
    const bDate = new Date(b.scheduledDate).toISOString().split('T')[0];
    return bDate === todayStr;
  });

  const activeJobs = bookings.filter((b) =>
    ['ACCEPTED', 'SCHEDULED', 'INSPECTION', 'ESTIMATE_PENDING', 'ESTIMATE_SUBMITTED', 'ESTIMATE_APPROVED', 'PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'WORK_IN_PROGRESS'].includes(b.status)
  );

  const completedJobs = bookings.filter((b) =>
    ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED'].includes(b.status)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* 1. Header & Verification Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Technician Workspace
            </span>
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
              verificationStatus === 'VERIFIED'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              {verificationStatus}
            </span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
            {profile?.businessName || mongoUser?.name || 'Technician Dashboard'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Review incoming requests, manage active job stages, and deliver verified home repairs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/technician/profile">
            <Button variant="outline" size="sm">
              Edit Profile
            </Button>
          </Link>
          <Link to="/technician/services">
            <Button variant="primary" size="sm">
              My Services ({profile?.servicesOffered?.length || 0})
            </Button>
          </Link>
        </div>
      </div>

      {bookingNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>✓ {bookingNotice}</span>
          <button onClick={() => setBookingNotice('')} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">×</button>
        </div>
      )}

      {/* Verification Notice Banner if Pending */}
      {verificationStatus === 'PENDING' && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <h3 className="text-sm font-bold">Profile Verification in Progress</h3>
              <p className="text-xs text-amber-800 mt-0.5 max-w-2xl leading-relaxed">
                Your profile is under administrative review. Once verified, you will appear in customer searches across your service areas.
              </p>
            </div>
          </div>
          <Link to="/technician/profile" className="flex-shrink-0">
            <Button size="sm" variant="outline" className="border-amber-300 bg-white text-amber-900">
              Review Profile Details
            </Button>
          </Link>
        </div>
      )}

      {/* 2. TOP CARDS (Requirement 23: New Requests, Active Jobs, Completed Jobs, Rating) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">New Requests</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
            {incomingRequests.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">Awaiting response</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Active Jobs</span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">
            {activeJobs.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">In pipeline</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Completed Jobs</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
            {completedJobs.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">Verified &amp; invoiced</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Rating</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            ★ {profile?.rating?.average ? Number(profile.rating.average).toFixed(1) : '5.0'}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
            {profile?.rating?.count || 0} reviews
          </span>
        </div>
      </div>

      {/* 3. NEW REQUESTS SECTION (Requirement 23 & 24) */}
      <section id="requests" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">New Service Requests</h2>
            <p className="text-xs text-slate-500">Direct booking requests submitted by customers.</p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
            {incomingRequests.length} Pending
          </span>
        </div>

        {bookingsLoading ? (
          <Loading text="Checking new requests..." />
        ) : incomingRequests.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl">
            <p className="text-sm font-bold text-slate-800">No pending requests</p>
            <p className="text-xs text-slate-400 mt-1">New requests from customers will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {incomingRequests.map((b) => (
              <Card
                key={b._id}
                title={b.serviceId?.name || 'Service Request'}
                subtitle={`Booking Ref: ${b.bookingNumber}`}
                footer={
                  <div className="flex items-center justify-between w-full pt-1">
                    <Link to={`/bookings/${b._id}`}>
                      <Button size="xs" variant="outline">
                        Inspect
                      </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                      {/* Reject: secondary/destructive */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => {
                          setRejectModal({ isOpen: true, bookingId: b._id, reason: '' });
                        }}
                      >
                        Reject
                      </Button>
                      {/* Accept: visually primary */}
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleQuickStatusTransition(b._id, 'ACCEPTED', 'Technician accepted booking request')}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                }
              >
                {/* Requirement 24: Customer, Service, Problem, Date, Time */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Customer:</span>
                    <span className="font-bold text-slate-800">{b.customerId?.name || 'Customer'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Schedule:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(b.scheduledDate).toLocaleDateString('en-IN')}
                      {b.preferredTimeSlot ? ` (${b.preferredTimeSlot})` : ''}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block">Problem:</span>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 italic mt-0.5">
                      "{b.problemDescription}"
                    </p>
                  </div>

                  {/* Masked location for unaccepted requests */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Location:</span>
                    <span className="font-medium text-slate-700">
                      {b.address?.locality || b.address?.city || 'Customer Area'} (Address unlocked upon acceptance)
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 4. TODAY'S JOBS SECTION (Requirement 23) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Today's Schedule</h2>
            <p className="text-xs text-slate-500">Appointments scheduled for today.</p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {todaysJobs.length} Today
          </span>
        </div>

        {todaysJobs.length === 0 ? (
          <div className="p-6 text-center bg-white border border-slate-200 rounded-3xl text-xs text-slate-400">
            No service jobs scheduled for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysJobs.map((j) => (
              <div
                key={j._id}
                className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{j.serviceId?.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                      {j.preferredTimeSlot || 'Today'}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Customer: <span className="font-semibold text-slate-900">{j.customerId?.name}</span>
                  </p>
                  <p className="text-slate-500 text-[11px] line-clamp-1">
                    📍 {j.address?.addressLine1 || j.address?.streetAddress}, {j.address?.city}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <Link to={`/bookings/${j._id}`}>
                    <Button size="xs" variant="primary">
                      Manage Job →
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. ACTIVE JOBS SECTION (Requirement 23 & 25) */}
      <section id="jobs" className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Active Jobs Pipeline</h2>
            <p className="text-xs text-slate-500">Ongoing diagnostics, estimates, and repair work.</p>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
            {activeJobs.length} In Progress
          </span>
        </div>

        {activeJobs.length === 0 ? (
          <div className="p-6 text-center bg-white border border-slate-200 rounded-3xl text-xs text-slate-400">
            No active jobs in the pipeline.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeJobs.map((b) => (
              <Card
                key={b._id}
                title={b.serviceId?.name}
                subtitle={`Ref: ${b.bookingNumber}`}
                footer={
                  <div className="flex items-center justify-between w-full pt-1">
                    <span className="text-xs font-bold text-slate-800">
                      ₹{b.pricing?.finalTotal || b.pricing?.estimatedTotal || 0}
                    </span>
                    <Link to={`/bookings/${b._id}`}>
                      <Button size="xs" variant="primary">
                        Job Lifecycle &rarr;
                      </Button>
                    </Link>
                  </div>
                }
              >
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Stage:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Customer:</span>
                    <span className="font-semibold text-slate-800">{b.customerId?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Full Address:</span>
                    <span className="text-slate-700">
                      {b.address?.addressLine1 || b.address?.streetAddress}, {b.address?.locality ? `${b.address.locality}, ` : ''}{b.address?.city}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 6. RECENT COMPLETED JOBS (Requirement 23) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Recent Completed Jobs</h2>
            <p className="text-xs text-slate-500">Finished repairs and finalized tax invoices.</p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {completedJobs.length} Completed
          </span>
        </div>

        {completedJobs.length === 0 ? (
          <div className="p-6 text-center bg-white border border-slate-200 rounded-3xl text-xs text-slate-400">
            No completed jobs to display.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedJobs.slice(0, 6).map((c) => (
              <div
                key={c._id}
                className="p-4 rounded-3xl bg-white border border-slate-200 text-xs flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-900">{c.serviceId?.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {c.customerId?.name} • ₹{c.pricing?.finalTotal || c.pricing?.estimatedTotal || 0}
                  </p>
                </div>
                <Link to={`/bookings/${c._id}`}>
                  <Button size="xs" variant="outline">
                    View &rarr;
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Rejection Modal with Mandatory Reason (Requirement 24) */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, bookingId: '', reason: '' })}
        title="Decline Service Request"
        subtitle="Please provide a reason. The customer will be notified."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Reason for Declining <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-2xl p-3 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
              rows={3}
              placeholder="e.g. Schedule fully booked, outside immediate service zone, specialized equipment required..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModal({ isOpen: false, bookingId: '', reason: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (!rejectModal.reason.trim()) {
                  alert('A reason is mandatory to decline a request.');
                  return;
                }
                const bId = rejectModal.bookingId;
                const r = rejectModal.reason.trim();
                setRejectModal({ isOpen: false, bookingId: '', reason: '' });
                await handleQuickStatusTransition(bId, 'REJECTED', r);
              }}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ProviderDashboardPage;

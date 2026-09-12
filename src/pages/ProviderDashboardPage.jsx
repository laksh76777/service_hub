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
  adminGetProviders,
  adminUpdateProviderStatus,
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

  // Admin section state
  const isAdmin = mongoUser?.role === 'ADMIN';
  const [adminProviders, setAdminProviders] = useState([]);
  const [adminFilter, setAdminFilter] = useState('PENDING');
  const [adminLoading, setAdminLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  const loadProviderData = async () => {
    // ADMIN users do not have a ProviderProfile — skip the profile API call
    if (isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getMyProviderProfile();
      if (res?.data?.profile) {
        setProfile(res.data.profile);
      }
    } catch (err) {
      console.error('Failed to load provider profile:', err);
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
      console.error('Failed to load provider bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadAdminProviders = async (status) => {
    setAdminLoading(true);
    try {
      const res = await adminGetProviders({ status });
      if (res?.data?.providers) {
        setAdminProviders(res.data.providers);
      }
    } catch (err) {
      console.error('Failed to load admin provider queue:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (mongoUser) {
      loadProviderData();
      loadBookings();
      if (isAdmin) {
        loadAdminProviders('PENDING');
      }
    }
  }, [isAdmin, mongoUser]);

  const handleQuickStatusTransition = async (bookingId, targetStatus, reason = '') => {
    try {
      setBookingNotice('');
      const res = await updateBookingStatus(bookingId, { status: targetStatus, reason });
      setBookingNotice(res.data.message || `Booking updated to ${targetStatus}`);
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update booking status.');
    }
  };

  const handleAdminStatusUpdate = async (providerId, newStatus) => {
    setActionFeedback('');
    try {
      await adminUpdateProviderStatus(providerId, { status: newStatus });
      setActionFeedback(`Provider marked as ${newStatus} successfully.`);
      loadAdminProviders(adminFilter);
    } catch (err) {
      setActionFeedback('Failed to update status: ' + err.message);
    }
  };

  if (loading) {
    return <Loading fullPage text="Loading technician workspace..." />;
  }

  const status = profile?.status || 'PENDING';

  const statusBannerConfig = {
    PENDING: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: '⏳',
      title: 'Verification In Progress',
      message:
        'Your technician profile is under review by our admin verification team. Complete your profile and trade service offerings so we can approve your account. Unverified technicians do not appear in public customer discovery.'
    },
    VERIFIED: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '✓',
      title: 'Certified & Verified Technician',
      message:
        'Your account is verified! Your technician profile and service offerings are actively listed in customer discovery searches across your configured service areas.'
    },
    REJECTED: {
      bg: 'bg-red-50 border-red-200 text-red-900',
      badge: 'bg-red-100 text-red-800 border-red-300',
      icon: '✕',
      title: 'Verification Needs Attention',
      message:
        'Your verification was rejected or requires updated documentation. Please inspect your profile and upload valid trade licensing or identification.'
    },
    SUSPENDED: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: '⚠',
      title: 'Account Suspended',
      message:
        'Your technician privileges have been temporarily paused. Please contact administrator support to resolve pending compliance or dispute inquiries.'
    }
  }[status] || {
    bg: 'bg-slate-50 border-slate-200 text-slate-900',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: 'ℹ',
    title: 'Status: ' + status,
    message: 'Your technician profile status is currently ' + status
  };

  const incomingRequests = bookings.filter((b) => b.status === 'REQUESTED');
  const activeJobs = bookings.filter((b) =>
    ['ACCEPTED', 'SCHEDULED', 'TECHNICIAN_ARRIVED', 'IN_PROGRESS', 'COMPLETION_PENDING'].includes(b.status)
  );
  const completedJobs = bookings.filter((b) =>
    ['CUSTOMER_VERIFIED', 'COMPLETED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER', 'DISPUTED'].includes(
      b.status
    )
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
            isAdmin
              ? 'text-purple-600 bg-purple-50 border-purple-100'
              : 'text-blue-600 bg-blue-50 border-blue-100'
          }`}>
            {isAdmin ? '👑 Admin Platform Monitor' : 'Technician Portal'}
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-2">
            {isAdmin
              ? `Welcome, ${mongoUser?.name || user?.displayName || 'Admin'}`
              : (mongoUser?.name || profile?.businessName || 'Technician Workspace')}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {isAdmin
              ? 'Monitor technician verifications, inspect bookings, handle disputes, and oversee the platform.'
              : 'Manage your credentials, coverage areas, service offerings, and incoming customer booking requests.'}
          </p>
        </div>

        {!isAdmin && (
          <div className="flex gap-3">
            <Link to="/technician/profile">
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
            </Link>
            <Link to="/technician/services">
              <Button variant="primary" size="sm">
                Manage Services ({profile?.servicesOffered?.length || 0})
              </Button>
            </Link>
          </div>
        )}
      </div>

      {bookingNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>✓ {bookingNotice}</span>
          <button onClick={() => setBookingNotice('')} className="text-emerald-600 hover:text-emerald-900">×</button>
        </div>
      )}

      {/* Verification Status Banner — only shown to TECHNICIAN users */}
      {!isAdmin && (
        <div className={`p-6 rounded-2xl border ${statusBannerConfig.bg} shadow-sm`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="text-2xl flex-shrink-0">{statusBannerConfig.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base">{statusBannerConfig.title}</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${statusBannerConfig.badge}`}>
                    {status}
                  </span>
                </div>
                <p className="text-xs mt-1 opacity-90 leading-relaxed max-w-3xl">
                  {statusBannerConfig.message}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0">
              {status === 'VERIFIED' ? (
                <Link to={`/technicians/${profile?._id}`}>
                  <Button size="sm" variant="outline" className="bg-white/80">
                    View Public Profile
                  </Button>
                </Link>
              ) : (
                <Link to="/technician/profile">
                  <Button size="sm" variant="primary">
                    Update Credentials
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs uppercase font-semibold text-slate-400">Incoming Requests</span>
          <div className="text-xl font-black text-amber-600 mt-1">{incomingRequests.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Pending response</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs uppercase font-semibold text-slate-400">Active Jobs</span>
          <div className="text-xl font-black text-blue-600 mt-1">{activeJobs.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Underway / Scheduled</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs uppercase font-semibold text-slate-400">Customer Rating</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            ★ {profile?.rating?.average ? profile.rating.average.toFixed(1) : '5.0'}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {profile?.rating?.count || 0} reviews ({completedJobs.length} completed)
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs uppercase font-semibold text-slate-400">Service Coverage</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {profile?.serviceArea?.cities?.length || 0} Cities
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {profile?.serviceArea?.pincodes?.length || profile?.serviceArea?.zipCodes?.length || 0} PIN Codes
          </span>
        </div>
      </div>

      {/* INCOMING SERVICE REQUESTS QUEUE */}
      <div id="requests" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Incoming Service Requests</h2>
            <p className="text-xs text-slate-500">New job bookings submitted by customers awaiting your confirmation.</p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
            {incomingRequests.length} Pending
          </span>
        </div>

        {bookingsLoading ? (
          <Loading text="Loading incoming bookings..." />
        ) : incomingRequests.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
            <p className="text-sm font-semibold text-slate-700">No new incoming requests</p>
            <p className="text-xs text-slate-400 mt-1">When customers in your service area request an appointment, they will show up here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {incomingRequests.map((b) => (
              <Card
                key={b._id}
                title={<span>{b.serviceId?.name || 'Service Job'}</span>}
                subtitle={`Ref: ${b.bookingNumber} • Scheduled: ${new Date(b.scheduledDate).toLocaleDateString('en-IN')} (${b.preferredTimeSlot})`}
                footer={
                  <div className="flex items-center justify-between w-full pt-1">
                    <Link to={`/bookings/${b._id}`}>
                      <Button size="sm" variant="outline">
                        View Details & Timeline &rarr;
                      </Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          setRejectModal({ isOpen: true, bookingId: b._id, reason: '' });
                        }}
                      >
                        Reject
                      </Button>
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
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Customer:</span>
                    <span className="font-bold text-slate-800">{b.customerId?.name}</span>
                    <span className="text-slate-500 block">{b.customerId?.phone} • {b.customerId?.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Job Location:</span>
                    <span className="text-slate-700">
                      {b.address?.addressLine1 || b.address?.streetAddress}
                      {b.address?.locality ? `, ${b.address.locality}` : ''}
                      {b.address?.city ? `, ${b.address.city}` : ''} - {b.address?.pincode || b.address?.zipCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Problem Scope:</span>
                    <p className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 italic">
                      "{b.problemDescription}"
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ACTIVE JOBS & SCHEDULED APPOINTMENTS */}
      <div id="jobs" className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Active Job Pipeline</h2>
            <p className="text-xs text-slate-500">Confirmed, scheduled, and ongoing jobs governed by the state machine.</p>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
            {activeJobs.length} Active
          </span>
        </div>

        {activeJobs.length === 0 ? (
          <div className="p-6 text-center bg-white border border-slate-200 rounded-2xl text-xs text-slate-400">
            No active jobs currently in progress.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeJobs.map((b) => (
              <Card
                key={b._id}
                title={<span>{b.serviceId?.name}</span>}
                subtitle={`Ref: ${b.bookingNumber} • ${new Date(b.scheduledDate).toLocaleDateString('en-IN')}`}
                footer={
                  <div className="flex items-center justify-between w-full pt-1">
                    <span className="text-[11px] font-bold text-slate-700">₹{b.pricing?.estimatedTotal || 0}</span>
                    <Link to={`/bookings/${b._id}`}>
                      <Button size="sm" variant="primary">
                        Manage Job &rarr;
                      </Button>
                    </Link>
                  </div>
                }
              >
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Stage:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Customer:</span>
                    <span className="font-medium text-slate-800">{b.customerId?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Address:</span>
                    <span className="text-slate-600">
                      {b.address?.addressLine1 || b.address?.streetAddress}
                      {b.address?.locality ? `, ${b.address.locality}` : ''}, {b.address?.city}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ADMIN VERIFICATION SECTION (Displayed only if logged in user is ADMIN) */}
      {isAdmin && (
        <div className="pt-8 border-t border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold uppercase">
                Admin Control Room
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Provider Verification Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and approve or reject provider credentials to control marketplace visibility.
              </p>
            </div>

            {/* Filter Pills for Admin */}
            <div className="flex gap-2">
              {['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setAdminFilter(st);
                    loadAdminProviders(st);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    adminFilter === st
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {actionFeedback && (
            <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold rounded-xl">
              {actionFeedback}
            </div>
          )}

          {adminLoading ? (
            <Loading text="Retrieving moderation queue..." />
          ) : adminProviders.length === 0 ? (
            <EmptyState
              title={`No ${adminFilter} providers in queue`}
              description="There are currently no provider applications matching this verification state."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminProviders.map((ap) => (
                <Card
                  key={ap._id}
                  title={ap.businessName}
                  subtitle={ap.userId?.email || 'Registered Provider'}
                  footer={
                    <div className="flex gap-2 w-full pt-1">
                      {ap.status !== 'VERIFIED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleAdminStatusUpdate(ap._id, 'VERIFIED')}
                        >
                          Approve
                        </Button>
                      )}
                      {ap.status !== 'REJECTED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleAdminStatusUpdate(ap._id, 'REJECTED')}
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  }
                >
                  <div className="space-y-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 font-semibold block">Applicant:</span>
                      <span className="font-medium text-slate-800">{ap.userId?.name} ({ap.userId?.phone || 'No phone'})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">License #:</span>
                      <span className="font-mono text-slate-800">{ap.licenseNumber || 'None declared'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Coverage:</span>
                      <span>{ap.serviceArea?.cities?.join(', ') || 'No cities set'}</span>
                    </div>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Current State:</span>
                      <span className="px-2 py-0.5 rounded font-black text-[10px] bg-slate-100 text-slate-800">
                        {ap.status}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rejection Modal requiring mandatory reason */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, bookingId: '', reason: '' })}
        title="Reject Service Request"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Please provide a clear reason for declining this request. The customer will be informed.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-red-500 outline-none"
              rows={3}
              placeholder="e.g., Unavailable at requested time, outside immediate trade expertise, fully booked..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModal({ isOpen: false, bookingId: '', reason: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!rejectModal.reason.trim()) {
                  alert('A reason is required to reject a booking request.');
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

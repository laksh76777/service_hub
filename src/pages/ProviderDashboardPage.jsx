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
  updateBookingStatus,
  startWork
} from '../services/api';

const ProviderDashboardPage = ({ initialTab = 'overview' }) => {
  const { user, mongoUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [jobStageFilter, setJobStageFilter] = useState('ALL');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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

  const handleStartWorkQuick = async (bookingId) => {
    try {
      setBookingNotice('');
      await startWork(bookingId);
      setBookingNotice('Service work started! Booking is now WORK_IN_PROGRESS.');
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to start service work.');
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'requests'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Requests ({incomingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'jobs'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active Jobs ({activeJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'earnings'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Earnings
        </button>
      </div>

      {/* 3. NEW REQUESTS SECTION (Requirement 23 & 24) */}
      {(activeTab === 'overview' || activeTab === 'requests') && (
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
                    <Link to={`/technician/jobs/${b._id}`}>
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
      )}

      {/* 4. TODAY'S JOBS SECTION (Requirement 23) */}
      {(activeTab === 'overview' || activeTab === 'jobs') && (
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
                  <Link to={`/technician/jobs/${j._id}`}>
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
      )}

      {/* 5. ACTIVE JOBS SECTION (Requirement 23 & 25) */}
      {(activeTab === 'overview' || activeTab === 'jobs') && (
      <section id="jobs" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Active Jobs Pipeline</h2>
            <p className="text-xs text-slate-500">Ongoing diagnostics, estimates, and repair execution stages.</p>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full w-fit">
            {activeJobs.length} In Pipeline
          </span>
        </div>

        {/* Phase 7 Job Stage Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { id: 'ALL', label: `All Active (${activeJobs.length})` },
            { id: 'ACCEPTED', label: 'Accepted' },
            { id: 'INSPECTION', label: 'Inspection' },
            { id: 'ESTIMATE', label: 'Estimate' },
            { id: 'PAYMENT_PENDING', label: 'Payment Pending' },
            { id: 'READY_TO_START', label: 'Ready to Start' },
            { id: 'WORK_IN_PROGRESS', label: 'Work In Progress' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setJobStageFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                jobStageFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(() => {
          const filteredJobs = (jobStageFilter === 'COMPLETED' ? completedJobs : bookings).filter((b) => {
            if (jobStageFilter === 'ALL') {
              return ['ACCEPTED', 'SCHEDULED', 'INSPECTION', 'ESTIMATE_PENDING', 'ESTIMATE_SUBMITTED', 'ESTIMATE_APPROVED', 'PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'WORK_IN_PROGRESS'].includes(b.status);
            }
            if (jobStageFilter === 'ACCEPTED') return ['ACCEPTED', 'SCHEDULED'].includes(b.status);
            if (jobStageFilter === 'INSPECTION') return ['INSPECTION', 'DIAGNOSIS'].includes(b.status);
            if (jobStageFilter === 'ESTIMATE') return ['ESTIMATE_PENDING', 'ESTIMATE_SUBMITTED', 'ESTIMATE_APPROVED'].includes(b.status);
            if (jobStageFilter === 'PAYMENT_PENDING') return ['PAYMENT_PENDING', 'CUSTOMER_CONFIRMED', 'CUSTOMER_VERIFIED', 'COMPLETION_PENDING'].includes(b.status);
            if (jobStageFilter === 'READY_TO_START') return b.status === 'PAYMENT_SUCCESS';
            if (jobStageFilter === 'WORK_IN_PROGRESS') return b.status === 'WORK_IN_PROGRESS';
            if (jobStageFilter === 'COMPLETED') return ['WORK_COMPLETED', 'INVOICED', 'COMPLETED'].includes(b.status);
            return true;
          });

          if (filteredJobs.length === 0) {
            return (
              <div className="p-6 text-center bg-white border border-slate-200 rounded-3xl text-xs text-slate-400">
                No jobs currently found in the '{jobStageFilter.replace(/_/g, ' ')}' stage.
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredJobs.map((b) => (
                <Card
                  key={b._id}
                  title={b.serviceId?.name}
                  subtitle={`Ref: ${b.bookingNumber}`}
                  footer={
                    <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-800">
                        ₹{b.pricing?.finalTotal || b.pricing?.estimatedTotal || 0}
                      </span>
                      <div className="flex items-center gap-2">
                        {b.status === 'PAYMENT_SUCCESS' ? (
                          <Button
                            size="xs"
                            variant="primary"
                            className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs"
                            onClick={() => handleStartWorkQuick(b._id)}
                          >
                            ⚡ Start Work
                          </Button>
                        ) : b.status === 'WORK_IN_PROGRESS' ? (
                          <Link to={`/technician/jobs/${b._id}#work-execution-section`}>
                            <Button size="xs" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-xs">
                              Manage Work →
                            </Button>
                          </Link>
                        ) : ['WORK_COMPLETED', 'INVOICED', 'COMPLETED'].includes(b.status) ? (
                          <Link to={`/technician/jobs/${b._id}`}>
                            <Button size="xs" variant="outline" className="text-xs">
                              Invoice / Details →
                            </Button>
                          </Link>
                        ) : (
                          <Link to={`/technician/jobs/${b._id}`}>
                            <Button size="xs" variant="primary" className="text-xs">
                              Job Lifecycle →
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  }
                >
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Stage:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                        b.status === 'PAYMENT_SUCCESS'
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          : b.status === 'WORK_IN_PROGRESS'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : ['WORK_COMPLETED', 'INVOICED', 'COMPLETED'].includes(b.status)
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Customer:</span>
                      <span className="font-semibold text-slate-800">{b.customerId?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Full Address:</span>
                      <span className="text-slate-700 line-clamp-1">
                        {b.address?.addressLine1 || b.address?.streetAddress}, {b.address?.locality ? `${b.address.locality}, ` : ''}{b.address?.city}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          );
        })()}
      </section>
      )}

      {/* 6. RECENT COMPLETED JOBS (Requirement 23) */}
      {(activeTab === 'overview' || activeTab === 'jobs') && (
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
                <Link to={`/technician/jobs/${c._id}`}>
                  <Button size="xs" variant="outline">
                    View &rarr;
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
      )}

      {/* 7. EARNINGS TAB */}
      {(activeTab === 'overview' || activeTab === 'earnings') && (
      <section id="earnings" className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Earnings &amp; Payouts</h2>
            <p className="text-xs text-slate-500">Breakdown of gross revenue, completed invoices, and platform settlement.</p>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
            ₹{completedJobs.reduce((acc, b) => acc + (b.pricing?.finalTotal || b.pricing?.estimatedTotal || 0), 0)} Total
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase">Gross Service Invoiced</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ₹{completedJobs.reduce((acc, b) => acc + (b.pricing?.finalTotal || b.pricing?.estimatedTotal || 0), 0)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">{completedJobs.length} completed jobs</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase">Net Technician Share (90%)</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ₹{Math.round(completedJobs.reduce((acc, b) => acc + (b.pricing?.finalTotal || b.pricing?.estimatedTotal || 0), 0) * 0.9)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Direct bank settlement</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase">Active In-Pipeline Value</span>
            <div className="text-2xl font-black text-blue-600 mt-1">
              ₹{activeJobs.reduce((acc, b) => acc + (b.pricing?.finalTotal || b.pricing?.estimatedTotal || 0), 0)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">{activeJobs.length} in progress jobs</span>
          </div>
        </div>
      </section>
      )}

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

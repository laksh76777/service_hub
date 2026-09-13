import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { SkeletonCard, SkeletonRow } from '../components/common/Loading';
import BookingModal from '../components/booking/BookingModal';
import { useAuth } from '../context/AuthContext';
import { updateMe, getBookings, getMyAddresses } from '../services/api';

const DashboardPage = ({ initialTab = 'overview' }) => {
  const { user, mongoUser, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  // Role guard: TECHNICIAN must use Technician Dashboard
  useEffect(() => {
    if (mongoUser?.role === 'TECHNICIAN' || mongoUser?.role === 'PROVIDER') {
      navigate('/technician/dashboard', { replace: true });
    }
  }, [mongoUser, navigate]);

  const [activeTab, setActiveTab] = useState(urlTab || initialTab);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [bookings, setBookings] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Profile Edit State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState(mongoUser?.name || user?.displayName || '');
  const [editPhone, setEditPhone] = useState(mongoUser?.phone || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const [bRes, aRes] = await Promise.all([
        getBookings({ limit: 50 }).catch(() => ({ data: { bookings: [] } })),
        getMyAddresses().catch(() => ({ data: { addresses: [] } }))
      ]);

      if (bRes?.data?.bookings) {
        setBookings(bRes.data.bookings);
      }
      if (aRes?.data?.addresses) {
        setSavedAddresses(aRes.data.addresses);
      }
    } catch (err) {
      console.error('Failed to load customer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCustomerData();
    }
  }, [user]);

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const customerName = mongoUser?.name || user?.displayName || user?.email?.split('@')[0] || 'Customer';

  // Categorize Bookings
  const terminalStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER'];
  const activeBookings = bookings.filter((b) => !terminalStatuses.includes(b.status));
  const upcomingBookings = bookings.filter((b) => ['ACCEPTED', 'SCHEDULED'].includes(b.status));
  const recentBookings = bookings.filter((b) => terminalStatuses.includes(b.status));

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');
    setProfileError('');

    try {
      await updateMe({
        name: editName.trim(),
        phone: editPhone.trim()
      });
      await refreshUserProfile();
      setProfileMessage('Profile updated successfully.');
      setTimeout(() => {
        setShowProfileModal(false);
      }, 1000);
    } catch (err) {
      setProfileError(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* 1. TOP GREETING & PRIMARY CTA (Requirement 15) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              Customer Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
            {getGreeting()}, {customerName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your active bookings, view transparent estimates, and track local home services.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowBookingModal(true)}
            className="shadow-sm shadow-blue-500/20 font-bold"
          >
            + Book a Service
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'bookings'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          My Bookings ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'invoices'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Invoices &amp; Payments
        </button>
        <button
          onClick={() => setActiveTab('warranty')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'warranty'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          30-Day Warranties
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'reviews'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          My Reviews
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'profile'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Profile &amp; Settings
        </button>
      </div>

      {/* 2. QUICK ACTIONS BAR (Requirement 16) */}
      {activeTab === 'overview' && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setShowBookingModal(true)}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all text-left flex items-center gap-3.5 group cursor-pointer"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
            🛠️
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Book a Service
            </div>
            <div className="text-[11px] text-slate-500">Request a verified trade technician</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all text-left flex items-center gap-3.5 group cursor-pointer"
        >
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
            📋
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              My Bookings
            </div>
            <div className="text-[11px] text-slate-500">{bookings.length} total service records</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowProfileModal(true)}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all text-left flex items-center gap-3.5 group cursor-pointer"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
            👤
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              My Profile &amp; Settings
            </div>
            <div className="text-[11px] text-slate-500">Update name, phone, or addresses</div>
          </div>
        </button>
      </div>
      )}

      {/* 3. ACTIVE BOOKING SECTION (Requirement 15 & 16) */}
      {activeTab === 'overview' && (
      <>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Active Bookings</h2>
            <p className="text-xs text-slate-500">Services currently requested, underway, or awaiting payment.</p>
          </div>
          {activeBookings.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {activeBookings.length} Active
            </span>
          )}
        </div>

        {loading ? (
          <SkeletonCard />
        ) : activeBookings.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No active bookings"
            description="You don't have any ongoing repairs right now. Need something serviced?"
            actionLabel="Book Your First Service"
            onAction={() => setShowBookingModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeBookings.map((b) => (
              <Card
                key={b._id}
                title={b.serviceId?.name || 'Home Service'}
                subtitle={`Booking #${b.bookingNumber}`}
                badge={
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    b.status === 'REQUESTED'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : b.status === 'ACCEPTED' || b.status === 'SCHEDULED'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                }
                footer={
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-700">
                      ₹{b.pricing?.finalTotal || b.pricing?.estimatedTotal || 0}
                    </span>
                    <Link to={`/customer/bookings/${b._id}`}>
                      <Button size="sm" variant="outline">
                        View Details &amp; Status →
                      </Button>
                    </Link>
                  </div>
                }
              >
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Technician:</span>
                    <span className="font-bold text-slate-800">
                      {b.technicianId?.name || b.providerId?.name || 'Verified Pro'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Schedule:</span>
                    <span className="text-slate-700 font-semibold">
                      {new Date(b.scheduledDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                      {b.preferredTimeSlot ? ` (${b.preferredTimeSlot})` : ''}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 font-medium block">Issue:</span>
                    <p className="text-slate-700 italic line-clamp-2 mt-0.5">"{b.problemDescription}"</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 4. UPCOMING SERVICE & SAVED ADDRESSES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming Bookings (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Upcoming Services</h2>
            <span className="text-xs text-slate-400">Confirmed appointments</span>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-400">
              No upcoming appointments scheduled.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((u) => (
                <div
                  key={u._id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                      📅
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{u.serviceId?.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        {new Date(u.scheduledDate).toLocaleDateString('en-IN')} • Technician:{' '}
                        {u.technicianId?.name || u.providerId?.name}
                      </p>
                    </div>
                  </div>
                  <Link to={`/customer/bookings/${u._id}`}>
                    <Button size="xs" variant="outline">
                      Manage →
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Addresses (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Saved Addresses</h2>
            <span className="text-xs text-slate-400">{savedAddresses.length} addresses</span>
          </div>

          <Card className="p-5">
            {savedAddresses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No saved addresses yet. Addresses are saved during service requests.
              </p>
            ) : (
              <div className="space-y-3">
                {savedAddresses.map((addr, idx) => (
                  <div
                    key={addr._id || idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase text-[10px]">
                        📍 {addr.type || 'Home'}
                      </span>
                    </div>
                    <p className="text-slate-700">
                      {addr.addressLine1 || addr.streetAddress}
                      {addr.locality ? `, ${addr.locality}` : ''}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      {addr.city}, {addr.state} - {addr.pincode || addr.zipCode}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* 5. RECENT SERVICES / ALL BOOKINGS HISTORY (Requirement 16) */}
      <section id="bookings-section" className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Service History</h2>
            <p className="text-xs text-slate-500">Past completed and verified home services.</p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {recentBookings.length} completed
          </span>
        </div>

        {recentBookings.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-400">
            No completed past services found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentBookings.map((b) => (
              <Card
                key={b._id}
                title={b.serviceId?.name || 'Completed Service'}
                subtitle={`Booking #${b.bookingNumber}`}
                footer={
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-slate-500">
                      {new Date(b.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    <Link to={`/customer/bookings/${b._id}`}>
                      <Button size="xs" variant="outline">
                        View Invoice &rarr;
                      </Button>
                    </Link>
                  </div>
                }
              >
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Technician:</span>
                    <span className="font-semibold text-slate-800">
                      {b.technicianId?.name || b.providerId?.name || 'Verified Tech'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Status:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
      </>
      )}

      {/* DEDICATED MY BOOKINGS VIEW (Requirement 17) */}
      {activeTab === 'bookings' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">My Bookings</h2>
              <p className="text-xs text-slate-500">View and track all service requests and appointments belonging to your account.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBookingModal(true)}
              className="font-bold"
            >
              + Book New Service
            </Button>
          </div>

          {/* Status Filter Tabs (Phase 7: All, Requested, Accepted, Inspection, Estimate, Payment Pending, In Progress, Completed, Rejected) */}
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { id: 'ALL', label: `All (${bookings.length})` },
              { id: 'REQUESTED', label: 'Requested' },
              { id: 'ACCEPTED', label: 'Accepted' },
              { id: 'INSPECTION', label: 'Inspection' },
              { id: 'ESTIMATE', label: 'Estimate' },
              { id: 'PAYMENT_PENDING', label: 'Payment Pending' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'REJECTED', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <SkeletonCard />
          ) : bookings.filter(b => {
            if (statusFilter === 'ALL') return true;
            if (statusFilter === 'REQUESTED') return b.status === 'REQUESTED';
            if (statusFilter === 'ACCEPTED') return ['ACCEPTED', 'SCHEDULED'].includes(b.status);
            if (statusFilter === 'INSPECTION') return ['INSPECTION', 'DIAGNOSIS'].includes(b.status);
            if (statusFilter === 'ESTIMATE') return ['ESTIMATE_PENDING', 'ESTIMATE_SUBMITTED', 'ESTIMATE_APPROVED', 'ESTIMATE_REJECTED'].includes(b.status);
            if (statusFilter === 'PAYMENT_PENDING') return ['PAYMENT_PENDING', 'CUSTOMER_CONFIRMED', 'CUSTOMER_VERIFIED', 'COMPLETION_PENDING'].includes(b.status);
            if (statusFilter === 'IN_PROGRESS') return ['PAYMENT_SUCCESS', 'WORK_IN_PROGRESS'].includes(b.status);
            if (statusFilter === 'COMPLETED') return ['WORK_COMPLETED', 'INVOICED', 'COMPLETED'].includes(b.status);
            if (statusFilter === 'REJECTED') return ['REJECTED', 'CANCELLED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER'].includes(b.status);
            return b.status === statusFilter;
          }).length === 0 ? (
            <EmptyState
              icon="📋"
              title="No bookings found"
              description={statusFilter === 'ALL' ? "You haven't requested any services yet." : `No bookings currently in '${statusFilter}' status.`}
              actionLabel="Book a Service"
              onAction={() => setShowBookingModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {bookings
                .filter(b => {
                  if (statusFilter === 'ALL') return true;
                  if (statusFilter === 'REQUESTED') return b.status === 'REQUESTED';
                  if (statusFilter === 'ACCEPTED') return ['ACCEPTED', 'SCHEDULED'].includes(b.status);
                  if (statusFilter === 'INSPECTION') return ['INSPECTION', 'DIAGNOSIS'].includes(b.status);
                  if (statusFilter === 'ESTIMATE') return ['ESTIMATE_PENDING', 'ESTIMATE_SUBMITTED', 'ESTIMATE_APPROVED', 'ESTIMATE_REJECTED'].includes(b.status);
                  if (statusFilter === 'PAYMENT_PENDING') return ['PAYMENT_PENDING', 'CUSTOMER_CONFIRMED', 'CUSTOMER_VERIFIED', 'COMPLETION_PENDING'].includes(b.status);
                  if (statusFilter === 'IN_PROGRESS') return ['PAYMENT_SUCCESS', 'WORK_IN_PROGRESS'].includes(b.status);
                  if (statusFilter === 'COMPLETED') return ['WORK_COMPLETED', 'INVOICED', 'COMPLETED'].includes(b.status);
                  if (statusFilter === 'REJECTED') return ['REJECTED', 'CANCELLED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER'].includes(b.status);
                  return b.status === statusFilter;
                })
                .map((b) => (
                  <Card
                    key={b._id}
                    title={
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-base text-slate-900">{b.serviceId?.name || 'Home Service'}</span>
                      </div>
                    }
                    subtitle={`Ref: ${b.bookingNumber}`}
                    badge={
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        b.status === 'REQUESTED'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : b.status === 'ACCEPTED' || b.status === 'SCHEDULED'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : ['INSPECTION', 'DIAGNOSIS'].includes(b.status)
                          ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                          : b.status.includes('ESTIMATE')
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : ['PAYMENT_PENDING', 'CUSTOMER_CONFIRMED', 'CUSTOMER_VERIFIED', 'COMPLETION_PENDING'].includes(b.status)
                          ? 'bg-amber-100 text-amber-800 border-amber-400'
                          : b.status === 'PAYMENT_SUCCESS'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : b.status === 'WORK_IN_PROGRESS'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : b.status === 'REJECTED' || b.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    }
                    footer={
                      <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-400">
                          Booked: {new Date(b.createdAt).toLocaleDateString('en-IN')}
                        </span>
                        <div className="flex items-center gap-2">
                          {['PAYMENT_PENDING', 'CUSTOMER_CONFIRMED', 'CUSTOMER_VERIFIED', 'COMPLETION_PENDING'].includes(b.status) ? (
                            <Link to={`/checkout/${b._id}`}>
                              <Button size="sm" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                                💳 Pay Now
                              </Button>
                            </Link>
                          ) : ['WORK_COMPLETED', 'INVOICED', 'COMPLETED'].includes(b.status) ? (
                            <Link to={`/customer/bookings/${b._id}#review-card-section`}>
                              <Button size="sm" variant="outline" className="text-xs">
                                Invoice &amp; Review →
                              </Button>
                            </Link>
                          ) : (
                            <Link to={`/customer/bookings/${b._id}`}>
                              <Button size="sm" variant="outline" className="text-xs">
                                View Details →
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    }
                  >
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Technician:</span>
                        <span className="font-bold text-slate-800">
                          {b.technicianId?.name || b.providerId?.name || 'Assigned Pro'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Requested Date/Time:</span>
                        <span className="text-slate-700 font-semibold">
                          {new Date(b.scheduledDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                          {b.preferredTimeSlot ? ` (${b.preferredTimeSlot})` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Location Summary:</span>
                        <span className="text-slate-700 text-right max-w-[220px] truncate">
                          {b.address?.addressLine1 || b.address?.streetAddress}, {b.address?.city}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium block">Problem Description:</span>
                        <p className="text-slate-700 italic line-clamp-2 mt-0.5">"{b.problemDescription}"</p>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </section>
      )}

      {/* DEDICATED INVOICES VIEW (Requirement 9) */}
      {activeTab === 'invoices' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Tax Invoices &amp; Receipts</h2>
              <p className="text-xs text-slate-500">Download and inspect authoritative GST-compliant tax invoices for your completed services.</p>
            </div>
          </div>

          {bookings.filter(b => ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED'].includes(b.status)).length === 0 ? (
            <EmptyState
              icon="🧾"
              title="No invoices available"
              description="Tax invoices are automatically generated when a service job is completed by your technician."
              actionLabel="Book a Service"
              onAction={() => setShowBookingModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {bookings
                .filter(b => ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED'].includes(b.status))
                .map((b) => (
                  <Card
                    key={b._id}
                    title={b.serviceId?.name || 'Completed Service'}
                    subtitle={`Booking Ref: ${b.bookingNumber}`}
                    badge={
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                        PAID &bull; INVOICED
                      </span>
                    }
                    footer={
                      <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Completed: {new Date(b.completedAt || b.updatedAt).toLocaleDateString('en-IN')}
                        </span>
                        <Link to={`/customer/bookings/${b._id}#invoice-card-section`}>
                          <Button size="xs" variant="outline">
                            View Official Tax Invoice →
                          </Button>
                        </Link>
                      </div>
                    }
                  >
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Technician:</span>
                        <span className="font-bold text-slate-800">{b.technicianId?.name || b.providerId?.name || 'Verified Technician'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Invoice Total (INR):</span>
                        <span className="font-black text-slate-900 text-sm">₹{b.pricing?.finalTotal || b.pricing?.paidAmount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Payment Mode:</span>
                        <span className="font-semibold text-emerald-700">Simulated Demo Escrow</span>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </section>
      )}

      {/* DEDICATED 30-DAY WARRANTY VIEW (Requirement 9) */}
      {activeTab === 'warranty' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Active 30-Day Workmanship Warranties</h2>
              <p className="text-xs text-slate-500">Track warranty certificates issued for your completed jobs. Re-inspection is free within 30 days.</p>
            </div>
          </div>

          {bookings.filter(b => ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED'].includes(b.status)).length === 0 ? (
            <EmptyState
              icon="🛡️"
              title="No active warranties"
              description="An automatic 30-day workmanship warranty is activated immediately upon successful job completion."
              actionLabel="Book a Service"
              onAction={() => setShowBookingModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {bookings
                .filter(b => ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED'].includes(b.status))
                .map((b) => (
                  <Card
                    key={b._id}
                    title={b.serviceId?.name || 'Protected Service'}
                    subtitle={`Booking Ref: ${b.bookingNumber}`}
                    badge={
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">
                        30-DAY ACTIVE
                      </span>
                    }
                    footer={
                      <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100">
                        <span className="text-[11px] text-emerald-600 font-semibold">
                          Free Re-Inspection Included
                        </span>
                        <Link to={`/customer/bookings/${b._id}#warranty-card-section`}>
                          <Button size="xs" variant="outline">
                            Warranty Certificate →
                          </Button>
                        </Link>
                      </div>
                    }
                  >
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Assigned Pro:</span>
                        <span className="font-bold text-slate-800">{b.technicianId?.name || b.providerId?.name || 'Verified Technician'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Work Completed Date:</span>
                        <span className="text-slate-700 font-medium">{new Date(b.completedAt || b.updatedAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Warranty Coverage:</span>
                        <span className="font-bold text-blue-700">30 Days Workmanship</span>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </section>
      )}

      {/* DEDICATED REVIEWS VIEW (Requirement 9) */}
      {activeTab === 'reviews' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">My Verified Reviews</h2>
              <p className="text-xs text-slate-500">Feedback and ratings you have shared for verified technicians.</p>
            </div>
          </div>

          {bookings.filter(b => ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED'].includes(b.status)).length === 0 ? (
            <EmptyState
              icon="⭐"
              title="No reviews yet"
              description="You can leave 5-star ratings and written reviews once your technician completes service."
              actionLabel="Book a Service"
              onAction={() => setShowBookingModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {bookings
                .filter(b => ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED'].includes(b.status))
                .map((b) => (
                  <Card
                    key={b._id}
                    title={b.serviceId?.name || 'Reviewed Service'}
                    subtitle={`Technician: ${b.technicianId?.name || b.providerId?.name || 'Verified Pro'}`}
                    badge={
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        ★ VERIFIED REVIEW
                      </span>
                    }
                    footer={
                      <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-400">
                          Booking #{b.bookingNumber}
                        </span>
                        <Link to={`/customer/bookings/${b._id}#review-card-section`}>
                          <Button size="xs" variant="outline">
                            Manage Review →
                          </Button>
                        </Link>
                      </div>
                    }
                  >
                    <div className="space-y-2 text-xs">
                      <p className="text-slate-600 italic">
                        "{b.problemDescription}"
                      </p>
                      <div className="text-[11px] text-emerald-600 font-semibold pt-1">
                        ✓ Verified Completed Job
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </section>
      )}

      {/* DEDICATED PROFILE & SETTINGS VIEW (Requirement 9, 24) */}
      {activeTab === 'profile' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Customer Profile &amp; Settings</h2>
              <p className="text-xs text-slate-500">Manage your contact information, service addresses, and account security.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowProfileModal(true)}
              className="font-bold cursor-pointer"
            >
              Edit Profile
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Account Details" subtitle="Your registered personal information">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Full Legal Name:</span>
                  <span className="font-bold text-slate-800">{customerName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Registered Email:</span>
                  <span className="font-mono text-slate-700">{mongoUser?.email || user?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Mobile Phone:</span>
                  <span className="font-semibold text-slate-800">{mongoUser?.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Account Role:</span>
                  <span className="font-bold text-blue-600 uppercase">CUSTOMER</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400 font-medium">Security Status:</span>
                  <span className="text-emerald-700 font-semibold">✓ Passwords &amp; Tokens Hidden</span>
                </div>
              </div>
            </Card>

            <Card title="Saved Service Locations" subtitle={`${savedAddresses.length} saved addresses for quick booking`}>
              {savedAddresses.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No saved addresses yet. Addresses are automatically saved when you request home services.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {savedAddresses.map((addr, idx) => (
                    <div key={addr._id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="font-bold text-slate-800">📍 {addr.type || 'Primary Residence'}</div>
                      <div className="text-slate-600 mt-0.5">{addr.addressLine1 || addr.streetAddress}, {addr.locality}</div>
                      <div className="text-slate-500 text-[11px]">{addr.city}, {addr.state} - {addr.pincode || addr.zipCode}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </section>
      )}

      {/* Profile Edit Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="My Profile"
        subtitle="Manage your personal contact information"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {profileMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
              {profileMessage}
            </div>
          )}

          {profileError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {profileError}
            </div>
          )}

          <Input
            label="Full Legal Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <Input
            label="Mobile Phone (+91)"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            placeholder="98765 43210"
          />

          <Input
            label="Registered Email"
            value={mongoUser?.email || user?.email || ''}
            disabled
            helperText="Email is securely tied to your Firebase account"
          />

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowProfileModal(false)}
            >
              Close
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Booking Creation Modal */}
      {showBookingModal && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            loadCustomerData();
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;

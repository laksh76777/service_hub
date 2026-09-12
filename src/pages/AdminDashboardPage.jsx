import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import {
  adminGetOverview,
  adminGetCustomers,
  adminGetCustomerDetail,
  adminGetTechnicians,
  adminUpdateTechnicianStatus,
  adminGetServices,
  adminCreateService,
  adminUpdateService,
  adminToggleServiceStatus,
  adminGetBookings,
  adminGetBookingDetail,
  adminGetPayments,
  adminGetInvoices,
  adminGetReviews,
  adminGetDisputes,
  adminGetReports,
  adminAiSummary
} from '../services/api';

const AdminDashboardPage = () => {
  const { mongoUser } = useAuth();
  const location = useLocation();

  // Tab State (sync with hash if provided)
  const getInitialTab = () => {
    const hash = location.hash.replace('#', '').toLowerCase();
    const validTabs = [
      'overview',
      'customers',
      'technicians',
      'services',
      'bookings',
      'payments',
      'invoices',
      'reviews',
      'disputes',
      'reports'
    ];
    return validTabs.includes(hash) ? hash : 'overview';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const hash = location.hash.replace('#', '').toLowerCase();
    if (hash && hash !== activeTab) {
      setActiveTab(hash);
    }
  }, [location.hash]);

  // Global & Tab Data States
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerModal, setCustomerModal] = useState({ isOpen: false, data: null, loading: false });

  const [technicians, setTechnicians] = useState([]);
  const [techFilter, setTechFilter] = useState('ALL');
  const [techniciansLoading, setTechniciansLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceModal, setServiceModal] = useState({ isOpen: false, isEditing: false, serviceId: null, data: { name: '', description: '', minPrice: 299, maxPrice: 1999 } });

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingDetailModal, setBookingDetailModal] = useState({ isOpen: false, data: null, loading: false });

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [disputes, setDisputes] = useState([]);
  const [disputesLoading, setDisputesLoading] = useState(false);

  const [reports, setReports] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [feedback, setFeedback] = useState(null);

  // AI Summary (Feature 3) — informational only, admin-only
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryType, setAiSummaryType] = useState('bookings');
  const [aiSummaryError, setAiSummaryError] = useState('');

  const handleAiSummary = async (type) => {
    const summaryType = type || aiSummaryType;
    setAiSummaryType(summaryType);
    setAiSummaryLoading(true);
    setAiSummaryError('');
    setAiSummary(null);
    try {
      const res = await adminAiSummary(summaryType, overview || {});
      if (res?.data) {
        setAiSummary(res.data);
      } else {
        setAiSummaryError('AI summary unavailable. Please view the dashboard data directly.');
      }
    } catch (err) {
      console.warn('[AdminDashboard] AI summary skipped:', err.message);
      setAiSummaryError('AI assistant temporarily unavailable. Dashboard data is unaffected.');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // Load Overview Metrics
  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const res = await adminGetOverview();
      if (res?.data?.data) {
        setOverview(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setOverviewLoading(false);
    }
  };

  // Load Customers
  const loadCustomers = async () => {
    setCustomersLoading(true);
    try {
      const res = await adminGetCustomers();
      if (res?.data?.data?.customers) {
        setCustomers(res.data.data.customers);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setCustomersLoading(false);
    }
  };

  // View Customer Details
  const handleOpenCustomer = async (id) => {
    setCustomerModal({ isOpen: true, data: null, loading: true });
    try {
      const res = await adminGetCustomerDetail(id);
      setCustomerModal({ isOpen: true, data: res?.data?.data, loading: false });
    } catch (err) {
      alert('Failed to load customer detail: ' + err.message);
      setCustomerModal({ isOpen: false, data: null, loading: false });
    }
  };

  // Load Technicians
  const loadTechnicians = async (status = techFilter) => {
    setTechniciansLoading(true);
    try {
      const params = status !== 'ALL' ? { status } : {};
      const res = await adminGetTechnicians(params);
      const list = res?.data?.data?.technicians || [];
      setTechnicians(list);
    } catch (err) {
      console.error('Failed to load technicians:', err);
    } finally {
      setTechniciansLoading(false);
    }
  };

  // Approve / Reject / Suspend Technician
  const handleUpdateTechnicianStatus = async (id, status) => {
    setActionLoading(id);
    try {
      await adminUpdateTechnicianStatus(id, { status });
      setFeedback({ type: 'success', text: `Technician status changed to ${status}.` });
      loadTechnicians();
      loadOverview();
    } catch (err) {
      setFeedback({ type: 'error', text: err?.response?.data?.message || 'Failed to update technician.' });
    } finally {
      setActionLoading(null);
    }
  };

  // Load Services
  const loadServices = async () => {
    setServicesLoading(true);
    try {
      const res = await adminGetServices();
      setServices(res?.data?.data?.services || []);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setServicesLoading(false);
    }
  };

  // Save Service (Create or Update)
  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      if (serviceModal.isEditing) {
        await adminUpdateService(serviceModal.serviceId, serviceModal.data);
        setFeedback({ type: 'success', text: 'Service updated successfully.' });
      } else {
        await adminCreateService(serviceModal.data);
        setFeedback({ type: 'success', text: 'New service created successfully.' });
      }
      setServiceModal({ isOpen: false, isEditing: false, serviceId: null, data: { name: '', description: '', minPrice: 299, maxPrice: 1999 } });
      loadServices();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to save service.');
    }
  };

  // Toggle Service Active/Inactive
  const handleToggleService = async (id) => {
    try {
      await adminToggleServiceStatus(id);
      loadServices();
    } catch (err) {
      alert('Failed to toggle service status.');
    }
  };

  // Load Bookings
  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await adminGetBookings();
      setBookings(res?.data?.data?.bookings || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  // View Booking Details
  const handleOpenBooking = async (id) => {
    setBookingDetailModal({ isOpen: true, data: null, loading: true });
    try {
      const res = await adminGetBookingDetail(id);
      setBookingDetailModal({ isOpen: true, data: res?.data?.data, loading: false });
    } catch (err) {
      alert('Failed to load booking detail: ' + err.message);
      setBookingDetailModal({ isOpen: false, data: null, loading: false });
    }
  };

  // Load Payments
  const loadPayments = async () => {
    setPaymentsLoading(true);
    try {
      const res = await adminGetPayments();
      setPayments(res?.data?.data?.payments || []);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Load Invoices
  const loadInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const res = await adminGetInvoices();
      setInvoices(res?.data?.data?.invoices || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Load Reviews
  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await adminGetReviews();
      setReviews(res?.data?.data?.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Load Disputes
  const loadDisputes = async () => {
    setDisputesLoading(true);
    try {
      const res = await adminGetDisputes();
      setDisputes(res?.data?.data?.disputes || []);
    } catch (err) {
      console.error('Failed to load disputes:', err);
    } finally {
      setDisputesLoading(false);
    }
  };

  // Load Reports
  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const res = await adminGetReports();
      setReports(res?.data?.data || null);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  // Lifecycle Data Fetching per Tab
  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'customers') loadCustomers();
    if (activeTab === 'technicians') loadTechnicians();
    if (activeTab === 'services') loadServices();
    if (activeTab === 'bookings') loadBookings();
    if (activeTab === 'payments') loadPayments();
    if (activeTab === 'invoices') loadInvoices();
    if (activeTab === 'reviews') loadReviews();
    if (activeTab === 'disputes') loadDisputes();
    if (activeTab === 'reports') loadReports();
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            🛡️ Platform Administration Console
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">System Control &amp; Moderation</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Logged in as <strong>{mongoUser?.email || 'abc@gmail.com'}</strong> • Role: <span className="text-purple-400 font-bold">ADMIN</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-white hover:bg-slate-800 text-xs"
            onClick={() => {
              loadOverview();
              if (activeTab === 'customers') loadCustomers();
              if (activeTab === 'technicians') loadTechnicians();
              if (activeTab === 'services') loadServices();
              if (activeTab === 'bookings') loadBookings();
              if (activeTab === 'payments') loadPayments();
              if (activeTab === 'invoices') loadInvoices();
              if (activeTab === 'reviews') loadReviews();
              if (activeTab === 'disputes') loadDisputes();
              if (activeTab === 'reports') loadReports();
            }}
          >
            🔄 Refresh Live Data
          </Button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-b border-slate-200 overflow-x-auto no-scrollbar pb-px">
        <nav className="flex space-x-2 sm:space-x-4 min-w-max">
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'customers', label: '👥 Customers' },
            { id: 'technicians', label: '🔧 Technicians' },
            { id: 'services', label: '🛠️ Services' },
            { id: 'bookings', label: '📅 Bookings' },
            { id: 'payments', label: '💳 Payments' },
            { id: 'invoices', label: '🧾 Invoices' },
            { id: 'reviews', label: '⭐ Reviews' },
            { id: 'disputes', label: '⚖️ Disputes' },
            { id: 'reports', label: '📈 Reports' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                window.location.hash = tab.id;
              }}
              className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-xs underline hover:opacity-75">
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. OVERVIEW TAB: Real-Time MongoDB Statistics Cards */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Platform Core Statistics</h2>
            <span className="text-xs font-semibold text-slate-400">Live MongoDB Aggregation</span>
          </div>

          {overviewLoading ? (
            <div className="py-12">
              <Loading text="Querying database metrics..." />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
              
              {/* Total Customers */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Customers</span>
                <div className="text-3xl font-black text-slate-900 mt-1">{overview?.totalCustomers ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Registered home service accounts</p>
              </div>

              {/* Total Technicians */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Technicians</span>
                <div className="text-3xl font-black text-blue-600 mt-1">{overview?.totalTechnicians ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Contractors on platform</p>
              </div>

              {/* Pending Verification */}
              <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Pending Verification</span>
                <div className="text-3xl font-black text-amber-600 mt-1">{overview?.pendingVerification ?? 0}</div>
                <p className="text-[11px] text-amber-700 mt-0.5">Requires admin background approval</p>
              </div>

              {/* Active Bookings */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Bookings</span>
                <div className="text-3xl font-black text-slate-900 mt-1">{overview?.activeBookings ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Scheduled, inspection, &amp; in progress</p>
              </div>

              {/* Completed Bookings */}
              <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Completed Bookings</span>
                <div className="text-3xl font-black text-emerald-600 mt-1">{overview?.completedBookings ?? 0}</div>
                <p className="text-[11px] text-emerald-700 mt-0.5">Verified &amp; confirmed jobs</p>
              </div>

              {/* Total Payment Volume */}
              <div className="bg-white p-5 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Total Payment Volume</span>
                <div className="text-3xl font-black text-indigo-600 mt-1">₹{(overview?.totalPaymentVolume ?? 0).toLocaleString('en-IN')}</div>
                <p className="text-[11px] text-indigo-700 mt-0.5">INR settled transactions</p>
              </div>

              {/* Successful Payments */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Successful Payments</span>
                <div className="text-3xl font-black text-emerald-600 mt-1">{overview?.successfulPayments ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Completed checkout payments</p>
              </div>

              {/* Failed Payments */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Failed Payments</span>
                <div className="text-3xl font-black text-red-500 mt-1">{overview?.failedPayments ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Declined / cancelled attempts</p>
              </div>

              {/* Open Disputes */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Open Disputes</span>
                <div className="text-3xl font-black text-purple-600 mt-1">{overview?.openDisputes ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Customer / technician mediation cases</p>
              </div>

            </div>
          )}

          {/* AI Insights Panel (Feature 3) — Informational only */}
          <div className="mt-2 border border-indigo-200 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50/80 to-purple-50/70">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <div>
                  <h3 className="text-sm font-bold text-indigo-950">AI Platform Insights</h3>
                  <p className="text-[11px] text-indigo-500">Informational summaries only. AI does not make decisions.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={aiSummaryType}
                  onChange={(e) => setAiSummaryType(e.target.value)}
                  className="text-[11px] px-2 py-1 rounded-lg border border-indigo-200 bg-white text-indigo-800 font-medium"
                >
                  <option value="bookings">Booking Summary</option>
                  <option value="disputes">Dispute Summary</option>
                  <option value="service_trends">Service Trends</option>
                  <option value="general">General Overview</option>
                </select>
                <button
                  onClick={() => handleAiSummary(aiSummaryType)}
                  disabled={aiSummaryLoading}
                  className="text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  {aiSummaryLoading ? <><span className="animate-spin inline-block">⚙️</span> Generating...</> : <><span>✨</span> Generate</>}
                </button>
              </div>
            </div>

            <div className="px-5 py-4 min-h-[80px]">
              {aiSummaryLoading && (
                <div className="flex items-center gap-2 text-indigo-600 text-sm">
                  <span className="animate-spin text-base">⚙️</span>
                  <span>Generating AI insights from platform data...</span>
                </div>
              )}
              {aiSummaryError && !aiSummaryLoading && (
                <div className="flex items-center justify-between">
                  <p className="text-amber-700 text-xs">{aiSummaryError}</p>
                  <button onClick={() => setAiSummaryError('')} className="text-amber-400 hover:text-amber-600 text-xs ml-2">✕</button>
                </div>
              )}
              {aiSummary && !aiSummaryLoading && (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900 text-sm">{aiSummary.headline}</p>
                  <ul className="space-y-1">
                    {aiSummary.insights?.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="text-indigo-400 mt-0.5 shrink-0">›</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-slate-400 italic pt-1 border-t border-indigo-100">{aiSummary.disclaimer} · Generated {aiSummary.generatedAt ? new Date(aiSummary.generatedAt).toLocaleTimeString('en-IN') : ''}</p>
                </div>
              )}
              {!aiSummary && !aiSummaryLoading && !aiSummaryError && (
                <p className="text-xs text-indigo-400">Select a summary type and click Generate to get an AI-powered platform overview.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CUSTOMERS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'customers' && (
        <Card
          title="Customer Accounts Directory"
          subtitle="All registered homeowners, service bookings history, and lifetime volume"
        >
          {customersLoading ? (
            <div className="py-12"><Loading text="Loading customers..." /></div>
          ) : customers.length === 0 ? (
            <EmptyState title="No Customers Found" description="No customer accounts registered yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Registration Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Bookings</th>
                    <th className="py-3 px-4 text-right">Payment Volume</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">{c.email}</td>
                      <td className="py-3 px-4">{c.phone}</td>
                      <td className="py-3 px-4">{new Date(c.registrationDate).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">{c.bookingsCount}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">₹{c.paymentVolume.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs py-1 px-2.5 font-bold"
                          onClick={() => handleOpenCustomer(c._id)}
                        >
                          View Detail →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. TECHNICIANS TAB: Including Pending Verification Filter & Actions */}
      {/* ========================================================================= */}
      {activeTab === 'technicians' && (
        <Card
          title="Technicians Registry & Verification Console"
          subtitle="Inspect trade background, verify credentials, and approve or reject technician accounts"
          headerAction={
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setTechFilter(st);
                    loadTechnicians(st);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    techFilter === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'PENDING' ? '⏳ Pending Verification' : st}
                </button>
              ))}
            </div>
          }
        >
          {techniciansLoading ? (
            <div className="py-12"><Loading text="Loading technicians..." /></div>
          ) : technicians.length === 0 ? (
            <EmptyState title="No Technicians Found" description={`No technicians matching status '${techFilter}'.`} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Contact Details</th>
                    <th className="py-3 px-4">Profession</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4 text-center">Completed Jobs</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {technicians.map((t) => {
                    const statusColors = {
                      VERIFIED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
                      REJECTED: 'bg-red-100 text-red-800 border-red-200',
                      SUSPENDED: 'bg-slate-200 text-slate-800 border-slate-300'
                    };

                    return (
                      <tr key={t._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{t.businessName || t.userId?.name}</div>
                          <div className="text-[11px] text-slate-400">Account: {t.userId?.name}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div>{t.userId?.email}</div>
                          <div className="text-slate-500">{t.userId?.phone || 'No phone'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                            {t.profession || 'General Technician'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{t.experience || `${t.experienceYears || 1} yrs`}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[t.status] || 'bg-slate-100 text-slate-800'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-500">
                          ★ {t.rating?.average ? t.rating.average.toFixed(1) : '5.0'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{t.completedJobs || 0}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {t.status !== 'VERIFIED' && (
                              <Button
                                size="sm"
                                variant="primary"
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-2.5 text-xs"
                                disabled={actionLoading === t._id}
                                onClick={() => handleUpdateTechnicianStatus(t._id, 'VERIFIED')}
                              >
                                ✓ Approve
                              </Button>
                            )}
                            {t.status !== 'REJECTED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50 py-1 px-2.5 text-xs"
                                disabled={actionLoading === t._id}
                                onClick={() => handleUpdateTechnicianStatus(t._id, 'REJECTED')}
                              >
                                ✕ Reject
                              </Button>
                            )}
                            {t.status === 'VERIFIED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-300 text-slate-700 hover:bg-slate-100 py-1 px-2.5 text-xs"
                                disabled={actionLoading === t._id}
                                onClick={() => handleUpdateTechnicianStatus(t._id, 'SUSPENDED')}
                              >
                                Suspend
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. SERVICES TAB: View, Create, Edit, Activate/Deactivate */}
      {/* ========================================================================= */}
      {activeTab === 'services' && (
        <Card
          title="Service Catalog Management"
          subtitle="View, create, edit, and activate/deactivate services from database records"
          headerAction={
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                setServiceModal({
                  isOpen: true,
                  isEditing: false,
                  serviceId: null,
                  data: { name: '', description: '', minPrice: 299, maxPrice: 1999 }
                })
              }
            >
              + Create New Service
            </Button>
          }
        >
          {servicesLoading ? (
            <div className="py-12"><Loading text="Loading services..." /></div>
          ) : services.length === 0 ? (
            <EmptyState title="No Services Found" description="No service records found in database." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Estimated Price Range</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                        <div className="text-[11px] text-slate-400">{s.description || 'Standard service'}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {s.categoryId?.name || 'General Home Services'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        ₹{s.estimatedPriceRange?.min || 299} - ₹{s.estimatedPriceRange?.max || 1999}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs py-1 px-2.5"
                            onClick={() =>
                              setServiceModal({
                                isOpen: true,
                                isEditing: true,
                                serviceId: s._id,
                                data: {
                                  name: s.name,
                                  description: s.description || '',
                                  minPrice: s.estimatedPriceRange?.min || 299,
                                  maxPrice: s.estimatedPriceRange?.max || 1999
                                }
                              })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={s.status === 'ACTIVE' ? 'secondary' : 'primary'}
                            className="text-xs py-1 px-2.5"
                            onClick={() => handleToggleService(s._id)}
                          >
                            {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. BOOKINGS TAB: All Bookings with Full Lifecycle */}
      {/* ========================================================================= */}
      {activeTab === 'bookings' && (
        <Card
          title="All Platform Bookings"
          subtitle="Real-time 15-state lifecycle supervision, customer, technician, and payment status"
        >
          {bookingsLoading ? (
            <div className="py-12"><Loading text="Loading bookings..." /></div>
          ) : bookings.length === 0 ? (
            <EmptyState title="No Bookings Found" description="Zero service bookings created yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Booking ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {b.bookingNumber || b._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{b.customerId?.name || 'Customer'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{b.technicianId?.name || 'Technician'}</td>
                      <td className="py-3 px-4">{b.serviceId?.name || 'Service'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                          {b.paymentStatus || 'UNPAID'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{b.pricing?.totalPrice || b.pricing?.estimatedTotal || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs py-1 px-2.5 font-bold"
                          onClick={() => handleOpenBooking(b._id)}
                        >
                          Lifecycle Details →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6. PAYMENTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <Card
          title="Payment Transactions"
          subtitle="All transactions processed across the platform (INR / DEMO Gateway)"
        >
          {paymentsLoading ? (
            <div className="py-12"><Loading text="Loading payments..." /></div>
          ) : payments.length === 0 ? (
            <EmptyState title="No Payments Found" description="Zero payment transactions recorded yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4">Booking</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Currency</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.paymentReference || p._id.slice(-6).toUpperCase()}</td>
                      <td className="py-3 px-4 font-mono">{p.bookingId?.bookingNumber || 'Booking'}</td>
                      <td className="py-3 px-4">{p.customerId?.name || 'Customer'}</td>
                      <td className="py-3 px-4">{p.technicianId?.name || 'Technician'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">₹{p.amount}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">INR</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px]">DEMO</span></td>
                      <td className="py-3 px-4 font-mono text-[10px]">{p.gatewayPaymentId || p._id}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 7. INVOICES TAB */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <Card
          title="Customer Invoices"
          subtitle="GST-compliant billing invoices generated upon completed services"
        >
          {invoicesLoading ? (
            <div className="py-12"><Loading text="Loading invoices..." /></div>
          ) : invoices.length === 0 ? (
            <EmptyState title="No Invoices Found" description="Zero invoices generated yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Items Count</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-mono">{inv.bookingId?.bookingNumber || 'N/A'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{inv.customerId?.name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{inv.technicianId?.name}</td>
                      <td className="py-3 px-4 text-center">{inv.items?.length || 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">₹{inv.totalAmount}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 8. REVIEWS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'reviews' && (
        <Card
          title="Customer Feedback & Reviews"
          subtitle="Verified service quality ratings and testimonials"
        >
          {reviewsLoading ? (
            <div className="py-12"><Loading text="Loading reviews..." /></div>
          ) : reviews.length === 0 ? (
            <EmptyState title="No Reviews Found" description="Zero customer reviews submitted yet." />
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r._id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 font-bold">★ {r.rating}</span>
                      <span className="text-xs font-bold text-slate-900">{r.customerId?.name || 'Customer'}</span>
                      <span className="text-slate-400 text-[11px]">reviewed</span>
                      <span className="text-xs font-bold text-blue-600">{r.technicianId?.name || 'Technician'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="text-xs text-slate-700 italic">"{r.comment || 'Great service.'}"</p>
                  <div className="text-[10px] text-slate-400 font-mono">Booking Ref: {r.bookingId?.bookingNumber || r.bookingId?._id}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 9. DISPUTES TAB */}
      {/* ========================================================================= */}
      {activeTab === 'disputes' && (
        <Card
          title="Dispute Arbitration Console"
          subtitle="Inspect open complaints, reasons, and arbitrate between customer and technician"
        >
          {disputesLoading ? (
            <div className="py-12"><Loading text="Loading disputes..." /></div>
          ) : disputes.length === 0 ? (
            <EmptyState title="No Active Disputes" description="Zero disputes or complaints reported on the platform." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Dispute #</th>
                    <th className="py-3 px-4">Booking</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {disputes.map((d) => (
                    <tr key={d._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-red-600">{d.disputeNumber || d._id.slice(-6).toUpperCase()}</td>
                      <td className="py-3 px-4 font-mono">{d.bookingId?.bookingNumber || 'N/A'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{d.raisedById?.name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{d.respondentId?.name}</td>
                      <td className="py-3 px-4 text-slate-700">{d.reason || 'Service dispute'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 10. REPORTS TAB: Real MongoDB Aggregation Data */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {reportsLoading ? (
            <div className="py-12"><Loading text="Aggregating reports..." /></div>
          ) : !reports ? (
            <EmptyState title="Reports Unavailable" description="Failed to compile reports." />
          ) : (
            <>
              {/* Metric Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400 uppercase">Total Bookings</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{reports.totalBookings}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-emerald-600 uppercase">Completed Jobs</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{reports.completedJobs}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-rose-600 uppercase">Cancelled Jobs</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">{reports.cancelledJobs}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-blue-600 uppercase">Payment Statuses</span>
                  <div className="text-xs text-slate-600 mt-1">
                    {reports.paymentSummary?.map((p) => (
                      <div key={p._id} className="flex justify-between">
                        <span>{p._id}:</span>
                        <span className="font-bold">{p.count} (₹{p.volume})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Services & Technicians */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Top Services by Bookings" subtitle="Most frequently requested trade services">
                  <div className="space-y-2 text-xs">
                    {reports.topServices?.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                        <span className="font-bold text-slate-800">{s.name}</span>
                        <span className="font-black text-blue-600">{s.count} requests</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Top Technicians by Completed Jobs" subtitle="Contractors with the highest completed jobs count">
                  <div className="space-y-2 text-xs">
                    {reports.topTechnicians?.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                        <span className="font-bold text-slate-800">{t.name}</span>
                        <span className="font-black text-emerald-600">{t.completedJobs} completed</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Recent Customers & Technicians */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Recently Joined Customers" subtitle="New homeowner registrations">
                  <div className="space-y-2 text-xs">
                    {reports.newCustomers?.map((c) => (
                      <div key={c._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-800">{c.name}</div>
                          <div className="text-[11px] text-slate-400">{c.email}</div>
                        </div>
                        <span className="text-slate-500">{new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Recently Registered Technicians" subtitle="New contractor applications">
                  <div className="space-y-2 text-xs">
                    {reports.newTechnicians?.map((t) => (
                      <div key={t._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-800">{t.businessName || t.userId?.name}</div>
                          <div className="text-[11px] text-indigo-600 font-semibold">{t.profession}</div>
                        </div>
                        <span className="text-slate-500">{new Date(t.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOMER DETAIL MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={customerModal.isOpen}
        onClose={() => setCustomerModal({ isOpen: false, data: null, loading: false })}
        title="Customer Dossier & Full Activity"
      >
        {customerModal.loading ? (
          <div className="py-8"><Loading text="Retrieving customer data..." /></div>
        ) : !customerModal.data ? (
          <div className="text-xs text-slate-500">Customer record not found.</div>
        ) : (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Name</span>
                <span className="font-bold text-sm text-slate-900">{customerModal.data.customer?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Email</span>
                <span className="font-mono text-slate-800">{customerModal.data.customer?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Phone</span>
                <span className="text-slate-800">{customerModal.data.customer?.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Registered</span>
                <span className="text-slate-800">{new Date(customerModal.data.customer?.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">Bookings ({customerModal.data.bookings?.length || 0})</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {customerModal.data.bookings?.map((b) => (
                  <div key={b._id} className="p-2.5 rounded-lg bg-white border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-blue-600 mr-2">{b.bookingNumber}</span>
                      <span className="text-slate-800">{b.serviceId?.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-700">{b.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">Payments ({customerModal.data.payments?.length || 0})</h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {customerModal.data.payments?.map((p) => (
                  <div key={p._id} className="p-2.5 rounded-lg bg-white border border-slate-200 flex justify-between items-center">
                    <span className="font-mono">{p.paymentReference}</span>
                    <span className="font-bold text-emerald-600">₹{p.amount} ({p.status})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="secondary" onClick={() => setCustomerModal({ isOpen: false, data: null, loading: false })}>
                Close Dossier
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* SERVICE CREATE / EDIT MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={serviceModal.isOpen}
        onClose={() => setServiceModal({ ...serviceModal, isOpen: false })}
        title={serviceModal.isEditing ? 'Edit Database Service' : 'Create New Service'}
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <Input
            label="Service Name"
            required
            placeholder="e.g. Smart Microwave Repair"
            value={serviceModal.data.name}
            onChange={(e) => setServiceModal({ ...serviceModal, data: { ...serviceModal.data, name: e.target.value } })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-800"
              placeholder="Scope of work and standard diagnostics..."
              value={serviceModal.data.description}
              onChange={(e) => setServiceModal({ ...serviceModal, data: { ...serviceModal.data, description: e.target.value } })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Starting Price (₹)"
              type="number"
              required
              value={serviceModal.data.minPrice}
              onChange={(e) => setServiceModal({ ...serviceModal, data: { ...serviceModal.data, minPrice: e.target.value } })}
            />
            <Input
              label="Max Price (₹)"
              type="number"
              required
              value={serviceModal.data.maxPrice}
              onChange={(e) => setServiceModal({ ...serviceModal, data: { ...serviceModal.data, maxPrice: e.target.value } })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setServiceModal({ ...serviceModal, isOpen: false })}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {serviceModal.isEditing ? 'Save Changes' : 'Create Service Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* BOOKING DETAIL / 15-STATE LIFECYCLE MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={bookingDetailModal.isOpen}
        onClose={() => setBookingDetailModal({ isOpen: false, data: null, loading: false })}
        title="Comprehensive Booking Lifecycle Dossier"
      >
        {bookingDetailModal.loading ? (
          <div className="py-8"><Loading text="Retrieving booking details..." /></div>
        ) : !bookingDetailModal.data ? (
          <div className="text-xs text-slate-500">Booking record not found.</div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-blue-900 text-sm">{bookingDetailModal.data.booking?.bookingNumber}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600 text-white">
                  {bookingDetailModal.data.booking?.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                <div><strong>Service:</strong> {bookingDetailModal.data.booking?.serviceId?.name}</div>
                <div><strong>Scheduled:</strong> {new Date(bookingDetailModal.data.booking?.scheduledDate).toLocaleDateString('en-IN')}</div>
                <div><strong>Customer:</strong> {bookingDetailModal.data.booking?.customerId?.name} ({bookingDetailModal.data.booking?.customerId?.email})</div>
                <div><strong>Technician:</strong> {bookingDetailModal.data.booking?.technicianId?.name} ({bookingDetailModal.data.booking?.technicianId?.phone || 'No phone'})</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">Issue Description:</span>
              <p className="text-slate-600 italic">"{bookingDetailModal.data.booking?.problemDescription}"</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">Service Address:</span>
              <p className="text-slate-600">
                {bookingDetailModal.data.booking?.address?.addressLine1 || bookingDetailModal.data.booking?.address?.streetAddress}, {bookingDetailModal.data.booking?.address?.city}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link to={`/bookings/${bookingDetailModal.data.booking?._id}`} target="_blank">
                <Button size="sm" variant="outline">
                  Open Interactive View ↗
                </Button>
              </Link>
              <Button size="sm" variant="secondary" onClick={() => setBookingDetailModal({ isOpen: false, data: null, loading: false })}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default AdminDashboardPage;

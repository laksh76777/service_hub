import React, { useState, useEffect, useMemo } from 'react';
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
  adminUpdateDisputeStatus,
  adminGetWarranties,
  adminGetWarrantyClaims,
  adminUpdateWarrantyClaimStatus,
  adminGetReports,
  adminAiSummary
} from '../services/api';

const AdminDashboardPage = ({ initialTab = 'overview' }) => {
  const { mongoUser } = useAuth();
  const location = useLocation();

  // Tab State (sync with hash or prop if provided)
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
      'warranty',
      'disputes',
      'reviews',
      'reports',
      'profile'
    ];
    if (validTabs.includes(hash)) return hash;
    if (validTabs.includes(initialTab)) return initialTab;
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
  const [serviceModal, setServiceModal] = useState({
    isOpen: false,
    isEditing: false,
    serviceId: null,
    data: { name: '', description: '', minPrice: 299, maxPrice: 1999 }
  });

  const [bookings, setBookings] = useState([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingDetailModal, setBookingDetailModal] = useState({ isOpen: false, data: null, loading: false });

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState({ isOpen: false, data: null });

  const [warranties, setWarranties] = useState([]);
  const [warrantiesLoading, setWarrantiesLoading] = useState(false);
  const [warrantyClaims, setWarrantyClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [warrantySubTab, setWarrantySubTab] = useState('claims'); // 'claims' or 'warranties'
  const [claimFilter, setClaimFilter] = useState('ALL');
  const [claimModal, setClaimModal] = useState({
    isOpen: false,
    data: null,
    status: 'UNDER_REVIEW',
    resolutionDetails: '',
    loading: false
  });

  const [disputes, setDisputes] = useState([]);
  const [disputeFilter, setDisputeFilter] = useState('ALL');
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputeModal, setDisputeModal] = useState({
    isOpen: false,
    data: null,
    status: 'UNDER_REVIEW',
    resolutionNotes: '',
    loading: false
  });

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [reports, setReports] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [feedback, setFeedback] = useState(null);

  // Informational AI Summary
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
      const ov = res?.data?.data || res?.data || res;
      if (ov) {
        setOverview(ov);
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
      const list = res?.data?.customers || res?.data?.data?.customers || res?.customers || [];
      setCustomers(list);
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
      const cust = res?.data?.customer || res?.data?.data?.customer || res?.data?.data || res?.data;
      setCustomerModal({ isOpen: true, data: cust, loading: false });
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
      const list = res?.data?.technicians || res?.data?.data?.technicians || res?.technicians || [];
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
      loadTechnicians(techFilter);
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
      const list = res?.data?.services || res?.data?.data?.services || res?.services || [];
      setServices(list);
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
      setServiceModal({
        isOpen: false,
        isEditing: false,
        serviceId: null,
        data: { name: '', description: '', minPrice: 299, maxPrice: 1999 }
      });
      loadServices();
      loadOverview();
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
  const loadBookings = async (status = bookingStatusFilter) => {
    setBookingsLoading(true);
    try {
      const params = status !== 'ALL' ? { status } : {};
      const res = await adminGetBookings(params);
      const list = res?.data?.bookings || res?.data?.data?.bookings || res?.bookings || [];
      setBookings(list);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  // View Booking Details Dossier
  const handleOpenBooking = async (id) => {
    setBookingDetailModal({ isOpen: true, data: null, loading: true });
    try {
      const res = await adminGetBookingDetail(id);
      const bkgData = res?.data?.data || res?.data;
      setBookingDetailModal({ isOpen: true, data: bkgData, loading: false });
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
      const list = res?.data?.payments || res?.data?.data?.payments || res?.payments || [];
      setPayments(list);
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
      const list = res?.data?.invoices || res?.data?.data?.invoices || res?.invoices || [];
      setInvoices(list);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Load Warranties & Claims
  const loadWarranties = async () => {
    setWarrantiesLoading(true);
    try {
      const res = await adminGetWarranties();
      const list = res?.data?.warranties || res?.data?.data?.warranties || res?.warranties || [];
      setWarranties(list);
    } catch (err) {
      console.error('Failed to load warranties:', err);
    } finally {
      setWarrantiesLoading(false);
    }
  };

  const loadWarrantyClaims = async (status = claimFilter) => {
    setClaimsLoading(true);
    try {
      const params = status !== 'ALL' ? { status } : {};
      const res = await adminGetWarrantyClaims(params);
      const list = res?.data?.claims || res?.data?.data?.claims || res?.claims || [];
      setWarrantyClaims(list);
    } catch (err) {
      console.error('Failed to load warranty claims:', err);
    } finally {
      setClaimsLoading(false);
    }
  };

  // Update Warranty Claim Status
  const handleUpdateClaimStatus = async (e) => {
    e.preventDefault();
    if (!claimModal.data?._id) return;
    try {
      await adminUpdateWarrantyClaimStatus(claimModal.data._id, {
        status: claimModal.status,
        resolutionDetails: claimModal.resolutionDetails
      });
      setFeedback({ type: 'success', text: `Warranty claim status updated to ${claimModal.status}.` });
      setClaimModal({ isOpen: false, data: null, status: 'UNDER_REVIEW', resolutionDetails: '', loading: false });
      loadWarrantyClaims(claimFilter);
      loadOverview();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update claim status.');
    }
  };

  // Load Disputes
  const loadDisputes = async (status = disputeFilter) => {
    setDisputesLoading(true);
    try {
      const params = status !== 'ALL' ? { status } : {};
      const res = await adminGetDisputes(params);
      const list = res?.data?.disputes || res?.data?.data?.disputes || res?.disputes || [];
      setDisputes(list);
    } catch (err) {
      console.error('Failed to load disputes:', err);
    } finally {
      setDisputesLoading(false);
    }
  };

  // Update Dispute Status
  const handleUpdateDisputeStatus = async (e) => {
    e.preventDefault();
    if (!disputeModal.data?._id) return;
    try {
      await adminUpdateDisputeStatus(disputeModal.data._id, {
        status: disputeModal.status,
        resolutionNotes: disputeModal.resolutionNotes
      });
      setFeedback({ type: 'success', text: `Dispute status updated to ${disputeModal.status}.` });
      setDisputeModal({ isOpen: false, data: null, status: 'UNDER_REVIEW', resolutionNotes: '', loading: false });
      loadDisputes(disputeFilter);
      loadOverview();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update dispute status.');
    }
  };

  // Load Reviews
  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await adminGetReviews();
      const list = res?.data?.reviews || res?.data?.data?.reviews || res?.reviews || [];
      setReviews(list);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Load Reports
  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const res = await adminGetReports();
      const rep = res?.data?.data || res?.data || null;
      setReports(rep);
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
    if (activeTab === 'technicians') loadTechnicians(techFilter);
    if (activeTab === 'services') loadServices();
    if (activeTab === 'bookings') loadBookings(bookingStatusFilter);
    if (activeTab === 'payments') loadPayments();
    if (activeTab === 'invoices') loadInvoices();
    if (activeTab === 'warranty') {
      loadWarranties();
      loadWarrantyClaims(claimFilter);
    }
    if (activeTab === 'disputes') loadDisputes(disputeFilter);
    if (activeTab === 'reviews') loadReviews();
    if (activeTab === 'reports') loadReports();
  }, [activeTab]);

  // Filtered dataset helpers using searchTerm
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const q = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q)
    );
  }, [customers, searchTerm]);

  const filteredTechnicians = useMemo(() => {
    if (!searchTerm.trim()) return technicians;
    const q = searchTerm.toLowerCase();
    return technicians.filter(
      (t) =>
        t.businessName?.toLowerCase().includes(q) ||
        t.userId?.name?.toLowerCase().includes(q) ||
        t.userId?.email?.toLowerCase().includes(q) ||
        t.profession?.toLowerCase().includes(q)
    );
  }, [technicians, searchTerm]);

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return services;
    const q = searchTerm.toLowerCase();
    return services.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.categoryId?.name?.toLowerCase().includes(q)
    );
  }, [services, searchTerm]);

  const filteredBookings = useMemo(() => {
    if (!searchTerm.trim()) return bookings;
    const q = searchTerm.toLowerCase();
    return bookings.filter(
      (b) =>
        b.bookingNumber?.toLowerCase().includes(q) ||
        b.customerId?.name?.toLowerCase().includes(q) ||
        b.customerId?.email?.toLowerCase().includes(q) ||
        b.technicianId?.name?.toLowerCase().includes(q) ||
        b.serviceId?.name?.toLowerCase().includes(q)
    );
  }, [bookings, searchTerm]);

  const filteredPayments = useMemo(() => {
    if (!searchTerm.trim()) return payments;
    const q = searchTerm.toLowerCase();
    return payments.filter(
      (p) =>
        p.paymentReference?.toLowerCase().includes(q) ||
        p.gatewayPaymentId?.toLowerCase().includes(q) ||
        p.bookingId?.bookingNumber?.toLowerCase().includes(q) ||
        p.customerId?.name?.toLowerCase().includes(q)
    );
  }, [payments, searchTerm]);

  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices;
    const q = searchTerm.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.bookingId?.bookingNumber?.toLowerCase().includes(q) ||
        inv.customerId?.name?.toLowerCase().includes(q) ||
        inv.technicianId?.name?.toLowerCase().includes(q)
    );
  }, [invoices, searchTerm]);

  const filteredWarranties = useMemo(() => {
    if (!searchTerm.trim()) return warranties;
    const q = searchTerm.toLowerCase();
    return warranties.filter(
      (w) =>
        w.warrantyCode?.toLowerCase().includes(q) ||
        w.bookingId?.bookingNumber?.toLowerCase().includes(q) ||
        w.customerId?.name?.toLowerCase().includes(q) ||
        w.technicianId?.name?.toLowerCase().includes(q)
    );
  }, [warranties, searchTerm]);

  const filteredClaims = useMemo(() => {
    if (!searchTerm.trim()) return warrantyClaims;
    const q = searchTerm.toLowerCase();
    return warrantyClaims.filter(
      (c) =>
        c.claimNumber?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.customerId?.name?.toLowerCase().includes(q) ||
        c.bookingId?.bookingNumber?.toLowerCase().includes(q)
    );
  }, [warrantyClaims, searchTerm]);

  const filteredDisputes = useMemo(() => {
    if (!searchTerm.trim()) return disputes;
    const q = searchTerm.toLowerCase();
    return disputes.filter(
      (d) =>
        d.disputeNumber?.toLowerCase().includes(q) ||
        d.reason?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.bookingId?.bookingNumber?.toLowerCase().includes(q) ||
        d.raisedById?.name?.toLowerCase().includes(q)
    );
  }, [disputes, searchTerm]);

  const filteredReviews = useMemo(() => {
    if (!searchTerm.trim()) return reviews;
    const q = searchTerm.toLowerCase();
    return reviews.filter(
      (r) =>
        r.customerId?.name?.toLowerCase().includes(q) ||
        r.technicianId?.name?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q)
    );
  }, [reviews, searchTerm]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Operations Header Banner */}
      <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-950 text-white p-6 sm:p-8 rounded-[28px] shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-cyan-400/10 to-transparent pointer-events-none" />
        <div>
          <div className="inline-flex items-center gap-2 bg-cyan-400/10 text-cyan-200 border border-cyan-300/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
            Platform Operations &amp; Oversight Console
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">System Control &amp; Moderation</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Logged in as <strong>{mongoUser?.email || 'abc@gmail.com'}</strong> • Role: <span className="text-cyan-300 font-black">ADMIN</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/20 hover:!border-white/30 text-xs"
            onClick={() => {
              loadOverview();
              if (activeTab === 'customers') loadCustomers();
              if (activeTab === 'technicians') loadTechnicians(techFilter);
              if (activeTab === 'services') loadServices();
              if (activeTab === 'bookings') loadBookings(bookingStatusFilter);
              if (activeTab === 'payments') loadPayments();
              if (activeTab === 'invoices') loadInvoices();
              if (activeTab === 'warranty') {
                loadWarranties();
                loadWarrantyClaims(claimFilter);
              }
              if (activeTab === 'disputes') loadDisputes(disputeFilter);
              if (activeTab === 'reviews') loadReviews();
              if (activeTab === 'reports') loadReports();
            }}
          >
            🔄 Refresh Live Data
          </Button>
        </div>
      </div>

      {/* Global Quick Search Bar */}
      {activeTab !== 'overview' && activeTab !== 'reports' && activeTab !== 'profile' && (
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search across ${activeTab}... (e.g. name, email, booking ref, status)`}
            className="w-full text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5 rounded"
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Feedback Alert */}
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
      {/* 1. DASHBOARD OVERVIEW: All 11 Real Database Statistics Cards */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Platform Overview &amp; Live Key Metrics</h2>
            <span className="text-xs font-semibold text-slate-400">Queried Directly from MongoDB Atlas</span>
          </div>

          {overviewLoading ? (
            <div className="py-12">
              <Loading text="Querying database metrics..." />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              
              {/* 1. Total Customers */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Customers</span>
                <div className="text-3xl font-black text-slate-900 mt-1">{overview?.totalCustomers ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Registered home service accounts</p>
              </div>

              {/* 2. Total Technicians */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Technicians</span>
                <div className="text-3xl font-black text-blue-600 mt-1">{overview?.totalTechnicians ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Contractors on platform</p>
              </div>

              {/* 3. Total Services */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Services</span>
                <div className="text-3xl font-black text-indigo-600 mt-1">{overview?.totalServices ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Catalog service offerings</p>
              </div>

              {/* 4. Total Bookings */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Bookings</span>
                <div className="text-3xl font-black text-slate-900 mt-1">{overview?.totalBookings ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Lifetime platform bookings</p>
              </div>

              {/* 5. Active Bookings */}
              <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Active Bookings</span>
                <div className="text-3xl font-black text-blue-600 mt-1">{overview?.activeBookings ?? 0}</div>
                <p className="text-[11px] text-blue-700 mt-0.5">Inspection, estimate, &amp; in progress</p>
              </div>

              {/* 6. Completed Bookings */}
              <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Completed Bookings</span>
                <div className="text-3xl font-black text-emerald-600 mt-1">{overview?.completedBookings ?? 0}</div>
                <p className="text-[11px] text-emerald-700 mt-0.5">Verified &amp; fulfilled services</p>
              </div>

              {/* 7. Pending Payments */}
              <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Pending Payments</span>
                <div className="text-3xl font-black text-amber-600 mt-1">{overview?.pendingPayments ?? 0}</div>
                <p className="text-[11px] text-amber-700 mt-0.5">Awaiting demo checkout</p>
              </div>

              {/* 8. Successful Payments */}
              <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Successful Payments</span>
                <div className="text-3xl font-black text-emerald-600 mt-1">{overview?.successfulPayments ?? 0}</div>
                <p className="text-[11px] text-emerald-700 mt-0.5">Settled demo transactions</p>
              </div>

              {/* 9. Total Revenue (PAYMENT_SUCCESS only, INR) */}
              <div className="bg-white p-5 rounded-2xl border border-violet-200 bg-violet-50/20 shadow-2xs">
                <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wider block">Total Revenue</span>
                <div className="text-3xl font-black text-violet-600 mt-1">₹{(overview?.totalRevenue ?? 0).toLocaleString('en-IN')}</div>
                <p className="text-[11px] text-violet-700 mt-0.5">From successful payments (INR)</p>
              </div>

              {/* 10. Open Disputes */}
              <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Open Disputes</span>
                <div className="text-3xl font-black text-rose-600 mt-1">{overview?.openDisputes ?? 0}</div>
                <p className="text-[11px] text-rose-700 mt-0.5">Mediation cases requiring action</p>
              </div>

              {/* 11. Active Warranty Claims */}
              <div className="bg-white p-5 rounded-2xl border border-orange-200 bg-orange-50/20 shadow-2xs">
                <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider block">Active Warranty Claims</span>
                <div className="text-3xl font-black text-orange-600 mt-1">{overview?.activeWarrantyClaims ?? 0}</div>
                <p className="text-[11px] text-orange-700 mt-0.5">Claims under investigation</p>
              </div>

              {/* Pending Technician Approvals */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Verification</span>
                <div className="text-3xl font-black text-slate-700 mt-1">{overview?.pendingVerification ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Contractors awaiting approval</p>
              </div>

            </div>
          )}

          {/* AI Insights Panel — Informational only */}
          <div className="mt-4 border border-indigo-200 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50/80 to-purple-50/70">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <div>
                  <h3 className="text-sm font-bold text-indigo-950">AI Platform Insights</h3>
                  <p className="text-[11px] text-indigo-500">Informational summaries only. AI does not make operational decisions.</p>
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
                  <span>Generating AI insights from platform metrics...</span>
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
                <p className="text-xs text-indigo-400">Select a summary type and click Generate to view automated platform analysis.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CUSTOMERS TAB: View details, metrics, location, secrets hidden */}
      {/* ========================================================================= */}
      {activeTab === 'customers' && (
        <Card
          title="Customer Accounts Directory"
          subtitle="Customer profiles, booking volume, completed jobs, and total amount paid"
        >
          {customersLoading ? (
            <div className="py-12"><Loading text="Loading customers..." /></div>
          ) : filteredCustomers.length === 0 ? (
            <EmptyState title="No Customers Found" description="No customer accounts match your search." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-center">Bookings</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">{c.email}</td>
                      <td className="py-3 px-4">{c.phone}</td>
                      <td className="py-3 px-4">{c.location}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{new Date(c.registrationDate).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">{c.bookingsCount}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">{c.completedBookings || 0}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">₹{(c.totalAmountPaid || c.paymentVolume || 0).toLocaleString('en-IN')}</td>
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
      {/* 3. TECHNICIANS TAB: Verification, Moderation, Profile Details */}
      {/* ========================================================================= */}
      {activeTab === 'technicians' && (
        <Card
          title="Technicians Registry &amp; Verification Console"
          subtitle="Verify credentials, moderate contractor status, and inspect background records"
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
                  {st === 'PENDING' ? '⏳ Pending Review' : st}
                </button>
              ))}
            </div>
          }
        >
          {techniciansLoading ? (
            <div className="py-12"><Loading text="Loading technicians..." /></div>
          ) : filteredTechnicians.length === 0 ? (
            <EmptyState title="No Technicians Found" description={`No technicians matching status '${techFilter}'.`} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Profession</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4 text-center">Services</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4 text-center">Bookings</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-right">Verification Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTechnicians.map((t) => {
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
                          <div className="text-slate-500">{t.phone || t.userId?.phone || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                            {t.profession || 'General Technician'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{t.experience || `${t.experienceYears || 1} yrs`}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {t.servicesOfferedCount || (Array.isArray(t.servicesOffered) ? t.servicesOffered.length : 0)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[t.verificationStatus || t.status] || 'bg-slate-100 text-slate-800'}`}>
                            {t.verificationStatus || t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-500">
                          ★ {t.rating?.average ? t.rating.average.toFixed(1) : '5.0'} ({t.rating?.count || 0})
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{t.bookingsCount || 0}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">{t.completedJobs || 0}</td>
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
                                ✓ Verify
                              </Button>
                            )}
                            {t.status !== 'REJECTED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50 py-1 px-2.5 text-xs font-bold"
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
      {/* 4. SERVICES TAB: Create, Edit, Activate/Deactivate, Technicians/Bookings count */}
      {/* ========================================================================= */}
      {activeTab === 'services' && (
        <Card
          title="Service Catalog Management"
          subtitle="Database service catalog, linked technician count, booking frequency, and activation controls"
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
          ) : filteredServices.length === 0 ? (
            <EmptyState title="No Services Found" description="No services match your search." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price Range (INR)</th>
                    <th className="py-3 px-4 text-center">Technicians Offering</th>
                    <th className="py-3 px-4 text-center">Total Bookings</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredServices.map((s) => (
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
                      <td className="py-3 px-4 text-center font-bold text-blue-600">
                        {s.techniciansCount ?? 0}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {s.bookingsCount ?? 0}
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
                            className="text-xs py-1 px-2.5 font-bold"
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
                            className="text-xs py-1 px-2.5 font-bold"
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
      {/* 5. BOOKINGS TAB: Platform-wide Bookings with Deep Lifecycle Dossier */}
      {/* ========================================================================= */}
      {activeTab === 'bookings' && (
        <Card
          title="Platform Bookings Oversight"
          subtitle="Real-time lifecycle supervision with customer, technician, schedule, and payment details"
          headerAction={
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'REQUESTED', 'ACCEPTED', 'INSPECTION', 'PAYMENT_PENDING', 'WORK_IN_PROGRESS', 'WORK_COMPLETED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setBookingStatusFilter(st);
                    loadBookings(st);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    bookingStatusFilter === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          }
        >
          {bookingsLoading ? (
            <div className="py-12"><Loading text="Loading bookings..." /></div>
          ) : filteredBookings.length === 0 ? (
            <EmptyState title="No Bookings Found" description="No bookings match your current filter or search criteria." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Scheduled</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => (
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
                      <td className="py-3 px-4">{new Date(b.scheduledDate || b.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.pricing?.isPaid || b.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                          {b.pricing?.isPaid ? 'PAID' : (b.paymentStatus || 'UNPAID')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{b.pricing?.totalPrice || b.pricing?.finalAmount || b.pricing?.estimatedTotal || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs py-1 px-2.5 font-bold"
                          onClick={() => handleOpenBooking(b._id)}
                        >
                          Dossier Details →
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
      {/* 6. PAYMENTS TAB: Simulated DEMO mode clearly labeled */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <Card
          title="Payment Transactions Ledger"
          subtitle="Authoritative transaction records (Simulated DEMO Mode Gateway • INR)"
          headerAction={
            <div className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <span>⚡</span> Simulated Gateway (DEMO Mode Only)
            </div>
          }
        >
          {paymentsLoading ? (
            <div className="py-12"><Loading text="Loading payments..." /></div>
          ) : filteredPayments.length === 0 ? (
            <EmptyState title="No Payments Found" description="Zero payment transactions match your query." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Payment Ref</th>
                    <th className="py-3 px-4">Booking</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4 font-bold">Amount (INR)</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.paymentReference || p._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-mono">{p.bookingId?.bookingNumber || 'Booking'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.customerId?.name || 'Customer'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.technicianId?.name || 'Technician'}</td>
                      <td className="py-3 px-4 font-black text-slate-900">₹{p.amount}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[10px]">
                          DEMO (Simulated)
                        </span>
                      </td>
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
      {/* 7. INVOICES TAB: View, search, inspect read-only GST invoices */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <Card
          title="Customer Invoices"
          subtitle="Authoritative invoices generated upon completion (INV-YYYY-XXXXXX format)"
        >
          {invoicesLoading ? (
            <div className="py-12"><Loading text="Loading invoices..." /></div>
          ) : filteredInvoices.length === 0 ? (
            <EmptyState title="No Invoices Found" description="Zero invoices match your search." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-mono">{inv.bookingId?.bookingNumber || 'N/A'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{inv.customerId?.name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{inv.technicianId?.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{inv.items?.length || 1}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">₹{inv.totalAmount}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs py-1 px-2.5 font-bold"
                          onClick={() => setInvoiceModal({ isOpen: true, data: inv })}
                        >
                          View Invoice
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
      {/* 8. WARRANTY & CLAIMS TAB: Claims moderation, status updates, terms */}
      {/* ========================================================================= */}
      {activeTab === 'warranty' && (
        <Card
          title="Warranty &amp; Claims Oversight Console"
          subtitle="Inspect active warranty periods, review filed warranty claims, and arbitrate claim decisions"
          headerAction={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWarrantySubTab('claims')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  warrantySubTab === 'claims'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ⚖️ Warranty Claims ({filteredClaims.length})
              </button>
              <button
                type="button"
                onClick={() => setWarrantySubTab('warranties')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  warrantySubTab === 'warranties'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🛡️ All Active Warranties ({filteredWarranties.length})
              </button>
            </div>
          }
        >
          {warrantySubTab === 'claims' ? (
            <div className="space-y-4">
              {/* Claims Status Filter */}
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 mr-2">Filter Claim Status:</span>
                {['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setClaimFilter(st);
                      loadWarrantyClaims(st);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      claimFilter === st
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              {claimsLoading ? (
                <div className="py-12"><Loading text="Loading warranty claims..." /></div>
              ) : filteredClaims.length === 0 ? (
                <EmptyState title="No Claims Found" description="Zero warranty claims match your status or search filter." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Claim #</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Technician</th>
                        <th className="py-3 px-4">Booking Ref</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date Filed</th>
                        <th className="py-3 px-4 text-right">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClaims.map((c) => {
                        const claimColors = {
                          OPEN: 'bg-amber-100 text-amber-800 border-amber-200',
                          UNDER_REVIEW: 'bg-blue-100 text-blue-800 border-blue-200',
                          RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                          REJECTED: 'bg-red-100 text-red-800 border-red-200'
                        };

                        return (
                          <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.claimNumber}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900">{c.customerId?.name || 'Customer'}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900">{c.technicianId?.name || 'Technician'}</td>
                            <td className="py-3 px-4 font-mono">{c.bookingId?.bookingNumber || 'N/A'}</td>
                            <td className="py-3 px-4 max-w-xs truncate text-slate-700">{c.description}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${claimColors[c.status] || 'bg-slate-100 text-slate-700'}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs py-1 px-2.5 font-bold"
                                onClick={() =>
                                  setClaimModal({
                                    isOpen: true,
                                    data: c,
                                    status: c.status,
                                    resolutionDetails: c.resolutionDetails || '',
                                    loading: false
                                  })
                                }
                              >
                                Inspect / Arbitrate →
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {warrantiesLoading ? (
                <div className="py-12"><Loading text="Loading active warranties..." /></div>
              ) : filteredWarranties.length === 0 ? (
                <EmptyState title="No Warranties Found" description="Zero warranties found in the database." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Warranty Code</th>
                        <th className="py-3 px-4">Booking Ref</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Technician</th>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Start Date</th>
                        <th className="py-3 px-4">End Date</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredWarranties.map((w) => (
                        <tr key={w._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700">{w.warrantyCode}</td>
                          <td className="py-3 px-4 font-mono">{w.bookingId?.bookingNumber || 'N/A'}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{w.customerId?.name}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{w.technicianId?.name}</td>
                          <td className="py-3 px-4 font-bold">{w.warrantyPeriod || `${w.durationDays || 30} days`}</td>
                          <td className="py-3 px-4">{new Date(w.startDate).toLocaleDateString('en-IN')}</td>
                          <td className="py-3 px-4 font-semibold">{new Date(w.endDate).toLocaleDateString('en-IN')}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {w.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 9. DISPUTES TAB: Customer/Technician mediation, security, arbitration */}
      {/* ========================================================================= */}
      {activeTab === 'disputes' && (
        <Card
          title="Dispute Arbitration Console"
          subtitle="Arbitrate customer-contractor complaints with full audit logging and status controls"
          headerAction={
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setDisputeFilter(st);
                    loadDisputes(st);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    disputeFilter === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          }
        >
          {disputesLoading ? (
            <div className="py-12"><Loading text="Loading disputes..." /></div>
          ) : filteredDisputes.length === 0 ? (
            <EmptyState title="No Active Disputes" description="Zero disputes match your filter or search criteria." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Dispute #</th>
                    <th className="py-3 px-4">Booking</th>
                    <th className="py-3 px-4">Raised By</th>
                    <th className="py-3 px-4">Against</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Arbitration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDisputes.map((d) => {
                    const dispColors = {
                      OPEN: 'bg-amber-100 text-amber-800 border-amber-200',
                      UNDER_REVIEW: 'bg-blue-100 text-blue-800 border-blue-200',
                      RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      REJECTED: 'bg-red-100 text-red-800 border-red-200',
                      CLOSED: 'bg-slate-100 text-slate-700 border-slate-200'
                    };

                    return (
                      <tr key={d._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-red-600">{d.disputeNumber || d._id.slice(-6).toUpperCase()}</td>
                        <td className="py-3 px-4 font-mono">{d.bookingId?.bookingNumber || 'N/A'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {d.raisedById?.name} ({d.raisedById?.role || 'User'})
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {d.againstId?.name || d.respondentId?.name}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{d.reason || 'Service dispute'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${dispColors[d.status] || 'bg-slate-100 text-slate-800'}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs py-1 px-2.5 font-bold"
                            onClick={() =>
                              setDisputeModal({
                                isOpen: true,
                                data: d,
                                status: d.status,
                                resolutionNotes: d.resolutionNotes || '',
                                loading: false
                              })
                            }
                          >
                            Inspect &amp; Arbitrate →
                          </Button>
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
      {/* 10. REVIEWS TAB: Customer feedback oversight */}
      {/* ========================================================================= */}
      {activeTab === 'reviews' && (
        <Card
          title="Customer Feedback &amp; Verified Reviews"
          subtitle="Real reviews submitted upon service completion with rating breakdown"
        >
          {reviewsLoading ? (
            <div className="py-12"><Loading text="Loading reviews..." /></div>
          ) : filteredReviews.length === 0 ? (
            <EmptyState title="No Reviews Found" description="Zero reviews match your search." />
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((r) => (
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
                  <p className="text-xs text-slate-700 italic">"{r.comment || 'Verified job review.'}"</p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Booking: {r.bookingId?.bookingNumber || r.bookingId?._id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 11. REPORTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {reportsLoading ? (
            <div className="py-12"><Loading text="Aggregating reports..." /></div>
          ) : !reports ? (
            <EmptyState title="Reports Unavailable" description="Failed to compile reports." />
          ) : (
            <>
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
                  <span className="text-xs font-bold text-blue-600 uppercase">Payment Summary</span>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Top Services by Bookings" subtitle="Most frequently requested services">
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
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. PROFILE TAB */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Administrator Credentials &amp; Profile</h2>
            <p className="text-xs text-slate-500">Platform-wide management permissions and authorization role.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="System Administrator" subtitle="Authorized platform control account">
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Administrator Name:</span>
                  <span className="font-bold text-slate-900">{mongoUser?.name || 'Platform Administrator'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Admin Email:</span>
                  <span className="font-mono text-indigo-700 font-bold">{mongoUser?.email || 'abc@gmail.com'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Role:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                    ADMIN
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Security Clearance:</span>
                  <span className="text-emerald-700 font-semibold">Tier 1 Full Platform Access</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500 font-medium">Database:</span>
                  <span className="text-slate-700 font-mono">MongoDB Atlas (Encrypted TLS)</span>
                </div>
              </div>
            </Card>

            <Card title="Administrative Capabilities" subtitle="Protected backend operations">
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <span className="text-purple-600 font-bold">✓</span>
                  <span><strong>Technician Verification:</strong> Verify or reject contractor profiles and manage platform eligibility.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-purple-600 font-bold">✓</span>
                  <span><strong>Catalog Management:</strong> Create, edit, and toggle platform home services.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-purple-600 font-bold">✓</span>
                  <span><strong>Lifecycle Oversight:</strong> Supervise bookings across all 15 states from request to completion.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-purple-600 font-bold">✓</span>
                  <span><strong>Warranty &amp; Claims:</strong> Arbitrate customer warranty claims and verify terms.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-purple-600 font-bold">✓</span>
                  <span><strong>Dispute Mediation:</strong> Arbitrate complaints raised by customers or technicians.</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOMER DETAIL MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={customerModal.isOpen}
        onClose={() => setCustomerModal({ isOpen: false, data: null, loading: false })}
        title="Customer Dossier &amp; Full Activity"
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
      {/* COMPREHENSIVE BOOKING DOSSIER MODAL (All 9 Items) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={bookingDetailModal.isOpen}
        onClose={() => setBookingDetailModal({ isOpen: false, data: null, loading: false })}
        title="Comprehensive Booking Lifecycle Dossier"
      >
        {bookingDetailModal.loading ? (
          <div className="py-8"><Loading text="Retrieving booking dossier..." /></div>
        ) : !bookingDetailModal.data ? (
          <div className="text-xs text-slate-500">Booking record not found.</div>
        ) : (
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Header / Identity */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-blue-900 text-sm">
                  {bookingDetailModal.data.booking?.bookingNumber || bookingDetailModal.data.booking?._id}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600 text-white">
                  {bookingDetailModal.data.booking?.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                <div><strong>Service:</strong> {bookingDetailModal.data.booking?.serviceId?.name}</div>
                <div><strong>Scheduled:</strong> {new Date(bookingDetailModal.data.booking?.scheduledDate || bookingDetailModal.data.booking?.createdAt).toLocaleDateString('en-IN')}</div>
                <div><strong>Customer:</strong> {bookingDetailModal.data.booking?.customerId?.name} ({bookingDetailModal.data.booking?.customerId?.email})</div>
                <div><strong>Technician:</strong> {bookingDetailModal.data.booking?.technicianId?.name} ({bookingDetailModal.data.booking?.technicianId?.phone || 'N/A'})</div>
              </div>
            </div>

            {/* 1. Problem Description */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">1. Reported Problem Description:</span>
              <p className="text-slate-600 italic">"{bookingDetailModal.data.booking?.problemDescription || 'No description provided.'}"</p>
            </div>

            {/* 2. Inspection */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">2. Inspection Findings:</span>
              {bookingDetailModal.data.booking?.inspection?.notes ? (
                <div className="space-y-1">
                  <p className="text-slate-700"><strong>Notes:</strong> {bookingDetailModal.data.booking.inspection.notes}</p>
                  <p className="text-[11px] text-slate-400">
                    Inspected: {bookingDetailModal.data.booking.inspection.completedAt ? new Date(bookingDetailModal.data.booking.inspection.completedAt).toLocaleString('en-IN') : 'Completed'}
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 italic">No inspection findings recorded yet.</p>
              )}
            </div>

            {/* 3. Estimate */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">3. Approved Cost Estimate:</span>
              <div className="grid grid-cols-3 gap-2 pt-1 text-slate-700">
                <div>Labor: ₹{bookingDetailModal.data.booking?.pricing?.laborCharge || 0}</div>
                <div>Materials: ₹{bookingDetailModal.data.booking?.pricing?.partsCharge || 0}</div>
                <div className="font-bold text-slate-900">Total: ₹{bookingDetailModal.data.booking?.pricing?.totalPrice || bookingDetailModal.data.booking?.pricing?.estimatedTotal || 0}</div>
              </div>
            </div>

            {/* 4. Payment */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">4. Payment Transaction:</span>
              {bookingDetailModal.data.payments?.length > 0 ? (
                <div className="space-y-1">
                  {bookingDetailModal.data.payments.map((p) => (
                    <div key={p._id} className="flex justify-between items-center text-[11px]">
                      <span className="font-mono font-bold text-slate-800">{p.paymentReference} (DEMO)</span>
                      <span className="font-bold text-emerald-600">₹{p.amount} • {p.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">Payment Status: {bookingDetailModal.data.booking?.paymentStatus || 'UNPAID'}</p>
              )}
            </div>

            {/* 5. Work Execution */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">5. Work Execution &amp; Completion Notes:</span>
              {bookingDetailModal.data.booking?.jobExecution?.workPerformed ? (
                <div className="space-y-1 text-slate-700">
                  <p><strong>Work Performed:</strong> {bookingDetailModal.data.booking.jobExecution.workPerformed}</p>
                  {bookingDetailModal.data.booking.jobExecution.partsUsed?.length > 0 && (
                    <div>
                      <strong>Parts Used:</strong>
                      <ul className="list-disc pl-4 text-[11px]">
                        {bookingDetailModal.data.booking.jobExecution.partsUsed.map((pt, idx) => (
                          <li key={idx}>{pt.name} (Qty: {pt.quantity}, Cost: ₹{pt.cost})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {bookingDetailModal.data.booking.jobExecution.completionNotes && (
                    <p><strong>Completion Notes:</strong> {bookingDetailModal.data.booking.jobExecution.completionNotes}</p>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 italic">Work execution details will appear upon commencement and completion.</p>
              )}
            </div>

            {/* 6. Invoice */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">6. Invoice:</span>
              {bookingDetailModal.data.invoices?.length > 0 ? (
                <div>
                  {bookingDetailModal.data.invoices.map((inv) => (
                    <div key={inv._id} className="flex justify-between items-center text-[11px]">
                      <span className="font-mono font-bold text-blue-600">{inv.invoiceNumber}</span>
                      <span className="font-bold text-slate-800">₹{inv.totalAmount} ({inv.status})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">Invoice generated automatically upon completion.</p>
              )}
            </div>

            {/* 7. Warranty */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">7. Warranty Coverage:</span>
              {bookingDetailModal.data.warranty ? (
                <div className="space-y-1 text-[11px] text-slate-700">
                  <div className="flex justify-between">
                    <span className="font-mono font-bold text-indigo-700">{bookingDetailModal.data.warranty.warrantyCode}</span>
                    <span className="font-bold text-emerald-600">{bookingDetailModal.data.warranty.status}</span>
                  </div>
                  <div>Period: {bookingDetailModal.data.warranty.warrantyPeriod} (Valid until {new Date(bookingDetailModal.data.warranty.endDate).toLocaleDateString('en-IN')})</div>
                </div>
              ) : (
                <p className="text-slate-400 italic">Warranty coverage active post service completion.</p>
              )}
            </div>

            {/* 8. Customer Review */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">8. Customer Review:</span>
              {bookingDetailModal.data.reviews?.length > 0 ? (
                <div className="space-y-1 text-[11px]">
                  {bookingDetailModal.data.reviews.map((r) => (
                    <div key={r._id} className="flex justify-between items-center">
                      <span className="text-amber-500 font-bold">★ {r.rating}</span>
                      <span className="text-slate-700 italic">"{r.comment}"</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No customer review submitted yet.</p>
              )}
            </div>

            {/* 9. Timeline */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-2">9. Lifecycle Status Timeline:</span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {bookingDetailModal.data.booking?.statusHistory?.map((sh, idx) => (
                  <div key={idx} className="flex justify-between items-center p-1.5 rounded bg-white border border-slate-100 text-[10px]">
                    <span className="font-bold text-slate-800">{sh.newStatus || sh.status}</span>
                    <span className="text-slate-400">{new Date(sh.timestamp).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link to={`/bookings/${bookingDetailModal.data.booking?._id}`} target="_blank">
                <Button size="sm" variant="outline">
                  Open Interactive View ↗
                </Button>
              </Link>
              <Button size="sm" variant="secondary" onClick={() => setBookingDetailModal({ isOpen: false, data: null, loading: false })}>
                Close Dossier
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* INVOICE VIEW MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={invoiceModal.isOpen}
        onClose={() => setInvoiceModal({ isOpen: false, data: null })}
        title="Authoritative Customer Invoice"
      >
        {!invoiceModal.data ? (
          <div className="text-xs text-slate-500">Invoice not found.</div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice Number</span>
                <span className="font-mono font-bold text-blue-900 text-sm">{invoiceModal.data.invoiceNumber}</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${invoiceModal.data.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {invoiceModal.data.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-700">
              <div>
                <strong>Customer:</strong> {invoiceModal.data.customerId?.name}
              </div>
              <div>
                <strong>Technician:</strong> {invoiceModal.data.technicianId?.name}
              </div>
              <div>
                <strong>Booking Ref:</strong> {invoiceModal.data.bookingId?.bookingNumber || 'N/A'}
              </div>
              <div>
                <strong>Issue Date:</strong> {new Date(invoiceModal.data.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>

            <div className="border-t border-b border-slate-200 py-3 space-y-2">
              <div className="font-bold text-slate-900">Line Items Breakdown (Read-Only):</div>
              {invoiceModal.data.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-700">
                  <span>{it.description || it.name || 'Service Item'}</span>
                  <span className="font-mono font-bold">₹{it.amount}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 font-black text-slate-900 text-sm border-t border-slate-100">
                <span>Total Amount Paid:</span>
                <span>₹{invoiceModal.data.totalAmount}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setInvoiceModal({ isOpen: false, data: null })}>
                Close Invoice
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* WARRANTY CLAIM ARBITRATION MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={claimModal.isOpen}
        onClose={() => setClaimModal({ isOpen: false, data: null, status: 'UNDER_REVIEW', resolutionDetails: '', loading: false })}
        title="Warranty Claim Arbitration"
      >
        {!claimModal.data ? (
          <div className="text-xs text-slate-500">Claim not found.</div>
        ) : (
          <form onSubmit={handleUpdateClaimStatus} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-slate-900">{claimModal.data.claimNumber}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Current: {claimModal.data.status}
                </span>
              </div>
              <div><strong>Customer:</strong> {claimModal.data.customerId?.name} ({claimModal.data.customerId?.email})</div>
              <div><strong>Technician:</strong> {claimModal.data.technicianId?.name}</div>
              <div><strong>Booking Ref:</strong> {claimModal.data.bookingId?.bookingNumber || 'N/A'}</div>
              <div><strong>Date Filed:</strong> {new Date(claimModal.data.createdAt).toLocaleString('en-IN')}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Customer Claim Description:</label>
              <div className="p-3 rounded-xl bg-slate-100 text-slate-800 italic">
                "{claimModal.data.description}"
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Update Status:</label>
              <select
                value={claimModal.status}
                onChange={(e) => setClaimModal({ ...claimModal, status: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl"
              >
                <option value="OPEN">OPEN</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Resolution Details &amp; Findings:</label>
              <textarea
                rows={3}
                required
                value={claimModal.resolutionDetails}
                onChange={(e) => setClaimModal({ ...claimModal, resolutionDetails: e.target.value })}
                placeholder="Enter formal arbitration findings or instructions..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setClaimModal({ isOpen: false, data: null, status: 'UNDER_REVIEW', resolutionDetails: '', loading: false })}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Arbitration Decision
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* DISPUTE ARBITRATION MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={disputeModal.isOpen}
        onClose={() => setDisputeModal({ isOpen: false, data: null, status: 'UNDER_REVIEW', resolutionNotes: '', loading: false })}
        title="Dispute Arbitration &amp; Resolution"
      >
        {!disputeModal.data ? (
          <div className="text-xs text-slate-500">Dispute not found.</div>
        ) : (
          <form onSubmit={handleUpdateDisputeStatus} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-red-600">{disputeModal.data.disputeNumber}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Current: {disputeModal.data.status}
                </span>
              </div>
              <div><strong>Raised By:</strong> {disputeModal.data.raisedById?.name} ({disputeModal.data.raisedById?.role || 'User'})</div>
              <div><strong>Against:</strong> {disputeModal.data.againstId?.name || disputeModal.data.respondentId?.name}</div>
              <div><strong>Reason:</strong> {disputeModal.data.reason}</div>
              <div><strong>Booking Ref:</strong> {disputeModal.data.bookingId?.bookingNumber || 'N/A'}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Dispute Description:</label>
              <div className="p-3 rounded-xl bg-slate-100 text-slate-800 italic">
                "{disputeModal.data.description}"
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Update Status:</label>
              <select
                value={disputeModal.status}
                onChange={(e) => setDisputeModal({ ...disputeModal, status: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl"
              >
                <option value="OPEN">OPEN</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Resolution Notes &amp; Mediation Outcome:</label>
              <textarea
                rows={3}
                required
                value={disputeModal.resolutionNotes}
                onChange={(e) => setDisputeModal({ ...disputeModal, resolutionNotes: e.target.value })}
                placeholder="Enter administrative review notes or resolution outcome..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDisputeModal({ isOpen: false, data: null, status: 'UNDER_REVIEW', resolutionNotes: '', loading: false })}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Resolution
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};

export default AdminDashboardPage;

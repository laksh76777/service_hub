import axios from 'axios';
import { auth } from '../config/firebase';

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'https://service-hub-backend-usb0.onrender.com/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to automatically attach Firebase ID Token
api.interceptors.request.use(
  async (config) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[API Interceptor] Failed to attach token:', err.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error formatting
api.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload && typeof payload === 'object' && !('data' in payload)) {
      try {
        Object.defineProperty(payload, 'data', {
          get() {
            return this;
          },
          configurable: true,
          enumerable: false
        });
      } catch {
        // ignore if non-extensible
      }
    }
    return payload;
  },
  (error) => {
    const customError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      status: error.response?.status || 500,
      data: error.response?.data || null
    };
    return Promise.reject(customError);
  }
);

export const checkApiHealth = () => api.get('/health');
export const checkDbHealth = () => api.get('/health/db');

// User profile API calls
export const getMe = () => api.get('/users/me');
export const updateMe = (data) => api.patch('/users/me', data);
export const syncUserProfile = (data) => api.post('/users/sync', data);

// Service Categories
export const getCategories = () => api.get('/categories');
export const getCategoryById = (id) => api.get(`/categories/${id}`);

// Services Marketplace
export const getServices = (params = {}) => api.get('/services', { params });
export const getServiceById = (id) => api.get(`/services/${id}`);

// Public Verified Technicians Directory
export const getTechnicians = (params = {}) => api.get('/technicians', { params });
export const getTechnicianById = (id) => api.get(`/technicians/${id}`);
export const getProviders = (params = {}) => api.get('/technicians', { params });
export const getProviderById = (id) => api.get(`/technicians/${id}`);

// Technician Portal Management
export const getMyTechnicianProfile = () => api.get('/technician/profile');
export const updateMyTechnicianProfile = (data) => api.patch('/technician/profile', data);
export const getMyProviderProfile = () => api.get('/technician/profile');
export const updateMyProviderProfile = (data) => api.patch('/technician/profile', data);
export const getMyServices = () => api.get('/technician/services');
export const addServiceOffering = (data) => api.post('/technician/services', data);
export const updateServiceOffering = (serviceId, data) => api.patch(`/technician/services/${serviceId}`, data);
export const removeServiceOffering = (serviceId) => api.delete(`/technician/services/${serviceId}`);

// Admin Moderation APIs located at bottom of file

// Booking APIs
export const createBooking = (data) => api.post('/bookings', data);
export const getBookings = (params = {}) => api.get('/bookings', { params });
export const getBookingById = (id) => api.get(`/bookings/${id}`);
export const updateBookingStatus = (id, data) => api.patch(`/bookings/${id}/status`, data);
export const rescheduleBooking = (id, data) => api.patch(`/bookings/${id}/reschedule`, data);
export const verifyBookingOtp = (id, data) => api.post(`/bookings/${id}/verify-otp`, data);
export const updateJobExecution = (id, data) => api.patch(`/bookings/${id}/job-execution`, data);
export const startInspection = (id) => api.patch(`/technician/jobs/${id}/start-inspection`);
export const saveInspection = (id, data) => api.patch(`/technician/jobs/${id}/inspection`, data);
export const startWork = (id) => api.patch(`/technician/jobs/${id}/start-work`);
export const saveWorkExecution = (id, data) => api.patch(`/technician/jobs/${id}/work-execution`, data);
export const completeWork = (id, data = {}) => api.patch(`/technician/jobs/${id}/complete-work`, data);

// Saved Addresses APIs
export const getMyAddresses = () => api.get('/addresses');
export const saveAddress = (data) => api.post('/addresses', data);
export const deleteAddress = (id) => api.delete(`/addresses/${id}`);

// Work Evidence & GridFS File APIs
export const uploadBookingEvidence = (bookingId, formData) =>
  api.post(`/bookings/${bookingId}/files`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
export const getBookingEvidence = (bookingId, category = '') =>
  api.get(`/bookings/${bookingId}/files${category ? `?category=${category}` : ''}`);
export const deleteBookingEvidence = (fileId) => api.delete(`/files/${fileId}`);

// Estimate APIs
export const createEstimate = (bookingId, data) => api.post(`/bookings/${bookingId}/estimates`, data);
export const getBookingEstimates = (bookingId) => api.get(`/bookings/${bookingId}/estimates`);
export const approveEstimate = (estimateId) => api.patch(`/estimates/${estimateId}/approve`);
export const rejectEstimate = (estimateId, data) => api.patch(`/estimates/${estimateId}/reject`, data);

// Invoice APIs
export const generateInvoice = (bookingId) => api.post(`/bookings/${bookingId}/invoices`);
export const getBookingInvoice = (bookingId) => api.get(`/bookings/${bookingId}/invoices`);
export const getInvoicePdfUrl = (invoiceId) => {
  const base = getApiBaseUrl();
  return `${base}/invoices/${invoiceId}/pdf`;
};

// Payment APIs (Phase 8 Demo Payment Gateway)
export const createPaymentOrder = (bookingId) => api.post('/payments/orders', { bookingId });
export const completePayment = (data) => api.post('/payments/complete', data);
export const getPaymentHistory = (bookingId) => api.get(`/payments/booking/${bookingId}`);
export const getPaymentById = (paymentId) => api.get(`/payments/${paymentId}`);

// Warranty APIs (Phase 9)
export const createWarranty = (data) => api.post('/warranties', data);
export const getBookingWarranty = (bookingId) => api.get(`/warranties/booking/${bookingId}`);
export const getWarrantyById = (warrantyId) => api.get(`/warranties/${warrantyId}`);
export const createWarrantyClaim = (warrantyId, data) => api.post(`/warranties/${warrantyId}/claims`, data);
export const updateWarrantyClaimStatus = (claimId, data) => api.patch(`/warranties/claims/${claimId}/status`, data);

// Dispute APIs (Phase 9)
export const createDispute = (data) => api.post('/disputes', data);
export const getDisputes = (params = {}) => api.get('/disputes', { params });
export const getBookingDispute = (bookingId) => api.get(`/disputes/booking/${bookingId}`);
export const getDisputeById = (disputeId) => api.get(`/disputes/${disputeId}`);
export const respondToDispute = (disputeId, data) => api.post(`/disputes/${disputeId}/respond`, data);
export const resolveDispute = (disputeId, data) => api.patch(`/disputes/${disputeId}/resolve`, data);

// Review APIs (Phase 9)
export const createReview = (data) => api.post('/reviews', data);
export const getBookingReview = (bookingId) => api.get(`/reviews/booking/${bookingId}`);
export const getTechnicianReviews = (technicianId) => api.get(`/reviews/technician/${technicianId}`);
export const getProviderReviews = (providerId) => api.get(`/reviews/technician/${providerId}`);

// Notification APIs (Phase 9)
export const getNotifications = (params = {}) => api.get('/notifications', { params });
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');

// AI APIs
// Feature 1: Customer problem description classification (no auth required)
export const classifyServiceRequest = (description) => api.post('/ai/classify-request', { description });
// Feature 2: Technician estimate assistance (auth: TECHNICIAN | ADMIN)
export const aiAssistEstimate = (inspectionNotes, serviceName = '') =>
  api.post('/ai/assist-estimate', { inspectionNotes, serviceName });
// Feature 3: Admin platform summary (auth: ADMIN)
export const adminAiSummary = (summaryType, overviewData = {}) =>
  api.post('/ai/admin-summary', { summaryType, overview: overviewData });


// Admin Console APIs
export const adminGetOverview = () => api.get('/admin/overview');
export const adminGetStats = () => api.get('/admin/overview');
export const adminGetCustomers = (params = {}) => api.get('/admin/customers', { params });
export const adminGetCustomerDetail = (id) => api.get(`/admin/customers/${id}`);
export const adminGetTechnicians = (params = {}) => api.get('/admin/technicians', { params });
export const adminGetProviders = (params = {}) => api.get('/admin/technicians', { params });
export const adminUpdateTechnicianStatus = (id, data) => api.patch(`/admin/technicians/${id}/status`, data);
export const adminUpdateProviderStatus = (id, data) => api.patch(`/admin/technicians/${id}/status`, data);
export const adminGetServices = () => api.get('/admin/services');
export const adminCreateService = (data) => api.post('/admin/services', data);
export const adminUpdateService = (id, data) => api.put(`/admin/services/${id}`, data);
export const adminToggleServiceStatus = (id) => api.patch(`/admin/services/${id}/status`);
export const adminGetBookings = (params = {}) => api.get('/admin/bookings', { params });
export const adminGetBookingDetail = (id) => api.get(`/admin/bookings/${id}`);
export const adminGetPayments = () => api.get('/admin/payments');
export const adminGetInvoices = () => api.get('/admin/invoices');
export const adminGetReviews = () => api.get('/admin/reviews');
export const adminGetDisputes = (params = {}) => api.get('/admin/disputes', { params });
export const adminUpdateDisputeStatus = (id, data) => api.patch(`/admin/disputes/${id}/status`, data);
export const adminGetWarranties = (params = {}) => api.get('/admin/warranties', { params });
export const adminGetWarrantyClaims = (params = {}) => api.get('/admin/warranties/claims', { params });
export const adminUpdateWarrantyClaimStatus = (claimId, data) => api.patch(`/admin/warranties/claims/${claimId}/status`, data);
export const adminGetReports = () => api.get('/admin/reports');
export const adminGetProfile = () => api.get('/admin/profile');

// Demo Accounts API
export const getDemoAccounts = () => api.get('/test/demo-accounts');

export default api;




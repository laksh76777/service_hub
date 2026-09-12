import axios from 'axios';
import { auth } from '../config/firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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
  (response) => response.data,
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

// Public Verified Providers Directory
export const getProviders = (params = {}) => api.get('/providers', { params });
export const getProviderById = (id) => api.get(`/providers/${id}`);

// Provider Portal Management
export const getMyProviderProfile = () => api.get('/provider/profile');
export const updateMyProviderProfile = (data) => api.patch('/provider/profile', data);
export const getMyServices = () => api.get('/provider/services');
export const addServiceOffering = (data) => api.post('/provider/services', data);
export const updateServiceOffering = (serviceId, data) => api.patch(`/provider/services/${serviceId}`, data);
export const removeServiceOffering = (serviceId) => api.delete(`/provider/services/${serviceId}`);

// Admin Moderation
export const adminGetProviders = (params = {}) => api.get('/admin/providers', { params });
export const adminUpdateProviderStatus = (id, data) => api.patch(`/admin/providers/${id}/status`, data);
export const adminCreateCategory = (data) => api.post('/categories', data);
export const adminCreateService = (data) => api.post('/services', data);

// Booking APIs
export const createBooking = (data) => api.post('/bookings', data);
export const getBookings = (params = {}) => api.get('/bookings', { params });
export const getBookingById = (id) => api.get(`/bookings/${id}`);
export const updateBookingStatus = (id, data) => api.patch(`/bookings/${id}/status`, data);
export const rescheduleBooking = (id, data) => api.patch(`/bookings/${id}/reschedule`, data);
export const verifyBookingOtp = (id, data) => api.post(`/bookings/${id}/verify-otp`, data);
export const updateJobExecution = (id, data) => api.patch(`/bookings/${id}/job-execution`, data);

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
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
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
export const createWarrantyClaim = (warrantyId, data) => api.post(`/warranties/${warrantyId}/claims`, data);
export const updateWarrantyClaimStatus = (claimId, data) => api.patch(`/warranties/claims/${claimId}/status`, data);

// Dispute APIs (Phase 9)
export const createDispute = (data) => api.post('/disputes', data);
export const getBookingDispute = (bookingId) => api.get(`/disputes/booking/${bookingId}`);
export const getDisputeById = (disputeId) => api.get(`/disputes/${disputeId}`);
export const respondToDispute = (disputeId, data) => api.post(`/disputes/${disputeId}/respond`, data);
export const resolveDispute = (disputeId, data) => api.patch(`/disputes/${disputeId}/resolve`, data);

// Review APIs (Phase 9)
export const createReview = (data) => api.post('/reviews', data);
export const getBookingReview = (bookingId) => api.get(`/reviews/booking/${bookingId}`);
export const getProviderReviews = (providerId) => api.get(`/reviews/provider/${providerId}`);

// Notification APIs (Phase 9)
export const getNotifications = (params = {}) => api.get('/notifications', { params });
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');

// AI Classification API (Phase 11)
export const classifyServiceRequest = (description) => api.post('/ai/classify-request', { description });

export default api;




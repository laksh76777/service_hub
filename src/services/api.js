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

export default api;

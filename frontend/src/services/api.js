import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

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

export default api;

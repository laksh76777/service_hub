import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import ServicesPage from './pages/ServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import ProvidersPage from './pages/ProvidersPage';
import ProviderDetailPage from './pages/ProviderDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProviderDashboardPage from './pages/ProviderDashboardPage';
import ProviderProfilePage from './pages/ProviderProfilePage';
import ProviderServicesPage from './pages/ProviderServicesPage';
import BookingDetailPage from './pages/BookingDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/:id" element={<ServiceDetailPage />} />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="providers/:id" element={<ProviderDetailPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="bookings/:id"
              element={
                <ProtectedRoute>
                  <BookingDetailPage />
                </ProtectedRoute>
              }
            />
            {/* Provider Portal Protected Routes */}
            <Route
              path="provider/dashboard"
              element={
                <ProtectedRoute allowedRoles={['PROVIDER', 'ADMIN']}>
                  <ProviderDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="provider/profile"
              element={
                <ProtectedRoute allowedRoles={['PROVIDER', 'ADMIN']}>
                  <ProviderProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="provider/services"
              element={
                <ProtectedRoute allowedRoles={['PROVIDER', 'ADMIN']}>
                  <ProviderServicesPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

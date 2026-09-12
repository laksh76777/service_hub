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
import DemoCheckoutPage from './pages/DemoCheckoutPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import HelpPage from './pages/HelpPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';
import NotificationsPage from './pages/NotificationsPage';
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
            <Route path="technicians" element={<ProvidersPage />} />
            <Route path="technicians/:id" element={<ProviderDetailPage />} />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="providers/:id" element={<ProviderDetailPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            
            {/* Informational Pages */}
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />

            {/* Customer Protected Routes */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <DashboardPage initialTab="overview" />
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
            <Route
              path="checkout/:bookingId"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <DemoCheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            {/* Admin Protected Dashboard */}
            <Route
              path="admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            {/* Technician Portal Protected Routes */}
            <Route
              path="technician/dashboard"
              element={
                <ProtectedRoute allowedRoles={['TECHNICIAN', 'PROVIDER']}>
                  <ProviderDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="technician/profile"
              element={
                <ProtectedRoute allowedRoles={['TECHNICIAN', 'PROVIDER']}>
                  <ProviderProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="technician/services"
              element={
                <ProtectedRoute allowedRoles={['TECHNICIAN', 'PROVIDER']}>
                  <ProviderServicesPage />
                </ProtectedRoute>
              }
            />
            {/* Backward-compatible legacy provider aliases */}
            <Route
              path="provider/dashboard"
              element={
                <ProtectedRoute allowedRoles={['TECHNICIAN', 'PROVIDER']}>
                  <ProviderDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="provider/profile"
              element={
                <ProtectedRoute allowedRoles={['TECHNICIAN', 'PROVIDER']}>
                  <ProviderProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="provider/services"
              element={
                <ProtectedRoute allowedRoles={['TECHNICIAN', 'PROVIDER']}>
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

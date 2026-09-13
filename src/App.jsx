import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import AuthLayout from './components/layout/AuthLayout';
import CustomerLayout from './components/layout/CustomerLayout';
import TechnicianLayout from './components/layout/TechnicianLayout';
import AdminLayout from './components/layout/AdminLayout';

// Auth & Guards
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import ServicesPage from './pages/ServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import ProvidersPage from './pages/ProvidersPage';
import ProviderDetailPage from './pages/ProviderDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Customer Pages
import DashboardPage from './pages/DashboardPage';
import BookingDetailPage from './pages/BookingDetailPage';
import DemoCheckoutPage from './pages/DemoCheckoutPage';
import NotificationsPage from './pages/NotificationsPage';

// Technician Pages
import ProviderDashboardPage from './pages/ProviderDashboardPage';
import ProviderProfilePage from './pages/ProviderProfilePage';
import ProviderServicesPage from './pages/ProviderServicesPage';

// Admin Pages
import AdminDashboardPage from './pages/AdminDashboardPage';

// Informational Pages
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import HelpPage from './pages/HelpPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ================================================================= */}
          {/* 1. PUBLIC ROUTES (PublicLayout: PublicNavbar + Landing Footer)    */}
          {/* ================================================================= */}
          <Route element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/:id" element={<ServiceDetailPage />} />
            <Route path="technicians" element={<ProvidersPage />} />
            <Route path="technicians/:id" element={<ProviderDetailPage />} />
            
            {/* Informational Pages */}
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />

            {/* Legacy aliases */}
            <Route path="providers" element={<Navigate to="/technicians" replace />} />
            <Route path="providers/:id" element={<Navigate to="/technicians" replace />} />
          </Route>

          {/* ================================================================= */}
          {/* 1B. AUTHENTICATION ROUTES (AuthLayout: Clean Navbar, No Footer)    */}
          {/* ================================================================= */}
          <Route element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>

          {/* ================================================================= */}
          {/* 2. CUSTOMER ROUTES (CustomerLayout: CustomerNavbar + Compact)     */}
          {/* ================================================================= */}
          <Route
            path="customer"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/customer/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage initialTab="overview" />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="technicians" element={<ProvidersPage />} />
            <Route path="technicians/:id" element={<ProviderDetailPage />} />
            <Route path="bookings" element={<DashboardPage initialTab="bookings" />} />
            <Route path="bookings/:id" element={<BookingDetailPage />} />
            <Route path="invoices" element={<DashboardPage initialTab="invoices" />} />
            <Route path="warranty" element={<DashboardPage initialTab="warranty" />} />
            <Route path="reviews" element={<DashboardPage initialTab="reviews" />} />
            <Route path="disputes" element={<DashboardPage initialTab="disputes" />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<DashboardPage initialTab="profile" />} />
            <Route path="bookings/:id/payment" element={<DemoCheckoutPage />} />
            <Route path="checkout/:bookingId" element={<DemoCheckoutPage />} />
          </Route>

          {/* ================================================================= */}
          {/* 3. TECHNICIAN ROUTES (TechnicianLayout: TechNavbar + Compact)     */}
          {/* ================================================================= */}
          <Route
            path="technician"
            element={
              <ProtectedRoute allowedRoles={['TECHNICIAN', 'PROVIDER']}>
                <TechnicianLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/technician/dashboard" replace />} />
            <Route path="dashboard" element={<ProviderDashboardPage initialTab="overview" />} />
            <Route path="requests" element={<ProviderDashboardPage initialTab="requests" />} />
            <Route path="jobs" element={<ProviderDashboardPage initialTab="jobs" />} />
            <Route path="jobs/:id" element={<BookingDetailPage />} />
            <Route path="jobs/:id/inspection" element={<BookingDetailPage />} />
            <Route path="jobs/:id/estimate" element={<BookingDetailPage />} />
            <Route path="earnings" element={<ProviderDashboardPage initialTab="earnings" />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProviderProfilePage />} />
            <Route path="services" element={<ProviderServicesPage />} />
          </Route>

          {/* ================================================================= */}
          {/* 4. ADMIN ROUTES (AdminLayout: AdminSidebar/Header + Minimal)       */}
          {/* ================================================================= */}
          <Route
            path="admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage initialTab="overview" />} />
            <Route path="customers" element={<AdminDashboardPage initialTab="customers" />} />
            <Route path="technicians" element={<AdminDashboardPage initialTab="technicians" />} />
            <Route path="services" element={<AdminDashboardPage initialTab="services" />} />
            <Route path="bookings" element={<AdminDashboardPage initialTab="bookings" />} />
            <Route path="payments" element={<AdminDashboardPage initialTab="payments" />} />
            <Route path="invoices" element={<AdminDashboardPage initialTab="invoices" />} />
            <Route path="reviews" element={<AdminDashboardPage initialTab="reviews" />} />
            <Route path="disputes" element={<AdminDashboardPage initialTab="disputes" />} />
            <Route path="reports" element={<AdminDashboardPage initialTab="reports" />} />
            <Route path="profile" element={<AdminDashboardPage initialTab="profile" />} />
          </Route>

          {/* ================================================================= */}
          {/* 5. LEGACY & CONVENIENCE REDIRECTS                                */}
          {/* ================================================================= */}
          <Route path="dashboard" element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="bookings/:id" element={<ProtectedRoute><BookingDetailPage /></ProtectedRoute>} />
          <Route path="checkout/:bookingId" element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="provider/*" element={<Navigate to="/technician/dashboard" replace />} />

          {/* 404 Catch-All */}
          <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

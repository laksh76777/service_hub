const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Strict RBAC: All Admin APIs unconditionally require ADMIN role
router.use(requireAuth);
router.use(requireRole(USER_ROLES.ADMIN));

// 1. Overview Statistics
router.get('/overview', adminController.getDashboardOverview);
router.get('/stats', adminController.getDashboardOverview);

// 2. Customers
router.get('/customers', adminController.getAllCustomers);
router.get('/customers/:id', adminController.getCustomerDetail);

// 3. Technicians (with backward compatible provider alias)
router.get('/technicians', adminController.getAllProviders);
router.patch('/technicians/:id/status', adminController.updateProviderStatus);
router.get('/providers', adminController.getAllProviders);
router.patch('/providers/:id/status', adminController.updateProviderStatus);

// 4. Services Management
router.get('/services', adminController.getAllServices);
router.post('/services', adminController.createService);
router.put('/services/:id', adminController.updateService);
router.patch('/services/:id/status', adminController.toggleServiceStatus);

// 5. Bookings
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/:id', adminController.getBookingDetail);

// 6. Payments
router.get('/payments', adminController.getAllPayments);

// 7. Invoices
router.get('/invoices', adminController.getAllInvoices);

// 8. Reviews
router.get('/reviews', adminController.getAllReviews);

// 9. Disputes
router.get('/disputes', adminController.getAllDisputes);

// 10. Reports
router.get('/reports', adminController.getReports);

module.exports = router;

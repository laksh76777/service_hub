const express = require('express');
const {
  generateInvoice,
  getInvoiceByBooking,
  getInvoiceById,
  downloadInvoicePdf
} = require('../controllers/invoiceController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Booking-level invoice operations
router.post('/bookings/:id/invoices', requireAuth, generateInvoice);
router.get('/bookings/:id/invoices', requireAuth, getInvoiceByBooking);

// Individual invoice operations & PDF streaming
router.get('/invoices/:id', requireAuth, getInvoiceById);
router.get('/invoices/:id/pdf', requireAuth, downloadInvoicePdf);

module.exports = router;

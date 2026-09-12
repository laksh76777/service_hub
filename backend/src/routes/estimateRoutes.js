const express = require('express');
const {
  createEstimate,
  getEstimatesByBooking,
  getEstimateById,
  approveEstimate,
  rejectEstimate
} = require('../controllers/estimateController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Booking-level estimate operations
router.post('/bookings/:id/estimates', requireAuth, createEstimate);
router.get('/bookings/:id/estimates', requireAuth, getEstimatesByBooking);

// Individual estimate operations
router.get('/estimates/:id', requireAuth, getEstimateById);
router.patch('/estimates/:id/approve', requireAuth, approveEstimate);
router.patch('/estimates/:id/reject', requireAuth, rejectEstimate);

module.exports = router;

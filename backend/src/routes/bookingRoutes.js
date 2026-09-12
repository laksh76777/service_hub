const express = require('express');
const {
  createBooking,
  getBookings,
  getBookingById,
  transitionBookingStatus,
  rescheduleBooking,
  verifyBookingOtp,
  updateJobExecution
} = require('../controllers/bookingController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// Apply authentication to all booking endpoints
router.use(requireAuth);

// Customer requests a service booking
router.post('/', requireRole(USER_ROLES.CUSTOMER), createBooking);

// User can view their list of bookings (filtered by role internally)
router.get('/', getBookings);

// User can view specific booking details
router.get('/:id', getBookingById);

// Transition booking status (validated by strict state machine)
router.patch('/:id/status', transitionBookingStatus);

// Reschedule booking date/time
router.patch('/:id/reschedule', rescheduleBooking);

// Dedicated OTP verification (Arrival / Completion)
router.post('/:id/verify-otp', verifyBookingOtp);

// Update technician job execution notes and parts
router.patch('/:id/job-execution', updateJobExecution);

module.exports = router;


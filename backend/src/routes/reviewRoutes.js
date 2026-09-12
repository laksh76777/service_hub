const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createReview,
  getReviewByBooking,
  getProviderReviews
} = require('../controllers/reviewController');

const router = express.Router();

// Publicly viewable provider reviews
router.get('/provider/:providerId', getProviderReviews);

// Authenticated endpoints
router.use(requireAuth);
router.post('/', createReview);
router.get('/booking/:bookingId', getReviewByBooking);

module.exports = router;

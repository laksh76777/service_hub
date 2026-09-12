const mongoose = require('mongoose');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const ProviderProfile = require('../models/ProviderProfile');
const notificationService = require('../services/notificationService');
const { BOOKING_STATUS, NOTIFICATION_TYPE } = require('../utils/constants');

/**
 * Customer reviews a provider after completed booking
 * POST /api/reviews
 */
const createReview = async (req, res) => {
  try {
    const { bookingId, rating, review: reviewText, comment } = req.body;
    const finalComment = (reviewText || comment || '').trim();

    if (!bookingId || rating === undefined || rating === null) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and rating (1-5) are required.'
      });
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.'
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // 1. Enforce: Only customer of this booking can review
    if ((booking.customerId?._id || booking.customerId)?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Customer can only review own completed booking.'
      });
    }

    // 2. Enforce: Review permitted only after completion/customer confirmation
    const eligibleStatuses = [
      BOOKING_STATUS.CUSTOMER_CONFIRMED,
      BOOKING_STATUS.WORK_COMPLETED,
      BOOKING_STATUS.INVOICED,
      BOOKING_STATUS.COMPLETED
    ];

    if (!eligibleStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Reviews can only be submitted for completed or customer-confirmed bookings. Current status: ${booking.status}`
      });
    }

    // 3. Enforce: Prevent providers reviewing themselves
    const techId = booking.technicianId?._id || booking.technicianId || booking.providerId?._id || booking.providerId;
    if (techId?.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Technicians are strictly prohibited from reviewing themselves.'
      });
    }

    // 4. Enforce: Exactly one review per completed booking
    const existingReview = await Review.findOne({ bookingId: booking._id });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Only one review per completed booking is allowed. A review already exists for this booking.'
      });
    }

    const review = await Review.create({
      bookingId: booking._id,
      customerId: req.user._id,
      technicianId: techId,
      providerId: techId,
      serviceId: booking.serviceId?._id || booking.serviceId,
      rating: numRating,
      comment: finalComment,
      review: finalComment,
      verifiedWork: true
    });

    // 5. Update technician rating on ProviderProfile from all valid reviews
    const stats = await Review.aggregate([
      {
        $match: {
          $or: [
            { technicianId: techId },
            { providerId: techId }
          ]
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      const average = Math.round(stats[0].avgRating * 10) / 10;
      const count = stats[0].count;

      await ProviderProfile.findOneAndUpdate(
        { userId: techId },
        {
          'rating.average': average,
          'rating.count': count
        }
      );
    }

    // Notify technician of new review
    try {
      await notificationService.notify({
        recipientId: techId,
        senderId: req.user._id,
        bookingId: booking._id,
        type: NOTIFICATION_TYPE.SYSTEM,
        title: `New Verified Review: ${numRating} ★`,
        message: `Customer rated your service ${numRating} out of 5 stars.${finalComment ? ` Feedback: "${finalComment}"` : ''}`,
        data: { reviewId: review._id, bookingId: booking._id, rating: numRating }
      });
    } catch (notifErr) {
      console.warn('[ReviewController] Notification failed:', notifErr.message);
    }

    const populated = await Review.findById(review._id)
      .populate('customerId', 'name fullName email')
      .populate('technicianId', 'name fullName email')
      .populate('providerId', 'name fullName email')
      .populate('serviceId', 'name slug')
      .populate('bookingId', 'bookingNumber status scheduledDate');

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully. Technician rating has been updated.',
      data: populated,
      review: populated
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to submit review.'
    });
  }
};

/**
 * Get review for a specific booking
 * GET /api/reviews/booking/:bookingId
 */
const getReviewByBooking = async (req, res) => {
  try {
    const bookingId = req.params.bookingId || req.params.id;
    const review = await Review.findOne({ bookingId })
      .populate('customerId', 'name fullName email')
      .populate('technicianId', 'name fullName email')
      .populate('providerId', 'name fullName email')
      .populate('serviceId', 'name slug')
      .populate('bookingId', 'bookingNumber status scheduledDate');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'No review found for this booking.'
      });
    }

    return res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve review.'
    });
  }
};

/**
 * Get all verified reviews for a provider
 * GET /api/reviews/provider/:providerId
 */
const getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;
    const reviews = await Review.find({ providerId })
      .populate('customerId', 'name fullName')
      .populate('bookingId', 'bookingNumber scheduledDate problemDescription')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve provider reviews.'
    });
  }
};

module.exports = {
  createReview,
  getReviewByBooking,
  getProviderReviews
};

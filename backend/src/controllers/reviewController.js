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
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || rating === undefined || rating === null) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and rating (1-5) are required.'
      });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be a numeric value between 1 and 5.'
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // 1. Enforce: Only customers with completed bookings can review
    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: `Reviews can only be submitted for COMPLETED bookings. Current status is ${booking.status}.`
      });
    }

    // 2. Enforce: Prevent arbitrary review ownership (must be the booking's customer)
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the customer who booked this service can submit a review.'
      });
    }

    // 3. Enforce: Prevent providers reviewing themselves
    if (booking.providerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Providers are strictly prohibited from reviewing themselves.'
      });
    }

    // 4. Enforce: Prevent duplicate reviews for the same booking
    const existingReview = await Review.findOne({ bookingId: booking._id });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'A review has already been submitted for this booking.'
      });
    }

    const review = await Review.create({
      bookingId: booking._id,
      customerId: req.user._id,
      providerId: booking.providerId,
      rating: numRating,
      comment: comment?.trim() || '',
      verifiedWork: true
    });

    // 5. Calculate provider rating efficiently via aggregation and update ProviderProfile
    const stats = await Review.aggregate([
      { $match: { providerId: booking.providerId } },
      {
        $group: {
          _id: '$providerId',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      const average = Math.round(stats[0].avgRating * 10) / 10;
      const count = stats[0].count;

      await ProviderProfile.findOneAndUpdate(
        { userId: booking.providerId },
        {
          'rating.average': average,
          'rating.count': count
        }
      );
    }

    // Notify provider of new review
    await notificationService.notify({
      recipientId: booking.providerId,
      senderId: req.user._id,
      type: NOTIFICATION_TYPE.SYSTEM,
      title: `New Verified Review: ${numRating} ★`,
      message: `A customer rated your service ${numRating} out of 5 stars.${comment ? ` Feedback: "${comment}"` : ''}`,
      data: { reviewId: review._id, bookingId: booking._id }
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully. Provider rating has been updated.',
      data: review
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
    const { bookingId } = req.params;
    const review = await Review.findOne({ bookingId })
      .populate('customerId', 'name fullName')
      .populate('providerId', 'name fullName');

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

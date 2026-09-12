const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
      index: true
    },
    comment: {
      type: String,
      trim: true
    },
    verifiedWork: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'reviews'
  }
);

reviewSchema.index({ providerId: 1, rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);

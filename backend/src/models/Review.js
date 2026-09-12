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
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
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
    review: {
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

reviewSchema.pre('validate', function () {
  if (this.technicianId && !this.providerId) {
    this.providerId = this.technicianId;
  } else if (this.providerId && !this.technicianId) {
    this.technicianId = this.providerId;
  }

  if (this.review && !this.comment) {
    this.comment = this.review;
  } else if (this.comment && !this.review) {
    this.review = this.comment;
  }
});

reviewSchema.index({ serviceId: 1 });
reviewSchema.index({ providerId: 1, rating: -1 });
reviewSchema.index({ technicianId: 1, rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);

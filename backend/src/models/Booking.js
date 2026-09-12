const mongoose = require('mongoose');
const { BOOKING_STATUS } = require('../utils/constants');

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    serviceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      required: true,
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
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      required: true
    },
    scheduledDate: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.REQUESTED,
      index: true
    },
    pricing: {
      estimatedTotal: { type: Number, default: 0 },
      finalTotal: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' }
    }
  },
  {
    timestamps: true,
    collection: 'bookings'
  }
);

bookingSchema.index({ customerId: 1, status: 1 });
bookingSchema.index({ providerId: 1, status: 1 });
bookingSchema.index({ scheduledDate: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);

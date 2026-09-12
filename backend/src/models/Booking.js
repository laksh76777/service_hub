const mongoose = require('mongoose');
const { BOOKING_STATUS } = require('../utils/constants');

const statusHistorySchema = new mongoose.Schema(
  {
    previousStatus: {
      type: String,
      enum: [...Object.values(BOOKING_STATUS), null],
      default: null
    },
    newStatus: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      required: true
    },
    actor: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String
      },
      name: {
        type: String
      }
    },
    reason: {
      type: String,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const rescheduleSchema = new mongoose.Schema(
  {
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String
    },
    previousDate: {
      type: Date
    },
    previousTimeSlot: {
      type: String
    },
    newDate: {
      type: Date,
      required: true
    },
    newTimeSlot: {
      type: String
    },
    reason: {
      type: String,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
      required: true,
      index: true
    },
    serviceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest'
    },
    address: {
      streetAddress: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true
      },
      unit: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
      },
      zipCode: {
        type: String,
        required: [true, 'Zip code is required'],
        trim: true
      }
    },
    scheduledDate: {
      type: Date,
      required: true,
      index: true
    },
    preferredTimeSlot: {
      type: String,
      trim: true,
      default: 'Morning (09:00 - 12:00)'
    },
    problemDescription: {
      type: String,
      required: [true, 'Problem description is required'],
      trim: true
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
      currency: { type: String, default: 'USD' }
    },
    statusHistory: [statusHistorySchema],
    rescheduleHistory: [rescheduleSchema]
  },
  {
    timestamps: true,
    collection: 'bookings'
  }
);

bookingSchema.index({ customerId: 1, status: 1 });
bookingSchema.index({ providerId: 1, status: 1 });
bookingSchema.index({ scheduledDate: 1, status: 1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);

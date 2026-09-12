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
      addressLine1: {
        type: String,
        trim: true
      },
      streetAddress: {
        type: String,
        trim: true
      },
      addressLine2: {
        type: String,
        trim: true
      },
      unit: {
        type: String,
        trim: true
      },
      locality: {
        type: String,
        trim: true
      },
      landmark: {
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
      pincode: {
        type: String,
        trim: true
      },
      zipCode: {
        type: String,
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
      currency: { type: String, default: 'INR' },
      isPaid: { type: Boolean, default: false },
      paidAt: { type: Date }
    },
    startOtp: {
      code: { type: String, trim: true },
      expiresAt: { type: Date },
      verifiedAt: { type: Date },
      attempts: { type: Number, default: 0 }
    },
    completionOtp: {
      code: { type: String, trim: true },
      expiresAt: { type: Date },
      verifiedAt: { type: Date },
      attempts: { type: Number, default: 0 }
    },
    jobExecution: {
      inspectionNotes: { type: String, trim: true, default: '' },
      workNotes: { type: String, trim: true, default: '' },
      partsUsed: [
        {
          name: { type: String, required: true, trim: true },
          quantity: { type: Number, default: 1, min: 1 },
          cost: { type: Number, default: 0, min: 0 }
        }
      ],
      technicianArrivedAt: { type: Date },
      workStartedAt: { type: Date },
      completionPendingAt: { type: Date },
      completedAt: { type: Date }
    },
    statusHistory: [statusHistorySchema],
    rescheduleHistory: [rescheduleSchema]
  },
  {
    timestamps: true,
    collection: 'bookings'
  }
);

// Backward-compatible address synchronization
bookingSchema.pre('validate', function () {
  if (this.address) {
    if (this.address.addressLine1 && !this.address.streetAddress) {
      this.address.streetAddress = this.address.addressLine1;
    } else if (this.address.streetAddress && !this.address.addressLine1) {
      this.address.addressLine1 = this.address.streetAddress;
    }

    if (this.address.addressLine2 && !this.address.unit) {
      this.address.unit = this.address.addressLine2;
    } else if (this.address.unit && !this.address.addressLine2) {
      this.address.addressLine2 = this.address.unit;
    }

    if (this.address.pincode && !this.address.zipCode) {
      this.address.zipCode = this.address.pincode;
    } else if (this.address.zipCode && !this.address.pincode) {
      this.address.pincode = this.address.zipCode;
    }

    if (!this.address.streetAddress && this.address.addressLine1) {
      this.address.streetAddress = this.address.addressLine1;
    }
    if (!this.address.zipCode && this.address.pincode) {
      this.address.zipCode = this.address.pincode;
    }
  }
});

bookingSchema.index({ customerId: 1, status: 1 });
bookingSchema.index({ providerId: 1, status: 1 });
bookingSchema.index({ scheduledDate: 1, status: 1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);

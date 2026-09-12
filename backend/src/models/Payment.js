const mongoose = require('mongoose');
const { PAYMENT_STATUS, PAYMENT_GATEWAY } = require('../utils/constants');

const paymentSchema = new mongoose.Schema(
  {
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
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
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    gateway: {
      type: String,
      enum: Object.values(PAYMENT_GATEWAY),
      default: PAYMENT_GATEWAY.DEMO
    },
    gatewayOrderId: {
      type: String,
      trim: true,
      index: true
    },
    gatewayPaymentId: {
      type: String,
      trim: true,
      index: true
    },
    transactionId: {
      type: String,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
      index: true
    },
    failureReason: {
      type: String,
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    paidAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'payments'
  }
);

paymentSchema.pre('validate', function () {
  if (this.technicianId && !this.providerId) {
    this.providerId = this.technicianId;
  } else if (this.providerId && !this.technicianId) {
    this.technicianId = this.providerId;
  }

  if (!this.paymentReference) {
    this.paymentReference = this.transactionId || this.gatewayOrderId || `PAY-${Date.now()}`;
  }
});

paymentSchema.index({ bookingId: 1, status: 1 });
paymentSchema.index({ customerId: 1, createdAt: -1 });
paymentSchema.index({ technicianId: 1, createdAt: -1 });
paymentSchema.index({ providerId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);

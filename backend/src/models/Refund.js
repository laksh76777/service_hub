const mongoose = require('mongoose');
const { REFUND_STATUS } = require('../utils/constants');

const refundSchema = new mongoose.Schema(
  {
    refundReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    reason: {
      type: String,
      required: [true, 'Refund reason is required'],
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.PENDING,
      index: true
    },
    processedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'refunds'
  }
);

refundSchema.index({ paymentId: 1, status: 1 });

module.exports = mongoose.model('Refund', refundSchema);

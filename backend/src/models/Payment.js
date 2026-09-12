const mongoose = require('mongoose');
const { PAYMENT_STATUS, PAYMENT_METHOD } = require('../utils/constants');

const paymentSchema = new mongoose.Schema(
  {
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
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
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    method: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true
    },
    gatewayTransactionId: {
      type: String,
      trim: true,
      sparse: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'payments'
  }
);

paymentSchema.index({ invoiceId: 1, status: 1 });
paymentSchema.index({ customerId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

const mongoose = require('mongoose');
const { INVOICE_STATUS } = require('../utils/constants');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
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
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    estimateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Estimate'
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      default: 0
    },
    amountPaid: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.ISSUED,
      index: true
    },
    dueDate: {
      type: Date,
      required: true,
      index: true
    },
    paidAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'invoices'
  }
);

invoiceSchema.index({ customerId: 1, status: 1 });
invoiceSchema.index({ providerId: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);

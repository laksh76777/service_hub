const mongoose = require('mongoose');
const { ESTIMATE_STATUS } = require('../utils/constants');

const estimateSchema = new mongoose.Schema(
  {
    estimateNumber: {
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
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    version: {
      type: Number,
      default: 1
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
    status: {
      type: String,
      enum: Object.values(ESTIMATE_STATUS),
      default: ESTIMATE_STATUS.DRAFT,
      index: true
    },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    notes: { type: String }
  },
  {
    timestamps: true,
    collection: 'estimates'
  }
);

estimateSchema.index({ bookingId: 1, version: -1 });
estimateSchema.index({ customerId: 1, status: 1 });
estimateSchema.index({ providerId: 1, status: 1 });

module.exports = mongoose.model('Estimate', estimateSchema);

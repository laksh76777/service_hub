const mongoose = require('mongoose');
const { WARRANTY_STATUS } = require('../utils/constants');

const warrantySchema = new mongoose.Schema(
  {
    warrantyCode: {
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
    durationDays: {
      type: Number,
      default: 30
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true
    },
    terms: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(WARRANTY_STATUS),
      default: WARRANTY_STATUS.ACTIVE,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'warranties'
  }
);

warrantySchema.pre('validate', function () {
  if (!this.warrantyCode) {
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(1000 + Math.random() * 9000);
    this.warrantyCode = `WAR-${timestamp}-${random}`;
  }
});

warrantySchema.index({ customerId: 1, status: 1 });
warrantySchema.index({ endDate: 1, status: 1 });

module.exports = mongoose.model('Warranty', warrantySchema);

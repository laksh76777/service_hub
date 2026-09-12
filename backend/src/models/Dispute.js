const mongoose = require('mongoose');
const { DISPUTE_STATUS, DISPUTE_REASON } = require('../utils/constants');

const disputeSchema = new mongoose.Schema(
  {
    disputeNumber: {
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
    raisedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    againstId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reason: {
      type: String,
      enum: Object.values(DISPUTE_REASON),
      required: true
    },
    description: {
      type: String,
      required: [true, 'Dispute description is required'],
      trim: true
    },
    evidenceUrls: [
      {
        type: String,
        trim: true
      }
    ],
    status: {
      type: String,
      enum: Object.values(DISPUTE_STATUS),
      default: DISPUTE_STATUS.OPEN,
      index: true
    },
    resolutionNotes: {
      type: String,
      trim: true
    },
    closedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'disputes'
  }
);

disputeSchema.index({ bookingId: 1, status: 1 });
disputeSchema.index({ raisedById: 1, status: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);

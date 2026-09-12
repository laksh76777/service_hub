const mongoose = require('mongoose');
const { DISPUTE_STATUS, DISPUTE_REASON, DISPUTE_RESOLUTION } = require('../utils/constants');

const disputeAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true
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
    note: {
      type: String,
      trim: true
    },
    previousStatus: {
      type: String,
      enum: [...Object.values(DISPUTE_STATUS), null],
      default: null
    },
    newStatus: {
      type: String,
      enum: Object.values(DISPUTE_STATUS),
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

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
    providerResponse: {
      message: {
        type: String,
        trim: true
      },
      respondedAt: {
        type: Date
      }
    },
    resolutionType: {
      type: String,
      enum: [...Object.values(DISPUTE_RESOLUTION), null],
      default: null
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    resolutionNotes: {
      type: String,
      trim: true
    },
    closedAt: {
      type: Date
    },
    auditHistory: [disputeAuditSchema]
  },
  {
    timestamps: true,
    collection: 'disputes'
  }
);

disputeSchema.pre('validate', function () {
  if (!this.disputeNumber) {
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(1000 + Math.random() * 9000);
    this.disputeNumber = `DSP-${timestamp}-${random}`;
  }
});

disputeSchema.index({ bookingId: 1, status: 1 });
disputeSchema.index({ raisedById: 1, status: 1 });
disputeSchema.index({ againstId: 1, status: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);

const mongoose = require('mongoose');
const { WARRANTY_CLAIM_STATUS } = require('../utils/constants');

const warrantyClaimSchema = new mongoose.Schema(
  {
    claimNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    warrantyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warranty',
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Claim description is required'],
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(WARRANTY_CLAIM_STATUS),
      default: WARRANTY_CLAIM_STATUS.SUBMITTED,
      index: true
    },
    resolutionDetails: {
      type: String,
      trim: true
    },
    resolvedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'warranty_claims'
  }
);

warrantyClaimSchema.index({ warrantyId: 1, status: 1 });
warrantyClaimSchema.index({ customerId: 1, status: 1 });

module.exports = mongoose.model('WarrantyClaim', warrantyClaimSchema);

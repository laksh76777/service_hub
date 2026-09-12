const mongoose = require('mongoose');
const { PROVIDER_STATUS } = require('../utils/constants');

const providerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      index: true
    },
    licenseNumber: {
      type: String,
      trim: true
    },
    insuranceDetails: {
      provider: { type: String, trim: true },
      policyNumber: { type: String, trim: true },
      expiresAt: { type: Date }
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceCategory',
        index: true
      }
    ],
    status: {
      type: String,
      enum: Object.values(PROVIDER_STATUS),
      default: PROVIDER_STATUS.PENDING_APPROVAL,
      index: true
    },
    serviceAreaZipCodes: [
      {
        type: String,
        trim: true,
        index: true
      }
    ],
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 }
    },
    completedJobsCount: {
      type: Number,
      default: 0
    },
    bio: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'provider_profiles'
  }
);

providerProfileSchema.index({ status: 1, 'rating.average': -1 });

module.exports = mongoose.model('ProviderProfile', providerProfileSchema);

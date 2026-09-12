const mongoose = require('mongoose');
const { PROVIDER_STATUS, SERVICE_PRICING_TYPE } = require('../utils/constants');

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
    bio: {
      type: String,
      trim: true,
      default: ''
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: ''
    },
    insuranceDetails: {
      provider: { type: String, trim: true, default: '' },
      policyNumber: { type: String, trim: true, default: '' },
      expiresAt: { type: Date, default: null }
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
      default: PROVIDER_STATUS.PENDING,
      index: true
    },
    serviceArea: {
      cities: [{ type: String, trim: true }],
      pincodes: [{ type: String, trim: true }],
      zipCodes: [{ type: String, trim: true }],
      radiusKm: { type: Number, default: 25 }
    },
    availability: {
      days: [
        {
          type: String,
          enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
        }
      ],
      workingHours: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' }
      },
      emergencyServices: {
        type: Boolean,
        default: false
      },
      noticeHours: {
        type: Number,
        default: 24
      }
    },
    servicesOffered: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Service',
          required: true
        },
        customTitle: {
          type: String,
          trim: true
        },
        description: {
          type: String,
          trim: true
        },
        pricing: {
          type: {
            type: String,
            enum: Object.values(SERVICE_PRICING_TYPE),
            default: SERVICE_PRICING_TYPE.STARTING_AT
          },
          amount: {
            type: Number,
            min: 0,
            default: 0
          },
          currency: {
            type: String,
            default: 'INR'
          }
        },
        isActive: {
          type: Boolean,
          default: true
        }
      }
    ],
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 }
    },
    completedJobsCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    collection: 'provider_profiles'
  }
);

// Backward-compatible synchronization of pincodes and zipCodes
providerProfileSchema.pre('save', function () {
  if (this.serviceArea) {
    if (Array.isArray(this.serviceArea.pincodes) && this.serviceArea.pincodes.length > 0) {
      this.serviceArea.zipCodes = [...new Set([...this.serviceArea.pincodes])];
    } else if (Array.isArray(this.serviceArea.zipCodes) && this.serviceArea.zipCodes.length > 0) {
      this.serviceArea.pincodes = [...new Set([...this.serviceArea.zipCodes])];
    }
  }
});

providerProfileSchema.index({ status: 1, 'rating.average': -1 });
providerProfileSchema.index({ status: 1, 'serviceArea.pincodes': 1 });
providerProfileSchema.index({ status: 1, 'serviceArea.zipCodes': 1 });
providerProfileSchema.index({ status: 1, 'serviceArea.cities': 1 });
providerProfileSchema.index({ status: 1, 'servicesOffered.serviceId': 1 });

module.exports = mongoose.model('ProviderProfile', providerProfileSchema);

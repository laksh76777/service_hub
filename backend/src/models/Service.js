const mongoose = require('mongoose');
const { SERVICE_STATUS } = require('../utils/constants');

const serviceSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: [true, 'Category reference is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'Service slug is required'],
      trim: true,
      lowercase: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    estimatedPriceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' }
    },
    status: {
      type: String,
      enum: Object.values(SERVICE_STATUS),
      default: SERVICE_STATUS.ACTIVE,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'services'
  }
);

serviceSchema.index({ categoryId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Service', serviceSchema);

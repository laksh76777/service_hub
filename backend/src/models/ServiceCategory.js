const mongoose = require('mongoose');
const { SERVICE_CATEGORY_STATUS } = require('../utils/constants');

const serviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      trim: true,
      unique: true,
      lowercase: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    icon: {
      type: String,
      default: 'wrench'
    },
    status: {
      type: String,
      enum: Object.values(SERVICE_CATEGORY_STATUS),
      default: SERVICE_CATEGORY_STATUS.ACTIVE,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'service_categories'
  }
);

module.exports = mongoose.model('ServiceCategory', serviceCategorySchema);

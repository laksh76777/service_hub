const mongoose = require('mongoose');
const { SERVICE_REQUEST_STATUS } = require('../utils/constants');

const serviceRequestSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
      index: true
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    preferredSchedule: {
      date: { type: Date },
      timeSlot: { type: String, trim: true }
    },
    status: {
      type: String,
      enum: Object.values(SERVICE_REQUEST_STATUS),
      default: SERVICE_REQUEST_STATUS.SUBMITTED,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'service_requests'
  }
);

serviceRequestSchema.index({ customerId: 1, status: 1 });
serviceRequestSchema.index({ categoryId: 1, status: 1 });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);

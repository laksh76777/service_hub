const mongoose = require('mongoose');
const { JOB_UPDATE_TYPE } = require('../utils/constants');

const jobUpdateSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(JOB_UPDATE_TYPE),
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Update title is required'],
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    evidenceUrls: [
      {
        type: String,
        trim: true
      }
    ],
    scopeChange: {
      requestedAmount: { type: Number },
      approved: { type: Boolean, default: null },
      approvedAt: { type: Date }
    }
  },
  {
    timestamps: true,
    collection: 'job_updates'
  }
);

jobUpdateSchema.index({ bookingId: 1, createdAt: -1 });

module.exports = mongoose.model('JobUpdate', jobUpdateSchema);

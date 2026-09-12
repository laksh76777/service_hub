const mongoose = require('mongoose');

const EVIDENCE_CATEGORIES = [
  'BEFORE_WORK',
  'INSPECTION',
  'AFTER_WORK',
  'DISPUTE_EVIDENCE',
  'OTHER'
];

const workEvidenceSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'GridFS fileId is required'],
      index: true
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Associated bookingId is required'],
      index: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader userId is required'],
      index: true
    },
    uploaderRole: {
      type: String,
      enum: ['CUSTOMER', 'PROVIDER', 'ADMIN'],
      required: true
    },
    category: {
      type: String,
      enum: {
        values: EVIDENCE_CATEGORIES,
        message: 'Invalid evidence category. Must be one of: {VALUES}'
      },
      required: [true, 'Evidence category is required'],
      index: true
    },
    filename: {
      type: String,
      required: true,
      trim: true
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true
    },
    mimeType: {
      type: String,
      required: true,
      trim: true
    },
    size: {
      type: Number,
      required: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'work_evidences'
  }
);

workEvidenceSchema.index({ bookingId: 1, category: 1 });
workEvidenceSchema.index({ bookingId: 1, createdAt: -1 });

module.exports = mongoose.model('WorkEvidence', workEvidenceSchema);
module.exports.EVIDENCE_CATEGORIES = EVIDENCE_CATEGORIES;

const mongoose = require('mongoose');
const { ESTIMATE_STATUS, ESTIMATE_ITEM_TYPE } = require('../utils/constants');

const estimateItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    totalPrice: {
      type: Number,
      default: 0
    },
    type: {
      type: String,
      enum: Object.values(ESTIMATE_ITEM_TYPE),
      default: ESTIMATE_ITEM_TYPE.LABOUR
    }
  },
  { _id: true }
);

// Backward-compatible amount/totalPrice synchronization
estimateItemSchema.pre('validate', function () {
  if (this.amount === undefined && this.totalPrice !== undefined) {
    this.amount = this.totalPrice;
  } else if (this.totalPrice === undefined && this.amount !== undefined) {
    this.totalPrice = this.amount;
  }
});

const estimateSchema = new mongoose.Schema(
  {
    estimateNumber: {
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
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    isAdditionalWork: {
      type: Boolean,
      default: false,
      index: true
    },
    parentEstimateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Estimate'
    },
    items: [estimateItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(ESTIMATE_STATUS),
      default: ESTIMATE_STATUS.DRAFT,
      index: true
    },
    notes: {
      type: String,
      trim: true
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    expiresAt: {
      type: Date
    },
    approvedAt: {
      type: Date
    },
    rejectedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'estimates'
  }
);

estimateSchema.pre('validate', function () {
  if (this.technicianId && !this.providerId) {
    this.providerId = this.technicianId;
  } else if (this.providerId && !this.technicianId) {
    this.technicianId = this.providerId;
  }

  if (this.taxes === undefined && this.tax !== undefined) {
    this.taxes = this.tax;
  } else if (this.tax === undefined && this.taxes !== undefined) {
    this.tax = this.taxes;
  }
});

estimateSchema.index({ bookingId: 1, status: 1 });
estimateSchema.index({ customerId: 1, status: 1 });
estimateSchema.index({ providerId: 1, status: 1 });
estimateSchema.index({ technicianId: 1, status: 1 });

module.exports = mongoose.model('Estimate', estimateSchema);

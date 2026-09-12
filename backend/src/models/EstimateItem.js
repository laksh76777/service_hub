const mongoose = require('mongoose');
const { ESTIMATE_ITEM_TYPE } = require('../utils/constants');

const estimateItemSchema = new mongoose.Schema(
  {
    estimateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Estimate',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(ESTIMATE_ITEM_TYPE),
      default: ESTIMATE_ITEM_TYPE.LABOR,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      default: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0
    }
  },
  {
    timestamps: true,
    collection: 'estimate_items'
  }
);

estimateItemSchema.index({ estimateId: 1, type: 1 });

module.exports = mongoose.model('EstimateItem', estimateItemSchema);

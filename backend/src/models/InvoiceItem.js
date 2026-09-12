const mongoose = require('mongoose');
const { INVOICE_ITEM_TYPE } = require('../utils/constants');

const invoiceItemSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(INVOICE_ITEM_TYPE),
      required: true
    },
    description: {
      type: String,
      required: [true, 'Invoice item description is required'],
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
    collection: 'invoice_items'
  }
);

module.exports = mongoose.model('InvoiceItem', invoiceItemSchema);

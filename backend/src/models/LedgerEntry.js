const mongoose = require('mongoose');
const { LEDGER_ENTRY_TYPE } = require('../utils/constants');

const ledgerEntrySchema = new mongoose.Schema(
  {
    entryNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(LEDGER_ENTRY_TYPE),
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      index: true
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      index: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'ledger_entries'
  }
);

ledgerEntrySchema.index({ bookingId: 1, type: 1 });
ledgerEntrySchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);

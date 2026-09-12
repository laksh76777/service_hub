const mongoose = require('mongoose');
const { INVOICE_STATUS } = require('../utils/constants');

const invoiceItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Invoice item description is required'],
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
    type: {
      type: String,
      default: 'SERVICE'
    },
    sourceEstimateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Estimate'
    },
    isAdditionalWork: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
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
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      index: true
    },
    items: [invoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    taxes: {
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
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true
    },
    paymentStatus: {
      type: String,
      default: 'PAID',
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    amountPaid: {
      type: Number,
      default: 0
    },
    remainingAmount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.ISSUED,
      index: true
    },
    dueDate: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    paidAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'invoices'
  }
);

invoiceSchema.pre('validate', function () {
  if (this.technicianId && !this.providerId) {
    this.providerId = this.technicianId;
  } else if (this.providerId && !this.technicianId) {
    this.technicianId = this.providerId;
  }

  if (this.amount === undefined || this.amount === 0) {
    this.amount = this.total || 0;
  } else if ((this.total === undefined || this.total === 0) && this.amount !== undefined) {
    this.total = this.amount;
  }

  if (!this.currency) {
    this.currency = 'INR';
  }

  if (!this.date) {
    this.date = this.issuedAt || new Date();
  }

  if (!this.paymentStatus) {
    this.paymentStatus = (this.status === INVOICE_STATUS.PAID || this.paidAmount >= this.total) ? 'PAID' : 'PENDING';
  }

  if (this.paidAmount === undefined && this.amountPaid !== undefined) {
    this.paidAmount = this.amountPaid;
  } else if (this.amountPaid === undefined && this.paidAmount !== undefined) {
    this.amountPaid = this.paidAmount;
  }

  if (this.tax === undefined && this.taxes !== undefined) {
    this.tax = this.taxes;
  } else if (this.taxes === undefined && this.tax !== undefined) {
    this.taxes = this.tax;
  }

  if (this.remainingAmount === undefined || this.isModified('total') || this.isModified('paidAmount')) {
    this.remainingAmount = Math.max(0, (this.total || 0) - (this.paidAmount || 0));
  }
});

invoiceSchema.index({ bookingId: 1, status: 1 });
invoiceSchema.index({ serviceId: 1 });
invoiceSchema.index({ customerId: 1, status: 1 });
invoiceSchema.index({ providerId: 1, status: 1 });
invoiceSchema.index({ technicianId: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);

const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Estimate = require('../models/Estimate');
const Booking = require('../models/Booking');
const { INVOICE_STATUS, ESTIMATE_STATUS, USER_ROLES } = require('../utils/constants');
const { generateInvoicePdf } = require('../services/invoicePdfService');

/**
 * Generates an official invoice number
 * e.g. INV-2026-84920
 */
const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `INV-${year}-${random}`;
};

/**
 * Generates a final invoice from all customer-approved estimate items
 * POST /api/bookings/:id/invoices
 */
const generateInvoice = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    const isProvider = booking.providerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the assigned provider or admin can generate an invoice.'
      });
    }

    // Duplicate invoice prevention: Only one active invoice per booking
    const existingActiveInvoice = await Invoice.findOne({
      bookingId: booking._id,
      status: { $ne: INVOICE_STATUS.CANCELLED }
    });

    if (existingActiveInvoice) {
      return res.status(400).json({
        success: false,
        message: `An active invoice (${existingActiveInvoice.invoiceNumber}) has already been issued for this booking. Duplicate invoices are strictly prevented.`,
        invoice: existingActiveInvoice
      });
    }

    // Compile only APPROVED estimate items (initial + approved additional work)
    const approvedEstimates = await Estimate.find({
      bookingId: booking._id,
      status: ESTIMATE_STATUS.APPROVED
    });

    if (approvedEstimates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate invoice: No customer-approved estimates found for this booking. Estimates must be approved by customer before invoicing.'
      });
    }

    // Extract all approved line items
    const billedItems = [];
    let totalDiscount = 0;

    for (const est of approvedEstimates) {
      if (est.discount > 0) totalDiscount += est.discount;
      for (const item of est.items) {
        billedItems.push({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: Math.round(item.quantity * item.unitPrice * 100) / 100,
          type: item.type,
          sourceEstimateId: est._id,
          isAdditionalWork: Boolean(est.isAdditionalWork)
        });
      }
    }

    // Zero-trust calculation
    const subtotal = Math.round(billedItems.reduce((acc, it) => acc + it.amount, 0) * 100) / 100;
    const tax = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST
    const discount = Math.round(totalDiscount * 100) / 100;
    const total = Math.max(0, Math.round((subtotal + tax - discount) * 100) / 100);

    const invoiceNumber = generateInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber,
      bookingId: booking._id,
      customerId: booking.customerId,
      providerId: booking.providerId,
      items: billedItems,
      subtotal,
      tax,
      taxes: tax,
      discount,
      total,
      paidAmount: 0,
      amountPaid: 0,
      remainingAmount: total,
      status: INVOICE_STATUS.ISSUED,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      issuedAt: new Date()
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('customerId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('bookingId');

    return res.status(201).json({
      success: true,
      message: 'Final tax invoice generated successfully.',
      invoice: populated
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate invoice.'
    });
  }
};

/**
 * Get invoice for a booking
 * GET /api/bookings/:id/invoices
 */
const getInvoiceByBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    const isCustomer = booking.customerId.toString() === req.user._id.toString();
    const isProvider = booking.providerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this invoice.'
      });
    }

    const invoice = await Invoice.findOne({ bookingId })
      .populate('customerId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('bookingId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'No invoice has been issued for this booking yet.'
      });
    }

    return res.status(200).json({
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Error fetching invoice by booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoice.'
    });
  }
};

/**
 * Get invoice details by ID
 * GET /api/invoices/:id
 */
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('bookingId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.'
      });
    }

    const isCustomer = invoice.customerId._id.toString() === req.user._id.toString();
    const isProvider = invoice.providerId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this invoice.'
      });
    }

    return res.status(200).json({
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoice.'
    });
  }
};

/**
 * Stream professional invoice PDF
 * GET /api/invoices/:id/pdf
 */
const downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('bookingId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.'
      });
    }

    const isCustomer = invoice.customerId._id.toString() === req.user._id.toString();
    const isProvider = invoice.providerId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to download this invoice.'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`
    );

    await generateInvoicePdf(invoice, res);
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate invoice PDF.'
      });
    }
  }
};

module.exports = {
  generateInvoice,
  getInvoiceByBooking,
  getInvoiceById,
  downloadInvoicePdf
};

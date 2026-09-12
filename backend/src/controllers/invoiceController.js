const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Estimate = require('../models/Estimate');
const Booking = require('../models/Booking');
const notificationService = require('../services/notificationService');
const { INVOICE_STATUS, ESTIMATE_STATUS, USER_ROLES, NOTIFICATION_TYPE } = require('../utils/constants');
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

    const isCustomer = (booking.customerId?._id || booking.customerId)?.toString() === req.user._id.toString();
    const isTechnician =
      (booking.technicianId?._id || booking.technicianId)?.toString() === req.user._id.toString() ||
      (booking.providerId?._id || booking.providerId)?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isTechnician && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to generate an invoice for this booking.'
      });
    }

    // Duplicate invoice prevention: Only one active invoice per booking
    const existingActiveInvoice = await Invoice.findOne({
      bookingId: booking._id,
      status: { $ne: INVOICE_STATUS.CANCELLED }
    })
      .populate('customerId', 'name email phone')
      .populate('technicianId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('serviceId', 'name slug description')
      .populate('bookingId');

    if (existingActiveInvoice) {
      return res.status(400).json({
        success: false,
        message: `An invoice (${existingActiveInvoice.invoiceNumber}) has already been generated for this booking. Duplicate invoices are strictly prohibited.`,
        invoice: existingActiveInvoice
      });
    }

    // Compile approved estimate items or completed service booking pricing
    const approvedEstimates = await Estimate.find({
      bookingId: booking._id,
      status: ESTIMATE_STATUS.APPROVED
    });

    const billedItems = [];
    let totalDiscount = 0;

    if (approvedEstimates.length > 0) {
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
    } else if (booking.pricing?.totalAmount > 0) {
      billedItems.push({
        description: booking.problemDescription || 'Standard Service Fee',
        quantity: 1,
        unitPrice: booking.pricing.totalAmount,
        amount: booking.pricing.totalAmount,
        type: 'SERVICE'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate invoice: No customer-approved estimates or service pricing found for this booking.'
      });
    }

    // Zero-trust calculation
    const subtotal = Math.round(billedItems.reduce((acc, it) => acc + it.amount, 0) * 100) / 100;
    const tax = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST
    const discount = Math.round(totalDiscount * 100) / 100;
    const total = Math.max(0, Math.round((subtotal + tax - discount) * 100) / 100);
    const amount = total;

    const isPaid = Boolean(
      booking.pricing?.isPaid ||
      ['PAYMENT_SUCCESS', 'WORK_IN_PROGRESS', 'WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED'].includes(booking.status)
    );

    const invoiceNumber = generateInvoiceNumber();
    const techId = booking.technicianId || booking.providerId;

    const invoice = await Invoice.create({
      invoiceNumber,
      bookingId: booking._id,
      customerId: booking.customerId,
      technicianId: techId,
      providerId: techId,
      serviceId: booking.serviceId,
      items: billedItems,
      subtotal,
      tax,
      taxes: tax,
      discount,
      total,
      amount,
      currency: 'INR',
      paymentStatus: isPaid ? 'PAID' : 'PENDING',
      date: new Date(),
      paidAmount: isPaid ? total : 0,
      amountPaid: isPaid ? total : 0,
      remainingAmount: isPaid ? 0 : total,
      status: isPaid ? INVOICE_STATUS.PAID : INVOICE_STATUS.ISSUED,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      issuedAt: new Date(),
      paidAt: isPaid ? (booking.pricing?.paidAt || new Date()) : undefined
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('customerId', 'name email phone')
      .populate('technicianId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('serviceId', 'name slug description')
      .populate('bookingId');

    // Notify Customer: Invoice generated
    try {
      await notificationService.notify({
        recipientId: invoice.customerId,
        senderId: invoice.providerId,
        bookingId: booking._id,
        type: NOTIFICATION_TYPE.INVOICE_GENERATED,
        title: 'Invoice Generated',
        message: `Tax invoice ${invoice.invoiceNumber} for ₹${invoice.total} has been generated for booking ${booking.bookingNumber || ''}.`,
        data: { bookingId: booking._id, invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber, total: invoice.total }
      });
    } catch (notifErr) {
      console.warn('[InvoiceController] Notification failed:', notifErr.message);
    }

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
    const isProvider =
      (booking.technicianId?._id || booking.technicianId)?.toString() === req.user._id.toString() ||
      (booking.providerId?._id || booking.providerId)?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this invoice.'
      });
    }

    const invoice = await Invoice.findOne({ bookingId })
      .populate('customerId', 'name email phone')
      .populate('technicianId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('serviceId', 'name slug description')
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
      .populate('technicianId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('serviceId', 'name slug description')
      .populate('bookingId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.'
      });
    }

    const isCustomer = (invoice.customerId?._id || invoice.customerId)?.toString() === req.user._id.toString();
    const isProvider =
      (invoice.technicianId?._id || invoice.technicianId)?.toString() === req.user._id.toString() ||
      (invoice.providerId?._id || invoice.providerId)?.toString() === req.user._id.toString();
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

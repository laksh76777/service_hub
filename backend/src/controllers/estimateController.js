const mongoose = require('mongoose');
const Estimate = require('../models/Estimate');
const Booking = require('../models/Booking');
const { ESTIMATE_STATUS, ESTIMATE_ITEM_TYPE, USER_ROLES } = require('../utils/constants');

/**
 * Generates a human-friendly unique estimate number
 * e.g. EST-8214-3401
 */
const generateEstimateNumber = () => {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `EST-${timestamp}-${random}`;
};

/**
 * Server-side zero-trust financial calculations
 * Enforces: amount = qty * unitPrice, 18% GST, and prevents tampering
 */
const calculateEstimatePricing = (rawItems = [], discountInput = 0) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('At least one estimate item is required.');
  }

  const validTypes = Object.values(ESTIMATE_ITEM_TYPE);

  const sanitizedItems = rawItems.map((item, idx) => {
    const description = (item.description || '').trim();
    if (!description) {
      throw new Error(`Item at position ${idx + 1} is missing a description.`);
    }

    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const unitPrice = Math.max(0, parseFloat(item.unitPrice) || 0);
    const amount = Math.round(quantity * unitPrice * 100) / 100;

    let type = (item.type || '').toUpperCase();
    if (!validTypes.includes(type)) {
      type = ESTIMATE_ITEM_TYPE.LABOUR;
    }

    return {
      description,
      quantity,
      unitPrice,
      amount,
      totalPrice: amount,
      type
    };
  });

  const subtotal = Math.round(sanitizedItems.reduce((sum, it) => sum + it.amount, 0) * 100) / 100;
  const taxes = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST
  const discount = Math.max(0, Math.round((parseFloat(discountInput) || 0) * 100) / 100);
  const total = Math.max(0, Math.round((subtotal + taxes - discount) * 100) / 100);

  return {
    sanitizedItems,
    subtotal,
    taxes,
    tax: taxes,
    discount,
    total
  };
};

/**
 * Create a new service or additional work estimate
 * POST /api/bookings/:id/estimates
 */
const createEstimate = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { items, isAdditionalWork = false, notes, discount = 0, status = ESTIMATE_STATUS.PENDING_CUSTOMER } = req.body;

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
        message: 'Access denied: Only the assigned provider or admin can create an estimate.'
      });
    }

    // Zero-trust calculation prevents client-side total manipulation
    const pricing = calculateEstimatePricing(items, discount);

    // If not additional work, supersede any existing unapproved estimates
    if (!isAdditionalWork) {
      await Estimate.updateMany(
        {
          bookingId: booking._id,
          isAdditionalWork: false,
          status: { $in: [ESTIMATE_STATUS.DRAFT, ESTIMATE_STATUS.PENDING_CUSTOMER] }
        },
        { status: ESTIMATE_STATUS.SUPERSEDED }
      );
    }

    const estimateNumber = generateEstimateNumber();

    const estimate = await Estimate.create({
      estimateNumber,
      bookingId: booking._id,
      providerId: booking.providerId,
      customerId: booking.customerId,
      isAdditionalWork: Boolean(isAdditionalWork),
      items: pricing.sanitizedItems,
      subtotal: pricing.subtotal,
      taxes: pricing.taxes,
      tax: pricing.tax,
      discount: pricing.discount,
      total: pricing.total,
      status: [ESTIMATE_STATUS.DRAFT, ESTIMATE_STATUS.PENDING_CUSTOMER].includes(status)
        ? status
        : ESTIMATE_STATUS.PENDING_CUSTOMER,
      notes: notes ? notes.trim() : '',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days validity
    });

    const populated = await Estimate.findById(estimate._id)
      .populate('providerId', 'name email phone')
      .populate('customerId', 'name email phone');

    return res.status(201).json({
      success: true,
      message: isAdditionalWork
        ? 'Additional work estimate created and submitted to customer.'
        : 'Job estimate created and submitted to customer.',
      estimate: populated
    });
  } catch (error) {
    console.error('Error creating estimate:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create estimate.'
    });
  }
};

/**
 * List all estimates for a booking
 * GET /api/bookings/:id/estimates
 */
const getEstimatesByBooking = async (req, res) => {
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
        message: 'Access denied: You are not authorized to view estimates for this booking.'
      });
    }

    const estimates = await Estimate.find({ bookingId })
      .populate('providerId', 'name email phone')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: estimates.length,
      estimates
    });
  } catch (error) {
    console.error('Error fetching estimates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch estimates.'
    });
  }
};

/**
 * Retrieve single estimate
 * GET /api/estimates/:id
 */
const getEstimateById = async (req, res) => {
  try {
    const estimate = await Estimate.findById(req.params.id)
      .populate('providerId', 'name email phone')
      .populate('customerId', 'name email phone')
      .populate('bookingId');

    if (!estimate) {
      return res.status(404).json({
        success: false,
        message: 'Estimate not found.'
      });
    }

    const isCustomer = estimate.customerId._id.toString() === req.user._id.toString();
    const isProvider = estimate.providerId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this estimate.'
      });
    }

    return res.status(200).json({
      success: true,
      estimate
    });
  } catch (error) {
    console.error('Error fetching estimate details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve estimate.'
    });
  }
};

/**
 * Customer approves an estimate
 * PATCH /api/estimates/:id/approve
 *
 * CRITICAL RULE: Provider cannot mark estimate as approved.
 */
const approveEstimate = async (req, res) => {
  try {
    const estimate = await Estimate.findById(req.params.id);
    if (!estimate) {
      return res.status(404).json({
        success: false,
        message: 'Estimate not found.'
      });
    }

    const isCustomer = estimate.customerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the customer can approve an estimate.'
      });
    }

    if (estimate.status === ESTIMATE_STATUS.APPROVED) {
      return res.status(400).json({
        success: false,
        message: 'Estimate has already been approved.'
      });
    }

    if (![ESTIMATE_STATUS.PENDING_CUSTOMER, ESTIMATE_STATUS.DRAFT].includes(estimate.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve estimate in '${estimate.status}' status.`
      });
    }

    estimate.status = ESTIMATE_STATUS.APPROVED;
    estimate.approvedAt = new Date();
    await estimate.save();

    // Update booking pricing with approved scope
    const booking = await Booking.findById(estimate.bookingId);
    if (booking) {
      const allApprovedEstimates = await Estimate.find({
        bookingId: booking._id,
        status: ESTIMATE_STATUS.APPROVED
      });

      const totalApproved = allApprovedEstimates.reduce((sum, est) => sum + est.total, 0);
      booking.pricing = booking.pricing || {};
      booking.pricing.finalTotal = totalApproved;
      await booking.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Estimate approved successfully.',
      estimate
    });
  } catch (error) {
    console.error('Error approving estimate:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve estimate.'
    });
  }
};

/**
 * Customer rejects an estimate with optional reason
 * PATCH /api/estimates/:id/reject
 */
const rejectEstimate = async (req, res) => {
  try {
    const { reason } = req.body;

    const estimate = await Estimate.findById(req.params.id);
    if (!estimate) {
      return res.status(404).json({
        success: false,
        message: 'Estimate not found.'
      });
    }

    const isCustomer = estimate.customerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the customer can reject an estimate.'
      });
    }

    if (estimate.status === ESTIMATE_STATUS.APPROVED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already approved estimate.'
      });
    }

    estimate.status = ESTIMATE_STATUS.REJECTED;
    estimate.rejectedAt = new Date();
    if (reason) {
      estimate.rejectionReason = reason.trim();
    }
    await estimate.save();

    return res.status(200).json({
      success: true,
      message: 'Estimate rejected.',
      estimate
    });
  } catch (error) {
    console.error('Error rejecting estimate:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to reject estimate.'
    });
  }
};

module.exports = {
  createEstimate,
  getEstimatesByBooking,
  getEstimateById,
  approveEstimate,
  rejectEstimate,
  calculateEstimatePricing
};

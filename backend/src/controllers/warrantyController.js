const mongoose = require('mongoose');
const Warranty = require('../models/Warranty');
const WarrantyClaim = require('../models/WarrantyClaim');
const Booking = require('../models/Booking');
const notificationService = require('../services/notificationService');
const { WARRANTY_STATUS, WARRANTY_CLAIM_STATUS, USER_ROLES, NOTIFICATION_TYPE, BOOKING_STATUS } = require('../utils/constants');

/**
 * Provider assigns warranty terms to completed work
 * POST /api/warranties
 */
const createWarranty = async (req, res) => {
  try {
    const bookingId = req.body.bookingId || req.params.id || req.params.bookingId;
    const { durationDays = 30, startDate, endDate, terms } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required.'
      });
    }

    const booking = await Booking.findById(bookingId).populate('serviceId');
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
        message: 'Access denied: You are not authorized to create or assign warranty for this booking.'
      });
    }

    // Check if service supports warranty
    if (booking.serviceId && booking.serviceId.supportsWarranty === false) {
      return res.status(400).json({
        success: false,
        message: 'The selected service does not support warranty coverage.'
      });
    }

    // Warranty can only be assigned to completed or verified work
    const eligibleStatuses = [
      BOOKING_STATUS.COMPLETED,
      BOOKING_STATUS.CUSTOMER_VERIFIED,
      BOOKING_STATUS.CUSTOMER_CONFIRMED,
      BOOKING_STATUS.INVOICED,
      BOOKING_STATUS.WORK_COMPLETED
    ];
    if (!eligibleStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Warranty can only be assigned to verified or completed work. Current status: ${booking.status}`
      });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const defaultDays = booking.serviceId?.warrantyPeriodDays || 30;
    const days = parseInt(durationDays, 10) || defaultDays;
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    const resolvedTerms = terms || booking.serviceId?.warrantyTerms || 'Standard 30-day workmanship warranty covering repair defects.';
    const techId = booking.technicianId || booking.providerId;

    let warranty = await Warranty.findOne({ bookingId: booking._id });
    if (warranty) {
      warranty.startDate = start;
      warranty.endDate = end;
      warranty.durationDays = days;
      warranty.warrantyPeriod = `${days} days`;
      warranty.serviceId = booking.serviceId?._id || booking.serviceId;
      warranty.technicianId = techId;
      warranty.providerId = techId;
      warranty.terms = resolvedTerms;
      warranty.status = WARRANTY_STATUS.ACTIVE;
      await warranty.save();
    } else {
      warranty = await Warranty.create({
        bookingId: booking._id,
        serviceId: booking.serviceId?._id || booking.serviceId,
        technicianId: techId,
        providerId: techId,
        customerId: booking.customerId,
        startDate: start,
        endDate: end,
        durationDays: days,
        warrantyPeriod: `${days} days`,
        terms: resolvedTerms,
        status: WARRANTY_STATUS.ACTIVE
      });
    }

    // Notify customer about warranty activation
    try {
      await notificationService.notify({
        recipientId: booking.customerId,
        senderId: req.user._id,
        bookingId: booking._id,
        type: NOTIFICATION_TYPE.WARRANTY_AVAILABLE,
        title: 'Warranty Available',
        message: `A ${days}-day service warranty is now available and active for booking ${booking.bookingNumber || booking._id}.`,
        data: { bookingId: booking._id, warrantyId: warranty._id }
      });
    } catch (notifErr) {
      console.warn('[WarrantyController] Notification failed:', notifErr.message);
    }

    const populated = await Warranty.findById(warranty._id)
      .populate('serviceId', 'name slug description')
      .populate('bookingId', 'bookingNumber status scheduledDate problemDescription')
      .populate('technicianId', 'name fullName email phoneNumber')
      .populate('providerId', 'name fullName email phoneNumber')
      .populate('customerId', 'name fullName email phoneNumber');

    return res.status(201).json({
      success: true,
      message: 'Warranty assigned successfully.',
      data: populated,
      warranty: populated
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to assign warranty.'
    });
  }
};

/**
 * Get warranty details for a booking
 * GET /api/warranties/booking/:bookingId
 */
const getWarrantyByBooking = async (req, res) => {
  try {
    const bookingId = req.params.bookingId || req.params.id;
    const warranty = await Warranty.findOne({ bookingId })
      .populate('serviceId', 'name slug description')
      .populate('bookingId', 'bookingNumber status scheduledDate problemDescription')
      .populate('technicianId', 'name fullName email phoneNumber')
      .populate('providerId', 'name fullName email phoneNumber')
      .populate('customerId', 'name fullName email phoneNumber');

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'No warranty record found for this booking.'
      });
    }

    // Auto-expire if end date passed and still active
    if (warranty.status === WARRANTY_STATUS.ACTIVE && new Date() > new Date(warranty.endDate)) {
      warranty.status = WARRANTY_STATUS.EXPIRED;
      await warranty.save();
    }

    // Fetch any claims on this warranty
    const claims = await WarrantyClaim.find({ warrantyId: warranty._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        warranty,
        claims
      },
      warranty
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve warranty.'
    });
  }
};

/**
 * Customer raises a warranty claim
 * POST /api/warranties/:id/claims
 */
const createWarrantyClaim = async (req, res) => {
  try {
    const warrantyId = req.params.id;
    const { description, evidenceFiles = [] } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Claim description is required.'
      });
    }

    const warranty = await Warranty.findById(warrantyId);
    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found.'
      });
    }

    const isCustomer = warranty.customerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the customer covered by this warranty can file a claim.'
      });
    }

    // Check if warranty has expired or is void
    if (new Date() > new Date(warranty.endDate)) {
      warranty.status = WARRANTY_STATUS.EXPIRED;
      await warranty.save();
      return res.status(400).json({
        success: false,
        message: 'Cannot file claim: This warranty has expired.'
      });
    }

    if (warranty.status === WARRANTY_STATUS.VOID) {
      return res.status(400).json({
        success: false,
        message: 'Cannot file claim: This warranty has been voided.'
      });
    }

    const claim = await WarrantyClaim.create({
      warrantyId: warranty._id,
      bookingId: warranty.bookingId,
      customerId: warranty.customerId,
      description,
      evidenceFiles: Array.isArray(evidenceFiles) ? evidenceFiles : [evidenceFiles],
      status: WARRANTY_CLAIM_STATUS.SUBMITTED
    });

    warranty.status = WARRANTY_STATUS.CLAIMED;
    await warranty.save();

    // Notify provider of new warranty claim
    await notificationService.notify({
      recipientId: warranty.providerId,
      senderId: req.user._id,
      type: NOTIFICATION_TYPE.WARRANTY_CLAIM_CREATED,
      title: 'New Warranty Claim Filed',
      message: `A warranty claim (${claim.claimNumber}) was raised by the customer for booking ${warranty.bookingId}.`,
      data: { warrantyId: warranty._id, claimId: claim._id, bookingId: warranty.bookingId }
    });

    return res.status(201).json({
      success: true,
      message: 'Warranty claim submitted successfully.',
      data: claim
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to submit warranty claim.'
    });
  }
};

/**
 * Provider or Admin updates claim status
 * PATCH /api/warranties/claims/:claimId/status
 */
const updateClaimStatus = async (req, res) => {
  try {
    const { claimId } = req.params;
    const { status, resolutionDetails } = req.body;

    if (!Object.values(WARRANTY_CLAIM_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed statuses: ${Object.values(WARRANTY_CLAIM_STATUS).join(', ')}`
      });
    }

    const claim = await WarrantyClaim.findById(claimId).populate('warrantyId');
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Warranty claim not found.'
      });
    }

    const warranty = claim.warrantyId;
    const isProvider = warranty.providerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the provider or admin can update claim status.'
      });
    }

    claim.status = status;
    if (resolutionDetails) {
      claim.resolutionDetails = resolutionDetails;
    }
    if (status === WARRANTY_CLAIM_STATUS.RESOLVED || status === WARRANTY_CLAIM_STATUS.REJECTED) {
      claim.resolvedAt = new Date();
    }
    await claim.save();

    // Notify customer of claim update
    await notificationService.notify({
      recipientId: claim.customerId,
      senderId: req.user._id,
      type: NOTIFICATION_TYPE.SYSTEM,
      title: `Warranty Claim Updated: ${status}`,
      message: `Your warranty claim ${claim.claimNumber} has been updated to ${status}.${resolutionDetails ? ` Note: "${resolutionDetails}"` : ''}`,
      data: { claimId: claim._id, warrantyId: warranty._id }
    });

    return res.status(200).json({
      success: true,
      message: `Warranty claim status updated to ${status}.`,
      data: claim
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to update warranty claim.'
    });
  }
};

/**
 * Get warranty details by ID
 * GET /api/warranties/:id
 */
const getWarrantyById = async (req, res) => {
  try {
    const warranty = await Warranty.findById(req.params.id)
      .populate('serviceId', 'name slug description')
      .populate('bookingId', 'bookingNumber status scheduledDate problemDescription')
      .populate('technicianId', 'name fullName email phoneNumber')
      .populate('providerId', 'name fullName email phoneNumber')
      .populate('customerId', 'name fullName email phoneNumber');

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found.'
      });
    }

    const isCustomer = (warranty.customerId?._id || warranty.customerId)?.toString() === req.user._id.toString();
    const isTech =
      (warranty.technicianId?._id || warranty.technicianId)?.toString() === req.user._id.toString() ||
      (warranty.providerId?._id || warranty.providerId)?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isTech && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this warranty.'
      });
    }

    // Auto-expire if end date passed and still active
    if (warranty.status === WARRANTY_STATUS.ACTIVE && new Date() > new Date(warranty.endDate)) {
      warranty.status = WARRANTY_STATUS.EXPIRED;
      await warranty.save();
    }

    const claims = await WarrantyClaim.find({ warrantyId: warranty._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        warranty,
        claims
      },
      warranty
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve warranty.'
    });
  }
};

module.exports = {
  createWarranty,
  getWarrantyByBooking,
  getWarrantyById,
  createWarrantyClaim,
  updateClaimStatus
};

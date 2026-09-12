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
    const { bookingId, durationDays = 30, startDate, endDate, terms } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required.'
      });
    }

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
        message: 'Access denied: Only the assigned provider or admin can assign warranty terms.'
      });
    }

    // Warranty can only be assigned to completed or verified work
    const eligibleStatuses = [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CUSTOMER_VERIFIED];
    if (!eligibleStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Warranty can only be assigned to verified or completed work. Current status: ${booking.status}`
      });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const days = parseInt(durationDays, 10) || 30;
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

    let warranty = await Warranty.findOne({ bookingId: booking._id });
    if (warranty) {
      warranty.startDate = start;
      warranty.endDate = end;
      warranty.durationDays = days;
      warranty.terms = terms || warranty.terms;
      warranty.status = WARRANTY_STATUS.ACTIVE;
      await warranty.save();
    } else {
      warranty = await Warranty.create({
        bookingId: booking._id,
        providerId: booking.providerId,
        customerId: booking.customerId,
        startDate: start,
        endDate: end,
        durationDays: days,
        terms: terms || 'Standard 30-day workmanship warranty covering repair defects.',
        status: WARRANTY_STATUS.ACTIVE
      });
    }

    // Notify customer about warranty activation
    await notificationService.notify({
      recipientId: booking.customerId,
      senderId: req.user._id,
      type: NOTIFICATION_TYPE.SYSTEM,
      title: 'Warranty Activated',
      message: `A ${days}-day service warranty has been activated for booking ${booking.bookingNumber || booking._id}.`,
      data: { bookingId: booking._id, warrantyId: warranty._id }
    });

    return res.status(201).json({
      success: true,
      message: 'Warranty assigned successfully.',
      data: warranty
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
    const { bookingId } = req.params;
    const warranty = await Warranty.findOne({ bookingId })
      .populate('bookingId', 'bookingNumber status scheduledDate problemDescription')
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
      }
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

module.exports = {
  createWarranty,
  getWarrantyByBooking,
  createWarrantyClaim,
  updateClaimStatus
};

const mongoose = require('mongoose');
const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const notificationService = require('../services/notificationService');
const {
  DISPUTE_STATUS,
  DISPUTE_RESOLUTION,
  DISPUTE_REASON,
  USER_ROLES,
  NOTIFICATION_TYPE,
  BOOKING_STATUS
} = require('../utils/constants');

/**
 * Customer raises a dispute against a booking
 * POST /api/disputes
 */
const createDispute = async (req, res) => {
  try {
    const { bookingId, reason, description, evidenceUrls = [] } = req.body;

    if (!bookingId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID, reason, and description are required to raise a dispute.'
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    const isCustomer = booking.customerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the customer of this booking can raise a dispute.'
      });
    }

    // Check if an open dispute already exists for this booking
    const activeDispute = await Dispute.findOne({
      bookingId: booking._id,
      status: { $nin: [DISPUTE_STATUS.RESOLVED, DISPUTE_STATUS.REJECTED, DISPUTE_STATUS.CANCELLED] }
    });

    if (activeDispute) {
      return res.status(400).json({
        success: false,
        message: `An active dispute (${activeDispute.disputeNumber}) already exists for this booking.`
      });
    }

    const dispute = await Dispute.create({
      bookingId: booking._id,
      raisedById: req.user._id,
      againstId: booking.providerId,
      reason,
      description,
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [evidenceUrls],
      status: DISPUTE_STATUS.OPEN,
      auditHistory: [
        {
          action: 'DISPUTE_RAISED',
          actor: {
            userId: req.user._id,
            role: req.user.role,
            name: req.user.name || req.user.fullName || 'Customer'
          },
          note: `Dispute raised: ${reason}. Description: "${description}"`,
          previousStatus: null,
          newStatus: DISPUTE_STATUS.OPEN,
          timestamp: new Date()
        }
      ]
    });

    // Update booking status to DISPUTED if not already terminal
    const previousBookingStatus = booking.status;
    booking.status = BOOKING_STATUS.DISPUTED;
    booking.statusHistory = booking.statusHistory || [];
    booking.statusHistory.push({
      previousStatus: previousBookingStatus,
      newStatus: BOOKING_STATUS.DISPUTED,
      actor: {
        userId: req.user._id,
        role: req.user.role,
        name: req.user.name || req.user.fullName
      },
      reason: `Customer opened dispute ${dispute.disputeNumber}`,
      timestamp: new Date()
    });
    await booking.save();

    // Notify provider and customer
    await notificationService.notify({
      recipientId: booking.providerId,
      senderId: req.user._id,
      type: NOTIFICATION_TYPE.DISPUTE_CREATED,
      title: 'Dispute Raised by Customer',
      message: `Customer raised dispute ${dispute.disputeNumber} regarding booking ${booking.bookingNumber || booking._id}.`,
      data: { disputeId: dispute._id, bookingId: booking._id }
    });

    return res.status(201).json({
      success: true,
      message: 'Dispute submitted successfully.',
      data: dispute
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to submit dispute.'
    });
  }
};

/**
 * Provider submits response to dispute
 * POST /api/disputes/:id/respond
 */
const respondToDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required.'
      });
    }

    const dispute = await Dispute.findById(id).populate('bookingId');
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found.'
      });
    }

    const isProvider = dispute.againstId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the assigned provider can submit this response.'
      });
    }

    const previousStatus = dispute.status;
    const newStatus = DISPUTE_STATUS.UNDER_REVIEW;

    dispute.providerResponse = {
      message,
      respondedAt: new Date()
    };
    dispute.status = newStatus;
    dispute.auditHistory.push({
      action: 'PROVIDER_RESPONDED',
      actor: {
        userId: req.user._id,
        role: req.user.role,
        name: req.user.name || req.user.fullName || 'Provider'
      },
      note: message,
      previousStatus,
      newStatus,
      timestamp: new Date()
    });

    await dispute.save();

    // Notify customer
    await notificationService.notify({
      recipientId: dispute.raisedById,
      senderId: req.user._id,
      type: NOTIFICATION_TYPE.DISPUTE_UPDATED,
      title: 'Provider Responded to Dispute',
      message: `The provider responded to dispute ${dispute.disputeNumber}: "${message.slice(0, 80)}..."`,
      data: { disputeId: dispute._id, bookingId: dispute.bookingId._id }
    });

    return res.status(200).json({
      success: true,
      message: 'Provider response recorded successfully.',
      data: dispute
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to submit response.'
    });
  }
};

/**
 * Admin resolves or rejects dispute
 * PATCH /api/disputes/:id/resolve
 */
const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionType, resolutionNotes, refundAmount = 0 } = req.body;

    // Only Admin can arbitrate disputes
    if (req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only platform administrators can arbitrate and resolve disputes.'
      });
    }

    const allowedResolutions = Object.values(DISPUTE_RESOLUTION);
    if (resolutionType && !allowedResolutions.includes(resolutionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid resolutionType. Allowed: ${allowedResolutions.join(', ')}`
      });
    }

    const dispute = await Dispute.findById(id).populate('bookingId');
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found.'
      });
    }

    const previousStatus = dispute.status;
    const finalStatus = status || DISPUTE_STATUS.RESOLVED;

    dispute.status = finalStatus;
    dispute.resolutionType = resolutionType || DISPUTE_RESOLUTION.NO_ACTION;
    dispute.resolutionNotes = resolutionNotes || '';
    dispute.refundAmount = Number(refundAmount) || 0;
    dispute.closedAt = new Date();

    dispute.auditHistory.push({
      action: `ADMIN_${finalStatus}`,
      actor: {
        userId: req.user._id,
        role: req.user.role,
        name: req.user.name || req.user.fullName || 'Admin'
      },
      note: `Resolved as ${finalStatus} (${resolutionType || 'NO_ACTION'}). Notes: ${resolutionNotes || 'None'}`,
      previousStatus,
      newStatus: finalStatus,
      timestamp: new Date()
    });

    await dispute.save();

    // If dispute is resolved and booking is in DISPUTED status, update booking status to COMPLETED
    const booking = await Booking.findById(dispute.bookingId._id);
    if (booking && booking.status === BOOKING_STATUS.DISPUTED) {
      booking.status = BOOKING_STATUS.COMPLETED;
      booking.statusHistory = booking.statusHistory || [];
      booking.statusHistory.push({
        previousStatus: BOOKING_STATUS.DISPUTED,
        newStatus: BOOKING_STATUS.COMPLETED,
        actor: {
          userId: req.user._id,
          role: req.user.role,
          name: 'Administrator'
        },
        reason: `Dispute ${dispute.disputeNumber} resolved with ${resolutionType || 'NO_ACTION'}`,
        timestamp: new Date()
      });
      await booking.save();
    }

    // Notify both customer and provider
    const notifyParams = {
      senderId: req.user._id,
      type: NOTIFICATION_TYPE.DISPUTE_UPDATED,
      title: `Dispute ${dispute.disputeNumber} Closed: ${finalStatus}`,
      message: `Resolution: ${resolutionType}. Notes: "${resolutionNotes || 'Case closed by admin.'}"`,
      data: { disputeId: dispute._id, bookingId: booking?._id }
    };

    await Promise.all([
      notificationService.notify({ ...notifyParams, recipientId: dispute.raisedById }),
      notificationService.notify({ ...notifyParams, recipientId: dispute.againstId })
    ]);

    return res.status(200).json({
      success: true,
      message: `Dispute successfully marked as ${finalStatus}.`,
      data: dispute
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to resolve dispute.'
    });
  }
};

/**
 * Get single dispute with audit history
 * GET /api/disputes/:id
 */
const getDisputeById = async (req, res) => {
  try {
    const { id } = req.params;
    const dispute = await Dispute.findById(id)
      .populate('bookingId')
      .populate('raisedById', 'name fullName email phoneNumber')
      .populate('againstId', 'name fullName email phoneNumber');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found.'
      });
    }

    const isCustomer = dispute.raisedById._id.toString() === req.user._id.toString();
    const isProvider = dispute.againstId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this dispute.'
      });
    }

    return res.status(200).json({
      success: true,
      data: dispute
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve dispute.'
    });
  }
};

/**
 * Get dispute for a booking
 * GET /api/disputes/booking/:bookingId
 */
const getDisputeByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const dispute = await Dispute.findOne({ bookingId })
      .populate('raisedById', 'name fullName email phoneNumber')
      .populate('againstId', 'name fullName email phoneNumber')
      .sort({ createdAt: -1 });

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'No dispute found for this booking.'
      });
    }

    return res.status(200).json({
      success: true,
      data: dispute
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve booking dispute.'
    });
  }
};

module.exports = {
  createDispute,
  respondToDispute,
  resolveDispute,
  getDisputeById,
  getDisputeByBooking
};

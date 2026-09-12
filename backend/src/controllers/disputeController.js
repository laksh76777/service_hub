const mongoose = require('mongoose');
const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const User = require('../models/User');
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
    const bookingId = req.body.bookingId || req.params.id || req.params.bookingId;
    const { reason, description, evidenceUrls = [] } = req.body;

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

    const isCustomer = (booking.customerId?._id || booking.customerId)?.toString() === req.user._id.toString();
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
      status: { $nin: [DISPUTE_STATUS.RESOLVED, DISPUTE_STATUS.CLOSED, 'REJECTED', 'CANCELLED'] }
    });

    if (activeDispute) {
      return res.status(400).json({
        success: false,
        message: `An active dispute (${activeDispute.disputeNumber}) already exists for this booking.`
      });
    }

    const techId = booking.technicianId?._id || booking.technicianId || booking.providerId?._id || booking.providerId;

    const dispute = await Dispute.create({
      bookingId: booking._id,
      raisedById: req.user._id,
      againstId: techId,
      technicianId: techId,
      providerId: techId,
      serviceId: booking.serviceId?._id || booking.serviceId,
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

    // Record dispute event in booking history without breaking booking state machine
    booking.statusHistory = booking.statusHistory || [];
    booking.statusHistory.push({
      previousStatus: booking.status,
      newStatus: booking.status,
      actor: {
        userId: req.user._id,
        role: req.user.role,
        name: req.user.name || req.user.fullName || 'Customer'
      },
      reason: `Customer opened dispute ${dispute.disputeNumber}: ${reason}`,
      timestamp: new Date()
    });
    await booking.save();

    // Notify technician and admins
    try {
      await notificationService.notify({
        recipientId: techId,
        senderId: req.user._id,
        bookingId: booking._id,
        type: NOTIFICATION_TYPE.DISPUTE_CREATED,
        title: 'Dispute Raised by Customer',
        message: `Customer raised dispute ${dispute.disputeNumber} regarding booking ${booking.bookingNumber || booking._id}.`,
        data: { disputeId: dispute._id, bookingId: booking._id }
      });

      if (mongoose.connection.readyState === 1 || User.find !== mongoose.Model.find) {
        const adminUsers = await User.find({ role: USER_ROLES.ADMIN });
        for (const admin of adminUsers) {
          await notificationService.notify({
            recipientId: admin._id,
            senderId: req.user._id,
            bookingId: booking._id,
            type: NOTIFICATION_TYPE.DISPUTE_CREATED,
            title: 'New Dispute Opened',
            message: `Customer opened dispute ${dispute.disputeNumber} for booking ${booking.bookingNumber || booking._id}.`,
            data: { disputeId: dispute._id, bookingId: booking._id, link: '/admin/dashboard#disputes' }
          });
        }
      }
    } catch (notifErr) {
      console.warn('[DisputeController] Notification error:', notifErr.message);
    }

    const populated = await Dispute.findById(dispute._id)
      .populate('bookingId')
      .populate('raisedById', 'name fullName email phoneNumber')
      .populate('againstId', 'name fullName email phoneNumber')
      .populate('technicianId', 'name fullName email phoneNumber')
      .populate('serviceId', 'name slug');

    return res.status(201).json({
      success: true,
      message: 'Dispute submitted successfully.',
      data: populated,
      dispute: populated
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to submit dispute.'
    });
  }
};

/**
 * Technician submits response to dispute
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

    const isTechnician =
      (dispute.againstId?._id || dispute.againstId)?.toString() === req.user._id.toString() ||
      (dispute.technicianId?._id || dispute.technicianId)?.toString() === req.user._id.toString() ||
      (dispute.providerId?._id || dispute.providerId)?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isTechnician && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the assigned technician or admin can submit this response.'
      });
    }

    const previousStatus = dispute.status;
    const newStatus = DISPUTE_STATUS.UNDER_REVIEW;

    dispute.technicianResponse = {
      message,
      respondedAt: new Date()
    };
    dispute.providerResponse = {
      message,
      respondedAt: new Date()
    };
    dispute.status = newStatus;
    dispute.auditHistory.push({
      action: 'TECHNICIAN_RESPONDED',
      actor: {
        userId: req.user._id,
        role: req.user.role,
        name: req.user.name || req.user.fullName || 'Technician'
      },
      note: message,
      previousStatus,
      newStatus,
      timestamp: new Date()
    });

    await dispute.save();

    // Notify customer
    try {
      await notificationService.notify({
        recipientId: dispute.raisedById,
        senderId: req.user._id,
        type: NOTIFICATION_TYPE.DISPUTE_UPDATED,
        title: 'Technician Responded to Dispute',
        message: `Technician responded to dispute ${dispute.disputeNumber}: "${message.slice(0, 80)}..."`,
        data: { disputeId: dispute._id, bookingId: dispute.bookingId._id }
      });
    } catch (notifErr) {
      console.warn('[DisputeController] Notification error:', notifErr.message);
    }

    const populated = await Dispute.findById(dispute._id)
      .populate('bookingId')
      .populate('raisedById', 'name fullName email phoneNumber')
      .populate('againstId', 'name fullName email phoneNumber')
      .populate('technicianId', 'name fullName email phoneNumber')
      .populate('serviceId', 'name slug');

    return res.status(200).json({
      success: true,
      message: 'Technician response recorded successfully. Status set to UNDER_REVIEW.',
      data: populated,
      dispute: populated
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to submit response.'
    });
  }
};

/**
 * Admin reviews and resolves or closes dispute
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
        message: 'Access denied: Only platform administrators can review and arbitrate disputes.'
      });
    }

    const allowedStatuses = [
      DISPUTE_STATUS.OPEN,
      DISPUTE_STATUS.UNDER_REVIEW,
      DISPUTE_STATUS.RESOLVED,
      DISPUTE_STATUS.CLOSED
    ];

    const finalStatus = status ? status.toUpperCase() : DISPUTE_STATUS.RESOLVED;
    if (!allowedStatuses.includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid dispute status. Allowed statuses: ${allowedStatuses.join(', ')}`
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

    dispute.status = finalStatus;
    dispute.resolutionType = resolutionType || (finalStatus === DISPUTE_STATUS.RESOLVED ? DISPUTE_RESOLUTION.NO_ACTION : null);
    dispute.resolutionNotes = resolutionNotes || '';
    dispute.refundAmount = Number(refundAmount) || 0;
    dispute.adminReview = {
      reviewedById: req.user._id,
      notes: resolutionNotes || '',
      reviewedAt: new Date()
    };

    if (finalStatus === DISPUTE_STATUS.RESOLVED || finalStatus === DISPUTE_STATUS.CLOSED) {
      dispute.closedAt = new Date();
    }

    dispute.auditHistory.push({
      action: `ADMIN_${finalStatus}`,
      actor: {
        userId: req.user._id,
        role: req.user.role,
        name: req.user.name || req.user.fullName || 'Admin'
      },
      note: `Status updated to ${finalStatus}. Notes: ${resolutionNotes || 'None'}`,
      previousStatus,
      newStatus: finalStatus,
      timestamp: new Date()
    });

    await dispute.save();

    // If dispute is resolved/closed and booking is in DISPUTED status, update booking status to COMPLETED
    if (finalStatus === DISPUTE_STATUS.RESOLVED || finalStatus === DISPUTE_STATUS.CLOSED) {
      const booking = await Booking.findById(dispute.bookingId?._id || dispute.bookingId);
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
          reason: `Dispute ${dispute.disputeNumber} concluded with ${finalStatus}`,
          timestamp: new Date()
        });
        await booking.save();
      }
    }

    // Notify both customer and technician
    try {
      const notifyParams = {
        senderId: req.user._id,
        type: NOTIFICATION_TYPE.DISPUTE_UPDATED,
        title: `Dispute ${dispute.disputeNumber}: ${finalStatus}`,
        message: `Admin review update: ${finalStatus}. Notes: "${resolutionNotes || 'Reviewed by admin.'}"`,
        data: { disputeId: dispute._id, bookingId: dispute.bookingId?._id }
      };

      await Promise.all([
        notificationService.notify({ ...notifyParams, recipientId: dispute.raisedById }),
        notificationService.notify({ ...notifyParams, recipientId: dispute.againstId })
      ]);
    } catch (notifErr) {
      console.warn('[DisputeController] Notification error:', notifErr.message);
    }

    const populated = await Dispute.findById(dispute._id)
      .populate('bookingId')
      .populate('raisedById', 'name fullName email phoneNumber')
      .populate('againstId', 'name fullName email phoneNumber')
      .populate('technicianId', 'name fullName email phoneNumber')
      .populate('adminReview.reviewedById', 'name email role')
      .populate('serviceId', 'name slug');

    return res.status(200).json({
      success: true,
      message: `Dispute successfully updated to ${finalStatus}.`,
      data: populated,
      dispute: populated
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to review dispute.'
    });
  }
};

/**
 * Get all disputes (accessible by admin, or filtered for technician/customer)
 * GET /api/disputes
 */
const getDisputes = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === USER_ROLES.ADMIN) {
      if (req.query.status) {
        filter.status = req.query.status.toUpperCase();
      }
    } else if (req.user.role === USER_ROLES.TECHNICIAN || req.user.role === 'PROVIDER') {
      filter = {
        $or: [
          { againstId: req.user._id },
          { technicianId: req.user._id },
          { providerId: req.user._id }
        ]
      };
    } else {
      filter = { raisedById: req.user._id };
    }

    const disputes = await Dispute.find(filter)
      .populate('bookingId', 'bookingNumber status scheduledDate')
      .populate('raisedById', 'name fullName email phoneNumber')
      .populate('againstId', 'name fullName email phoneNumber')
      .populate('technicianId', 'name fullName email phoneNumber')
      .populate('serviceId', 'name slug')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: disputes.length,
      data: disputes,
      disputes
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve disputes.'
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
      .populate('againstId', 'name fullName email phoneNumber')
      .populate('technicianId', 'name fullName email phoneNumber')
      .populate('serviceId', 'name slug');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found.'
      });
    }

    const isCustomer = (dispute.raisedById?._id || dispute.raisedById)?.toString() === req.user._id.toString();
    const isTechnician =
      (dispute.againstId?._id || dispute.againstId)?.toString() === req.user._id.toString() ||
      (dispute.technicianId?._id || dispute.technicianId)?.toString() === req.user._id.toString() ||
      (dispute.providerId?._id || dispute.providerId)?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isTechnician && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this dispute.'
      });
    }

    return res.status(200).json({
      success: true,
      data: dispute,
      dispute
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
      .populate('technicianId', 'name fullName email phoneNumber')
      .populate('serviceId', 'name slug')
      .sort({ createdAt: -1 });

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'No dispute found for this booking.'
      });
    }

    return res.status(200).json({
      success: true,
      data: dispute,
      dispute
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
  getDisputes,
  getDisputeById,
  getDisputeByBooking
};

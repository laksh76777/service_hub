const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const Invoice = require('../models/Invoice');
const Warranty = require('../models/Warranty');
const Estimate = require('../models/Estimate');
const notificationService = require('../services/notificationService');
const { BOOKING_STATUS, USER_ROLES, PROVIDER_STATUS, NOTIFICATION_TYPE } = require('../utils/constants');
const { validateStatusTransition, canRescheduleBooking } = require('../utils/bookingStateMachine');

/**
 * Generates a human-friendly unique booking number
 * e.g. BK-2609-4821
 */
/**
 * Generates a 6-digit numeric OTP for customer verification
 */
const generateNumericOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generates a human-friendly unique booking number
 * e.g. BK-2609-4821
 */
const generateBookingNumber = () => {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BK-${timestamp}-${random}`;
};

/**
 * Create a service request / booking (Customer)
 * POST /api/bookings
 */
const createBooking = async (req, res) => {
  try {
    const {
      serviceId,
      providerId,
      technicianId,
      address,
      scheduledDate,
      preferredTimeSlot,
      problemDescription
    } = req.body;

    const targetTechId = technicianId || providerId;

    // Validate required inputs
    if (!serviceId || !targetTechId || !address || !scheduledDate || !problemDescription) {
      return res.status(400).json({
        success: false,
        message: 'serviceId, technicianId/providerId, address, scheduledDate, and problemDescription are required.'
      });
    }

    const line1 = (address.addressLine1 || address.streetAddress || address.street || '').trim();
    const pin = (address.pincode || address.zipCode || address.pin || '').trim();

    if (!line1 || !address.city || !address.state || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Complete address details (addressLine1/streetAddress/street, city, state, pincode/zipCode/pin) are required.'
      });
    }

    const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
    if (!PINCODE_REGEX.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 6-digit Indian PIN code (e.g. 560001).'
      });
    }

    const normalizedAddress = {
      addressLine1: line1,
      streetAddress: line1,
      addressLine2: (address.addressLine2 || address.unit || '').trim(),
      unit: (address.unit || address.addressLine2 || '').trim(),
      locality: (address.locality || '').trim(),
      landmark: (address.landmark || '').trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      pincode: pin,
      zipCode: pin
    };

    // Verify service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Selected service was not found.'
      });
    }

    // Verify technician exists
    const targetTechnicianId = req.body.technicianId || req.body.providerId;
    if (!targetTechnicianId) {
      return res.status(400).json({
        success: false,
        message: 'Technician selection is required.'
      });
    }

    const technicianUser = await User.findById(targetTechnicianId);
    if (!technicianUser || (technicianUser.role !== USER_ROLES.TECHNICIAN && technicianUser.role !== 'PROVIDER')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid technician selected.'
      });
    }

    // Verify technician profile is VERIFIED
    const technicianProfile = await ProviderProfile.findOne({ userId: targetTechnicianId });
    if (!technicianProfile || technicianProfile.status !== PROVIDER_STATUS.VERIFIED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book an unverified technician. Please choose an approved verified technician.'
      });
    }

    // Calculate baseline estimated price if available
    let estimatedTotal = service.basePrice || service.estimatedPriceRange?.min || 0;
    const matchedOffering = technicianProfile.servicesOffered?.find(
      (s) => s.serviceId.toString() === serviceId.toString() && s.isActive
    );
    if (matchedOffering?.pricing?.amount) {
      estimatedTotal = matchedOffering.pricing.amount;
    }

    const bookingNumber = generateBookingNumber();

    const initialStatusHistory = [
      {
        previousStatus: null,
        newStatus: BOOKING_STATUS.REQUESTED,
        actor: {
          userId: req.user._id,
          role: req.user.role,
          name: req.user.name || 'Customer'
        },
        reason: 'Initial booking request submitted',
        timestamp: new Date()
      }
    ];

    const startOtp = {
      code: generateNumericOtp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days validity
      attempts: 0
    };

    const booking = new Booking({
      bookingNumber,
      customerId: req.user._id,
      technicianId: targetTechnicianId,
      providerId: targetTechnicianId,
      serviceId,
      address: normalizedAddress,
      scheduledDate: new Date(scheduledDate),
      preferredTimeSlot: preferredTimeSlot || 'Morning (09:00 - 12:00)',
      problemDescription: problemDescription.trim(),
      status: BOOKING_STATUS.REQUESTED,
      pricing: {
        estimatedTotal,
        finalTotal: 0,
        currency: 'INR'
      },
      startOtp,
      jobExecution: {
        inspectionNotes: '',
        workNotes: '',
        partsUsed: []
      },
      statusHistory: initialStatusHistory,
      rescheduleHistory: []
    });

    await booking.save();

    // Notify customer: Request sent & technician: New request received
    try {
      await Promise.all([
        notificationService.notify({
          recipientId: req.user._id,
          senderId: targetTechnicianId,
          bookingId: booking._id,
          type: NOTIFICATION_TYPE.BOOKING_REQUESTED,
          title: 'Request Sent',
          message: `Your service request for ${service.name} (${booking.bookingNumber}) has been sent to the technician.`,
          data: { bookingId: booking._id, bookingNumber: booking.bookingNumber }
        }),
        notificationService.notify({
          recipientId: targetTechnicianId,
          senderId: req.user._id,
          bookingId: booking._id,
          type: NOTIFICATION_TYPE.BOOKING_REQUESTED,
          title: 'New Request Received',
          message: `You have received a new service request (${booking.bookingNumber}) for ${service.name} from ${req.user.name || 'Customer'}.`,
          data: { bookingId: booking._id, bookingNumber: booking.bookingNumber }
        })
      ]);
    } catch (notifErr) {
      console.warn('[BookingController] createBooking notification error:', notifErr.message);
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate('serviceId', 'name description basePrice')
      .populate('providerId', 'name email phone')
      .populate('customerId', 'name email phone');

    return res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully.',
      booking: populatedBooking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create booking request.'
    });
  }
};

/**
 * List bookings for authenticated user
 * GET /api/bookings
 */
const getBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === USER_ROLES.CUSTOMER) {
      filter.customerId = req.user._id;
    } else if (req.user.role === USER_ROLES.TECHNICIAN || req.user.role === 'PROVIDER') {
      filter.$or = [{ technicianId: req.user._id }, { providerId: req.user._id }];
    } else if (req.user.role === USER_ROLES.ADMIN) {
      if (req.query.customerId) filter.customerId = req.query.customerId;
      if (req.query.technicianId || req.query.providerId) {
        const tId = req.query.technicianId || req.query.providerId;
        filter.$or = [{ technicianId: tId }, { providerId: tId }];
      }
    }

    if (status && Object.values(BOOKING_STATUS).includes(status)) {
      filter.status = status;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('serviceId', 'name description basePrice')
        .populate('technicianId', 'name email phone avatarUrl')
        .populate('providerId', 'name email phone avatarUrl')
        .populate('customerId', 'name email phone avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Booking.countDocuments(filter)
    ]);

    const isTechnician = req.user.role === USER_ROLES.TECHNICIAN || req.user.role === 'PROVIDER';
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    const formattedBookings = bookings.map((b) => {
      const bObj = b.toObject();
      if (isTechnician && !isAdmin && bObj.status === BOOKING_STATUS.REQUESTED && bObj.address) {
        bObj.address = {
          ...bObj.address,
          addressLine1: 'Complete address disclosed upon accepting request',
          streetAddress: 'Complete address disclosed upon accepting request',
          addressLine2: '',
          unit: ''
        };
      }
      return bObj;
    });

    return res.status(200).json({
      success: true,
      count: formattedBookings.length,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      bookings: formattedBookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings.'
    });
  }
};

/**
 * Get single booking details
 * GET /api/bookings/:id
 */
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('serviceId', 'name description basePrice')
      .populate('technicianId', 'name email phone avatarUrl')
      .populate('providerId', 'name email phone avatarUrl')
      .populate('customerId', 'name email phone avatarUrl')
      .populate('statusHistory.actor.userId', 'name email role');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Access control: User must be customer, technician, or admin
    const isCustomer = (booking.customerId?._id || booking.customerId).toString() === req.user._id.toString();
    const isTechnician =
      ((booking.technicianId?._id || booking.technicianId)?.toString() === req.user._id.toString()) ||
      ((booking.providerId?._id || booking.providerId)?.toString() === req.user._id.toString());
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isTechnician && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this booking.'
      });
    }

    const bookingObj = booking.toObject();

    // Security & Location Principle:
    // Technician receives the complete service address after accepting the request.
    if (isTechnician && !isAdmin && !isCustomer) {
      if (booking.status === BOOKING_STATUS.REQUESTED && bookingObj.address) {
        bookingObj.address = {
          ...bookingObj.address,
          addressLine1: 'Complete address disclosed upon accepting request',
          streetAddress: 'Complete address disclosed upon accepting request',
          addressLine2: '',
          unit: ''
        };
      }

      // Security: Unverified OTPs must NOT be exposed to the technician
      if (bookingObj.startOtp && !bookingObj.startOtp.verifiedAt) {
        bookingObj.startOtp = {
          hasOtp: true,
          verifiedAt: null,
          attempts: bookingObj.startOtp.attempts || 0
        };
      }
      if (bookingObj.completionOtp && !bookingObj.completionOtp.verifiedAt) {
        bookingObj.completionOtp = {
          hasOtp: true,
          verifiedAt: null,
          attempts: bookingObj.completionOtp.attempts || 0
        };
      }
    }

    return res.status(200).json({
      success: true,
      booking: bookingObj
    });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve booking details.'
    });
  }
};

/**
 * Strictly transition booking status
 * PATCH /api/bookings/:id/status
 */
const transitionBookingStatus = async (req, res) => {
  try {
    const { status: nextStatus, reason, otp } = req.body;

    if (!nextStatus) {
      return res.status(400).json({
        success: false,
        message: 'Target status is required.'
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Authorization check
    const isCustomer = (booking.customerId?._id || booking.customerId).toString() === req.user._id.toString();
    const isTechnician =
      ((booking.technicianId?._id || booking.technicianId)?.toString() === req.user._id.toString()) ||
      ((booking.providerId?._id || booking.providerId)?.toString() === req.user._id.toString());
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isTechnician && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to update this booking.'
      });
    }

    // Determine actor's effective role
    let actorRole = req.user.role;
    if (isAdmin) {
      actorRole = USER_ROLES.ADMIN;
    } else if (isCustomer) {
      actorRole = USER_ROLES.CUSTOMER;
    } else if (isTechnician) {
      actorRole = USER_ROLES.TECHNICIAN;
    }

    // Prevent duplicate status transitions
    if (booking.status === nextStatus) {
      return res.status(400).json({
        success: false,
        message: `Booking is already in '${booking.status}' status.`
      });
    }

    // Reject strictly requires reason
    if (nextStatus === BOOKING_STATUS.REJECTED) {
      if (!reason || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'A reason is required to reject a booking request.'
        });
      }
      booking.rejectionReason = reason.trim();
    }

    // State machine check
    const validation = validateStatusTransition(booking.status, nextStatus, actorRole);
    if (!validation.allowed) {
      return res.status(400).json({
        success: false,
        message: validation.reason
      });
    }

    booking.jobExecution = booking.jobExecution || {};

    // Specific state handling
    if (nextStatus === BOOKING_STATUS.ACCEPTED) {
      booking.jobExecution.acceptedAt = new Date();
    } else if (nextStatus === BOOKING_STATUS.SCHEDULED) {
      booking.jobExecution.scheduledAt = new Date();
    } else if (nextStatus === BOOKING_STATUS.INSPECTION) {
      if (otp && booking.startOtp && booking.startOtp.code) {
        if (booking.startOtp.code !== otp.trim()) {
          booking.startOtp.attempts = (booking.startOtp.attempts || 0) + 1;
          await booking.save();
          return res.status(400).json({
            success: false,
            message: 'Invalid arrival OTP. Please obtain the correct 6-digit OTP from the customer.'
          });
        }
        booking.startOtp.verifiedAt = new Date();
      }
      booking.jobExecution.technicianArrivedAt = booking.jobExecution.technicianArrivedAt || new Date();
      booking.jobExecution.inspectedAt = new Date();
    } else if (nextStatus === BOOKING_STATUS.ESTIMATE_PENDING) {
      booking.jobExecution.estimatePendingAt = new Date();
    } else if (nextStatus === BOOKING_STATUS.ESTIMATE_SUBMITTED) {
      booking.jobExecution.estimateSubmittedAt = new Date();
    } else if (nextStatus === BOOKING_STATUS.ESTIMATE_APPROVED) {
      booking.jobExecution.estimateApprovedAt = new Date();
    } else if (nextStatus === BOOKING_STATUS.PAYMENT_PENDING) {
      booking.pricing = booking.pricing || {};
      booking.pricing.isPaid = false;
    } else if (nextStatus === BOOKING_STATUS.PAYMENT_SUCCESS) {
      booking.pricing = booking.pricing || {};
      booking.pricing.isPaid = true;
      booking.pricing.paidAt = new Date();
    } else if (nextStatus === BOOKING_STATUS.WORK_IN_PROGRESS) {
      booking.jobExecution.workStartedAt = booking.jobExecution.workStartedAt || new Date();
    } else if (nextStatus === BOOKING_STATUS.WORK_COMPLETED) {
      booking.jobExecution.workCompletedAt = new Date();
      booking.jobExecution.completionPendingAt = new Date();
      if (!booking.completionOtp || !booking.completionOtp.code) {
        booking.completionOtp = {
          code: generateNumericOtp(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours validity
          attempts: 0
        };
      }
    } else if (nextStatus === BOOKING_STATUS.CUSTOMER_CONFIRMED) {
      if ((actorRole === USER_ROLES.TECHNICIAN || actorRole === USER_ROLES.PROVIDER) && otp) {
        if (booking.completionOtp && booking.completionOtp.code && booking.completionOtp.code !== otp.trim()) {
          booking.completionOtp.attempts = (booking.completionOtp.attempts || 0) + 1;
          await booking.save();
          return res.status(400).json({
            success: false,
            message: 'Invalid completion OTP. Please verify with customer.'
          });
        }
        if (booking.completionOtp) booking.completionOtp.verifiedAt = new Date();
      } else if (actorRole === USER_ROLES.CUSTOMER) {
        if (booking.completionOtp) booking.completionOtp.verifiedAt = new Date();
      }
      booking.jobExecution.customerConfirmedAt = new Date();
    } else if (nextStatus === BOOKING_STATUS.INVOICED) {
      booking.jobExecution.invoicedAt = new Date();
      booking.jobExecution.completedAt = booking.jobExecution.completedAt || new Date();
    }

    // Apply transition
    const previousStatus = booking.status;
    booking.status = nextStatus;

    booking.statusHistory.push({
      previousStatus,
      newStatus: nextStatus,
      actor: {
        userId: req.user._id,
        role: actorRole,
        name: req.user.name || 'User'
      },
      reason: reason ? reason.trim() : (nextStatus === BOOKING_STATUS.ACCEPTED ? 'Technician accepted booking request' : ''),
      timestamp: new Date()
    });

    await booking.save();

    // Trigger lifecycle notifications
    try {
      const custId = booking.customerId?._id || booking.customerId;
      const techId = booking.technicianId?._id || booking.technicianId || booking.providerId?._id || booking.providerId;

      if (nextStatus === BOOKING_STATUS.ACCEPTED) {
        // Customer: Technician accepts
        await notificationService.notify({
          recipientId: custId,
          senderId: req.user._id,
          bookingId: booking._id,
          type: NOTIFICATION_TYPE.BOOKING_ACCEPTED,
          title: 'Technician Accepts',
          message: `Technician ${req.user.name || ''} accepted your service request ${booking.bookingNumber}.`,
          data: { bookingId: booking._id, bookingNumber: booking.bookingNumber }
        });
      } else if (nextStatus === BOOKING_STATUS.REJECTED) {
        // Customer: Technician rejects
        await notificationService.notify({
          recipientId: custId,
          senderId: req.user._id,
          bookingId: booking._id,
          type: NOTIFICATION_TYPE.BOOKING_REJECTED,
          title: 'Technician Rejects',
          message: `Your service request ${booking.bookingNumber} was declined by the technician.${booking.rejectionReason ? ` Reason: ${booking.rejectionReason}` : ''}`,
          data: { bookingId: booking._id, bookingNumber: booking.bookingNumber, reason: booking.rejectionReason }
        });
      } else if (nextStatus === BOOKING_STATUS.CANCELLED) {
        // Technician: Customer cancels
        await notificationService.notify({
          recipientId: techId,
          senderId: req.user._id,
          bookingId: booking._id,
          type: NOTIFICATION_TYPE.BOOKING_CANCELLED,
          title: 'Customer Cancels',
          message: `Customer cancelled service booking ${booking.bookingNumber}.${reason ? ` Reason: ${reason}` : ''}`,
          data: { bookingId: booking._id, bookingNumber: booking.bookingNumber, reason }
        });
      } else if (nextStatus === BOOKING_STATUS.WORK_IN_PROGRESS) {
        // Customer: Work started
        await notificationService.notify({
          recipientId: custId,
          senderId: req.user._id,
          bookingId: booking._id,
          type: NOTIFICATION_TYPE.WORK_STARTED,
          title: 'Work Started',
          message: `Technician has started work on your service booking ${booking.bookingNumber}.`,
          data: { bookingId: booking._id, bookingNumber: booking.bookingNumber }
        });
      } else if (nextStatus === BOOKING_STATUS.WORK_COMPLETED) {
        // Customer: Work completed
        await notificationService.notify({
          recipientId: custId,
          senderId: req.user._id,
          bookingId: booking._id,
          type: NOTIFICATION_TYPE.WORK_COMPLETED,
          title: 'Work Completed',
          message: `Technician completed work on booking ${booking.bookingNumber}. Please inspect and confirm completion.`,
          data: { bookingId: booking._id, bookingNumber: booking.bookingNumber }
        });
      } else if (nextStatus === BOOKING_STATUS.CUSTOMER_CONFIRMED) {
        // Technician: Customer confirms completion
        await notificationService.notify({
          recipientId: techId,
          senderId: req.user._id,
          bookingId: booking._id,
          type: NOTIFICATION_TYPE.CUSTOMER_CONFIRMED,
          title: 'Customer Confirms Completion',
          message: `Customer has confirmed service completion for booking ${booking.bookingNumber}.`,
          data: { bookingId: booking._id, bookingNumber: booking.bookingNumber }
        });
        // Customer: Review requested
        await notificationService.notify({
          recipientId: custId,
          senderId: techId,
          bookingId: booking._id,
          type: NOTIFICATION_TYPE.REVIEW_REQUESTED,
          title: 'Review Requested',
          message: `Your service for booking ${booking.bookingNumber} is complete! Please rate and review your technician.`,
          data: { bookingId: booking._id, bookingNumber: booking.bookingNumber }
        });
      }
    } catch (notifErr) {
      console.warn('[BookingController] Lifecycle notification failed:', notifErr.message);
    }

    const updatedBooking = await Booking.findById(booking._id)
      .populate('serviceId', 'name description basePrice')
      .populate('technicianId', 'name email phone avatarUrl')
      .populate('providerId', 'name email phone avatarUrl')
      .populate('customerId', 'name email phone avatarUrl');

    return res.status(200).json({
      success: true,
      message: `Booking status transitioned successfully to '${nextStatus}'.`,
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Error transitioning booking status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update booking status.'
    });
  }
};

/**
 * Reschedule booking date or time slot
 * PATCH /api/bookings/:id/reschedule
 */
const rescheduleBooking = async (req, res) => {
  try {
    const { newScheduledDate, newTimeSlot, reason } = req.body;

    if (!newScheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'newScheduledDate is required.'
      });
    }

    const booking = await Booking.findById(req.params.id);
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
        message: 'Access denied: You are not authorized to reschedule this booking.'
      });
    }

    if (!canRescheduleBooking(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule booking in '${booking.status}' status.`
      });
    }

    const prevDate = booking.scheduledDate;
    const prevTimeSlot = booking.preferredTimeSlot;

    // Record in reschedule history
    booking.rescheduleHistory.push({
      proposedBy: req.user._id,
      role: req.user.role,
      previousDate: prevDate,
      previousTimeSlot: prevTimeSlot,
      newDate: new Date(newScheduledDate),
      newTimeSlot: newTimeSlot || prevTimeSlot,
      reason: reason || '',
      timestamp: new Date()
    });

    booking.scheduledDate = new Date(newScheduledDate);
    if (newTimeSlot) {
      booking.preferredTimeSlot = newTimeSlot;
    }

    // Rescheduling advances ACCEPTED or keeps SCHEDULED
    const targetStatus = BOOKING_STATUS.SCHEDULED;
    const prevStatus = booking.status;
    booking.status = targetStatus;

    booking.statusHistory.push({
      previousStatus: prevStatus,
      newStatus: targetStatus,
      actor: {
        userId: req.user._id,
        role: req.user.role,
        name: req.user.name || 'User'
      },
      reason: `Rescheduled booking to ${new Date(newScheduledDate).toDateString()}${
        newTimeSlot ? ` (${newTimeSlot})` : ''
      }${reason ? `. Reason: ${reason}` : ''}`,
      timestamp: new Date()
    });

    await booking.save();

    // Job schedule changes notification
    try {
      const custId = booking.customerId?._id || booking.customerId;
      const techId = booking.technicianId?._id || booking.technicianId || booking.providerId?._id || booking.providerId;
      const formattedDate = new Date(newScheduledDate).toLocaleDateString('en-IN');
      const timeSlotStr = newTimeSlot || booking.preferredTimeSlot;

      if (isCustomer) {
        // Notify technician: Job schedule changes
        await notificationService.notify({
          recipientId: techId,
          senderId: req.user._id,
          bookingId: booking._id,
          type: NOTIFICATION_TYPE.BOOKING_RESCHEDULED,
          title: 'Job Schedule Changes',
          message: `Customer rescheduled booking ${booking.bookingNumber} to ${formattedDate} (${timeSlotStr}).${reason ? ` Reason: ${reason}` : ''}`,
          data: { bookingId: booking._id, bookingNumber: booking.bookingNumber, newScheduledDate, newTimeSlot: timeSlotStr }
        });
      } else {
        // Notify customer: Job schedule changes
        await notificationService.notify({
          recipientId: custId,
          senderId: req.user._id,
          bookingId: booking._id,
          type: NOTIFICATION_TYPE.BOOKING_RESCHEDULED,
          title: 'Job Schedule Changes',
          message: `Technician updated appointment for booking ${booking.bookingNumber} to ${formattedDate} (${timeSlotStr}).${reason ? ` Reason: ${reason}` : ''}`,
          data: { bookingId: booking._id, bookingNumber: booking.bookingNumber, newScheduledDate, newTimeSlot: timeSlotStr }
        });
      }
    } catch (notifErr) {
      console.warn('[BookingController] Reschedule notification failed:', notifErr.message);
    }

    const updatedBooking = await Booking.findById(booking._id)
      .populate('serviceId', 'name description basePrice')
      .populate('providerId', 'name email phone')
      .populate('customerId', 'name email phone');

    return res.status(200).json({
      success: true,
      message: 'Booking rescheduled successfully.',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to reschedule booking.'
    });
  }
};

/**
 * Dedicated endpoint to verify customer arrival or completion OTP
 * POST /api/bookings/:id/verify-otp
 */
const verifyBookingOtp = async (req, res) => {
  try {
    const { type, otp } = req.body;

    if (!type || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Both type (ARRIVAL or COMPLETION) and otp are required.'
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    const isTechnician =
      (booking.technicianId && booking.technicianId.toString() === req.user._id.toString()) ||
      (booking.providerId && booking.providerId.toString() === req.user._id.toString());
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isTechnician && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the assigned technician or admin can verify customer OTP.'
      });
    }

    const normalizedType = type.toUpperCase();
    const submittedOtp = otp.toString().trim();

    booking.jobExecution = booking.jobExecution || {};

    if (normalizedType === 'ARRIVAL' || normalizedType === 'START') {
      if (booking.status !== BOOKING_STATUS.SCHEDULED) {
        return res.status(400).json({
          success: false,
          message: `Arrival OTP can only be verified when booking is in SCHEDULED status. Current status: '${booking.status}'.`
        });
      }

      if (!booking.startOtp || !booking.startOtp.code) {
        return res.status(400).json({
          success: false,
          message: 'No arrival OTP found for this booking.'
        });
      }

      if (booking.startOtp.code !== submittedOtp) {
        booking.startOtp.attempts = (booking.startOtp.attempts || 0) + 1;
        await booking.save();
        return res.status(400).json({
          success: false,
          message: 'Invalid arrival OTP. Please check with customer and try again.'
        });
      }

      // Mark verified and transition to TECHNICIAN_ARRIVED
      booking.startOtp.verifiedAt = new Date();
      booking.jobExecution.technicianArrivedAt = new Date();
      booking.status = BOOKING_STATUS.TECHNICIAN_ARRIVED;
      booking.statusHistory.push({
        previousStatus: BOOKING_STATUS.SCHEDULED,
        newStatus: BOOKING_STATUS.TECHNICIAN_ARRIVED,
        actor: {
          userId: req.user._id,
          role: req.user.role,
          name: req.user.name || 'Provider'
        },
        reason: 'Customer arrival OTP verified successfully',
        timestamp: new Date()
      });

      await booking.save();

      const updatedBooking = await Booking.findById(booking._id)
        .populate('serviceId', 'name description basePrice')
        .populate('providerId', 'name email phone')
        .populate('customerId', 'name email phone');

      return res.status(200).json({
        success: true,
        message: 'Arrival OTP verified successfully. Technician checked in at job site.',
        booking: updatedBooking
      });
    } else if (normalizedType === 'COMPLETION') {
      if (booking.status !== BOOKING_STATUS.COMPLETION_PENDING) {
        return res.status(400).json({
          success: false,
          message: `Completion OTP can only be verified when work is in COMPLETION_PENDING status. Current status: '${booking.status}'.`
        });
      }

      if (!booking.completionOtp || !booking.completionOtp.code) {
        return res.status(400).json({
          success: false,
          message: 'No completion OTP generated yet for this booking.'
        });
      }

      if (booking.completionOtp.code !== submittedOtp) {
        booking.completionOtp.attempts = (booking.completionOtp.attempts || 0) + 1;
        await booking.save();
        return res.status(400).json({
          success: false,
          message: 'Invalid completion OTP. Please verify with customer and try again.'
        });
      }

      // Mark verified and transition to CUSTOMER_VERIFIED
      booking.completionOtp.verifiedAt = new Date();
      booking.jobExecution.completedAt = new Date();
      booking.status = BOOKING_STATUS.CUSTOMER_VERIFIED;
      booking.statusHistory.push({
        previousStatus: BOOKING_STATUS.COMPLETION_PENDING,
        newStatus: BOOKING_STATUS.CUSTOMER_VERIFIED,
        actor: {
          userId: req.user._id,
          role: req.user.role,
          name: req.user.name || 'Provider'
        },
        reason: 'Customer completion OTP verified successfully',
        timestamp: new Date()
      });

      await booking.save();

      const updatedBooking = await Booking.findById(booking._id)
        .populate('serviceId', 'name description basePrice')
        .populate('providerId', 'name email phone')
        .populate('customerId', 'name email phone');

      return res.status(200).json({
        success: true,
        message: 'Completion OTP verified successfully. Work is customer-verified.',
        booking: updatedBooking
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP type. Must be 'ARRIVAL' or 'COMPLETION'."
      });
    }
  } catch (error) {
    console.error('Error verifying booking OTP:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify OTP.'
    });
  }
};

/**
 * Update technician job execution notes and parts used
 * PATCH /api/bookings/:id/job-execution
 */
const updateJobExecution = async (req, res) => {
  try {
    const {
      inspectionNotes,
      problemIdentified,
      requiredWork,
      workNotes,
      partsUsed
    } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    const isTechnician =
      ((booking.technicianId?._id || booking.technicianId)?.toString() === req.user._id.toString()) ||
      ((booking.providerId?._id || booking.providerId)?.toString() === req.user._id.toString());
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isTechnician && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the assigned technician or admin can update job execution details.'
      });
    }

    booking.jobExecution = booking.jobExecution || {};

    if (inspectionNotes !== undefined) {
      booking.jobExecution.inspectionNotes = inspectionNotes.trim();
    }
    if (problemIdentified !== undefined) {
      booking.jobExecution.problemIdentified = problemIdentified.trim();
    }
    if (requiredWork !== undefined) {
      booking.jobExecution.requiredWork = requiredWork.trim();
    }
    if (workNotes !== undefined) {
      booking.jobExecution.workNotes = workNotes.trim();
    }
    if (Array.isArray(partsUsed)) {
      booking.jobExecution.partsUsed = partsUsed.map((p) => ({
        name: (p.name || p.description || 'Part/Consumable').trim(),
        quantity: Math.max(1, parseInt(p.quantity, 10) || 1),
        cost: Math.max(0, parseFloat(p.cost || p.unitPrice) || 0)
      }));
    }

    if (booking.status === BOOKING_STATUS.INSPECTION) {
      booking.jobExecution.inspectedAt = booking.jobExecution.inspectedAt || new Date();
    }

    // CRITICAL SECURITY RULE:
    // Do not allow technician to directly charge the customer from inspection/job updates.
    // Financial charges must only be proposed via an Estimate requiring customer approval.

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('serviceId', 'name description basePrice')
      .populate('providerId', 'name email phone')
      .populate('customerId', 'name email phone');

    return res.status(200).json({
      success: true,
      message: 'Job execution details updated successfully.',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Error updating job execution:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update job execution details.'
    });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  transitionBookingStatus,
  updateBookingStatus: transitionBookingStatus,
  rescheduleBooking,
  verifyBookingOtp,
  updateJobExecution
};


const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const { BOOKING_STATUS, USER_ROLES, PROVIDER_STATUS } = require('../utils/constants');
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
      address,
      scheduledDate,
      preferredTimeSlot,
      problemDescription
    } = req.body;

    // Validate required inputs
    if (!serviceId || !providerId || !address || !scheduledDate || !problemDescription) {
      return res.status(400).json({
        success: false,
        message: 'serviceId, providerId, address, scheduledDate, and problemDescription are required.'
      });
    }

    const line1 = (address.addressLine1 || address.streetAddress || '').trim();
    const pin = (address.pincode || address.zipCode || '').trim();

    if (!line1 || !address.city || !address.state || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Complete address details (addressLine1/streetAddress, city, state, pincode/zipCode) are required.'
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

    // Verify provider exists
    const providerUser = await User.findById(providerId);
    if (!providerUser || providerUser.role !== USER_ROLES.PROVIDER) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider selected.'
      });
    }

    // Verify provider profile is VERIFIED
    const providerProfile = await ProviderProfile.findOne({ userId: providerId });
    if (!providerProfile || providerProfile.status !== PROVIDER_STATUS.VERIFIED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book an unverified service provider. Please choose an approved verified provider.'
      });
    }

    // Calculate baseline estimated price if available
    let estimatedTotal = service.basePrice || service.estimatedPriceRange?.min || 0;
    const matchedOffering = providerProfile.servicesOffered?.find(
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
      providerId,
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
    } else if (req.user.role === USER_ROLES.PROVIDER) {
      filter.providerId = req.user._id;
    } else if (req.user.role === USER_ROLES.ADMIN) {
      if (req.query.customerId) filter.customerId = req.query.customerId;
      if (req.query.providerId) filter.providerId = req.query.providerId;
    }

    if (status && Object.values(BOOKING_STATUS).includes(status)) {
      filter.status = status;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('serviceId', 'name description basePrice')
        .populate('providerId', 'name email phone')
        .populate('customerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Booking.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      bookings
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
      .populate('providerId', 'name email phone')
      .populate('customerId', 'name email phone')
      .populate('statusHistory.actor.userId', 'name email role');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Access control: User must be customer, provider, or admin
    const isCustomer = booking.customerId._id.toString() === req.user._id.toString();
    const isProvider = booking.providerId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this booking.'
      });
    }

    const bookingObj = booking.toObject();

    // Security: Unverified OTPs must NOT be exposed to the provider
    if (isProvider && !isAdmin && !isCustomer) {
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
    const isCustomer = booking.customerId.toString() === req.user._id.toString();
    const isProvider = booking.providerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isProvider && !isAdmin) {
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
    } else if (isProvider) {
      actorRole = USER_ROLES.PROVIDER;
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
    if (nextStatus === BOOKING_STATUS.TECHNICIAN_ARRIVED) {
      if (otp) {
        if (booking.startOtp && booking.startOtp.code && booking.startOtp.code !== otp.trim()) {
          booking.startOtp.attempts = (booking.startOtp.attempts || 0) + 1;
          await booking.save();
          return res.status(400).json({
            success: false,
            message: 'Invalid arrival OTP. Please obtain the correct 6-digit OTP from the customer.'
          });
        }
        if (booking.startOtp) booking.startOtp.verifiedAt = new Date();
      }
      booking.jobExecution.technicianArrivedAt = booking.jobExecution.technicianArrivedAt || new Date();
    } else if (nextStatus === BOOKING_STATUS.IN_PROGRESS) {
      booking.jobExecution.workStartedAt = booking.jobExecution.workStartedAt || new Date();
    } else if (nextStatus === BOOKING_STATUS.COMPLETION_PENDING) {
      booking.jobExecution.completionPendingAt = new Date();
      if (!booking.completionOtp || !booking.completionOtp.code) {
        booking.completionOtp = {
          code: generateNumericOtp(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours validity
          attempts: 0
        };
      }
    } else if (nextStatus === BOOKING_STATUS.CUSTOMER_VERIFIED) {
      if (actorRole === USER_ROLES.PROVIDER && otp) {
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
    } else if (nextStatus === BOOKING_STATUS.COMPLETED) {
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
      reason: reason ? reason.trim() : '',
      timestamp: new Date()
    });

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('serviceId', 'name description basePrice')
      .populate('providerId', 'name email phone')
      .populate('customerId', 'name email phone');

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

    const isProvider = booking.providerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the assigned provider or admin can verify customer OTP.'
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
    const { inspectionNotes, workNotes, partsUsed } = req.body;

    const booking = await Booking.findById(req.params.id);
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
        message: 'Access denied: Only the assigned provider or admin can update job execution details.'
      });
    }

    booking.jobExecution = booking.jobExecution || {};

    if (inspectionNotes !== undefined) {
      booking.jobExecution.inspectionNotes = inspectionNotes.trim();
    }
    if (workNotes !== undefined) {
      booking.jobExecution.workNotes = workNotes.trim();
    }
    if (Array.isArray(partsUsed)) {
      booking.jobExecution.partsUsed = partsUsed.map((p) => ({
        name: (p.name || 'Part/Consumable').trim(),
        quantity: Math.max(1, parseInt(p.quantity, 10) || 1),
        cost: Math.max(0, parseFloat(p.cost) || 0)
      }));

      // Update pricing final total with parts cost
      const partsTotal = booking.jobExecution.partsUsed.reduce(
        (sum, p) => sum + p.cost * p.quantity,
        0
      );
      const basePrice = booking.pricing?.estimatedTotal || 0;
      booking.pricing.finalTotal = basePrice + partsTotal;
    }

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
  rescheduleBooking,
  verifyBookingOtp,
  updateJobExecution
};


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

    if (!address.streetAddress || !address.city || !address.state || !address.zipCode) {
      return res.status(400).json({
        success: false,
        message: 'Complete address details (streetAddress, city, state, zipCode) are required.'
      });
    }

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
    let estimatedTotal = service.basePrice || 0;
    const matchedOffering = providerProfile.servicesOffered?.find(
      (s) => s.serviceId.toString() === serviceId.toString() && s.isActive
    );
    if (matchedOffering?.price) {
      estimatedTotal = matchedOffering.price;
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

    const booking = new Booking({
      bookingNumber,
      customerId: req.user._id,
      providerId,
      serviceId,
      address,
      scheduledDate: new Date(scheduledDate),
      preferredTimeSlot: preferredTimeSlot || 'Morning (09:00 - 12:00)',
      problemDescription: problemDescription.trim(),
      status: BOOKING_STATUS.REQUESTED,
      pricing: {
        estimatedTotal,
        finalTotal: 0,
        currency: 'USD'
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

    return res.status(200).json({
      success: true,
      booking
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
    const { status: nextStatus, reason } = req.body;

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

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  transitionBookingStatus,
  rescheduleBooking
};

const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Review = require('../models/Review');
const Dispute = require('../models/Dispute');
const { PROVIDER_STATUS, USER_ROLES, SERVICE_STATUS } = require('../utils/constants');

/**
 * GET /api/admin/overview
 * Real-time dashboard statistics queried directly from MongoDB.
 */
const getDashboardOverview = async (req, res) => {
  try {
    const [
      totalCustomers,
      totalTechnicians,
      pendingVerification,
      activeBookings,
      completedBookings,
      successfulPayments,
      failedPayments,
      paymentVolumeAgg,
      openDisputes
    ] = await Promise.all([
      User.countDocuments({ role: USER_ROLES.CUSTOMER }),
      User.countDocuments({ role: { $in: [USER_ROLES.TECHNICIAN, 'PROVIDER'] } }),
      ProviderProfile.countDocuments({ status: 'PENDING' }),
      Booking.countDocuments({
        status: {
          $in: [
            'REQUESTED',
            'ACCEPTED',
            'SCHEDULED',
            'INSPECTION',
            'ESTIMATE_PENDING',
            'ESTIMATE_SUBMITTED',
            'ESTIMATE_APPROVED',
            'PAYMENT_PENDING',
            'PAYMENT_SUCCESS',
            'WORK_IN_PROGRESS',
            'IN_PROGRESS'
          ]
        }
      }),
      Booking.countDocuments({
        status: {
          $in: ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED']
        }
      }),
      Payment.countDocuments({ status: 'SUCCESS' }),
      Payment.countDocuments({ status: { $in: ['FAILED', 'PAYMENT_FAILED'] } }),
      Payment.aggregate([
        { $match: { status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Dispute.countDocuments({ status: { $in: ['OPEN', 'UNDER_REVIEW', 'INVESTIGATING'] } })
    ]);

    const totalPaymentVolume = paymentVolumeAgg.length > 0 ? paymentVolumeAgg[0].total : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        totalTechnicians,
        pendingVerification,
        activeBookings,
        completedBookings,
        totalPaymentVolume,
        successfulPayments,
        failedPayments,
        openDisputes
      }
    });
  } catch (error) {
    console.error('[AdminController] getDashboardOverview error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard overview: ' + error.message
    });
  }
};

/**
 * GET /api/admin/customers
 * List all customer accounts with aggregated booking & payment volume metrics.
 */
const getAllCustomers = async (req, res) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const filter = { role: USER_ROLES.CUSTOMER };

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const customers = await User.find(filter)
      .select('-password -passwordHash -firebaseUid')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    const customerIds = customers.map((c) => c._id);

    // Aggregate booking counts per customer
    const bookingCounts = await Booking.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } }
    ]);
    const bookingCountMap = {};
    bookingCounts.forEach((b) => {
      bookingCountMap[b._id.toString()] = b.count;
    });

    // Aggregate payment volume per customer
    const paymentVolumes = await Payment.aggregate([
      { $match: { customerId: { $in: customerIds }, status: 'SUCCESS' } },
      { $group: { _id: '$customerId', volume: { $sum: '$amount' } } }
    ]);
    const paymentVolumeMap = {};
    paymentVolumes.forEach((p) => {
      paymentVolumeMap[p._id.toString()] = p.volume;
    });

    const enrichedCustomers = customers.map((c) => ({
      _id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone || 'N/A',
      status: c.status || 'ACTIVE',
      registrationDate: c.createdAt,
      bookingsCount: bookingCountMap[c._id.toString()] || 0,
      paymentVolume: paymentVolumeMap[c._id.toString()] || 0
    }));

    const total = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        customers: enrichedCustomers,
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('[AdminController] getAllCustomers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customers: ' + error.message
    });
  }
};

/**
 * GET /api/admin/customers/:id
 * Detailed customer profile with their bookings, payments, invoices, and reviews.
 */
const getCustomerDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await User.findOne({ _id: id, role: USER_ROLES.CUSTOMER })
      .select('-password -passwordHash -firebaseUid')
      .lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const [bookings, payments, invoices, reviews] = await Promise.all([
      Booking.find({ customerId: id })
        .populate('technicianId', 'name email phone')
        .populate('serviceId', 'name')
        .sort({ createdAt: -1 })
        .lean(),
      Payment.find({ customerId: id })
        .sort({ createdAt: -1 })
        .lean(),
      Invoice.find({ customerId: id })
        .sort({ createdAt: -1 })
        .lean(),
      Review.find({ customerId: id })
        .populate('technicianId', 'name')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      data: {
        customer,
        bookings,
        payments,
        invoices,
        reviews
      }
    });
  } catch (error) {
    console.error('[AdminController] getCustomerDetail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer detail: ' + error.message
    });
  }
};

/**
 * GET /api/admin/technicians
 * List all technicians with filtering by verification status.
 */
const getAllProviders = async (req, res) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (status && status !== 'ALL') {
      filter.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      filter.$or = [
        { businessName: { $regex: search.trim(), $options: 'i' } },
        { profession: { $regex: search.trim(), $options: 'i' } },
        { licenseNumber: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const providers = await ProviderProfile.find(filter)
      .populate('userId', 'name email phone status avatarUrl createdAt')
      .populate('categories', 'name slug icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    // Enrich with completed jobs count
    const technicianUserIds = providers.map((p) => p.userId?._id).filter(Boolean);
    const completedJobCounts = await Booking.aggregate([
      {
        $match: {
          technicianId: { $in: technicianUserIds },
          status: { $in: ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED'] }
        }
      },
      { $group: { _id: '$technicianId', count: { $sum: 1 } } }
    ]);

    const completedMap = {};
    completedJobCounts.forEach((c) => {
      completedMap[c._id.toString()] = c.count;
    });

    const enriched = providers.map((p) => ({
      ...p,
      completedJobs: completedMap[p.userId?._id?.toString()] || 0
    }));

    const total = await ProviderProfile.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        technicians: enriched,
        providers: enriched,
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('[AdminController] getAllProviders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve technicians: ' + error.message
    });
  }
};

/**
 * PATCH /api/admin/technicians/:id/status
 * Approve, reject, or suspend a technician.
 */
const updateProviderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status || !Object.values(PROVIDER_STATUS).includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${Object.values(PROVIDER_STATUS).join(', ')}`
      });
    }

    const provider = await ProviderProfile.findById(id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found'
      });
    }

    const oldStatus = provider.status;
    const newStatus = status.toUpperCase();
    provider.status = newStatus;
    provider.verificationStatus = newStatus;
    await provider.save();

    console.log(
      `[Admin] Technician ${provider.businessName} (${provider._id}) status updated from ${oldStatus} to ${provider.status}. Reason: ${reason || 'N/A'}`
    );

    return res.status(200).json({
      success: true,
      message: `Technician status updated to ${provider.status}. Eligible for booking: ${provider.status === 'VERIFIED'}`,
      data: { provider }
    });
  } catch (error) {
    console.error('[AdminController] updateProviderStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update technician status: ' + error.message
    });
  }
};

/**
 * GET /api/admin/services
 * List all services in the database.
 */
const getAllServices = async (req, res) => {
  try {
    const services = await Service.find()
      .populate('categoryId', 'name icon slug')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { services }
    });
  } catch (error) {
    console.error('[AdminController] getAllServices error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve services: ' + error.message
    });
  }
};

/**
 * POST /api/admin/services
 * Create a new service record in MongoDB.
 */
const createService = async (req, res) => {
  try {
    const { name, description, minPrice, maxPrice, categoryId, categoryName, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Service name is required' });
    }

    let targetCategoryId = categoryId;
    if (!targetCategoryId) {
      // Find or create default category
      let category = await ServiceCategory.findOne({ name: categoryName || 'General Home Services' });
      if (!category) {
        const catSlug = (categoryName || 'General Home Services').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        category = await ServiceCategory.create({
          name: categoryName || 'General Home Services',
          slug: catSlug,
          icon: icon || '🛠️'
        });
      }
      targetCategoryId = category._id;
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const service = await Service.create({
      name: name.trim(),
      slug,
      description: description?.trim() || '',
      categoryId: targetCategoryId,
      estimatedPriceRange: {
        min: Number(minPrice) || 299,
        max: Number(maxPrice) || 1999,
        currency: 'INR'
      },
      status: SERVICE_STATUS.ACTIVE
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service }
    });
  } catch (error) {
    console.error('[AdminController] createService error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create service: ' + error.message
    });
  }
};

/**
 * PUT /api/admin/services/:id
 * Edit an existing service.
 */
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, minPrice, maxPrice, status } = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (name) {
      service.name = name.trim();
      service.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    if (description !== undefined) service.description = description.trim();
    if (minPrice !== undefined) service.estimatedPriceRange.min = Number(minPrice);
    if (maxPrice !== undefined) service.estimatedPriceRange.max = Number(maxPrice);
    if (status) service.status = status;

    await service.save();

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: { service }
    });
  } catch (error) {
    console.error('[AdminController] updateService error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update service: ' + error.message
    });
  }
};

/**
 * PATCH /api/admin/services/:id/status
 * Toggle service active/inactive status.
 */
const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const isCurrentlyActive = String(service.status).toLowerCase() === 'active';
    service.status = isCurrentlyActive ? SERVICE_STATUS.INACTIVE : SERVICE_STATUS.ACTIVE;
    await service.save();

    return res.status(200).json({
      success: true,
      message: `Service status changed to ${service.status}`,
      data: { service }
    });
  } catch (error) {
    console.error('[AdminController] toggleServiceStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle service status: ' + error.message
    });
  }
};

/**
 * GET /api/admin/bookings
 * List all bookings across the entire platform.
 */
const getAllBookings = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status && status !== 'ALL') {
      filter.status = status;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const bookings = await Booking.find(filter)
      .populate('customerId', 'name email phone')
      .populate('technicianId', 'name email phone')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    const total = await Booking.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        bookings,
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('[AdminController] getAllBookings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings: ' + error.message
    });
  }
};

/**
 * GET /api/admin/bookings/:id
 * Retrieve comprehensive booking details including timeline, payments, invoices.
 */
const getBookingDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('customerId', 'name email phone')
      .populate('technicianId', 'name email phone')
      .populate('serviceId', 'name')
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const [payments, invoices, reviews] = await Promise.all([
      Payment.find({ bookingId: id }).lean(),
      Invoice.find({ bookingId: id }).lean(),
      Review.find({ bookingId: id }).lean()
    ]);

    return res.status(200).json({
      success: true,
      data: {
        booking,
        payments,
        invoices,
        reviews
      }
    });
  } catch (error) {
    console.error('[AdminController] getBookingDetail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve booking detail: ' + error.message
    });
  }
};

/**
 * GET /api/admin/payments
 * View all payment transactions.
 */
const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('bookingId', 'bookingNumber status')
      .populate('customerId', 'name email')
      .populate('technicianId', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      data: { payments }
    });
  } catch (error) {
    console.error('[AdminController] getAllPayments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payments: ' + error.message
    });
  }
};

/**
 * GET /api/admin/invoices
 * View all customer invoices.
 */
const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('bookingId', 'bookingNumber status')
      .populate('customerId', 'name email')
      .populate('technicianId', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      data: { invoices }
    });
  } catch (error) {
    console.error('[AdminController] getAllInvoices error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoices: ' + error.message
    });
  }
};

/**
 * GET /api/admin/reviews
 * View all customer reviews.
 */
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('bookingId', 'bookingNumber serviceId')
      .populate('customerId', 'name email')
      .populate('technicianId', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      data: { reviews }
    });
  } catch (error) {
    console.error('[AdminController] getAllReviews error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reviews: ' + error.message
    });
  }
};

/**
 * GET /api/admin/disputes
 * View all disputes.
 */
const getAllDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate('bookingId', 'bookingNumber status')
      .populate('raisedById', 'name email role')
      .populate('respondentId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      data: { disputes }
    });
  } catch (error) {
    console.error('[AdminController] getAllDisputes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve disputes: ' + error.message
    });
  }
};

/**
 * GET /api/admin/reports
 * Simple useful reports aggregated from MongoDB.
 */
const getReports = async (req, res) => {
  try {
    const [
      totalBookings,
      completedJobs,
      cancelledJobs,
      totalPayments,
      topServices,
      topTechnicians,
      newCustomers,
      newTechnicians
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: { $in: ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED'] } }),
      Booking.countDocuments({ status: { $in: ['CANCELLED', 'REJECTED'] } }),
      Payment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            volume: { $sum: '$amount' }
          }
        }
      ]),
      Booking.aggregate([
        { $group: { _id: '$serviceId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'services',
            localField: '_id',
            foreignField: '_id',
            as: 'service'
          }
        },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } }
      ]),
      Booking.aggregate([
        {
          $match: {
            status: { $in: ['WORK_COMPLETED', 'CUSTOMER_CONFIRMED', 'INVOICED', 'COMPLETED'] }
          }
        },
        { $group: { _id: '$technicianId', completedJobs: { $sum: 1 } } },
        { $sort: { completedJobs: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'technician'
          }
        },
        { $unwind: { path: '$technician', preserveNullAndEmptyArrays: true } }
      ]),
      User.find({ role: USER_ROLES.CUSTOMER })
        .select('name email phone createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      ProviderProfile.find()
        .populate('userId', 'name email createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalBookings,
        completedJobs,
        cancelledJobs,
        paymentSummary: totalPayments,
        topServices: topServices.map((s) => ({
          serviceId: s._id,
          name: s.service?.name || 'Service',
          count: s.count
        })),
        topTechnicians: topTechnicians.map((t) => ({
          technicianId: t._id,
          name: t.technician?.name || 'Technician',
          completedJobs: t.completedJobs
        })),
        newCustomers,
        newTechnicians
      }
    });
  } catch (error) {
    console.error('[AdminController] getReports error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate reports: ' + error.message
    });
  }
};

module.exports = {
  getDashboardOverview,
  getAllCustomers,
  getCustomerDetail,
  getAllProviders,
  updateProviderStatus,
  getAllServices,
  createService,
  updateService,
  toggleServiceStatus,
  getAllBookings,
  getBookingDetail,
  getAllPayments,
  getAllInvoices,
  getAllReviews,
  getAllDisputes,
  getReports
};

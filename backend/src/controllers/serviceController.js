const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');
const ProviderProfile = require('../models/ProviderProfile');
const { SERVICE_STATUS, PROVIDER_STATUS } = require('../utils/constants');

/**
 * GET /api/services
 * Public endpoint to list/search services with category filtering.
 */
const getServices = async (req, res) => {
  try {
    const { category, search, limit = 50, page = 1 } = req.query;

    const filter = { status: SERVICE_STATUS.ACTIVE };

    if (category) {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        filter.categoryId = category;
      } else {
        const cat = await ServiceCategory.findOne({ slug: category.toLowerCase() });
        if (cat) {
          filter.categoryId = cat._id;
        } else {
          return res.status(200).json({ success: true, data: { services: [], total: 0 } });
        }
      }
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const services = await Service.find(filter)
      .populate('categoryId', 'name slug icon')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    const total = await Service.countDocuments(filter);

    // Efficiently compute count of verified providers offering each service
    const serviceIds = services.map((s) => s._id);
    const providerOfferings = await ProviderProfile.aggregate([
      { $match: { status: PROVIDER_STATUS.VERIFIED } },
      { $unwind: '$servicesOffered' },
      { $match: { 'servicesOffered.serviceId': { $in: serviceIds }, 'servicesOffered.isActive': true } },
      { $group: { _id: '$servicesOffered.serviceId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    providerOfferings.forEach((po) => {
      countMap[po._id.toString()] = po.count;
    });

    const enriched = services.map((s) => ({
      ...s,
      providersCount: countMap[s._id.toString()] || 0
    }));

    return res.status(200).json({
      success: true,
      data: {
        services: enriched,
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('[ServiceController] getServices error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve services: ' + error.message
    });
  }
};

/**
 * GET /api/services/:id
 * Public endpoint to get service details and verified providers offering it.
 */
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id.toLowerCase() };

    const service = await Service.findOne(query)
      .populate('categoryId', 'name slug icon description')
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Security & Eligibility: Only VERIFIED active technicians who offer this service
    const verifiedProviders = await ProviderProfile.find({
      status: PROVIDER_STATUS.VERIFIED,
      $or: [
        { 'servicesOffered.serviceId': service._id, 'servicesOffered.isActive': true },
        { categories: service.categoryId }
      ]
    })
      .populate('userId', 'name email phone avatarUrl role status')
      .lean();

    // Strictly exclude Admin and Customer accounts; ensure active status
    const eligibleTechnicians = verifiedProviders.filter((p) => {
      const u = p.userId;
      if (!u) return false;
      if (u.role === 'ADMIN' || u.role === 'CUSTOMER') return false;
      if (u.role !== 'TECHNICIAN' && u.role !== 'PROVIDER') return false;
      if (u.status && u.status !== 'ACTIVE') return false;
      return true;
    });

    // Format technician cards with all required display fields
    const formattedTechnicians = eligibleTechnicians.map((p) => {
      const offering = (p.servicesOffered || []).find(
        (so) => so.serviceId?.toString() === service._id.toString()
      );

      const servicesList = (p.servicesOffered || [])
        .filter((s) => s.isActive)
        .map((s) => s.customTitle || s.serviceId?.name || service.name);

      return {
        id: p._id,
        name: p.userId?.name || p.businessName,
        businessName: p.businessName,
        profession: p.profession || 'General Service Technician',
        experience: p.experience || `${p.experienceYears || 1} years`,
        experienceYears: p.experienceYears || 1,
        bio: p.bio,
        rating: p.rating || { average: 5.0, count: 0 },
        completedJobsCount: p.completedJobsCount || 0,
        services: servicesList.length > 0 ? servicesList : [service.name],
        availability: {
          days: p.availability?.days || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
          workingHours: p.availability?.workingHours || { start: '08:00', end: '20:00' },
          emergencyServices: !!p.availability?.emergencyServices
        },
        verificationStatus: p.status || 'VERIFIED',
        status: p.status || 'VERIFIED',
        offering: offering || null,
        user: p.userId
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        service,
        technicians: formattedTechnicians,
        providers: formattedTechnicians,
        techniciansCount: formattedTechnicians.length,
        providersCount: formattedTechnicians.length
      }
    });
  } catch (error) {
    console.error('[ServiceController] getServiceById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve service details: ' + error.message
    });
  }
};

/**
 * POST /api/services
 * Admin endpoint to create a service.
 */
const createService = async (req, res) => {
  try {
    const { categoryId, name, slug, description, estimatedPriceRange, status } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and service name are required'
      });
    }

    const category = await ServiceCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Specified category does not exist'
      });
    }

    const generatedSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await Service.findOne({ categoryId, slug: generatedSlug });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A service with this slug already exists in this category'
      });
    }

    const service = await Service.create({
      categoryId,
      name: name.trim(),
      slug: generatedSlug,
      description: description?.trim() || '',
      estimatedPriceRange: {
        min: estimatedPriceRange?.min || 0,
        max: estimatedPriceRange?.max || 0,
        currency: estimatedPriceRange?.currency || 'INR'
      },
      status: status || SERVICE_STATUS.ACTIVE
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service }
    });
  } catch (error) {
    console.error('[ServiceController] createService error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create service: ' + error.message
    });
  }
};

/**
 * PATCH /api/services/:id
 * Admin endpoint to update service.
 */
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, name, description, estimatedPriceRange, status } = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (categoryId) {
      const category = await ServiceCategory.findById(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      service.categoryId = categoryId;
    }

    if (name) service.name = name.trim();
    if (description !== undefined) service.description = description.trim();
    if (estimatedPriceRange) {
      if (estimatedPriceRange.min !== undefined) service.estimatedPriceRange.min = estimatedPriceRange.min;
      if (estimatedPriceRange.max !== undefined) service.estimatedPriceRange.max = estimatedPriceRange.max;
      if (estimatedPriceRange.currency) service.estimatedPriceRange.currency = estimatedPriceRange.currency;
    }
    if (status) service.status = status;

    await service.save();

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: { service }
    });
  } catch (error) {
    console.error('[ServiceController] updateService error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update service: ' + error.message
    });
  }
};

/**
 * DELETE /api/services/:id
 * Admin endpoint to deactivate/delete service.
 */
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any provider offers this service
    const offeredCount = await ProviderProfile.countDocuments({
      'servicesOffered.serviceId': id
    });

    if (offeredCount > 0) {
      await Service.findByIdAndUpdate(id, { status: SERVICE_STATUS.INACTIVE });
      return res.status(200).json({
        success: true,
        message: 'Service has active provider offerings; status set to INACTIVE'
      });
    }

    await Service.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('[ServiceController] deleteService error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete service: ' + error.message
    });
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};

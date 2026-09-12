const ProviderProfile = require('../models/ProviderProfile');
const Service = require('../models/Service');
const { PROVIDER_STATUS, SERVICE_PRICING_TYPE } = require('../utils/constants');

/**
 * GET /api/providers
 * Public Customer Endpoint: Browse and filter verified service providers.
 * SECURITY: Excludes unverified/pending/rejected/suspended providers.
 */
const getPublicProviders = async (req, res) => {
  try {
    const { search, category, service, minRating = 0, limit = 50, page = 1 } = req.query;

    // Strict security rule: Only VERIFIED providers appear in public marketplace
    const filter = { status: PROVIDER_STATUS.VERIFIED };

    if (search && search.trim()) {
      filter.$or = [
        { businessName: { $regex: search.trim(), $options: 'i' } },
        { profession: { $regex: search.trim(), $options: 'i' } },
        { bio: { $regex: search.trim(), $options: 'i' } },
        { 'servicesOffered.customTitle': { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (category && category.match(/^[0-9a-fA-F]{24}$/)) {
      filter.categories = category;
    }

    // Dynamic service matching: ID, slug, or name
    if (service && typeof service === 'string' && service.trim()) {
      const cleanService = service.trim();
      let targetService = null;
      if (cleanService.match(/^[0-9a-fA-F]{24}$/)) {
        const q = Service.findById(cleanService);
        targetService = (q && typeof q.lean === 'function') ? await q.lean() : await q;
      } else {
        const q = Service.findOne({
          $or: [
            { slug: cleanService.toLowerCase() },
            { name: { $regex: new RegExp(`^${cleanService}$`, 'i') } }
          ]
        });
        targetService = (q && typeof q.lean === 'function') ? await q.lean() : await q;
      }

      if (targetService) {
        // Must match technicians offering this specific service or category
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            {
              'servicesOffered.serviceId': targetService._id,
              'servicesOffered.isActive': true
            },
            { categories: targetService.categoryId },
            { profession: { $regex: targetService.name.split(' ')[0], $options: 'i' } }
          ]
        });
      } else {
        // If not found in Service model, filter by search keyword in servicesOffered or profession
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { profession: { $regex: cleanService, $options: 'i' } },
            { 'servicesOffered.customTitle': { $regex: cleanService, $options: 'i' } }
          ]
        });
      }
    }

    if (minRating && Number(minRating) > 0) {
      filter['rating.average'] = { $gte: Number(minRating) };
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const providers = await ProviderProfile.find(filter)
      .populate('userId', 'name email phone avatarUrl role status')
      .populate('categories', 'name slug icon')
      .populate('servicesOffered.serviceId', 'name slug categoryId')
      .sort({ 'rating.average': -1, completedJobsCount: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    // Security & Eligibility Rule:
    // A technician can appear to customers only when:
    // * active
    // * verified
    // * supports the selected service
    // Strictly exclude ADMIN and CUSTOMER
    const validProviders = providers.filter((p) => {
      const user = p.userId;
      if (!user) return false;
      if (user.role === 'ADMIN' || user.role === 'CUSTOMER') return false;
      if (user.role !== 'TECHNICIAN' && user.role !== 'PROVIDER') return false;
      if (user.status && user.status !== 'ACTIVE') return false;
      return true;
    });

    const total = validProviders.length;

    // Format technician cards with all required display fields
    const formatted = validProviders.map((p) => {
      const servicesList = (p.servicesOffered || [])
        .filter((s) => s.isActive)
        .map((s) => s.customTitle || s.serviceId?.name || 'Trade Service');

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
        services: servicesList.length > 0 ? servicesList : [p.profession || 'Trade Service'],
        servicesOffered: p.servicesOffered || [],
        categories: p.categories,
        availability: {
          days: p.availability?.days || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
          workingHours: p.availability?.workingHours || { start: '08:00', end: '20:00' },
          emergencyServices: !!p.availability?.emergencyServices
        },
        availabilitySummary: {
          days: p.availability?.days || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
          workingHours: p.availability?.workingHours || { start: '08:00', end: '20:00' },
          emergencyServices: !!p.availability?.emergencyServices
        },
        verificationStatus: p.status || 'VERIFIED',
        user: p.userId
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        technicians: formatted,
        providers: formatted,
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('[ProviderController] getPublicProviders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve technicians: ' + error.message
    });
  }
};

/**
 * GET /api/providers/:id
 * Public Customer Endpoint: View detailed public profile of a technician.
 */
const getPublicProviderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid technician ID format' });
    }

    const provider = await ProviderProfile.findById(id)
      .populate('userId', 'name email phone avatarUrl role status')
      .populate('categories', 'name slug icon description')
      .populate({
        path: 'servicesOffered.serviceId',
        select: 'name slug description estimatedPriceRange categoryId',
        populate: { path: 'categoryId', select: 'name slug icon' }
      })
      .lean();

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Technician profile not found' });
    }

    // Security: Admin or Customer can never be viewed as a technician
    if (provider.userId?.role === 'ADMIN' || provider.userId?.role === 'CUSTOMER') {
      return res.status(404).json({ success: false, message: 'Technician profile not found' });
    }

    // Security: Only VERIFIED providers can be viewed publicly (unless the owner or admin is viewing)
    const isOwnerOrAdmin =
      req.user &&
      (req.user.role === 'ADMIN' ||
        provider.userId?._id?.toString() === req.user._id?.toString());

    if (provider.status !== PROVIDER_STATUS.VERIFIED && !isOwnerOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'This technician profile is pending verification and is not publicly visible yet.'
      });
    }

    // Filter only active offerings for public view
    const activeOfferings = (provider.servicesOffered || []).filter(
      (s) => s.isActive && s.serviceId
    );

    const servicesList = activeOfferings.map(
      (s) => s.customTitle || s.serviceId?.name || 'Trade Service'
    );

    const technicianData = {
      id: provider._id,
      name: provider.userId?.name || provider.businessName,
      businessName: provider.businessName,
      profession: provider.profession || 'General Service Technician',
      experience: provider.experience || `${provider.experienceYears || 1} years`,
      experienceYears: provider.experienceYears || 1,
      bio: provider.bio,
      licenseNumber: provider.licenseNumber ? `License Verified (${provider.licenseNumber})` : null,
      rating: provider.rating || { average: 5.0, count: 0 },
      completedJobsCount: provider.completedJobsCount || 0,
      categories: provider.categories,
      availability: provider.availability,
      services: activeOfferings,
      servicesList: servicesList.length > 0 ? servicesList : [provider.profession || 'Trade Service'],
      verificationStatus: provider.status,
      status: provider.status,
      user: provider.userId
    };

    return res.status(200).json({
      success: true,
      data: {
        technician: technicianData,
        provider: technicianData
      }
    });
  } catch (error) {
    console.error('[ProviderController] getPublicProviderById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve technician profile: ' + error.message
    });
  }
};

/**
 * GET /api/provider/profile
 * Provider Portal: Get current authenticated provider's full profile.
 */
const getMyProviderProfile = async (req, res) => {
  try {
    // ADMIN users do not have a ProviderProfile
    if (req.user.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts do not have a provider profile. Use admin endpoints for platform management.'
      });
    }

    let profile = await ProviderProfile.findOne({ userId: req.user._id })
      .populate('categories', 'name slug icon')
      .populate('servicesOffered.serviceId', 'name slug categoryId estimatedPriceRange');

    // If profile does not exist yet, initialize it
    if (!profile) {
      profile = await ProviderProfile.create({
        userId: req.user._id,
        businessName: `${req.user.name}'s Services`,
        status: PROVIDER_STATUS.PENDING
      });
    }

    return res.status(200).json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    console.error('[ProviderController] getMyProviderProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve provider profile: ' + error.message
    });
  }
};

/**
 * PATCH /api/provider/profile
 * Provider Portal: Update business name, bio, license, serviceArea, availability.
 * SECURITY: Strips and rejects attempts to self-approve status or manipulate ratings.
 */
const updateMyProviderProfile = async (req, res) => {
  try {
    if (req.user.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts do not have a technician profile. Use admin endpoints for platform management.'
      });
    }

    let profile = await ProviderProfile.findOne({ userId: req.user._id });

    if (!profile) {
      profile = new ProviderProfile({ userId: req.user._id });
    }

    const {
      businessName,
      profession,
      experience,
      experienceYears,
      bio,
      licenseNumber,
      insuranceDetails,
      categories,
      serviceArea,
      availability
    } = req.body;

    if (businessName && typeof businessName === 'string') {
      profile.businessName = businessName.trim();
    }

    if (profession && typeof profession === 'string') {
      profile.profession = profession.trim();
    }

    if (experience && typeof experience === 'string') {
      profile.experience = experience.trim();
    }

    if (experienceYears !== undefined) {
      profile.experienceYears = Number(experienceYears) || profile.experienceYears;
    }

    if (bio !== undefined) profile.bio = String(bio).trim();
    if (licenseNumber !== undefined) profile.licenseNumber = String(licenseNumber).trim();

    if (insuranceDetails) {
      profile.insuranceDetails = {
        provider: insuranceDetails.provider?.trim() || '',
        policyNumber: insuranceDetails.policyNumber?.trim() || '',
        expiresAt: insuranceDetails.expiresAt || null
      };
    }

    if (Array.isArray(categories)) {
      profile.categories = categories;
    }

    if (serviceArea) {
      const pins = Array.isArray(serviceArea.pincodes)
        ? serviceArea.pincodes.map((z) => String(z).trim())
        : Array.isArray(serviceArea.zipCodes)
        ? serviceArea.zipCodes.map((z) => String(z).trim())
        : profile.serviceArea?.pincodes || profile.serviceArea?.zipCodes || [];

      profile.serviceArea = {
        cities: Array.isArray(serviceArea.cities) ? serviceArea.cities.map((c) => String(c).trim()) : profile.serviceArea?.cities || [],
        pincodes: pins,
        zipCodes: pins,
        radiusKm: Number(serviceArea.radiusKm) || 25
      };
    }

    if (availability) {
      profile.availability = {
        days: Array.isArray(availability.days) ? availability.days : profile.availability?.days || [],
        workingHours: {
          start: availability.workingHours?.start || '09:00',
          end: availability.workingHours?.end || '18:00'
        },
        emergencyServices: Boolean(availability.emergencyServices),
        noticeHours: Number(availability.noticeHours) || 24
      };
    }

    // Security check: Ignore any client attempts to change status or ratings
    if (req.body.status && req.body.status !== profile.status) {
      console.warn(`[Security Alert] Provider ${req.user._id} attempted to self-set status to ${req.body.status}. Denied.`);
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Provider profile updated successfully',
      data: { profile }
    });
  } catch (error) {
    console.error('[ProviderController] updateMyProviderProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update provider profile: ' + error.message
    });
  }
};

/**
 * GET /api/provider/services
 * Provider Portal: Get provider's catalog of offered services.
 */
const getMyServices = async (req, res) => {
  try {
    const profile = await ProviderProfile.findOne({ userId: req.user._id })
      .populate({
        path: 'servicesOffered.serviceId',
        select: 'name slug description estimatedPriceRange categoryId',
        populate: { path: 'categoryId', select: 'name slug icon' }
      });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    return res.status(200).json({
      success: true,
      data: { services: profile.servicesOffered || [] }
    });
  } catch (error) {
    console.error('[ProviderController] getMyServices error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve services: ' + error.message
    });
  }
};

/**
 * POST /api/provider/services
 * Provider Portal: Add a service offering with custom pricing & description.
 */
const addServiceOffering = async (req, res) => {
  try {
    const { serviceId, customTitle, description, pricing } = req.body;

    if (!serviceId) {
      return res.status(400).json({ success: false, message: 'serviceId is required' });
    }

    const serviceDoc = await Service.findById(serviceId);
    if (!serviceDoc) {
      return res.status(404).json({ success: false, message: 'Service does not exist on platform' });
    }

    let profile = await ProviderProfile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = await ProviderProfile.create({
        userId: req.user._id,
        businessName: `${req.user.name}'s Services`
      });
    }

    // Check if service already exists in provider offerings
    const alreadyExists = profile.servicesOffered.some(
      (so) => so.serviceId.toString() === serviceId.toString()
    );

    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        message: 'This service is already in your service catalog'
      });
    }

    const newOffering = {
      serviceId,
      customTitle: customTitle?.trim() || serviceDoc.name,
      description: description?.trim() || serviceDoc.description,
      pricing: {
        type: pricing?.type || SERVICE_PRICING_TYPE.STARTING_AT,
        amount: Number(pricing?.amount) || serviceDoc.estimatedPriceRange?.min || 0,
        currency: pricing?.currency || 'INR'
      },
      isActive: true
    };

    profile.servicesOffered.push(newOffering);

    // Also ensure category is added to provider categories
    if (serviceDoc.categoryId && !profile.categories.includes(serviceDoc.categoryId)) {
      profile.categories.push(serviceDoc.categoryId);
    }

    await profile.save();

    return res.status(201).json({
      success: true,
      message: 'Service added to your offerings successfully',
      data: { offering: profile.servicesOffered[profile.servicesOffered.length - 1] }
    });
  } catch (error) {
    console.error('[ProviderController] addServiceOffering error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add service offering: ' + error.message
    });
  }
};

/**
 * PATCH /api/provider/services/:serviceId
 * Provider Portal: Update custom pricing, description, or active status of an offered service.
 */
const updateServiceOffering = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { customTitle, description, pricing, isActive } = req.body;

    const profile = await ProviderProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    const offering = profile.servicesOffered.find(
      (so) => so.serviceId.toString() === serviceId.toString() || so._id.toString() === serviceId.toString()
    );

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Service offering not found in your catalog'
      });
    }

    if (customTitle !== undefined) offering.customTitle = customTitle.trim();
    if (description !== undefined) offering.description = description.trim();
    if (pricing) {
      if (pricing.type) offering.pricing.type = pricing.type;
      if (pricing.amount !== undefined) offering.pricing.amount = Number(pricing.amount);
      if (pricing.currency) offering.pricing.currency = pricing.currency;
    }
    if (isActive !== undefined) offering.isActive = Boolean(isActive);

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Service offering updated successfully',
      data: { offering }
    });
  } catch (error) {
    console.error('[ProviderController] updateServiceOffering error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update service offering: ' + error.message
    });
  }
};

/**
 * DELETE /api/provider/services/:serviceId
 * Provider Portal: Remove a service from offered services.
 */
const removeServiceOffering = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const profile = await ProviderProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    const initialLength = profile.servicesOffered.length;
    profile.servicesOffered = profile.servicesOffered.filter(
      (so) => so.serviceId.toString() !== serviceId.toString() && so._id.toString() !== serviceId.toString()
    );

    if (profile.servicesOffered.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Service offering not found in catalog'
      });
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Service offering removed from catalog'
    });
  } catch (error) {
    console.error('[ProviderController] removeServiceOffering error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove service offering: ' + error.message
    });
  }
};

module.exports = {
  getPublicProviders,
  getPublicProviderById,
  getMyProviderProfile,
  updateMyProviderProfile,
  getMyServices,
  addServiceOffering,
  updateServiceOffering,
  removeServiceOffering
};

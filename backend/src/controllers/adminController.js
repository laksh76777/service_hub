const ProviderProfile = require('../models/ProviderProfile');
const { PROVIDER_STATUS } = require('../utils/constants');

/**
 * GET /api/admin/providers
 * Admin endpoint to list all providers with filtering by verification status.
 */
const getAllProviders = async (req, res) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (status) {
      filter.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      filter.$or = [
        { businessName: { $regex: search.trim(), $options: 'i' } },
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

    const total = await ProviderProfile.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        providers,
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('[AdminController] getAllProviders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve providers: ' + error.message
    });
  }
};

/**
 * PATCH /api/admin/providers/:id/status
 * Admin endpoint to approve (VERIFIED), reject (REJECTED), or suspend (SUSPENDED) a provider.
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
        message: 'Provider profile not found'
      });
    }

    const oldStatus = provider.status;
    provider.status = status.toUpperCase();
    await provider.save();

    console.log(`[Admin] Provider ${provider.businessName} (${provider._id}) status updated from ${oldStatus} to ${provider.status}. Reason: ${reason || 'N/A'}`);

    return res.status(200).json({
      success: true,
      message: `Provider status updated to ${provider.status}`,
      data: { provider }
    });
  } catch (error) {
    console.error('[AdminController] updateProviderStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update provider status: ' + error.message
    });
  }
};

module.exports = {
  getAllProviders,
  updateProviderStatus
};

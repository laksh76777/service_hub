const ServiceCategory = require('../models/ServiceCategory');
const Service = require('../models/Service');
const { SERVICE_CATEGORY_STATUS } = require('../utils/constants');

/**
 * GET /api/categories
 * Public endpoint to list active service categories with service count.
 */
const getCategories = async (req, res) => {
  try {
    const categories = await ServiceCategory.find({ status: SERVICE_CATEGORY_STATUS.ACTIVE })
      .sort({ name: 1 })
      .lean();

    // Attach count of active services in each category
    const categoryIds = categories.map((c) => c._id);
    const serviceCounts = await Service.aggregate([
      { $match: { categoryId: { $in: categoryIds }, status: 'ACTIVE' } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    serviceCounts.forEach((sc) => {
      countMap[sc._id.toString()] = sc.count;
    });

    const enriched = categories.map((c) => ({
      ...c,
      servicesCount: countMap[c._id.toString()] || 0
    }));

    return res.status(200).json({
      success: true,
      data: { categories: enriched }
    });
  } catch (error) {
    console.error('[CategoryController] getCategories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve service categories: ' + error.message
    });
  }
};

/**
 * GET /api/categories/:id
 * Public endpoint to get category details along with associated active services.
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id.toLowerCase() };

    const category = await ServiceCategory.findOne(query).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }

    const services = await Service.find({
      categoryId: category._id,
      status: 'ACTIVE'
    }).sort({ name: 1 }).lean();

    return res.status(200).json({
      success: true,
      data: {
        category,
        services
      }
    });
  } catch (error) {
    console.error('[CategoryController] getCategoryById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve category: ' + error.message
    });
  }
};

/**
 * POST /api/categories
 * Admin endpoint to create a new category.
 */
const createCategory = async (req, res) => {
  try {
    const { name, slug, description, icon, status } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const generatedSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await ServiceCategory.findOne({
      $or: [{ name: name.trim() }, { slug: generatedSlug }]
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name or slug already exists'
      });
    }

    const category = await ServiceCategory.create({
      name: name.trim(),
      slug: generatedSlug,
      description: description?.trim() || '',
      icon: icon?.trim() || 'wrench',
      status: status || SERVICE_CATEGORY_STATUS.ACTIVE
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('[CategoryController] createCategory error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category: ' + error.message
    });
  }
};

/**
 * PATCH /api/categories/:id
 * Admin endpoint to update category.
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, status } = req.body;

    const category = await ServiceCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (icon) category.icon = icon.trim();
    if (status) category.status = status;

    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('[CategoryController] updateCategory error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category: ' + error.message
    });
  }
};

/**
 * DELETE /api/categories/:id
 * Admin endpoint to deactivate or delete category.
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if services are using this category
    const servicesCount = await Service.countDocuments({ categoryId: id });
    if (servicesCount > 0) {
      // Soft-delete by setting status to INACTIVE
      await ServiceCategory.findByIdAndUpdate(id, { status: SERVICE_CATEGORY_STATUS.INACTIVE });
      return res.status(200).json({
        success: true,
        message: 'Category has associated services; status set to INACTIVE'
      });
    }

    await ServiceCategory.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('[CategoryController] deleteCategory error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category: ' + error.message
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};

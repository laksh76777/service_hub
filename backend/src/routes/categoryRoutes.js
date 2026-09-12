const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

// Public discovery routes
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin-only category management
router.post('/', requireAuth, requireRole(USER_ROLES.ADMIN), categoryController.createCategory);
router.patch('/:id', requireAuth, requireRole(USER_ROLES.ADMIN), categoryController.updateCategory);
router.delete('/:id', requireAuth, requireRole(USER_ROLES.ADMIN), categoryController.deleteCategory);

module.exports = router;

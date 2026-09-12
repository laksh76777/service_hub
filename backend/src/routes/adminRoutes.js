const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Enforce admin access across all admin routes
router.use(requireAuth);
router.use(requireRole(USER_ROLES.ADMIN));

router.get('/providers', adminController.getAllProviders);
router.patch('/providers/:id/status', adminController.updateProviderStatus);

module.exports = router;

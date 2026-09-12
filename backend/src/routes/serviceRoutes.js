const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');
const serviceController = require('../controllers/serviceController');

const router = express.Router();

// Public discovery routes
router.get('/', serviceController.getServices);
router.get('/:id', serviceController.getServiceById);

// Admin-only service management
router.post('/', requireAuth, requireRole(USER_ROLES.ADMIN), serviceController.createService);
router.patch('/:id', requireAuth, requireRole(USER_ROLES.ADMIN), serviceController.updateService);
router.delete('/:id', requireAuth, requireRole(USER_ROLES.ADMIN), serviceController.deleteService);

module.exports = router;

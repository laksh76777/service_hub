const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

/**
 * GET /api/test/protected
 * Accessible by any authenticated user.
 */
router.get('/protected', requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Protected route accessed successfully.',
    data: {
      userId: req.user._id,
      firebaseUid: req.user.firebaseUid,
      role: req.user.role
    }
  });
});

/**
 * GET /api/test/customer-only
 * Accessible only by users with CUSTOMER role.
 */
router.get('/customer-only', requireAuth, requireRole(USER_ROLES.CUSTOMER), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Customer-only route accessed successfully.',
    data: { role: req.user.role }
  });
});

/**
 * GET /api/test/provider-only
 * Accessible only by users with PROVIDER role.
 */
router.get('/provider-only', requireAuth, requireRole(USER_ROLES.PROVIDER), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Provider-only route accessed successfully.',
    data: { role: req.user.role }
  });
});

/**
 * GET /api/test/admin-only
 * Accessible only by users with ADMIN role.
 */
router.get('/admin-only', requireAuth, requireRole(USER_ROLES.ADMIN), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin-only route accessed successfully.',
    data: { role: req.user.role }
  });
});

module.exports = router;

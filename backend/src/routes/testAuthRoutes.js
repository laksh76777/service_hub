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
 * GET /api/test/technician-only
 * Accessible only by users with TECHNICIAN role.
 */
router.get('/technician-only', requireAuth, requireRole(USER_ROLES.TECHNICIAN, 'PROVIDER'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Technician-only route accessed successfully.',
    data: { role: req.user.role }
  });
});

/**
 * GET /api/test/provider-only
 * Accessible only by users with PROVIDER or TECHNICIAN role (legacy compatibility).
 */
router.get('/provider-only', requireAuth, requireRole(USER_ROLES.TECHNICIAN, 'PROVIDER'), (req, res) => {
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

/**
 * GET /api/test/demo-accounts
 * Public Endpoint: Returns available demo accounts for 1-click test sign-in.
 */
router.get('/demo-accounts', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      accounts: [
        { role: 'Admin', email: 'abc@gmail.com', label: '👑 Demo Admin', desc: 'Platform oversight & dispute arbitration' },
        { role: 'Customer', email: 'laksh@gmail.com', label: '👤 Demo Customer', desc: 'Laksh Suthar (Indiranagar, Bengaluru)' },
        { role: 'Technician', email: 'ac@gmail.com', label: '❄️ AC Technician', desc: 'Rahul Sharma (CoolCare AC Solutions)' },
        { role: 'Technician', email: 'plumber@gmail.com', label: '🚰 Plumber', desc: 'Imran Khan (QuickFix Plumbing)' },
        { role: 'Technician', email: 'electrician@gmail.com', label: '⚡ Electrician', desc: 'Arjun Patel (PowerFix Electricals)' },
        { role: 'Technician', email: 'ro@gmail.com', label: '💧 RO Technician', desc: 'Suresh Verma (PureFlow RO Systems)' },
        { role: 'Technician', email: 'appliance@gmail.com', label: '🧺 Appliance Specialist', desc: 'Vikram Singh (SmartCare Home Appliances)' }
      ]
    }
  });
});

module.exports = router;

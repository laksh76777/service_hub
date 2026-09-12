const express = require('express');
const healthRoutes = require('./healthRoutes');
const userRoutes = require('./userRoutes');
const testAuthRoutes = require('./testAuthRoutes');
const categoryRoutes = require('./categoryRoutes');
const serviceRoutes = require('./serviceRoutes');
const { publicRouter: providerPublicRoutes, portalRouter: providerPortalRoutes } = require('./providerRoutes');
const adminRoutes = require('./adminRoutes');
const bookingRoutes = require('./bookingRoutes');
const addressRoutes = require('./addressRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/users', userRoutes);
router.use('/test', testAuthRoutes);
router.use('/categories', categoryRoutes);
router.use('/services', serviceRoutes);
router.use('/providers', providerPublicRoutes);
router.use('/provider', providerPortalRoutes);
router.use('/admin', adminRoutes);
router.use('/bookings', bookingRoutes);
router.use('/addresses', addressRoutes);

module.exports = router;

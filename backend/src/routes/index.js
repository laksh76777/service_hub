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
const fileRoutes = require('./fileRoutes');
const estimateRoutes = require('./estimateRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const paymentRoutes = require('./paymentRoutes');
const warrantyRoutes = require('./warrantyRoutes');
const disputeRoutes = require('./disputeRoutes');
const reviewRoutes = require('./reviewRoutes');
const notificationRoutes = require('./notificationRoutes');
const aiRoutes = require('./aiRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/ai', aiRoutes);
router.use('/users', userRoutes);
router.use('/test', testAuthRoutes);
router.use('/categories', categoryRoutes);
router.use('/services', serviceRoutes);
router.use('/technicians', providerPublicRoutes);
router.use('/technician', providerPortalRoutes);
router.use('/providers', providerPublicRoutes);
router.use('/provider', providerPortalRoutes);
router.use('/admin', adminRoutes);
router.use('/bookings', bookingRoutes);
router.use('/addresses', addressRoutes);
router.use('/', fileRoutes);
router.use('/', estimateRoutes);
router.use('/', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/warranties', warrantyRoutes);
router.use('/disputes', disputeRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;



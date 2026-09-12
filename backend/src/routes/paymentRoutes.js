const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createPaymentOrder,
  completePayment,
  getPaymentHistory,
  getPaymentById
} = require('../controllers/paymentController');

const router = express.Router();

router.use(requireAuth);

router.post('/orders', createPaymentOrder);
router.post('/complete', completePayment);
router.get('/booking/:bookingId', getPaymentHistory);
router.get('/:paymentId', getPaymentById);

module.exports = router;

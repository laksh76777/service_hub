const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createDispute,
  respondToDispute,
  resolveDispute,
  getDisputeById,
  getDisputeByBooking
} = require('../controllers/disputeController');

const router = express.Router();

router.use(requireAuth);

router.post('/', createDispute);
router.post('/:id/respond', respondToDispute);
router.patch('/:id/resolve', resolveDispute);
router.get('/booking/:bookingId', getDisputeByBooking);
router.get('/:id', getDisputeById);

module.exports = router;

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createWarranty,
  getWarrantyByBooking,
  createWarrantyClaim,
  updateClaimStatus
} = require('../controllers/warrantyController');

const router = express.Router();

router.use(requireAuth);

router.post('/', createWarranty);
router.get('/booking/:bookingId', getWarrantyByBooking);
router.post('/:id/claims', createWarrantyClaim);
router.patch('/claims/:claimId/status', updateClaimStatus);

module.exports = router;

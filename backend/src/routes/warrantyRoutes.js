const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createWarranty,
  getWarrantyByBooking,
  getWarrantyById,
  createWarrantyClaim,
  updateClaimStatus
} = require('../controllers/warrantyController');

const router = express.Router();

router.use(requireAuth);

router.post('/', createWarranty);
router.get('/booking/:bookingId', getWarrantyByBooking);
router.get('/:id', getWarrantyById);
router.post('/:id/claims', createWarrantyClaim);
router.patch('/claims/:claimId/status', updateClaimStatus);

module.exports = router;

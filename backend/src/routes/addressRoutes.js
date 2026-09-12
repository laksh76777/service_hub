const express = require('express');
const { getMyAddresses, saveAddress, deleteAddress } = require('../controllers/addressController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', getMyAddresses);
router.post('/', saveAddress);
router.delete('/:id', deleteAddress);

module.exports = router;

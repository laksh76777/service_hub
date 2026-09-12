const express = require('express');
const { getHealth, getDbHealth } = require('../controllers/healthController');

const router = express.Router();

router.get('/health', getHealth);
router.get('/health/db', getDbHealth);

module.exports = router;

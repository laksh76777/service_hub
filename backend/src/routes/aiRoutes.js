const express = require('express');
const { classifyRequest } = require('../controllers/aiController');

const router = express.Router();

// Classification endpoint - practical advisory tool accessible for booking flow
router.post('/classify-request', classifyRequest);

module.exports = router;

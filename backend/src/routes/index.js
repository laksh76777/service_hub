const express = require('express');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

router.use('/', healthRoutes);

module.exports = router;

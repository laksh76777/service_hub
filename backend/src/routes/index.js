const express = require('express');
const healthRoutes = require('./healthRoutes');
const userRoutes = require('./userRoutes');
const testAuthRoutes = require('./testAuthRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/users', userRoutes);
router.use('/test', testAuthRoutes);

module.exports = router;

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// Protected user profile routes
router.get('/me', requireAuth, userController.getMe);
router.patch('/me', requireAuth, userController.updateMe);
router.post('/sync', requireAuth, userController.syncProfile);

module.exports = router;

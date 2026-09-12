const express = require('express');
const multer = require('multer');
const {
  uploadBookingFile,
  getBookingFiles,
  streamFile,
  deleteFile
} = require('../controllers/fileController');
const { requireAuth } = require('../middleware/auth');
const { MAX_FILE_SIZE_BYTES } = require('../services/fileService');

const router = express.Router();

// Configure Multer with memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  }
});

// Booking-level files
router.post('/bookings/:id/files', requireAuth, upload.single('file'), uploadBookingFile);
router.get('/bookings/:id/files', requireAuth, getBookingFiles);

// Direct file access (stream from GridFS) & deletion
router.get('/files/:fileId', requireAuth, streamFile);
router.delete('/files/:fileId', requireAuth, deleteFile);

module.exports = router;

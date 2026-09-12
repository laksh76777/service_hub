const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const WorkEvidence = require('../models/WorkEvidence');
const {
  uploadToGridFS,
  getFileStream,
  deleteFromGridFS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES
} = require('../services/fileService');
const { USER_ROLES } = require('../utils/constants');

/**
 * Checks if the user is authorized to view or manage files for the given booking
 */
const checkBookingAccess = (booking, user) => {
  if (!user || !booking) return false;
  if (user.role === USER_ROLES.ADMIN) return true;

  const customerId = booking.customerId?._id || booking.customerId;
  const providerId = booking.providerId?._id || booking.providerId;

  if (customerId && customerId.toString() === user._id.toString()) return true;
  if (providerId && providerId.toString() === user._id.toString()) return true;

  return false;
};

/**
 * Upload work evidence file to MongoDB GridFS
 * POST /api/bookings/:id/files
 */
const uploadBookingFile = async (req, res) => {
  try {
    const bookingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format.'
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Access control: only customer, assigned provider, or admin can upload
    if (!checkBookingAccess(booking, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to upload files for this booking.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided. Please attach a file using form-data key "file".'
      });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported file type '${req.file.mimetype}'. Allowed types: JPEG, PNG, WEBP, and PDF.`
      });
    }

    // Validate size limit (10 MB)
    if (req.file.size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds 10 MB limit (File size: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB).`
      });
    }

    const category = (req.body.category || 'BEFORE_WORK').toUpperCase();
    if (!WorkEvidence.EVIDENCE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category '${category}'. Allowed: ${WorkEvidence.EVIDENCE_CATEGORIES.join(', ')}.`
      });
    }

    const notes = (req.body.notes || '').trim();

    // Stream upload into GridFS
    const gridFile = await uploadToGridFS(req.file, {
      bookingId: booking._id,
      uploadedBy: req.user._id,
      uploaderRole: req.user.role,
      category
    });

    // Create WorkEvidence metadata document
    const evidence = await WorkEvidence.create({
      fileId: gridFile.fileId,
      bookingId: booking._id,
      uploadedBy: req.user._id,
      uploaderRole: req.user.role,
      category,
      filename: gridFile.filename,
      originalFilename: gridFile.originalFilename,
      mimeType: gridFile.mimeType,
      size: gridFile.size,
      notes
    });

    return res.status(201).json({
      success: true,
      message: 'Work evidence uploaded successfully.',
      evidence: {
        id: evidence._id,
        fileId: evidence.fileId,
        bookingId: evidence.bookingId,
        category: evidence.category,
        filename: evidence.filename,
        originalFilename: evidence.originalFilename,
        mimeType: evidence.mimeType,
        size: evidence.size,
        notes: evidence.notes,
        uploaderRole: evidence.uploaderRole,
        createdAt: evidence.createdAt,
        downloadUrl: `/api/files/${evidence.fileId}`
      }
    });
  } catch (error) {
    console.error('Error uploading booking evidence:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload work evidence.'
    });
  }
};

/**
 * List all evidence files associated with a booking
 * GET /api/bookings/:id/files
 */
const getBookingFiles = async (req, res) => {
  try {
    const bookingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format.'
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (!checkBookingAccess(booking, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view files for this booking.'
      });
    }

    const filter = { bookingId: booking._id };
    if (req.query.category && WorkEvidence.EVIDENCE_CATEGORIES.includes(req.query.category.toUpperCase())) {
      filter.category = req.query.category.toUpperCase();
    }

    const evidences = await WorkEvidence.find(filter)
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });

    const formatted = evidences.map((ev) => ({
      id: ev._id,
      fileId: ev.fileId,
      bookingId: ev.bookingId,
      category: ev.category,
      originalFilename: ev.originalFilename,
      mimeType: ev.mimeType,
      size: ev.size,
      notes: ev.notes,
      uploaderRole: ev.uploaderRole,
      uploadedBy: ev.uploadedBy,
      createdAt: ev.createdAt,
      downloadUrl: `/api/files/${ev.fileId}`
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      files: formatted
    });
  } catch (error) {
    console.error('Error fetching booking evidence files:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch work evidence files.'
    });
  }
};

/**
 * Stream binary file from MongoDB GridFS
 * GET /api/files/:fileId
 */
const streamFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID format.'
      });
    }

    const evidence = await WorkEvidence.findOne({ fileId: new mongoose.Types.ObjectId(fileId) });
    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'File not found.'
      });
    }

    const booking = await Booking.findById(evidence.bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Associated booking not found.'
      });
    }

    // Access control: only customer, assigned provider, or admin
    if (!checkBookingAccess(booking, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to access this file.'
      });
    }

    const downloadStream = getFileStream(evidence.fileId);

    downloadStream.on('error', (err) => {
      console.error('GridFS stream error:', err);
      if (!res.headersSent) {
        return res.status(404).json({
          success: false,
          message: 'File stream could not be opened.'
        });
      }
    });

    res.setHeader('Content-Type', evidence.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', evidence.size);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(evidence.originalFilename || 'evidence')}"`
    );
    res.setHeader('Cache-Control', 'private, max-age=86400');

    downloadStream.pipe(res);
  } catch (error) {
    console.error('Error streaming GridFS file:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve file from storage.'
      });
    }
  }
};

/**
 * Delete file from GridFS and delete metadata document
 * DELETE /api/files/:fileId
 */
const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID format.'
      });
    }

    const evidence = await WorkEvidence.findOne({ fileId: new mongoose.Types.ObjectId(fileId) });
    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'File metadata not found.'
      });
    }

    const booking = await Booking.findById(evidence.bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Associated booking not found.'
      });
    }

    // Permission: Uploader, assigned provider, or admin
    const isUploader = evidence.uploadedBy.toString() === req.user._id.toString();
    const isProvider = booking.providerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isUploader && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to delete this file.'
      });
    }

    // Delete from GridFS bucket
    try {
      await deleteFromGridFS(evidence.fileId);
    } catch (gridErr) {
      console.warn('GridFS deletion note:', gridErr.message);
    }

    // Delete metadata
    await WorkEvidence.findByIdAndDelete(evidence._id);

    return res.status(200).json({
      success: true,
      message: 'Evidence file deleted successfully from GridFS.'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete file.'
    });
  }
};

module.exports = {
  uploadBookingFile,
  getBookingFiles,
  streamFile,
  deleteFile
};

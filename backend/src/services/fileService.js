const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const { Readable } = require('stream');

const BUCKET_NAME = 'workEvidence';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

/**
 * Returns the GridFS bucket instance on the active database connection
 */
const getGridFSBucket = () => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error('Database connection is not open for GridFS operations');
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET_NAME
  });
};

/**
 * Validates file MIME type and size
 */
const validateFile = (file) => {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(
      `Unsupported file type '${file.mimetype}'. Allowed types: JPEG, PNG, WEBP, and PDF.`
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size exceeds maximum limit of 10 MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)} MB.`
    );
  }
};

/**
 * Generates an obfuscated, unique filename preserving valid extension
 */
const generateSafeFilename = (originalName) => {
  const ext = path.extname(originalName || '').toLowerCase() || '.bin';
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `evidence_${timestamp}_${random}${ext}`;
};

/**
 * Uploads a memory buffer into MongoDB GridFS
 *
 * @param {Object} file - Multer file object with buffer, originalname, mimetype, size
 * @param {Object} metadata - Optional metadata to store directly on GridFS file document
 * @returns {Promise<{ fileId: mongoose.Types.ObjectId, filename: string, size: number, mimeType: string }>}
 */
const uploadToGridFS = (file, metadata = {}) => {
  return new Promise((resolve, reject) => {
    try {
      validateFile(file);

      const bucket = getGridFSBucket();
      const safeFilename = generateSafeFilename(file.originalname);

      const uploadStream = bucket.openUploadStream(safeFilename, {
        contentType: file.mimetype,
        metadata: {
          ...metadata,
          originalName: file.originalname,
          uploadedAt: new Date()
        }
      });

      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null); // End of stream

      uploadStream.on('error', (err) => {
        reject(new Error(`GridFS upload failed: ${err.message}`));
      });

      uploadStream.on('finish', () => {
        resolve({
          fileId: uploadStream.id,
          filename: safeFilename,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        });
      });

      readableStream.pipe(uploadStream);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Returns a readable stream for reading a file from GridFS
 *
 * @param {string|mongoose.Types.ObjectId} fileId
 * @returns {ReadableStream}
 */
const getFileStream = (fileId) => {
  const bucket = getGridFSBucket();
  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  return bucket.openDownloadStream(objectId);
};

/**
 * Retrieves file metadata directly from the GridFS files collection
 *
 * @param {string|mongoose.Types.ObjectId} fileId
 * @returns {Promise<Object|null>}
 */
const getFileInfo = async (fileId) => {
  const bucket = getGridFSBucket();
  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  const files = await bucket.find({ _id: objectId }).toArray();
  return files.length > 0 ? files[0] : null;
};

/**
 * Deletes a file and its binary chunks from GridFS
 *
 * @param {string|mongoose.Types.ObjectId} fileId
 * @returns {Promise<void>}
 */
const deleteFromGridFS = async (fileId) => {
  const bucket = getGridFSBucket();
  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  await bucket.delete(objectId);
};

module.exports = {
  uploadToGridFS,
  getFileStream,
  getFileInfo,
  deleteFromGridFS,
  validateFile,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES
};

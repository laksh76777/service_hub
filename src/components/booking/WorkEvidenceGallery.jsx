import React, { useState, useEffect } from 'react';
import { uploadBookingEvidence, getBookingEvidence, deleteBookingEvidence, getApiBaseUrl } from '../../services/api';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';

const CATEGORIES = [
  { key: 'ALL', label: 'All Evidence' },
  { key: 'BEFORE_WORK', label: 'Before Work' },
  { key: 'INSPECTION', label: 'Inspection' },
  { key: 'AFTER_WORK', label: 'After Work' },
  { key: 'DISPUTE_EVIDENCE', label: 'Dispute Evidence' },
  { key: 'OTHER', label: 'Other Documents' }
];

const WorkEvidenceGallery = ({ bookingId, canUpload = true, canDelete = true }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('BEFORE_WORK');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, file: null, fileUrl: '' });

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const categoryParam = activeCategory === 'ALL' ? '' : activeCategory;
      const res = await getBookingEvidence(bookingId, categoryParam);
      setFiles(res.files || []);
    } catch (err) {
      console.error('Failed to load evidence files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchFiles();
    }
  }, [bookingId, activeCategory]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please choose a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', uploadCategory);
    if (uploadNotes.trim()) {
      formData.append('notes', uploadNotes.trim());
    }

    try {
      setUploading(true);
      await uploadBookingEvidence(bookingId, formData);
      setIsUploadOpen(false);
      setSelectedFile(null);
      setUploadNotes('');
      setUploadCategory('BEFORE_WORK');
      await fetchFiles();
    } catch (err) {
      alert(err.message || 'Failed to upload work evidence.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this evidence file?')) return;
    try {
      await deleteBookingEvidence(fileId);
      setFiles((prev) => prev.filter((f) => f.fileId !== fileId && f.id !== fileId));
    } catch (err) {
      alert(err.message || 'Failed to delete file.');
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📷</span> Work Evidence & Photos (GridFS)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Verified photos and documents stored securely in MongoDB GridFS.
          </p>
        </div>
        {canUpload && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5"
          >
            <span>+</span> Upload Evidence
          </Button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
              activeCategory === cat.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading evidence gallery...</div>
      ) : files.length === 0 ? (
        <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <div className="text-3xl mb-1">🖼️</div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No work evidence uploaded yet.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Technicians and customers can upload before/after photos and inspection documents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
          {files.map((file) => {
            const isImage = file.mimeType?.startsWith('image/');
            const fileUrl = `${getApiBaseUrl()}/files/${file.fileId}`;

            return (
              <div
                key={file.id || file.fileId}
                className="group relative rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                {/* Thumbnail / Preview Area */}
                <div
                  className="aspect-video w-full bg-gray-100 dark:bg-gray-900 cursor-pointer flex items-center justify-center overflow-hidden relative"
                  onClick={() => setPreviewModal({ isOpen: true, file, fileUrl })}
                >
                  {isImage ? (
                    <img
                      src={fileUrl}
                      alt={file.originalFilename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-center p-3">
                      <span className="text-3xl">📄</span>
                      <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase">
                        {file.mimeType?.split('/')[1] || 'DOC'}
                      </p>
                    </div>
                  )}

                  {/* Category Badge overlay */}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider bg-black/70 text-white backdrop-blur-sm">
                    {file.category?.replace('_', ' ')}
                  </span>
                </div>

                {/* Info Card */}
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <p
                      className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate"
                      title={file.originalFilename}
                    >
                      {file.originalFilename}
                    </p>
                    {file.notes && (
                      <p
                        className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5"
                        title={file.notes}
                      >
                        {file.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-[10px] text-gray-400">
                    <span>{(file.size / 1024).toFixed(0)} KB</span>
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.fileId);
                        }}
                        className="text-red-500 hover:text-red-700 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => !uploading && setIsUploadOpen(false)}
        title="Upload Work Evidence"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Select Evidence Category
            </label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="BEFORE_WORK">Before Work (Initial State)</option>
              <option value="INSPECTION">Inspection Diagnosis</option>
              <option value="AFTER_WORK">After Work (Completed State)</option>
              <option value="DISPUTE_EVIDENCE">Dispute Evidence</option>
              <option value="OTHER">Other / Document / Invoice</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Attachment File (JPEG, PNG, WEBP, PDF up to 10MB)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              required
              className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Notes / Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              placeholder="e.g. Broken valve replaced with new brass fitting..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => setIsUploadOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={uploading}>
              {uploading ? 'Uploading to GridFS...' : 'Upload File'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lightbox / Preview Modal */}
      <Modal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, file: null, fileUrl: '' })}
        title={previewModal.file?.originalFilename || 'File Preview'}
      >
        <div className="text-center space-y-4">
          {previewModal.file?.mimeType?.startsWith('image/') ? (
            <div className="max-h-[60vh] overflow-hidden rounded-xl bg-black flex items-center justify-center">
              <img
                src={previewModal.fileUrl}
                alt={previewModal.file?.originalFilename}
                className="max-h-[60vh] w-auto object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <span className="text-5xl">📄</span>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
                PDF / Document File
              </p>
            </div>
          )}

          {previewModal.file?.notes && (
            <div className="text-left bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
              <span className="font-bold text-gray-900 dark:text-white">Notes: </span>
              {previewModal.file.notes}
            </div>
          )}

          <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
            <span>
              Category: <strong>{previewModal.file?.category}</strong>
            </span>
            <a
              href={previewModal.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={previewModal.file?.originalFilename}
              className="text-blue-600 hover:underline font-semibold"
            >
              Open / Download Original ↗
            </a>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default WorkEvidenceGallery;

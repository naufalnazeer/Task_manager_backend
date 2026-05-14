const multer = require('multer');

// Use memory storage — files are kept in buffer for S3 upload
const storage = multer.memoryStorage();

// File filter for attachments (allow common file types)
const attachmentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/zip',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// File filter for voice notes (audio only)
const voiceNoteFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed for voice notes'), false);
  }
};

const uploadAttachment = multer({
  storage,
  fileFilter: attachmentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

const uploadVoiceNote = multer({
  storage,
  fileFilter: voiceNoteFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

module.exports = { uploadAttachment, uploadVoiceNote };

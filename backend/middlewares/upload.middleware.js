// backend/middlewares/upload.middleware.js
// -------------------------------------------------------
// Multer file upload configuration & validation for resumes
// -------------------------------------------------------
'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `resume-${uniqueSuffix}${ext}`);
  }
});

// File filter (PDF and DOCX only)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.pdf', '.docx'];

  if (!allowedExts.includes(ext)) {
    return cb(new Error('Invalid file type. Only .pdf and .docx resumes are accepted.'));
  }

  cb(null, true);
};

// Multer instance with 5MB limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB maximum
    files: 1
  }
}).single('resume');

/**
 * Express middleware wrapper to catch Multer errors (e.g. file size exceeded)
 */
function uploadResumeFile(req, res, next) {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the 5MB limit. Please upload a smaller resume.'
        });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}

module.exports = { uploadResumeFile, UPLOADS_DIR };

// backend/controllers/resume.controller.js
// -------------------------------------------------------
// Handles resume uploads, text extraction, retrieval, and deletion
// -------------------------------------------------------
'use strict';

const fs = require('fs');
const path = require('path');
const ResumeModel = require('../models/resume.model');
const { extractTextFromResume } = require('../utils/parser.util');
const { UPLOADS_DIR } = require('../middlewares/upload.middleware');

/**
 * Upload a resume (PDF or DOCX) and extract its text.
 * Route: POST /resumes/upload
 */
async function uploadResume(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No resume file uploaded. Please attach a .pdf or .docx file.'
      });
    }

    const originalName = req.file.originalname;
    const storedName = req.file.filename;
    const fileSize = req.file.size;
    const ext = path.extname(originalName).toLowerCase().replace('.', '');
    const fileType = ext === 'pdf' ? 'pdf' : 'docx';

    // Extract text from the uploaded file
    let extractedText = '';
    let wordCount = 0;

    try {
      const parsed = await extractTextFromResume(req.file.path, fileType);
      extractedText = parsed.text;
      wordCount = parsed.wordCount;
    } catch (parseErr) {
      console.warn(`[uploadResume] Text extraction warning for ${storedName}:`, parseErr.message);
      // Fallback: save resume record even if text extraction encounters unexpected format
      extractedText = '';
    }

    // Save resume to MySQL
    const newId = await ResumeModel.create({
      userId: req.session.userId,
      originalName,
      storedName,
      fileType,
      fileSize,
      extractedText
    });

    return res.status(201).json({
      success: true,
      message: 'Resume uploaded and parsed successfully!',
      resume: {
        id: newId,
        original_name: originalName,
        file_type: fileType,
        file_size: fileSize,
        word_count: wordCount,
        text_preview: extractedText ? extractedText.slice(0, 300) + '...' : 'No selectable text found in document.',
        uploaded_at: new Date()
      }
    });

  } catch (err) {
    console.error('[uploadResume]', err);
    // Cleanup orphaned file if DB insertion failed
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    return res.status(500).json({ success: false, message: 'Server error processing resume upload.' });
  }
}

/**
 * List all uploaded resumes for the authenticated user.
 * Route: GET /resumes
 */
async function getResumes(req, res) {
  try {
    const resumes = await ResumeModel.findByUserId(req.session.userId);
    return res.json({ success: true, count: resumes.length, resumes });
  } catch (err) {
    console.error('[getResumes]', err);
    return res.status(500).json({ success: false, message: 'Server error fetching resumes.' });
  }
}

/**
 * Get detailed resume information including the full extracted text.
 * Route: GET /resumes/:id
 */
async function getResumeById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid resume ID.' });
    }

    const resume = await ResumeModel.findByIdAndUserId(id, req.session.userId);
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    return res.json({ success: true, resume });
  } catch (err) {
    console.error('[getResumeById]', err);
    return res.status(500).json({ success: false, message: 'Server error fetching resume details.' });
  }
}

/**
 * Delete a resume from database and remove its file from disk.
 * Route: DELETE /resumes/:id
 */
async function deleteResume(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid resume ID.' });
    }

    const resume = await ResumeModel.findByIdAndUserId(id, req.session.userId);
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    await ResumeModel.deleteByIdAndUserId(id, req.session.userId);

    // Delete file from disk if present
    const filePath = path.join(UPLOADS_DIR, resume.stored_name);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileErr) {
        console.warn(`[deleteResume] Failed to remove file from disk:`, fileErr.message);
      }
    }

    return res.json({ success: true, message: 'Resume deleted successfully.' });
  } catch (err) {
    console.error('[deleteResume]', err);
    return res.status(500).json({ success: false, message: 'Server error deleting resume.' });
  }
}

module.exports = {
  uploadResume,
  getResumes,
  getResumeById,
  deleteResume
};

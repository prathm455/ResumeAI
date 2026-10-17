// backend/routes/resume.routes.js
// -------------------------------------------------------
// Endpoints for resume uploading, viewing, and deleting
// Mounted at /resumes in server.js
// -------------------------------------------------------
'use strict';

const express = require('express');
const router = express.Router();

const resumeController = require('../controllers/resume.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { uploadResumeFile } = require('../middlewares/upload.middleware');

// All resume routes require authenticated user session
router.use(requireAuth);

// POST /resumes/upload
router.post('/upload', uploadResumeFile, resumeController.uploadResume);

// GET /resumes
router.get('/', resumeController.getResumes);

// GET /resumes/:id
router.get('/:id', resumeController.getResumeById);

// DELETE /resumes/:id
router.delete('/:id', resumeController.deleteResume);

module.exports = router;

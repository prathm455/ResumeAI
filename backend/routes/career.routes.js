// backend/routes/career.routes.js
// -------------------------------------------------------
// Endpoints for AI Career Assistant tools
// Mounted at /career in server.js
// -------------------------------------------------------
'use strict';

const express = require('express');
const router = express.Router();

const careerController = require('../controllers/career.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// All career assistant routes require user authentication
router.use(requireAuth);

// POST /career/cover-letter
router.post('/cover-letter', careerController.createCoverLetter);

// POST /career/interview-prep
router.post('/interview-prep', careerController.getInterviewPrep);

module.exports = router;


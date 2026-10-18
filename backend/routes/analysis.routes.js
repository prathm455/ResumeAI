// backend/routes/analysis.routes.js
// -------------------------------------------------------
// Endpoints for running ATS analyses, checking match scores, and advice
// Mounted at /analyses in server.js
// -------------------------------------------------------
'use strict';

const express = require('express');
const router = express.Router();

const analysisController = require('../controllers/analysis.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// All analysis routes require user authentication
router.use(requireAuth);

// POST /analyses/run
router.post('/run', analysisController.runAnalysis);

// GET /analyses/stats/summary
router.get('/stats/summary', analysisController.getStats);

// GET /analyses
router.get('/', analysisController.getAnalyses);

// GET /analyses/:id
router.get('/:id', analysisController.getAnalysisById);

// DELETE /analyses/:id
router.delete('/:id', analysisController.deleteAnalysis);

module.exports = router;

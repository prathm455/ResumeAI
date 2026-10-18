// backend/controllers/analysis.controller.js
// -------------------------------------------------------
// Controller for ATS matching, role prediction, and scoring
// -------------------------------------------------------
'use strict';

const AnalysisModel = require('../models/analysis.model');
const ResumeModel = require('../models/resume.model');
const { analyzeResume } = require('../utils/analyzer.util');

/**
 * Runs ATS analysis on a chosen resume against an optional job description.
 * Route: POST /analyses/run
 */
async function runAnalysis(req, res) {
  try {
    const { resume_id, job_description } = req.body;

    if (!resume_id) {
      return res.status(400).json({ success: false, message: 'Please select a resume to analyze.' });
    }

    const resumeIdNum = parseInt(resume_id, 10);
    const resume = await ResumeModel.findByIdAndUserId(resumeIdNum, req.session.userId);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Selected resume not found.' });
    }

    if (!resume.extracted_text || resume.extracted_text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The selected resume contains no extracted text. Please upload a selectable PDF or DOCX file.'
      });
    }

    // Run intelligent scoring and matching algorithm
    const analysisResult = analyzeResume(resume.extracted_text, job_description || '');

    // Save to database
    const newId = await AnalysisModel.create({
      resumeId: resumeIdNum,
      userId: req.session.userId,
      jobDescription: job_description || null,
      matchScore: analysisResult.match_score,
      matchedSkills: analysisResult.matched_skills,
      missingSkills: analysisResult.missing_skills,
      predictedRole: analysisResult.predicted_role,
      suggestions: analysisResult.suggestions
    });

    return res.status(201).json({
      success: true,
      message: 'Analysis completed successfully!',
      analysis: {
        id: newId,
        resume_id: resumeIdNum,
        resume_name: resume.original_name,
        match_score: analysisResult.match_score,
        matched_skills: analysisResult.matched_skills,
        missing_skills: analysisResult.missing_skills,
        predicted_role: analysisResult.predicted_role,
        suggestions: analysisResult.suggestions,
        created_at: new Date()
      }
    });

  } catch (err) {
    console.error('[runAnalysis]', err);
    return res.status(500).json({ success: false, message: 'Server error processing resume analysis.' });
  }
}

/**
 * List all analyses for the authenticated user.
 * Route: GET /analyses
 */
async function getAnalyses(req, res) {
  try {
    const analyses = await AnalysisModel.findByUserId(req.session.userId);
    return res.json({ success: true, count: analyses.length, analyses });
  } catch (err) {
    console.error('[getAnalyses]', err);
    return res.status(500).json({ success: false, message: 'Server error fetching analyses.' });
  }
}

/**
 * Get a single analysis by its ID.
 * Route: GET /analyses/:id
 */
async function getAnalysisById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid analysis ID.' });
    }

    const analysis = await AnalysisModel.findByIdAndUserId(id, req.session.userId);
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Analysis not found.' });
    }

    return res.json({ success: true, analysis });
  } catch (err) {
    console.error('[getAnalysisById]', err);
    return res.status(500).json({ success: false, message: 'Server error fetching analysis.' });
  }
}

/**
 * Delete an analysis record.
 * Route: DELETE /analyses/:id
 */
async function deleteAnalysis(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid analysis ID.' });
    }

    const rows = await AnalysisModel.deleteByIdAndUserId(id, req.session.userId);
    if (!rows) {
      return res.status(404).json({ success: false, message: 'Analysis not found.' });
    }

    return res.json({ success: true, message: 'Analysis deleted successfully.' });
  } catch (err) {
    console.error('[deleteAnalysis]', err);
    return res.status(500).json({ success: false, message: 'Server error deleting analysis.' });
  }
}

/**
 * Returns overall statistics for the dashboard.
 * Route: GET /analyses/stats/summary
 */
async function getStats(req, res) {
  try {
    const analysisStats = await AnalysisModel.getUserStats(req.session.userId);
    const totalResumes = await ResumeModel.countByUserId(req.session.userId);

    return res.json({
      success: true,
      stats: {
        totalResumes,
        totalAnalyses: analysisStats.totalAnalyses,
        avgScore: analysisStats.avgScore,
        latestRole: analysisStats.latestRole
      }
    });
  } catch (err) {
    console.error('[getStats]', err);
    return res.status(500).json({ success: false, message: 'Server error fetching statistics.' });
  }
}

module.exports = {
  runAnalysis,
  getAnalyses,
  getAnalysisById,
  deleteAnalysis,
  getStats
};

// backend/controllers/career.controller.js
// -------------------------------------------------------
// Controller for AI Career Assistant: Cover Letter & Interview Preparation Coach
// -------------------------------------------------------
'use strict';

const ResumeModel = require('../models/resume.model');
const UserModel = require('../models/user.model');
const {
  generateCoverLetter,
  generateInterviewQuestions
} = require('../utils/career-assistant.util');

/**
 * Generates a tailored, professional cover letter matching a candidate's resume to target job.
 * Route: POST /career/cover-letter
 */
async function createCoverLetter(req, res) {
  try {
    const { resume_id, company_name, role_title, job_description } = req.body;

    if (!resume_id) {
      return res.status(400).json({ success: false, message: 'Please select a resume.' });
    }

    const resumeIdNum = parseInt(resume_id, 10);
    const resume = await ResumeModel.findByIdAndUserId(resumeIdNum, req.session.userId);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    const user = await UserModel.findById(req.session.userId);

    const result = generateCoverLetter({
      candidateName: req.session.fullName || (user ? user.full_name : 'Candidate'),
      userEmail: user ? user.email : '',
      resumeText: resume.extracted_text || '',
      jobDescription: job_description || '',
      companyName: company_name || 'Hiring Team',
      roleTitle: role_title || 'Software Engineer'
    });

    return res.json({ success: true, result });

  } catch (err) {
    console.error('[createCoverLetter]', err);
    return res.status(500).json({ success: false, message: 'Error generating cover letter.' });
  }
}

/**
 * Generates personalized interview questions, sample answers, and talking points
 * adapted to candidate skills, target role, and selected difficulty level (basic, intermediate, advanced).
 * Route: POST /career/interview-prep
 */
async function getInterviewPrep(req, res) {
  try {
    const { resume_id, job_description, role_title, difficulty_level } = req.body;

    if (!resume_id) {
      return res.status(400).json({ success: false, message: 'Please select a resume.' });
    }

    // Validate difficulty level: only basic, intermediate, or advanced allowed
    const validLevels = ['basic', 'intermediate', 'advanced'];
    const selectedLevel = (difficulty_level || 'intermediate').toString().toLowerCase().trim();

    if (!validLevels.includes(selectedLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty level. Must be basic, intermediate, or advanced.'
      });
    }

    const resumeIdNum = parseInt(resume_id, 10);
    const resume = await ResumeModel.findByIdAndUserId(resumeIdNum, req.session.userId);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    const result = generateInterviewQuestions(
      resume.extracted_text || '',
      job_description || '',
      role_title || '',
      selectedLevel
    );

    return res.json({ success: true, result });

  } catch (err) {
    console.error('[getInterviewPrep]', err);
    return res.status(500).json({ success: false, message: 'Error generating interview preparation questions.' });
  }
}

module.exports = {
  createCoverLetter,
  getInterviewPrep
};


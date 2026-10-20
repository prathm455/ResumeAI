// backend/controllers/career.controller.js
// -------------------------------------------------------
// Controller for AI Career Assistant: Bullet rewriter, cover letter, & interview prep
// -------------------------------------------------------
'use strict';

const ResumeModel = require('../models/resume.model');
const UserModel = require('../models/user.model');
const {
  rewriteBulletPoint,
  generateCoverLetter,
  generateInterviewQuestions
} = require('../utils/career-assistant.util');

/**
 * Optimizes a resume bullet point into 3 impactful variations.
 * Route: POST /career/rewrite-bullet
 */
async function rewriteBullet(req, res) {
  try {
    const { bullet_point, focus_role, target_skill } = req.body;

    if (!bullet_point || bullet_point.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a bullet point with at least 5 characters.'
      });
    }

    const result = rewriteBulletPoint(bullet_point, focus_role, target_skill);
    return res.json({ success: true, result });

  } catch (err) {
    console.error('[rewriteBullet]', err);
    return res.status(500).json({ success: false, message: err.message || 'Error rewriting bullet point.' });
  }
}

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
 * Generates personalized interview questions and talking points based on candidate skills.
 * Route: POST /career/interview-prep
 */
async function getInterviewPrep(req, res) {
  try {
    const { resume_id, job_description } = req.body;

    if (!resume_id) {
      return res.status(400).json({ success: false, message: 'Please select a resume.' });
    }

    const resumeIdNum = parseInt(resume_id, 10);
    const resume = await ResumeModel.findByIdAndUserId(resumeIdNum, req.session.userId);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    const result = generateInterviewQuestions(
      resume.extracted_text || '',
      job_description || ''
    );

    return res.json({ success: true, result });

  } catch (err) {
    console.error('[getInterviewPrep]', err);
    return res.status(500).json({ success: false, message: 'Error generating interview preparation questions.' });
  }
}

module.exports = {
  rewriteBullet,
  createCoverLetter,
  getInterviewPrep
};

// backend/models/analysis.model.js
// -------------------------------------------------------
// Database queries for the "analyses" table
// -------------------------------------------------------
'use strict';

const pool = require('../config/db');

/**
 * Creates a new analysis entry.
 * @param {Object} data
 * @param {number} data.resumeId
 * @param {number} data.userId
 * @param {string} data.jobDescription
 * @param {number} data.matchScore
 * @param {Array} data.matchedSkills
 * @param {Array} data.missingSkills
 * @param {string} data.predictedRole
 * @param {Array} data.suggestions
 * @returns {Promise<number>} insertId
 */
async function create({ resumeId, userId, jobDescription, matchScore, matchedSkills, missingSkills, predictedRole, suggestions }) {
  const [result] = await pool.execute(
    `INSERT INTO analyses 
      (resume_id, user_id, job_description, match_score, matched_skills, missing_skills, predicted_role, suggestions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resumeId,
      userId,
      jobDescription || null,
      matchScore,
      JSON.stringify(matchedSkills || []),
      JSON.stringify(missingSkills || []),
      predictedRole || 'Software Engineer',
      JSON.stringify(suggestions || [])
    ]
  );
  return result.insertId;
}

/**
 * Retrieves all analyses for a user joined with resume title.
 * @param {number} userId
 * @returns {Promise<Array<Object>>}
 */
async function findByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT a.id, a.resume_id, a.user_id, a.match_score, a.predicted_role,
            a.matched_skills, a.missing_skills, a.suggestions, a.created_at,
            r.original_name AS resume_name, r.file_type
     FROM analyses a
     JOIN resumes r ON a.resume_id = r.id
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC`,
    [userId]
  );

  return rows.map(row => ({
    ...row,
    matched_skills: typeof row.matched_skills === 'string' ? JSON.parse(row.matched_skills) : row.matched_skills,
    missing_skills: typeof row.missing_skills === 'string' ? JSON.parse(row.missing_skills) : row.missing_skills,
    suggestions: typeof row.suggestions === 'string' ? JSON.parse(row.suggestions) : row.suggestions
  }));
}

/**
 * Retrieves a single analysis by its ID and user ID.
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<Object|undefined>}
 */
async function findByIdAndUserId(id, userId) {
  const [rows] = await pool.execute(
    `SELECT a.*, r.original_name AS resume_name, r.file_type
     FROM analyses a
     JOIN resumes r ON a.resume_id = r.id
     WHERE a.id = ? AND a.user_id = ?
     LIMIT 1`,
    [id, userId]
  );

  if (!rows[0]) return undefined;

  const row = rows[0];
  return {
    ...row,
    matched_skills: typeof row.matched_skills === 'string' ? JSON.parse(row.matched_skills) : row.matched_skills,
    missing_skills: typeof row.missing_skills === 'string' ? JSON.parse(row.missing_skills) : row.missing_skills,
    suggestions: typeof row.suggestions === 'string' ? JSON.parse(row.suggestions) : row.suggestions
  };
}

/**
 * Deletes an analysis record.
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<number>} affectedRows
 */
async function deleteByIdAndUserId(id, userId) {
  const [result] = await pool.execute(
    `DELETE FROM analyses WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows;
}

/**
 * Calculates aggregate stats for user dashboard.
 * @param {number} userId
 * @returns {Promise<{ totalAnalyses: number, avgScore: number, latestRole: string }>}
 */
async function getUserStats(userId) {
  const [scoreRows] = await pool.execute(
    `SELECT COUNT(*) AS total_analyses, AVG(match_score) AS avg_score
     FROM analyses
     WHERE user_id = ?`,
    [userId]
  );

  const [roleRows] = await pool.execute(
    `SELECT predicted_role FROM analyses
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  return {
    totalAnalyses: scoreRows[0] ? scoreRows[0].total_analyses : 0,
    avgScore: scoreRows[0] && scoreRows[0].avg_score ? parseFloat(Number(scoreRows[0].avg_score).toFixed(1)) : null,
    latestRole: roleRows[0] ? roleRows[0].predicted_role : null
  };
}

module.exports = {
  create,
  findByUserId,
  findByIdAndUserId,
  deleteByIdAndUserId,
  getUserStats
};

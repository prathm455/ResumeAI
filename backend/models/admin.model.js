// backend/models/admin.model.js
// -------------------------------------------------------
// Data access methods for the Admin Dashboard & Platform Analytics
// -------------------------------------------------------
'use strict';

const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Aggregates high-level platform metrics:
 * Users, Resumes, Analyses, Average Scores, Role Distributions.
 * @returns {Promise<Object>}
 */
async function getPlatformStats() {
  // 1. User Counts & Role Breakdown
  const [userRows] = await pool.execute(`
    SELECT 
      COUNT(*) AS total_users,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admin_count,
      SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) AS candidate_count
    FROM users
  `);

  // 2. Resume Counts & File Type Breakdown
  const [resumeRows] = await pool.execute(`
    SELECT 
      COUNT(*) AS total_resumes,
      SUM(CASE WHEN file_type = 'pdf' THEN 1 ELSE 0 END) AS pdf_count,
      SUM(CASE WHEN file_type = 'docx' THEN 1 ELSE 0 END) AS docx_count
    FROM resumes
  `);

  // 3. Analysis Counts & Score Statistics
  const [analysisRows] = await pool.execute(`
    SELECT 
      COUNT(*) AS total_analyses,
      AVG(match_score) AS avg_match_score,
      MAX(match_score) AS max_match_score,
      MIN(match_score) AS min_match_score
    FROM analyses
  `);

  // 4. Top Predicted Career Roles Distribution
  const [roleDistribution] = await pool.execute(`
    SELECT 
      predicted_role, 
      COUNT(*) AS count 
    FROM analyses 
    WHERE predicted_role IS NOT NULL AND predicted_role != ''
    GROUP BY predicted_role 
    ORDER BY count DESC 
    LIMIT 6
  `);

  const u = userRows[0] || {};
  const r = resumeRows[0] || {};
  const a = analysisRows[0] || {};

  return {
    users: {
      total: Number(u.total_users || 0),
      admins: Number(u.admin_count || 0),
      candidates: Number(u.candidate_count || 0)
    },
    resumes: {
      total: Number(r.total_resumes || 0),
      pdf: Number(r.pdf_count || 0),
      docx: Number(r.docx_count || 0)
    },
    analyses: {
      total: Number(a.total_analyses || 0),
      avg_score: a.avg_match_score !== null ? parseFloat(Number(a.avg_match_score).toFixed(1)) : 0,
      max_score: a.max_match_score !== null ? parseFloat(Number(a.max_match_score).toFixed(1)) : 0,
      min_score: a.min_match_score !== null ? parseFloat(Number(a.min_match_score).toFixed(1)) : 0
    },
    top_roles: roleDistribution.map(row => ({
      role: row.predicted_role,
      count: Number(row.count)
    }))
  };
}

/**
 * Retrieves all registered users with their resume & analysis counts.
 * Supports search filtering by name or email, and role filtering.
 * @param {Object} options
 * @param {string} [options.search='']
 * @param {string} [options.role='all']
 * @returns {Promise<Array<Object>>}
 */
async function getUsersList({ search = '', role = 'all' } = {}) {
  let query = `
    SELECT 
      u.id, 
      u.full_name, 
      u.email, 
      u.role, 
      u.created_at,
      COUNT(DISTINCT r.id) AS resume_count,
      COUNT(DISTINCT a.id) AS analysis_count
    FROM users u
    LEFT JOIN resumes r ON r.user_id = u.id
    LEFT JOIN analyses a ON a.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (search && search.trim()) {
    query += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
    const pattern = `%${search.trim()}%`;
    params.push(pattern, pattern);
  }

  if (role && role !== 'all') {
    query += ` AND u.role = ?`;
    params.push(role);
  }

  query += `
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `;

  const [rows] = await pool.execute(query, params);
  return rows.map(row => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    resume_count: Number(row.resume_count),
    analysis_count: Number(row.analysis_count)
  }));
}

/**
 * Updates a user's role (user <-> admin).
 * @param {number} userId
 * @param {'user'|'admin'} newRole
 * @returns {Promise<boolean>}
 */
async function updateUserRole(userId, newRole) {
  if (!['user', 'admin'].includes(newRole)) {
    throw new Error('Invalid role specified. Must be user or admin.');
  }

  const [result] = await pool.execute(
    'UPDATE users SET role = ? WHERE id = ?',
    [newRole, userId]
  );
  return result.affectedRows > 0;
}

/**
 * Deletes a user and cleanly unlinks their uploaded resume files from disk.
 * MySQL cascading deletes remove all corresponding database records.
 * @param {number} userId
 * @param {string} uploadsDir
 * @returns {Promise<boolean>}
 */
async function deleteUser(userId, uploadsDir) {
  // 1. Fetch stored filenames to remove disk files
  const [resumes] = await pool.execute(
    'SELECT stored_name FROM resumes WHERE user_id = ?',
    [userId]
  );

  // 2. Delete user from MySQL (cascades to resumes, analyses, sessions)
  const [result] = await pool.execute(
    'DELETE FROM users WHERE id = ?',
    [userId]
  );

  // 3. Safely unlink disk files
  if (uploadsDir) {
    for (const r of resumes) {
      if (r.stored_name) {
        const filePath = path.join(uploadsDir, r.stored_name);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.warn(`[admin.deleteUser] Could not delete file ${filePath}:`, err.message);
        }
      }
    }
  }

  return result.affectedRows > 0;
}

/**
 * Retrieves a unified chronological activity feed across uploads and analyses.
 * @param {number} [limit=20]
 * @returns {Promise<Array<Object>>}
 */
async function getRecentActivity(limit = 20) {
  const query = `
    (
      SELECT 
        'resume_upload' AS type,
        r.id AS id,
        r.original_name AS title,
        u.full_name AS user_name,
        u.email AS user_email,
        r.file_type AS meta,
        r.uploaded_at AS timestamp
      FROM resumes r
      JOIN users u ON u.id = r.user_id
    )
    UNION ALL
    (
      SELECT 
        'analysis_run' AS type,
        a.id AS id,
        COALESCE(a.predicted_role, 'Role Analysis') AS title,
        u.full_name AS user_name,
        u.email AS user_email,
        CONCAT(ROUND(a.match_score), '% Match') AS meta,
        a.created_at AS timestamp
      FROM analyses a
      JOIN users u ON u.id = a.user_id
    )
    ORDER BY timestamp DESC
    LIMIT ?
  `;

  const [rows] = await pool.query(query, [Number(limit) || 20]);
  return rows;
}

module.exports = {
  getPlatformStats,
  getUsersList,
  updateUserRole,
  deleteUser,
  getRecentActivity
};

// backend/models/resume.model.js
// -------------------------------------------------------
// Database queries for the "resumes" table
// -------------------------------------------------------
'use strict';

const pool = require('../config/db');

/**
 * Creates a new resume record in the database.
 * @param {Object} data
 * @param {number} data.userId
 * @param {string} data.originalName
 * @param {string} data.storedName
 * @param {'pdf'|'docx'} data.fileType
 * @param {number} data.fileSize
 * @param {string} data.extractedText
 * @returns {Promise<number>} insertId
 */
async function create({ userId, originalName, storedName, fileType, fileSize, extractedText }) {
  const [result] = await pool.execute(
    `INSERT INTO resumes (user_id, original_name, stored_name, file_type, file_size, extracted_text)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, originalName, storedName, fileType, fileSize, extractedText]
  );
  return result.insertId;
}

/**
 * Retrieves all resumes for a specific user, sorted from newest to oldest.
 * @param {number} userId
 * @returns {Promise<Array<Object>>}
 */
async function findByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, original_name, stored_name, file_type, file_size,
            uploaded_at, CHAR_LENGTH(extracted_text) AS text_length
     FROM resumes
     WHERE user_id = ?
     ORDER BY uploaded_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Retrieves a single resume by its ID and user ID (including extracted_text).
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<Object|undefined>}
 */
async function findByIdAndUserId(id, userId) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, original_name, stored_name, file_type, file_size, extracted_text, uploaded_at
     FROM resumes
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [id, userId]
  );
  return rows[0];
}

/**
 * Deletes a resume by its ID and user ID.
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<number>} affectedRows
 */
async function deleteByIdAndUserId(id, userId) {
  const [result] = await pool.execute(
    `DELETE FROM resumes WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows;
}

/**
 * Counts total resumes uploaded by a user.
 * @param {number} userId
 * @returns {Promise<number>}
 */
async function countByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM resumes WHERE user_id = ?`,
    [userId]
  );
  return rows[0] ? rows[0].total : 0;
}

module.exports = {
  create,
  findByUserId,
  findByIdAndUserId,
  deleteByIdAndUserId,
  countByUserId
};

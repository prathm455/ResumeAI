// backend/models/user.model.js
// -------------------------------------------------------
// All database queries related to the "users" table live
// here. No SQL is scattered across controllers.
// -------------------------------------------------------
'use strict';

const pool = require('../config/db');

/**
 * Find a user by their email address.
 * @param {string} email
 * @returns {Promise<Object|undefined>} user row or undefined
 */
async function findByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0];
}

/**
 * Find a user by their numeric ID.
 * @param {number} id
 * @returns {Promise<Object|undefined>} user row or undefined
 */
async function findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, full_name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0];
}

/**
 * Create a new user.
 * @param {string} fullName
 * @param {string} email
 * @param {string} hashedPassword  — already bcrypt-hashed
 * @returns {Promise<number>} insertId of new user
 */
async function create(fullName, email, hashedPassword) {
  const [result] = await pool.execute(
    'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
    [fullName, email, hashedPassword]
  );
  return result.insertId;
}

module.exports = { findByEmail, findById, create };

// backend/controllers/auth.controller.js
// -------------------------------------------------------
// Handles register, login, logout, and /me (session check).
// Keeps route files thin — business logic lives here.
// -------------------------------------------------------
'use strict';

const bcrypt   = require('bcryptjs');
const UserModel = require('../models/user.model');

// ---- REGISTER ------------------------------------------
async function register(req, res) {
  try {
    const { full_name, email, password } = req.body;

    // --- basic input validation ---
    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (full_name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Full name must be at least 2 characters.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    // --- check duplicate email ---
    const existing = await UserModel.findByEmail(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // --- hash the password (saltRounds=12) ---
    const hashed = await bcrypt.hash(password, 12);

    // --- save to DB ---
    const newId = await UserModel.create(full_name.trim(), email.toLowerCase(), hashed);

    // --- auto-login: set session ---
    req.session.userId   = newId;
    req.session.fullName = full_name.trim();
    req.session.role     = 'user';

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: { id: newId, full_name: full_name.trim(), email: email.toLowerCase(), role: 'user' }
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
}

// ---- LOGIN ---------------------------------------------
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await UserModel.findByEmail(email.toLowerCase());

    // Use the same generic message for both "not found" and "wrong password"
    // to avoid leaking which emails are registered (timing-safe approach).
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // --- regenerate session to prevent session fixation attacks ---
    req.session.regenerate(err => {
      if (err) {
        console.error('[login] session regenerate error:', err);
        return res.status(500).json({ success: false, message: 'Session error.' });
      }

      req.session.userId   = user.id;
      req.session.fullName = user.full_name;
      req.session.role     = user.role;

      return res.json({
        success: true,
        message: 'Logged in successfully!',
        user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
      });
    });

  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ---- LOGOUT --------------------------------------------
async function logout(req, res) {
  req.session.destroy(err => {
    if (err) {
      console.error('[logout]', err);
      return res.status(500).json({ success: false, message: 'Logout failed.' });
    }
    res.clearCookie('resumeai.sid');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
}

// ---- ME (session check) --------------------------------
async function me(req, res) {
  // requireAuth middleware ensures session.userId exists
  const user = await UserModel.findById(req.session.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  return res.json({ success: true, user });
}

module.exports = { register, login, logout, me };

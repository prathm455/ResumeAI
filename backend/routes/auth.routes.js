// backend/routes/auth.routes.js
// -------------------------------------------------------
// Defines the auth API endpoints and maps them to the
// controller functions.
//
// All routes are prefixed with /auth in server.js
// -------------------------------------------------------
'use strict';

const express = require('express');
const router  = express.Router();

const authController  = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// POST /auth/register
router.post('/register', authController.register);

// POST /auth/login
router.post('/login', authController.login);

// GET  /auth/logout   (GET so a simple link can log you out)
router.get('/logout', authController.logout);

// GET  /auth/me   — returns current user info (protected)
router.get('/me', requireAuth, authController.me);

module.exports = router;

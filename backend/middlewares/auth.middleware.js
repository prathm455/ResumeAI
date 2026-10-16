// backend/middlewares/auth.middleware.js
// -------------------------------------------------------
// Reusable middleware functions for authentication checks.
// -------------------------------------------------------
'use strict';

/**
 * requireAuth — blocks any route that needs a logged-in user.
 * If the session has no user, redirect to login.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  // API callers get JSON; browser callers get redirect
  if (req.headers['content-type'] === 'application/json' ||
      req.xhr) {
    return res.status(401).json({ success: false, message: 'Please log in first.' });
  }
  return res.redirect('/pages/login.html');
}

/**
 * requireAdmin — blocks non-admin users from admin routes.
 * Must be placed AFTER requireAuth in the middleware chain.
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Admin access only.' });
}

module.exports = { requireAuth, requireAdmin };

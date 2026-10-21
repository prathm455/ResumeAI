// backend/routes/admin.routes.js
// -------------------------------------------------------
// Administrative routes protected by requireAuth and requireAdmin
// -------------------------------------------------------
'use strict';

const express = require('express');
const router  = express.Router();

const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');
const AdminController = require('../controllers/admin.controller');

// Enforce authentication & admin privilege on all /admin routes
router.use(requireAuth);
router.use(requireAdmin);

// Platform Overview & System Health
router.get('/stats', AdminController.getStats);

// User Accounts Management
router.get('/users', AdminController.getUsers);
router.patch('/users/:id/role', AdminController.updateRole);
router.delete('/users/:id', AdminController.deleteUser);

// Audit & Global Activity
router.get('/activity', AdminController.getActivity);

module.exports = router;

// backend/controllers/admin.controller.js
// -------------------------------------------------------
// Controller for Phase 6 Admin Operations & Platform Health
// -------------------------------------------------------
'use strict';

const path = require('path');
const http = require('http');
const pool = require('../config/db');
const AdminModel = require('../models/admin.model');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Pings the Python ML microservice to assess real-time availability and latency.
 * @returns {Promise<{ status: string, latency_ms: number, info?: Object, error?: string }>}
 */
function probeMlServiceHealth() {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get('http://127.0.0.1:8000/health', { timeout: 2500 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - start;
        try {
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode === 200 ? 'online' : 'degraded',
            latency_ms: latency,
            info: json
          });
        } catch {
          resolve({
            status: res.statusCode === 200 ? 'online' : 'degraded',
            latency_ms: latency,
            info: { raw: data }
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 'offline',
        latency_ms: Date.now() - start,
        error: err.code === 'ECONNREFUSED' ? 'ML Microservice (port 8000) is unreachable.' : err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'offline',
        latency_ms: 2500,
        error: 'Connection timed out after 2500ms.'
      });
    });
  });
}

/**
 * Pings MySQL database connection and measures roundtrip response time.
 * @returns {Promise<{ status: string, latency_ms: number, error?: string }>}
 */
async function probeDbHealth() {
  const start = Date.now();
  try {
    await pool.query('SELECT 1 AS ping');
    return {
      status: 'online',
      latency_ms: Date.now() - start
    };
  } catch (err) {
    return {
      status: 'offline',
      latency_ms: Date.now() - start,
      error: err.message
    };
  }
}

/**
 * Platform Metrics & System Health
 * Route: GET /admin/stats
 */
async function getStats(req, res) {
  try {
    // 1. Gather platform aggregation metrics
    const stats = await AdminModel.getPlatformStats();

    // 2. Gather Node.js Process Health
    const uptimeSec = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = uptimeSec % 60;
    const mem = process.memoryUsage();

    const nodeHealth = {
      status: 'online',
      uptime_formatted: `${hours}h ${minutes}m ${seconds}s`,
      uptime_seconds: uptimeSec,
      memory_heap_used_mb: parseFloat((mem.heapUsed / 1024 / 1024).toFixed(1)),
      memory_heap_total_mb: parseFloat((mem.heapTotal / 1024 / 1024).toFixed(1)),
      node_version: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development'
    };

    // 3. Probe MySQL and Python ML Services in parallel
    const [dbHealth, mlHealth] = await Promise.all([
      probeDbHealth(),
      probeMlServiceHealth()
    ]);

    return res.json({
      success: true,
      stats,
      health: {
        node: nodeHealth,
        database: dbHealth,
        ml_service: mlHealth
      }
    });

  } catch (err) {
    console.error('[admin.getStats]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve administrative statistics.' });
  }
}

/**
 * List all registered users with their resume and analysis counts.
 * Supports search and role filtering.
 * Route: GET /admin/users
 */
async function getUsers(req, res) {
  try {
    const { search, role } = req.query;
    const users = await AdminModel.getUsersList({ search, role });
    return res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error('[admin.getUsers]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user accounts.' });
  }
}

/**
 * Promotes or demotes a user's role.
 * Route: PATCH /admin/users/:id/role
 */
async function updateRole(req, res) {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (!targetUserId || isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID provided.' });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be 'user' or 'admin'." });
    }

    // Safety check: Prevent admin from demoting their own active account
    if (targetUserId === req.session.userId && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Security protection: You cannot demote your own administrative account.'
      });
    }

    const updated = await AdminModel.updateUserRole(targetUserId, role);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: `User role successfully updated to '${role}'.`,
      userId: targetUserId,
      newRole: role
    });

  } catch (err) {
    console.error('[admin.updateRole]', err);
    return res.status(500).json({ success: false, message: 'Failed to update user role.' });
  }
}

/**
 * Deletes a user account and purges disk resumes.
 * Route: DELETE /admin/users/:id
 */
async function deleteUser(req, res) {
  try {
    const targetUserId = parseInt(req.params.id, 10);

    if (!targetUserId || isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID provided.' });
    }

    // Safety check: Prevent admin from deleting their own active account
    if (targetUserId === req.session.userId) {
      return res.status(403).json({
        success: false,
        message: 'Security protection: You cannot delete your own active administrative account.'
      });
    }

    const deleted = await AdminModel.deleteUser(targetUserId, UPLOADS_DIR);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: 'User account and associated documents successfully removed.'
    });

  } catch (err) {
    console.error('[admin.deleteUser]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete user account.' });
  }
}

/**
 * Unified global activity audit feed.
 * Route: GET /admin/activity
 */
async function getActivity(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const activity = await AdminModel.getRecentActivity(limit);
    return res.json({ success: true, count: activity.length, activity });
  } catch (err) {
    console.error('[admin.getActivity]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve activity feed.' });
  }
}

module.exports = {
  getStats,
  getUsers,
  updateRole,
  deleteUser,
  getActivity
};

// backend/server.js
// -------------------------------------------------------
// The main Express application entry point.
// Responsibilities:
//   1. Load environment variables from .env
//   2. Connect to MySQL (via db.js)
//   3. Set up security middleware (helmet, cors)
//   4. Set up session middleware (stored in MySQL)
//   5. Serve static frontend files
//   6. Mount route files
//   7. Global error handler
// -------------------------------------------------------
'use strict';

require('dotenv').config();           // Must be first!

const path           = require('path');
const express        = require('express');
const session        = require('express-session');
const MySQLStore     = require('express-mysql-session')(session);
const helmet         = require('helmet');
const cors           = require('cors');
const morgan         = require('morgan');

// -- DB pool (also runs connectivity test on import) --
const pool = require('./config/db');

// -- Route files --
const authRoutes = require('./routes/auth.routes');
const resumeRoutes = require('./routes/resume.routes');
const analysisRoutes = require('./routes/analysis.routes');
const careerRoutes = require('./routes/career.routes');
const adminRoutes = require('./routes/admin.routes');

// ── App Setup ─────────────────────────────────────────
const app  = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Security Headers ──────────────────────────────────
// helmet sets many HTTP headers that protect against
// common attacks (XSS, clickjacking, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "'unsafe-inline'"],
        styleSrc:   ["'self'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc:    ["'self'", "https://fonts.gstatic.com"],
        imgSrc:     ["'self'", "data:"],
      },
    },
  })
);

// ── CORS ──────────────────────────────────────────────
// Only allow requests from the same origin in production.
// Adjust origin if you deploy frontend separately.
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://your-production-domain.com'
    : true,
  credentials: true,    // needed for session cookies
}));

// ── Request Logging ───────────────────────────────────
// 'dev' format: coloured method + status + response time
app.use(morgan('dev'));

// ── Body Parsers ─────────────────────────────────────
app.use(express.json());                        // parse JSON bodies
app.use(express.urlencoded({ extended: true })); // parse HTML form bodies

// ── Session Store (MySQL) ─────────────────────────────
// Sessions are stored in the `sessions` table in MySQL.
// This means sessions survive server restarts.
const sessionStore = new MySQLStore({
  clearExpired:         true,
  checkExpirationInterval: 900000,  // cleanup every 15 min
  expiration:           86400000,   // session lives 24 hours
  createDatabaseTable:  true,       // auto-creates sessions table
}, pool);

app.use(session({
  key:               'resumeai.sid',          // cookie name
  secret:            process.env.SESSION_SECRET || 'fallback-dev-secret',
  store:             sessionStore,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                   // JS cannot read the cookie (XSS protection)
    secure:   process.env.NODE_ENV === 'production',  // HTTPS only in prod
    sameSite: 'lax',
    maxAge:   24 * 60 * 60 * 1000,  // 24 hours
  },
}));

// ── Static Files (Frontend) ───────────────────────────
// Serve everything inside ../frontend as static files.
// E.g. /css/main.css → frontend/css/main.css
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// ── API Routes ────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/resumes', resumeRoutes);
app.use('/analyses', analysisRoutes);
app.use('/career', careerRoutes);
app.use('/admin', adminRoutes);

// ── Health Check ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── 404 Fallback ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.url} not found.` });
});

// ── Global Error Handler ──────────────────────────────
// Express calls this when next(err) is called
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── Start Server ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  ResumeAI backend running → http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; // exported for tests

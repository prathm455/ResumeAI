// backend/config/db.js
// -------------------------------------------------------
// Creates and exports a MySQL2 connection POOL.
// A pool reuses connections instead of opening a new one
// for every request — much faster and more reliable.
// -------------------------------------------------------
'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'resumeai',
  waitForConnections: true,
  connectionLimit:    10,       // max 10 simultaneous DB connections
  queueLimit:         0,        // unlimited queuing
  charset:            'utf8mb4',
});

// Quick connectivity test on startup
pool.getConnection()
  .then(conn => {
    console.log('✅  MySQL connected — host:', process.env.DB_HOST);
    conn.release();
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message);
    process.exit(1);    // crash fast so you know immediately
  });

module.exports = pool;

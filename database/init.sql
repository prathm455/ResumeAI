-- ============================================================
-- ResumeAI — MySQL Database Migration Script
-- Run once to create the database and all tables.
-- Command:  mysql -u root -p < database/init.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS resumeai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE resumeai;

-- -------------------------------------------------------
-- Table: users
-- Stores registered users. Passwords are bcrypt hashes.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  full_name    VARCHAR(120)    NOT NULL,
  email        VARCHAR(191)    NOT NULL,
  password     VARCHAR(255)    NOT NULL,          -- bcrypt hash
  role         ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- Table: sessions
-- Stores express-session data in MySQL.
-- Created automatically by connect-mysql-session but
-- listed here for reference / documentation.
-- -------------------------------------------------------
-- (connect-mysql-session creates this table on startup)

-- -------------------------------------------------------
-- Table: resumes  (placeholder — populated in Phase 2)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumes (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED  NOT NULL,
  original_name  VARCHAR(255)  NOT NULL,
  stored_name    VARCHAR(255)  NOT NULL,  -- UUID filename on disk
  file_type      ENUM('pdf','docx') NOT NULL,
  file_size      INT UNSIGNED  NOT NULL,  -- bytes
  extracted_text LONGTEXT,
  uploaded_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_resumes_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- Table: analyses  (placeholder — populated in Phase 3)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS analyses (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  resume_id       INT UNSIGNED  NOT NULL,
  user_id         INT UNSIGNED  NOT NULL,
  job_description TEXT,
  match_score     DECIMAL(5,2),           -- e.g. 78.50
  matched_skills  JSON,
  missing_skills  JSON,
  predicted_role  VARCHAR(100),
  suggestions     JSON,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_analyses_resume
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  CONSTRAINT fk_analyses_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

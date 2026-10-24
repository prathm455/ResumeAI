# ResumeAI — AI-Powered Resume Analyzer & Career Assistant

[![Platform Status](https://img.shields.io/badge/Status-Complete-success.svg)](#)
[![Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20FastAPI%20%7C%20MySQL%20%7C%20Vanilla%20JS-blue.svg)](#)
[![AI/ML](https://img.shields.io/badge/ML-SentenceTransformers%20%7C%20TF--IDF-purple.svg)](#)

ResumeAI is an enterprise-grade, full-stack recruitment and career intelligence platform. It analyzes candidate resumes against job descriptions using hybrid AI (combining local lightweight algorithms with Python microservices powered by transformer models), generates ATS compatibility scores with deep skill gap analysis, crafts personalized fact-grounded cover letters, prepares interview questions, and provides real-time administrative telemetry and user governance.

---

## Architecture Overview

```
                                      +------------------------------------+
                                      |          Web Browser               |
                                      |  (Glassmorphic Vanilla JS / CSS)   |
                                      +-----------------+------------------+
                                                        |
                                                        v
+-------------------------------------------------------+-------------------------------------------------------+
|  Node.js / Express Core Backend (Port 3000)                                                                   |
|                                                                                                               |
|  - Auth & RBAC (JWT HttpOnly Cookies)                 - Document Parser (pdf-parse, mammoth)                  |
|  - ATS Scoring & Gap Engine (Local TF-IDF Fallback)   - Career Assistant Toolkit (Bullet, Cover Letter, Prep) |
|  - Platform Telemetry & System Health Probes          - User Governance & Audit Feed                          |
+---------------------------+---------------------------------------------------+-------------------------------+
                            |                                                   |
                            v                                                   v
           +---------------------------------+                 +---------------------------------+
           |      MySQL 8.0 Relational DB    |                 |   Python FastAPI ML Microservice|
           |           (Port 3306)           |                 |           (Port 8000)           |
           |                                 |                 |                                 |
           |  - Users & Roles                |                 |  - Sentence-Transformers        |
           |  - Resumes & Parsed Metadata    |                 |  - Semantic Cosine Similarity   |
           |  - ATS Analyses & Scores        |                 |  - Role Classification Vectors  |
           |  - Foreign-Key Cascades         |                 |  - Health & Telemetry Probes    |
           +---------------------------------+                 +---------------------------------+
```

---

## Key Features by Phase

### Phase 1: Authentication & Authorization Core
- Secure user registration, authentication, and session management using **JWT stored in HttpOnly cookies**.
- Role-Based Access Control (**RBAC**) separating `user` (candidate) and `admin` privileges.
- BCrypt password hashing, parameter validation, and rate-limiting.

### Phase 2: Resume Ingestion & Parsing Engine
- Multi-format ingestion supporting **PDF** (`pdf-parse`) and **DOCX** (`mammoth`) up to 5MB.
- Heuristic regex-based entity extraction for:
  - Personal contact info (Name, Email, Phone, LinkedIn, GitHub, Location).
  - Technical & Soft Skills matching a curated 200+ industry taxonomy across 12 domains.
  - Work Experience & Employment history.
  - Education, Degrees, and Institutions.

### Phase 3: Intelligent ATS Scoring & Gap Analysis
- Job Description vs Resume parsing with weighted multi-factor scoring:
  - **Skill Match Score** (40% weight): Core vs secondary keyword coverage.
  - **Semantic Relevance** (30% weight): Vector/text similarity.
  - **Experience & Impact** (15% weight): Quantifiable metrics and tenure alignment.
  - **Education Alignment** (15% weight): Degree and credential verification.
- Actionable gap feedback: Matched skills, missing required skills, and specific bullet-by-bullet optimization recommendations.

### Phase 4: Hybrid AI & Python ML Microservice
- FastAPI microservice running on port 8000 with endpoints for semantic embeddings (`all-MiniLM-L6-v2`) and role prediction.
- Resilient Node.js failover client (`ml-client.util.js`): If the Python service is unavailable or restarting, the platform automatically degrades gracefully to the local TF-IDF engine without interrupting user workflows.

### Phase 5: Career Assistant Toolkit
- **Bullet Point Enhancer:** Re-engineers resume achievements using the Google XYZ formula (*Accomplished [X] as measured by [Y], by doing [Z]*).
- **Smart Cover Letter Generator:** Adheres strictly to AI factual grounding guidelines:
  - Uses exact job titles and user-provided experience.
  - Prevents hallucinated metrics, unlisted skills, or fictional tenure.
  - Tailors tone (Modern, Professional, Enthusiastic, Executive).
- **Interview Preparation Coach:** Generates contextual behavioral (STAR technique) and technical interview questions based on the candidate's exact resume and target role.

### Phase 6: Admin Dashboard & Platform Analytics
- **Live Multi-Service Health Monitoring:** Real-time health beacons and latency probes for Node.js Express, MySQL InnoDB pool, and the Python FastAPI ML microservice.
- **Platform Telemetry:** Aggregate user metrics, document format distribution, ATS score distributions, and career role trends.
- **User Governance:** Full-text search, role filtering, role promotion/demotion, and cascading account deletion with disk file unlinking.
- **Self-Protection Guard:** Strict backend security preventing admins from accidentally demoting or deleting their own active session.
- **Global Activity Audit Stream:** Chronological feed tracking document uploads and analysis runs across the platform.

---

## Project Structure

```
ResumeAI/
├── backend/
│   ├── config/             # Database connection pool (mysql2)
│   ├── controllers/        # Express request handlers (auth, resumes, analyses, career, admin)
│   ├── middlewares/        # Auth guards (requireAuth, requireAdmin) and Multer upload
│   ├── models/             # MySQL data access layer
│   ├── routes/             # REST API routing
│   ├── uploads/            # Secure disk storage for ingested resumes
│   ├── utils/              # Parsers, ATS analyzer, ML microservice client
│   ├── .env                # Environment configuration
│   ├── package.json        # Node.js dependencies
│   └── server.js           # Main Express server entry point
│
├── ml-service/
│   ├── main.py             # FastAPI microservice
│   └── requirements.txt    # Python dependencies (fastapi, uvicorn, sentence-transformers)
│
├── database/
│   └── init.sql            # MySQL schema with tables, indices, and foreign keys
│
└── frontend/
    ├── css/
    │   ├── main.css        # Global CSS design tokens, typography, glassmorphism
    │   ├── auth.css        # Login and registration styles
    │   ├── dashboard.css   # Candidate dashboard styles
    │   └── admin.css       # Admin console and telemetry styling
    ├── js/
    │   ├── api.js          # Unified client-side API helper
    │   ├── auth.js         # Authentication page controller
    │   ├── dashboard.js    # Candidate dashboard controller
    │   ├── admin.js        # Admin console controller
    │   └── toast.js        # Notification toast manager
    ├── pages/
    │   ├── login.html      # Authentication portal (Sign In / Sign Up)
    │   ├── dashboard.html  # Candidate interactive dashboard
    │   └── admin.html      # Admin telemetry & user governance console
    └── index.html          # Public landing page
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.9 or higher (with `pip`)
- **MySQL Server**: v8.0 or higher running on port 3306

---

### 1. Database Setup
Ensure MySQL is running and execute the database initialization script:
```bash
mysql -u root -p < database/init.sql
```

---

### 2. Configure Backend Environment
Create or verify `backend/.env`:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=resumeai_db
DB_PORT=3306
JWT_SECRET=super_secret_jwt_key_resumeai_2026
JWT_EXPIRES_IN=7d
ML_SERVICE_URL=http://127.0.0.1:8000
```

---

### 3. Start Python FastAPI ML Microservice
```bash
cd ml-service
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
*The ML microservice will start on `http://127.0.0.1:8000`.*

---

### 4. Start Node.js Express Backend
In a new terminal:
```bash
cd backend
npm install
npm run dev
# or
node server.js
```
*The Express server will start on `http://localhost:3000`.*

---

### 5. Access the Platform
- **Public Landing Page**: `http://localhost:3000/`
- **Login / Register**: `http://localhost:3000/pages/login.html`
- **Candidate Dashboard**: `http://localhost:3000/pages/dashboard.html`
- **Admin Console**: `http://localhost:3000/pages/admin.html`

---

## Default Administrator Credentials

| Role | Email | Password |
|---|---|---|
| **Platform Administrator** | `admin@resumeai.com` | `xyz` |

*(Admins can manage user roles, delete accounts, view live server telemetry, and inspect the platform activity feed directly from `/pages/admin.html`.)*

---

## License
MIT License. Built for advanced AI-assisted talent evaluation and career development.

// frontend/js/api.js
// -------------------------------------------------------
// Unified client-side API helper
// -------------------------------------------------------

const API = {
  async register(fullName, email, password) {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ full_name: fullName, email, password })
    });
    return res.json();
  },

  async login(email, password) {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  async logout() {
    const res = await fetch('/auth/logout', {
      method: 'GET',
      credentials: 'same-origin'
    });
    return res.json();
  },

  async getMe() {
    const res = await fetch('/auth/me', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async me() {
    return this.getMe();
  },

  async checkHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async uploadResume(formData) {
    const res = await fetch('/resumes/upload', {
      method: 'POST',
      credentials: 'same-origin',
      body: formData
    });
    return res.json();
  },

  async getResumes() {
    const res = await fetch('/resumes', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async getResumeById(id) {
    const res = await fetch(`/resumes/${id}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async deleteResume(id) {
    const res = await fetch(`/resumes/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async runAnalysis(resumeId, jobDescription) {
    const res = await fetch('/analyses/run', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: resumeId, job_description: jobDescription })
    });
    return res.json();
  },

  async getAnalyses() {
    const res = await fetch('/analyses', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async getAnalysisById(id) {
    const res = await fetch(`/analyses/${id}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async deleteAnalysis(id) {
    const res = await fetch(`/analyses/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async getStatsSummary() {
    const res = await fetch('/analyses/stats/summary', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async generateCoverLetter(data) {
    const res = await fetch('/career/cover-letter', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async generateInterviewPrep(data) {
    const res = await fetch('/career/interview-prep', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ── Admin Telemetry & Governance Endpoints ───────────
  async getAdminStats() {
    const res = await fetch('/admin/stats', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async getAdminUsers(search = '', role = 'all') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role && role !== 'all') params.append('role', role);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/admin/users${qs}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async updateUserRole(userId, newRole) {
    const res = await fetch(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    return res.json();
  },

  async deleteUser(userId) {
    const res = await fetch(`/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async getAdminActivity(limit = 20) {
    const res = await fetch(`/admin/activity?limit=${limit}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  }
};

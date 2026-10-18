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
  }
};

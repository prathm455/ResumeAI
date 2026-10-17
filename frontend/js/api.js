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
  }
};

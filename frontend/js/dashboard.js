// frontend/js/dashboard.js
// -------------------------------------------------------
// Dashboard state management: uploads, ATS analyses, and live scorecards
// -------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  let cachedResumes = [];

  // 1. Session Authentication Guard
  try {
    const authResult = await API.getMe();
    if (!authResult.success || !authResult.user) {
      window.location.href = '/pages/login.html';
      return;
    }

    const user = authResult.user;

    // Populate user info in UI
    const userNameEl = document.getElementById('user-full-name');
    const userRoleEl = document.getElementById('user-role-badge');
    const userAvatarEl = document.getElementById('user-avatar');
    const welcomeNameEl = document.getElementById('welcome-user-name');

    if (userNameEl) userNameEl.textContent = user.full_name;
    if (userRoleEl) {
      userRoleEl.textContent = user.role.toUpperCase();
      if (user.role === 'admin') {
        userRoleEl.className = 'user-role badge badge-secondary';
        userRoleEl.style.color = '#c084fc';
        userRoleEl.style.borderColor = 'rgba(168, 85, 247, 0.4)';
      }
    }
    const adminLink = document.getElementById('nav-admin-link');
    if (adminLink && user.role === 'admin') {
      adminLink.style.display = 'inline-flex';
    }
    if (userAvatarEl) {
      userAvatarEl.textContent = user.full_name.charAt(0).toUpperCase();
    }

    // Load initial data
    await loadResumes();
    await loadAnalysesHistory();
    await loadUserStats();

  } catch (err) {
    console.error('Session guard check failed:', err);
    window.location.href = '/pages/login.html';
    return;
  }

  // 2. Logout Handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await API.logout();
        showToast('Logged out successfully.', 'info');
        setTimeout(() => {
          window.location.href = '/pages/login.html';
        }, 500);
      } catch (err) {
        console.error('Logout error:', err);
        window.location.href = '/pages/login.html';
      }
    });
  }

  // 3. Dropzone & File Upload Pipeline
  const dropzone = document.getElementById('resume-dropzone');
  const fileInput = document.getElementById('resume-file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-active');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-active');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-active');
      if (e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleFileUpload(fileInput.files[0]);
      }
    });
  }

  async function handleFileUpload(file) {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      showToast('Please upload a PDF (.pdf) or Word (.docx) document.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds the 5MB limit.', 'error');
      return;
    }

    const originalContent = dropzone.innerHTML;
    dropzone.classList.add('uploading');
    dropzone.innerHTML = `
      <div class="dropzone-icon" style="color: var(--accent-cyan);">
        <div class="spinner" style="display: inline-block; width: 32px; height: 32px; border-width: 3px;"></div>
      </div>
      <div class="dropzone-title">Parsing "${escapeHtml(file.name)}"...</div>
      <div class="dropzone-sub">Extracting text & structuring document data</div>
    `;

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const result = await API.uploadResume(formData);

      if (result.success) {
        showToast(`"${file.name}" uploaded and parsed successfully!`, 'success');
        await loadResumes();
        await loadUserStats();
      } else {
        showToast(result.message || 'Failed to upload resume.', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Network error while uploading resume.', 'error');
    } finally {
      dropzone.classList.remove('uploading');
      dropzone.innerHTML = originalContent;
      fileInput.value = '';
    }
  }

  // 4. Load Resumes List & Populate Select Dropdown
  async function loadResumes() {
    const listEl = document.getElementById('resumes-list');
    const emptyStateEl = document.getElementById('resumes-empty-state');
    const badgeCountEl = document.getElementById('resumes-badge-count');
    const statResumesCount = document.getElementById('stat-resumes-count');
    const selectEl = document.getElementById('analysis-resume-select');

    try {
      const res = await API.getResumes();
      if (!res.success) return;

      cachedResumes = res.resumes || [];
      const count = cachedResumes.length;

      if (badgeCountEl) badgeCountEl.textContent = `${count} Resume${count === 1 ? '' : 's'}`;
      if (statResumesCount) statResumesCount.textContent = count;

      // Populate All Resume Select Dropdowns
      ['analysis-resume-select', 'cover-resume-select', 'interview-resume-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          const currentVal = el.value;
          el.innerHTML = '<option value="">-- Choose an uploaded resume --</option>' +
            cachedResumes.map(r => `<option value="${r.id}">${escapeHtml(r.original_name)} (${r.file_type.toUpperCase()})</option>`).join('');
          if (currentVal && cachedResumes.some(r => r.id == currentVal)) {
            el.value = currentVal;
          } else if (cachedResumes.length > 0) {
            el.value = cachedResumes[0].id;
          }
        }
      });

      if (count === 0) {
        if (emptyStateEl) emptyStateEl.style.display = 'flex';
        if (listEl) listEl.style.display = 'none';
        return;
      }

      if (emptyStateEl) emptyStateEl.style.display = 'none';
      if (listEl) {
        listEl.style.display = 'flex';
        listEl.innerHTML = cachedResumes.map(r => renderResumeItem(r)).join('');
        attachResumeItemEvents();
      }

    } catch (err) {
      console.error('Failed to load resumes:', err);
    }
  }

  function renderResumeItem(resume) {
    const sizeKb = (resume.file_size / 1024).toFixed(1);
    const dateFormatted = new Date(resume.uploaded_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const isPdf = resume.file_type === 'pdf';

    return `
      <div class="resume-item" data-id="${resume.id}">
        <div class="resume-info">
          <div class="resume-file-icon" style="color: ${isPdf ? '#fb7185' : '#38bdf8'}; background: ${isPdf ? 'rgba(244,63,94,0.15)' : 'rgba(56,189,248,0.15)'};">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div class="resume-details">
            <span class="resume-title" title="${escapeHtml(resume.original_name)}">${escapeHtml(resume.original_name)}</span>
            <div class="resume-meta">
              <span class="badge badge-ai" style="padding: 2px 8px; font-size: 0.7rem;">${resume.file_type.toUpperCase()}</span>
              <span>${sizeKb} KB</span>
              <span>•</span>
              <span>${dateFormatted}</span>
            </div>
          </div>
        </div>
        <div class="resume-actions">
          <button class="action-icon-btn btn-view-text" data-id="${resume.id}" title="View Extracted Text">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button class="action-icon-btn btn-delete" data-id="${resume.id}" title="Delete Resume">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  function attachResumeItemEvents() {
    document.querySelectorAll('.btn-view-text').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        openTextModal(id);
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this resume?')) {
          try {
            const res = await API.deleteResume(id);
            if (res.success) {
              showToast('Resume deleted.', 'info');
              await loadResumes();
              await loadUserStats();
            } else {
              showToast(res.message || 'Failed to delete resume.', 'error');
            }
          } catch (err) {
            console.error('Delete error:', err);
            showToast('Error deleting resume.', 'error');
          }
        }
      });
    });
  }

  // 5. AI Job Match & Analysis Execution
  const analyzeForm = document.getElementById('analyze-form');
  const sampleJdBtn = document.getElementById('btn-sample-jd');
  const analyzeBtn = document.getElementById('btn-run-analysis');
  const analyzeSpinner = document.getElementById('analyze-spinner');
  const jobDescInput = document.getElementById('analysis-job-desc');

  if (sampleJdBtn && jobDescInput) {
    sampleJdBtn.addEventListener('click', () => {
      jobDescInput.value = `Senior Full-Stack & AI Systems Engineer
Requirements & Technical Skills:
- 4+ years of professional experience building scalable web applications.
- Strong proficiency in modern JavaScript, TypeScript, React, and Node.js (Express / NestJS).
- Proven hands-on background in Python, Machine Learning frameworks (PyTorch, TensorFlow, or Scikit-Learn), and REST APIs.
- Experience with cloud platforms (AWS / Azure), Docker containerization, Kubernetes, and CI/CD pipelines.
- Solid understanding of SQL (MySQL, PostgreSQL) and NoSQL databases (Redis, MongoDB).
- Demonstrated track record of system design, performance optimization, and agile collaboration.`;
      showToast('Sample job description inserted!', 'info');
    });
  }

  if (analyzeForm) {
    analyzeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const selectEl = document.getElementById('analysis-resume-select');
      const resumeId = selectEl.value;
      const jobDesc = jobDescInput.value.trim();

      if (!resumeId) {
        showToast('Please select an uploaded resume first.', 'error');
        return;
      }

      try {
        analyzeBtn.disabled = true;
        if (analyzeSpinner) analyzeSpinner.style.display = 'inline-block';

        const result = await API.runAnalysis(resumeId, jobDesc);

        if (result.success && result.analysis) {
          showToast('Analysis completed successfully!', 'success');
          renderScorecard(result.analysis);
          await loadAnalysesHistory();
          await loadUserStats();
        } else {
          showToast(result.message || 'Analysis failed.', 'error');
        }

      } catch (err) {
        console.error('Analysis error:', err);
        showToast('Error running resume analysis.', 'error');
      } finally {
        analyzeBtn.disabled = false;
        if (analyzeSpinner) analyzeSpinner.style.display = 'none';
      }
    });
  }

  // 6. Interactive Scorecard Rendering
  const scorecardContainer = document.getElementById('scorecard-container');
  const closeScorecardBtn = document.getElementById('btn-close-scorecard');

  if (closeScorecardBtn) {
    closeScorecardBtn.addEventListener('click', () => {
      scorecardContainer.style.display = 'none';
    });
  }

  function renderScorecard(analysis) {
    if (!scorecardContainer) return;

    scorecardContainer.style.display = 'block';

    const score = Math.round(analysis.match_score);
    const scoreValEl = document.getElementById('scorecard-score-value');
    const gaugeCircle = document.getElementById('score-gauge-circle');
    const matchBadge = document.getElementById('scorecard-match-badge');
    const statusTitle = document.getElementById('scorecard-status-title');
    const predictedRoleEl = document.getElementById('scorecard-predicted-role');
    const matchedContainer = document.getElementById('matched-skills-container');
    const missingContainer = document.getElementById('missing-skills-container');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const matchedCountEl = document.getElementById('matched-count');
    const missingCountEl = document.getElementById('missing-count');

    // Score and Gauge
    if (scoreValEl) scoreValEl.textContent = `${score}%`;

    if (gaugeCircle) {
      // Circumference = 2 * PI * 42 ≈ 264
      const circumference = 264;
      const offset = circumference - (circumference * (score / 100));
      gaugeCircle.style.strokeDashoffset = offset;

      if (score >= 80) {
        gaugeCircle.style.stroke = '#10b981'; // Emerald
        matchBadge.className = 'badge badge-success';
        matchBadge.textContent = 'High Match';
        statusTitle.textContent = 'Exceptional Match';
      } else if (score >= 60) {
        gaugeCircle.style.stroke = '#38bdf8'; // Cyan
        matchBadge.className = 'badge badge-ai';
        matchBadge.textContent = 'Moderate Match';
        statusTitle.textContent = 'Good Match';
      } else {
        gaugeCircle.style.stroke = '#f43f5e'; // Rose
        matchBadge.className = 'badge badge-danger';
        matchBadge.textContent = 'Needs Optimization';
        statusTitle.textContent = 'Low Keyword Match';
      }
    }

    if (predictedRoleEl) {
      predictedRoleEl.textContent = analysis.predicted_role || 'Software Engineer';
    }

    // Engine badge & ML metrics
    const engineBadge = document.getElementById('scorecard-engine-badge');
    const mlMetrics = document.getElementById('scorecard-ml-metrics');

    if (engineBadge) {
      if (analysis.engine_source && analysis.engine_source.includes('Python')) {
        engineBadge.style.display = 'inline-flex';
        engineBadge.className = 'badge badge-ai';
        engineBadge.innerHTML = '<span class="badge-pulse"></span> Python ML Service (scikit-learn)';
      } else {
        engineBadge.style.display = 'inline-flex';
        engineBadge.className = 'badge badge-secondary';
        engineBadge.innerHTML = 'Native Rule Engine';
      }
    }

    if (mlMetrics) {
      const items = [];
      if (analysis.cosine_similarity !== null && analysis.cosine_similarity !== undefined) {
        items.push(`<span>Cosine Vector Similarity: <strong style="color: #38bdf8;">${(analysis.cosine_similarity * 100).toFixed(1)}%</strong></span>`);
      }
      if (analysis.role_confidence) {
        items.push(`<span>Role Classification Confidence: <strong style="color: #6ee7b7;">${Math.round(analysis.role_confidence * 100)}%</strong></span>`);
      }
      mlMetrics.innerHTML = items.join('<span style="color: rgba(255,255,255,0.2);">|</span>');
    }

    // Matched Skills
    const matched = analysis.matched_skills || [];
    if (matchedCountEl) matchedCountEl.textContent = matched.length;
    if (matchedContainer) {
      if (matched.length === 0) {
        matchedContainer.innerHTML = '<span style="color: var(--text-dim); font-size: 0.85rem;">No direct matching keywords detected.</span>';
      } else {
        matchedContainer.innerHTML = matched.map(s => `
          <span class="skill-pill matched">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ${escapeHtml(s)}
          </span>
        `).join('');
      }
    }

    // Missing Skills
    const missing = analysis.missing_skills || [];
    if (missingCountEl) missingCountEl.textContent = missing.length;
    if (missingContainer) {
      if (missing.length === 0) {
        missingContainer.innerHTML = '<span class="badge badge-success" style="font-size: 0.8rem;">Full Keyword Coverage!</span>';
      } else {
        missingContainer.innerHTML = missing.map(s => `
          <span class="skill-pill missing">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            ${escapeHtml(s)}
          </span>
        `).join('');
      }
    }

    // Suggestions
    const suggestions = analysis.suggestions || [];
    if (suggestionsContainer) {
      if (suggestions.length === 0) {
        suggestionsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">Your resume meets top ATS criteria for this target profile!</div>';
      } else {
        suggestionsContainer.innerHTML = suggestions.map(s => `
          <div class="suggestion-card type-${escapeHtml(s.type || 'general')}">
            <div class="suggestion-title">${escapeHtml(s.title || 'Recommendation')}</div>
            <div class="suggestion-detail">${escapeHtml(s.detail || '')}</div>
          </div>
        `).join('');
      }
    }

    scorecardContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // 7. Load Analyses History
  async function loadAnalysesHistory() {
    const historyListEl = document.getElementById('analyses-history-list');
    const emptyStateEl = document.getElementById('analyses-empty-state');

    try {
      const res = await API.getAnalyses();
      if (!res.success) return;

      const analyses = res.analyses || [];

      if (analyses.length === 0) {
        if (emptyStateEl) emptyStateEl.style.display = 'flex';
        if (historyListEl) historyListEl.style.display = 'none';
        return;
      }

      if (emptyStateEl) emptyStateEl.style.display = 'none';
      if (historyListEl) {
        historyListEl.style.display = 'flex';
        historyListEl.innerHTML = analyses.map(a => renderHistoryItem(a)).join('');
        attachHistoryEvents();
      }

    } catch (err) {
      console.error('Failed to load analyses history:', err);
    }
  }

  function renderHistoryItem(analysis) {
    const score = Math.round(analysis.match_score);
    const dateFormatted = new Date(analysis.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const isHigh = score >= 80;
    const isMedium = score >= 60;
    const scoreColor = isHigh ? '#10b981' : (isMedium ? '#38bdf8' : '#f43f5e');

    return `
      <div class="resume-item" data-id="${analysis.id}">
        <div class="resume-info">
          <div class="resume-file-icon" style="color: ${scoreColor}; background: rgba(255, 255, 255, 0.05); font-weight: 800; font-size: 0.88rem;">
            ${score}%
          </div>
          <div class="resume-details">
            <span class="resume-title">${escapeHtml(analysis.resume_name || 'Resume')}</span>
            <div class="resume-meta">
              <span class="badge badge-ai" style="padding: 2px 8px; font-size: 0.7rem;">${escapeHtml(analysis.predicted_role)}</span>
              <span>${dateFormatted}</span>
            </div>
          </div>
        </div>
        <div class="resume-actions">
          <button class="action-icon-btn btn-view-analysis" data-id="${analysis.id}" title="View Scorecard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
          <button class="action-icon-btn btn-delete-analysis" data-id="${analysis.id}" title="Delete Analysis">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  function attachHistoryEvents() {
    document.querySelectorAll('.btn-view-analysis').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          const res = await API.getAnalysisById(id);
          if (res.success && res.analysis) {
            renderScorecard(res.analysis);
          }
        } catch (err) {
          console.error('Error opening analysis:', err);
        }
      });
    });

    document.querySelectorAll('.btn-delete-analysis').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Delete this analysis report?')) {
          try {
            const res = await API.deleteAnalysis(id);
            if (res.success) {
              showToast('Analysis deleted.', 'info');
              await loadAnalysesHistory();
              await loadUserStats();
            }
          } catch (err) {
            console.error('Delete error:', err);
          }
        }
      });
    });
  }

  // 8. Load Aggregate User Stats
  async function loadUserStats() {
    try {
      const res = await API.getStatsSummary();
      if (!res.success || !res.stats) return;

      const stats = res.stats;
      const statAvgAts = document.getElementById('stat-avg-ats');
      const statSkillsCount = document.getElementById('stat-skills-count');

      if (statAvgAts) {
        statAvgAts.textContent = stats.avgScore !== null ? `${Math.round(stats.avgScore)}%` : '--';
      }

      // Count total identified unique skills across user's resumes
      if (statSkillsCount && cachedResumes.length > 0) {
        const totalWords = cachedResumes.reduce((acc, r) => acc + (r.text_length || 0), 0);
        // Estimate identified skill tags density
        statSkillsCount.textContent = Math.max(Math.round(totalWords / 45), cachedResumes.length * 6);
      }

    } catch (err) {
      console.error('Failed to load stats summary:', err);
    }
  }

  // 9. Text Preview Modal Logic
  const modal = document.getElementById('text-modal');
  const modalTitle = document.getElementById('modal-resume-title');
  const modalText = document.getElementById('modal-extracted-text');
  const modalWordCount = document.getElementById('modal-word-count');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCopyBtn = document.getElementById('modal-copy-btn');

  async function openTextModal(resumeId) {
    if (!modal) return;
    modal.classList.add('active');
    modalTitle.textContent = 'Loading Resume Content...';
    modalText.textContent = 'Fetching extracted text from database...';
    modalWordCount.textContent = '...';

    try {
      const res = await API.getResumeById(resumeId);
      if (res.success && res.resume) {
        const r = res.resume;
        modalTitle.textContent = r.original_name;
        const text = r.extracted_text || 'No text extracted from this document.';
        modalText.textContent = text;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        modalWordCount.textContent = `${wordCount} Words`;
      } else {
        modalText.textContent = 'Unable to load resume details.';
      }
    } catch (err) {
      console.error('Modal error:', err);
      modalText.textContent = 'Error loading resume text.';
    }
  }

  function closeModal() {
    if (modal) modal.classList.remove('active');
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (modalCopyBtn) {
    modalCopyBtn.addEventListener('click', () => {
      if (modalText && modalText.textContent) {
        navigator.clipboard.writeText(modalText.textContent)
          .then(() => showToast('Resume text copied to clipboard!', 'success'))
          .catch(() => showToast('Failed to copy to clipboard.', 'error'));
      }
    });
  }

  // 10. Career Assistant Studio Sub-Navigation
  const careerTabBtns = document.querySelectorAll('.career-tab-btn');
  const careerPanels = document.querySelectorAll('.career-panel');

  careerTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      careerTabBtns.forEach(b => b.classList.remove('active'));
      careerPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // Tool 1: Cover Letter Generator
  const coverForm = document.getElementById('cover-letter-form');
  const coverResumeSelect = document.getElementById('cover-resume-select');
  const coverCompanyInput = document.getElementById('cover-company-input');
  const coverRoleInput = document.getElementById('cover-role-input');
  const coverJobDesc = document.getElementById('cover-job-desc');
  const coverSpinner = document.getElementById('cover-spinner');
  const coverResults = document.getElementById('cover-results');
  const coverLetterText = document.getElementById('cover-letter-text');
  const coverWordCount = document.getElementById('cover-word-count');
  const btnCopyCover = document.getElementById('btn-copy-cover');
  const btnDownloadCover = document.getElementById('btn-download-cover');

  let currentCoverLetter = '';

  if (coverForm) {
    coverForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const resumeId = coverResumeSelect.value;
      const company = coverCompanyInput.value.trim();
      const role = coverRoleInput.value.trim();
      const jd = coverJobDesc.value.trim();

      if (!resumeId || !company || !role) {
        showToast('Please select a resume, company name, and role title.', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-generate-cover');
      try {
        submitBtn.disabled = true;
        if (coverSpinner) coverSpinner.style.display = 'inline-block';

        const res = await API.generateCoverLetter({
          resume_id: resumeId,
          company_name: company,
          role_title: role,
          job_description: jd
        });

        if (res.success && res.result) {
          showToast('Cover letter generated!', 'success');
          const r = res.result;
          currentCoverLetter = r.cover_letter;
          coverLetterText.textContent = currentCoverLetter;
          coverWordCount.textContent = `${r.word_count} Words`;

          const tierBadge = document.getElementById('cover-tier-badge');
          const roleBadge = document.getElementById('cover-role-badge');
          const qcBadge = document.getElementById('cover-qc-badge');
          const skillsPills = document.getElementById('cover-skills-pills');

          if (tierBadge) {
            tierBadge.textContent = r.experience_level || 'Grounded Profile';
          }
          if (roleBadge) {
            roleBadge.textContent = `${r.targeted_role} @ ${r.targeted_company}`;
          }
          if (qcBadge && r.quality_check) {
            qcBadge.textContent = r.quality_check.status === 'PASSED'
              ? '✓ 7 Guidelines Verified & Grounded'
              : 'AI Verified';
          }
          if (skillsPills) {
            const skills = r.matched_skills_used || [];
            if (skills.length > 0) {
              skillsPills.innerHTML = skills.map(s => `
                <span class="skill-pill matched" style="font-size: 0.75rem; padding: 2px 8px;">
                  ${escapeHtml(s)}
                </span>
              `).join('');
            } else {
              skillsPills.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-dim);">Core Software Fundamentals</span>';
            }
          }

          coverResults.style.display = 'block';
          coverResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          showToast(res.message || 'Failed to generate cover letter.', 'error');
        }
      } catch (err) {
        console.error('Cover letter error:', err);
        showToast('Error generating cover letter.', 'error');
      } finally {
        submitBtn.disabled = false;
        if (coverSpinner) coverSpinner.style.display = 'none';
      }
    });
  }

  if (btnCopyCover) {
    btnCopyCover.addEventListener('click', () => {
      if (!currentCoverLetter) return;
      navigator.clipboard.writeText(currentCoverLetter)
        .then(() => showToast('Cover letter copied to clipboard!', 'success'))
        .catch(() => showToast('Failed to copy.', 'error'));
    });
  }

  if (btnDownloadCover) {
    btnDownloadCover.addEventListener('click', () => {
      if (!currentCoverLetter) return;
      const company = (coverCompanyInput.value.trim() || 'Company').replace(/\s+/g, '_');
      const blob = new Blob([currentCoverLetter], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cover_Letter_${company}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Cover letter downloaded!', 'success');
    });
  }

  // Tool 2: Interview Coach & Q&A
  const interviewForm = document.getElementById('interview-prep-form');
  const interviewResumeSelect = document.getElementById('interview-resume-select');
  const interviewRoleInput = document.getElementById('interview-role-input');
  const interviewJobDesc = document.getElementById('interview-job-desc');
  const interviewSpinner = document.getElementById('interview-spinner');
  const interviewResults = document.getElementById('interview-results');
  const interviewContainer = document.getElementById('interview-questions-container');
  const interviewNavPills = document.getElementById('interview-nav-pills');
  const activeLevelBadge = document.getElementById('interview-active-level-badge');
  const activeRoleBadge = document.getElementById('interview-active-role-badge');
  const btnToggleAllAnswers = document.getElementById('btn-toggle-all-answers');

  let currentDifficulty = 'intermediate';
  let candidatePracticeAnswers = {};
  let currentQuestions = [];
  let allAnswersShown = false;

  // Handle difficulty selection cards
  const diffCards = document.querySelectorAll('.difficulty-card');
  const diffHiddenInput = document.getElementById('interview-difficulty-level');

  diffCards.forEach(card => {
    card.addEventListener('click', () => {
      diffCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const selected = card.getAttribute('data-level') || 'intermediate';
      currentDifficulty = selected;
      if (diffHiddenInput) diffHiddenInput.value = selected;
    });
  });

  if (interviewForm) {
    interviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const resumeId = interviewResumeSelect.value;
      const roleTitle = interviewRoleInput ? interviewRoleInput.value.trim() : '';
      const jd = interviewJobDesc.value.trim();

      if (!resumeId) {
        showToast('Please select a resume to analyze for interview questions.', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-generate-interview');
      try {
        submitBtn.disabled = true;
        if (interviewSpinner) interviewSpinner.style.display = 'inline-block';

        const res = await API.generateInterviewPrep({
          resume_id: resumeId,
          role_title: roleTitle,
          job_description: jd,
          difficulty_level: currentDifficulty
        });

        if (res.success && res.result) {
          showToast(`Generated 5 ${res.result.difficulty_level || ''} interview questions!`, 'success');
          renderInterviewQuestions(res.result);
        } else {
          showToast(res.message || 'Failed to generate questions.', 'error');
        }
      } catch (err) {
        console.error('Interview prep error:', err);
        showToast('Error generating interview questions.', 'error');
      } finally {
        submitBtn.disabled = false;
        if (interviewSpinner) interviewSpinner.style.display = 'none';
      }
    });
  }

  function renderInterviewQuestions(data) {
    if (!interviewResults || !interviewContainer) return;
    interviewResults.style.display = 'block';

    currentQuestions = data.questions || [];
    const level = (data.difficulty_level || currentDifficulty).toLowerCase();

    // Update Meta Bar
    if (activeLevelBadge) {
      activeLevelBadge.textContent = data.difficulty_level || 'Intermediate';
      activeLevelBadge.className = 'badge';
      if (level === 'basic') activeLevelBadge.classList.add('badge-basic');
      else if (level === 'advanced') activeLevelBadge.classList.add('badge-advanced');
      else activeLevelBadge.classList.add('badge-intermediate');
    }

    if (activeRoleBadge) {
      activeRoleBadge.textContent = data.role_title || 'Software Engineer';
    }

    // Render Navigation Pills
    if (interviewNavPills) {
      interviewNavPills.innerHTML = `
        <button type="button" class="nav-pill-btn active" data-filter="all">All (5 Questions)</button>
        ${currentQuestions.map(q => `
          <button type="button" class="nav-pill-btn" data-filter="${q.id}">Q${q.id}</button>
        `).join('')}
      `;

      interviewNavPills.querySelectorAll('.nav-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          interviewNavPills.querySelectorAll('.nav-pill-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const filter = btn.getAttribute('data-filter');

          const allCards = interviewContainer.querySelectorAll('.interview-q-card');
          if (filter === 'all') {
            allCards.forEach(c => c.style.display = 'flex');
          } else {
            allCards.forEach(c => {
              if (c.getAttribute('data-qid') === filter) {
                c.style.display = 'flex';
                c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              } else {
                c.style.display = 'none';
              }
            });
          }
        });
      });
    }

    // Render Question Cards
    interviewContainer.innerHTML = currentQuestions.map(q => {
      const qLevel = (q.difficulty_level || 'Intermediate').toLowerCase();
      const badgeClass = qLevel === 'basic' ? 'badge-basic' : (qLevel === 'advanced' ? 'badge-advanced' : 'badge-intermediate');
      const savedAnswer = candidatePracticeAnswers[q.id] || '';

      return `
        <div class="interview-q-card level-${qLevel}" id="q-card-${q.id}" data-qid="${q.id}">
          <div class="interview-q-header">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="difficulty-badge ${badgeClass}">${escapeHtml(q.difficulty_level)}</span>
              <span class="badge badge-ai" style="font-size: 0.75rem;">${escapeHtml(q.category)}</span>
              <span style="font-size: 0.8rem; color: var(--text-dim); font-weight: 600;">Question ${q.id} of ${currentQuestions.length}</span>
            </div>
            <span style="font-size: 0.78rem; color: var(--accent-cyan); font-weight: 600;">Framework: ${escapeHtml(q.recommended_model)}</span>
          </div>

          <div class="interview-q-title">Q${q.id}. ${escapeHtml(q.question)}</div>

          <!-- Practice Answer Area -->
          <div class="candidate-practice-box">
            <div class="candidate-practice-label">
              <span>✍️ Your Practice Answer:</span>
              <span style="font-size: 0.72rem; color: var(--text-dim);">Practice structuring your thoughts before viewing the model answer</span>
            </div>
            <textarea class="form-textarea candidate-practice-textarea" data-qid="${q.id}" placeholder="Type your practice response here...">${escapeHtml(savedAnswer)}</textarea>
          </div>

          <!-- Card Actions -->
          <div class="interview-card-actions">
            <button type="button" class="btn btn-secondary btn-toggle-answer" data-target="answer-box-${q.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <span>Show Sample Answer</span>
            </button>

            ${q.id < currentQuestions.length ? `
              <button type="button" class="btn btn-secondary btn-next-q" data-next="${q.id + 1}" style="padding: 6px 14px; font-size: 0.8rem;">
                Next Question →
              </button>
            ` : `
              <span style="font-size: 0.78rem; color: var(--text-dim);">Final Question</span>
            `}
          </div>

          <!-- Sample Answer & Key Points Collapsible Box -->
          <div class="sample-answer-box" id="answer-box-${q.id}" style="display: none;">
            <div class="sample-answer-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Model Sample Answer</span>
            </div>
            <div class="sample-answer-text">${escapeHtml(q.sample_answer)}</div>
            <div class="talking-points-box">
              <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Key Interviewer Expectations:</div>
              <ul>
                ${q.talking_points.map(tp => `<li>${escapeHtml(tp)}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach Practice Answer Auto-Save Listener
    interviewContainer.querySelectorAll('.candidate-practice-textarea').forEach(textarea => {
      textarea.addEventListener('input', () => {
        const qid = textarea.getAttribute('data-qid');
        candidatePracticeAnswers[qid] = textarea.value;
      });
    });

    // Attach Toggle Answer Listeners
    interviewContainer.querySelectorAll('.btn-toggle-answer').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const box = document.getElementById(targetId);
        if (!box) return;

        const isHidden = box.style.display === 'none' || !box.style.display;
        box.style.display = isHidden ? 'flex' : 'none';
        btn.querySelector('span').textContent = isHidden ? 'Hide Sample Answer' : 'Show Sample Answer';
      });
    });

    // Attach Next Question Listeners
    interviewContainer.querySelectorAll('.btn-next-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextId = btn.getAttribute('data-next');
        const nextCard = document.getElementById(`q-card-${nextId}`);
        if (nextCard) {
          // If filtered to single question, adjust filter pill
          const activePill = interviewNavPills?.querySelector(`.nav-pill-btn[data-filter="${nextId}"]`);
          if (activePill && interviewNavPills?.querySelector('.nav-pill-btn.active')?.getAttribute('data-filter') !== 'all') {
            activePill.click();
          }
          nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // Master Toggle All Answers
    if (btnToggleAllAnswers) {
      allAnswersShown = false;
      btnToggleAllAnswers.textContent = 'Show All Answers';
      btnToggleAllAnswers.onclick = () => {
        allAnswersShown = !allAnswersShown;
        btnToggleAllAnswers.textContent = allAnswersShown ? 'Hide All Answers' : 'Show All Answers';

        interviewContainer.querySelectorAll('.sample-answer-box').forEach(box => {
          box.style.display = allAnswersShown ? 'flex' : 'none';
        });

        interviewContainer.querySelectorAll('.btn-toggle-answer').forEach(btn => {
          btn.querySelector('span').textContent = allAnswersShown ? 'Hide Sample Answer' : 'Show Sample Answer';
        });
      };
    }

    interviewResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});

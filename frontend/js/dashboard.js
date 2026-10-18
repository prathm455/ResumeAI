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
    if (welcomeNameEl) welcomeNameEl.textContent = user.full_name.split(' ')[0];
    if (userRoleEl) userRoleEl.textContent = user.role;
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

      // Populate Select Dropdown
      if (selectEl) {
        const currentVal = selectEl.value;
        selectEl.innerHTML = '<option value="">-- Choose an uploaded resume --</option>' +
          cachedResumes.map(r => `<option value="${r.id}">${escapeHtml(r.original_name)} (${r.file_type.toUpperCase()})</option>`).join('');
        if (currentVal && cachedResumes.some(r => r.id == currentVal)) {
          selectEl.value = currentVal;
        } else if (cachedResumes.length > 0) {
          selectEl.value = cachedResumes[0].id;
        }
      }

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

  // 5. Phase 3: AI Job Match & Analysis Execution
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

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});

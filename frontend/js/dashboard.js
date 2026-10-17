// frontend/js/dashboard.js
// -------------------------------------------------------
// Dashboard state management, resume uploads, and previews
// -------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
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

    // Load user's uploaded resumes
    await loadResumes();

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

    // Set dropzone to uploading state
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

  // 4. Load Resumes List
  async function loadResumes() {
    const listEl = document.getElementById('resumes-list');
    const emptyStateEl = document.getElementById('resumes-empty-state');
    const badgeCountEl = document.getElementById('resumes-badge-count');
    const statResumesCount = document.getElementById('stat-resumes-count');

    try {
      const res = await API.getResumes();
      if (!res.success) return;

      const resumes = res.resumes || [];
      const count = resumes.length;

      if (badgeCountEl) badgeCountEl.textContent = `${count} Resume${count === 1 ? '' : 's'}`;
      if (statResumesCount) statResumesCount.textContent = count;

      if (count === 0) {
        if (emptyStateEl) emptyStateEl.style.display = 'flex';
        if (listEl) listEl.style.display = 'none';
        return;
      }

      if (emptyStateEl) emptyStateEl.style.display = 'none';
      if (listEl) {
        listEl.style.display = 'flex';
        listEl.innerHTML = resumes.map(r => renderResumeItem(r)).join('');
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
    // View extracted text
    document.querySelectorAll('.btn-view-text').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        openTextModal(id);
      });
    });

    // Delete resume
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this resume?')) {
          try {
            const res = await API.deleteResume(id);
            if (res.success) {
              showToast('Resume deleted.', 'info');
              await loadResumes();
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

  // 5. Text Preview Modal Logic
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

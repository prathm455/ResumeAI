// frontend/js/dashboard.js
// -------------------------------------------------------
// Dashboard state management, session guard, and actions
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

  // 3. Dropzone interactions (Phase 2 preview)
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
        fileInput.files = e.dataTransfer.files;
        handleFileSelect(fileInput.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleFileSelect(fileInput.files[0]);
      }
    });
  }

  function handleFileSelect(file) {
    if (!file) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (!allowed.includes(file.type) && ext !== 'pdf' && ext !== 'docx') {
      showToast('Please upload a PDF (.pdf) or Word (.docx) document.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds the 5MB limit.', 'error');
      return;
    }

    showToast(`"${file.name}" selected! Ready for Phase 2 upload pipeline.`, 'success');
  }
});

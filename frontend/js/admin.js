// frontend/js/admin.js
// -------------------------------------------------------
// Admin Console & Platform Analytics Controller
// -------------------------------------------------------
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;
  let cachedUsers = [];
  let currentSearch = '';
  let currentRoleFilter = 'all';

  // 1. Session Guard Check (requireAuth + requireAdmin)
  try {
    const meRes = await API.me();
    if (!meRes.success || !meRes.user) {
      window.location.href = '/pages/login.html';
      return;
    }

    currentUser = meRes.user;

    // Strict client-side role guard
    if (currentUser.role !== 'admin') {
      showToast('Admin privilege required. Redirecting to Candidate Dashboard...', 'error');
      setTimeout(() => {
        window.location.href = '/pages/dashboard.html';
      }, 1200);
      return;
    }

    // Set user profile in header
    const adminNameEl = document.getElementById('admin-user-name');
    const adminAvatarEl = document.getElementById('admin-avatar');
    if (adminNameEl) adminNameEl.textContent = currentUser.full_name;
    if (adminAvatarEl) adminAvatarEl.textContent = currentUser.full_name.charAt(0).toUpperCase();

    // Initial Data Fetch
    await refreshTelemetry();

  } catch (err) {
    console.error('Admin session initialization error:', err);
    window.location.href = '/pages/login.html';
    return;
  }

  // 2. Refresh Telemetry & Platform Overview
  async function refreshTelemetry() {
    const refreshBtn = document.getElementById('btn-refresh-all');
    const spinner = document.getElementById('refresh-spinner');
    if (spinner) spinner.classList.add('spinning');

    try {
      await Promise.all([
        loadStatsAndHealth(),
        loadUsersTable(),
        loadActivityFeed()
      ]);
    } catch (err) {
      console.error('Error refreshing admin telemetry:', err);
      showToast('Failed to refresh some telemetry metrics.', 'error');
    } finally {
      if (spinner) spinner.classList.remove('spinning');
    }
  }

  // 3. Load Platform Stats & Service Health Probes
  async function loadStatsAndHealth() {
    const res = await API.getAdminStats();
    if (!res.success) {
      showToast(res.message || 'Error fetching telemetry.', 'error');
      return;
    }

    const { stats, health } = res;

    // A. Service Health Probes
    // 1. Node.js
    if (health.node) {
      const nodeBeacon = document.getElementById('status-node-beacon');
      const nodeText = document.getElementById('status-node-text');
      const nodeUptime = document.getElementById('metric-node-uptime');
      const nodeMem = document.getElementById('metric-node-memory');
      const nodeVer = document.getElementById('metric-node-version');

      if (nodeBeacon) nodeBeacon.className = 'status-indicator online';
      if (nodeText) nodeText.textContent = 'ONLINE';
      if (nodeUptime) nodeUptime.textContent = health.node.uptime_formatted;
      if (nodeMem) nodeMem.textContent = `${health.node.memory_heap_used_mb} MB / ${health.node.memory_heap_total_mb} MB`;
      if (nodeVer) nodeVer.textContent = `Node ${health.node.node_version} (${health.node.env})`;
    }

    // 2. MySQL Database
    if (health.database) {
      const dbBeacon = document.getElementById('status-db-beacon');
      const dbText = document.getElementById('status-db-text');
      const dbLatency = document.getElementById('metric-db-latency');

      if (health.database.status === 'online') {
        if (dbBeacon) dbBeacon.className = 'status-indicator online';
        if (dbText) dbText.textContent = 'CONNECTED';
        if (dbLatency) {
          dbLatency.textContent = `${health.database.latency_ms} ms`;
          dbLatency.style.color = health.database.latency_ms < 10 ? '#6ee7b7' : '#f59e0b';
        }
      } else {
        if (dbBeacon) dbBeacon.className = 'status-indicator offline';
        if (dbText) dbText.textContent = 'OFFLINE';
        if (dbLatency) dbLatency.textContent = 'Error';
      }
    }

    // 3. Python ML Microservice
    if (health.ml_service) {
      const mlBeacon = document.getElementById('status-ml-beacon');
      const mlText = document.getElementById('status-ml-text');
      const mlLatency = document.getElementById('metric-ml-latency');
      const mlModel = document.getElementById('metric-ml-model');

      if (health.ml_service.status === 'online') {
        if (mlBeacon) mlBeacon.className = 'status-indicator online';
        if (mlText) mlText.textContent = 'ONLINE';
        if (mlLatency) {
          mlLatency.textContent = `${health.ml_service.latency_ms} ms`;
          mlLatency.style.color = health.ml_service.latency_ms < 20 ? '#6ee7b7' : '#f59e0b';
        }
        if (mlModel && health.ml_service.info) {
          mlModel.textContent = health.ml_service.info.model || 'scikit-learn TF-IDF';
        }
      } else {
        if (mlBeacon) mlBeacon.className = 'status-indicator offline';
        if (mlText) mlText.textContent = 'OFFLINE';
        if (mlLatency) {
          mlLatency.textContent = 'Unreachable';
          mlLatency.style.color = '#fb7185';
        }
        if (mlModel) mlModel.textContent = 'Native Rule Fallback Active';
      }
    }

    // B. Platform Aggregated Stat Counters
    if (stats.users) {
      const totalUsersEl = document.getElementById('stat-total-users');
      const usersSubEl = document.getElementById('stat-users-sub');
      if (totalUsersEl) totalUsersEl.textContent = stats.users.total;
      if (usersSubEl) usersSubEl.textContent = `${stats.users.candidates} Candidates • ${stats.users.admins} Admins`;
    }

    if (stats.resumes) {
      const totalResumesEl = document.getElementById('stat-total-resumes');
      const resumesSubEl = document.getElementById('stat-resumes-sub');
      if (totalResumesEl) totalResumesEl.textContent = stats.resumes.total;
      if (resumesSubEl) resumesSubEl.textContent = `${stats.resumes.pdf} PDF Documents • ${stats.resumes.docx} DOCX`;
    }

    if (stats.analyses) {
      const totalAnalysesEl = document.getElementById('stat-total-analyses');
      const avgScoreEl = document.getElementById('stat-avg-score');
      const scoreRangeEl = document.getElementById('stat-score-range');

      if (totalAnalysesEl) totalAnalysesEl.textContent = stats.analyses.total;
      if (avgScoreEl) avgScoreEl.textContent = stats.analyses.total > 0 ? `${stats.analyses.avg_score}%` : '--%';
      if (scoreRangeEl) {
        scoreRangeEl.textContent = stats.analyses.total > 0
          ? `Min: ${stats.analyses.min_score}% • Max: ${stats.analyses.max_score}%`
          : 'No analyses recorded yet';
      }
    }

    // C. Visual Distribution Breakdown
    renderRolesDistribution(stats.top_roles || [], stats.analyses ? stats.analyses.total : 0);
    renderFormatBreakdown(stats.resumes || {});
  }

  // 4. Render Career Roles Distribution Bars
  function renderRolesDistribution(roles, totalAnalyses) {
    const container = document.getElementById('roles-distribution-container');
    if (!container) return;

    if (!roles || roles.length === 0 || totalAnalyses === 0) {
      container.innerHTML = '<div style="color: var(--text-dim); font-size: 0.88rem; padding: 24px; text-align: center;">No role classifications recorded yet.</div>';
      return;
    }

    const maxCount = Math.max(...roles.map(r => r.count), 1);

    container.innerHTML = roles.map(r => {
      const percentage = Math.round((r.count / totalAnalyses) * 100);
      const widthPct = Math.round((r.count / maxCount) * 100);

      return `
        <div class="role-bar-item">
          <div class="role-bar-meta">
            <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(r.role)}</span>
            <span style="color: var(--text-dim);">${r.count} candidates (${percentage}%)</span>
          </div>
          <div class="role-bar-track">
            <div class="role-bar-fill" style="width: ${widthPct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 5. Render Document Format Breakdown
  function renderFormatBreakdown(resumes) {
    const container = document.getElementById('format-breakdown-container');
    if (!container) return;

    const total = resumes.total || 0;
    const pdfCount = resumes.pdf || 0;
    const docxCount = resumes.docx || 0;

    const pdfPct = total > 0 ? Math.round((pdfCount / total) * 100) : 0;
    const docxPct = total > 0 ? Math.round((docxCount / total) * 100) : 0;

    container.innerHTML = `
      <div class="format-donut-wrap">
        <div class="format-stat-pill">
          <div style="width: 12px; height: 12px; border-radius: 3px; background: #38bdf8;"></div>
          <div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #fff;">${pdfCount}</div>
            <div style="font-size: 0.78rem; color: var(--text-dim);">PDF Format (${pdfPct}%)</div>
          </div>
        </div>
        <div class="format-stat-pill">
          <div style="width: 12px; height: 12px; border-radius: 3px; background: #6ee7b7;"></div>
          <div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #fff;">${docxCount}</div>
            <div style="font-size: 0.78rem; color: var(--text-dim);">DOCX Format (${docxPct}%)</div>
          </div>
        </div>
      </div>
      <div style="margin-top: 14px; font-size: 0.82rem; color: var(--text-dim); text-align: center;">
        Parsed with native pdf-parse & mammoth extractors in Node.js
      </div>
    `;
  }

  // 6. Load & Render User Accounts Management Table
  async function loadUsersTable() {
    const tableBody = document.getElementById('users-table-body');
    const usersCountBadge = document.getElementById('users-count-badge');
    if (!tableBody) return;

    try {
      const res = await API.getAdminUsers(currentSearch, currentRoleFilter);
      if (!res.success) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #fb7185; padding: 24px;">${escapeHtml(res.message || 'Error loading users.')}</td></tr>`;
        return;
      }

      cachedUsers = res.users || [];
      if (usersCountBadge) usersCountBadge.textContent = `${cachedUsers.length} User${cachedUsers.length === 1 ? '' : 's'}`;

      if (cachedUsers.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-dim); padding: 32px;">
              No users found matching "${escapeHtml(currentSearch || currentRoleFilter)}".
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = cachedUsers.map(u => renderUserRow(u)).join('');
      attachUserActionHandlers();

    } catch (err) {
      console.error('Error loading users table:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #fb7185; padding: 24px;">Failed to fetch users list.</td></tr>`;
    }
  }

  function renderUserRow(user) {
    const isSelf = currentUser && currentUser.id === user.id;
    const initial = (user.full_name || 'U').charAt(0).toUpperCase();
    const dateFormatted = new Date(user.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const isRoleAdmin = user.role === 'admin';
    const rolePillClass = isRoleAdmin ? 'role-pill admin' : 'role-pill candidate';
    const roleText = isRoleAdmin ? 'ADMIN' : 'CANDIDATE';

    // Role toggle text
    const nextRole = isRoleAdmin ? 'user' : 'admin';
    const toggleRoleLabel = isRoleAdmin ? 'Demote to Candidate' : 'Promote to Admin';
    const toggleRoleBtnClass = isRoleAdmin ? 'btn btn-secondary' : 'btn btn-primary';

    return `
      <tr data-user-id="${user.id}">
        <td>
          <div class="user-cell">
            <div class="user-cell-avatar">${escapeHtml(initial)}</div>
            <div class="user-cell-meta">
              <span class="user-cell-name">
                ${escapeHtml(user.full_name)}
                ${isSelf ? '<span class="badge badge-secondary" style="font-size: 0.68rem; margin-left: 6px;">You</span>' : ''}
              </span>
              <span class="user-cell-email">${escapeHtml(user.email)}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="${rolePillClass}">${roleText}</span>
        </td>
        <td>
          <span class="badge badge-secondary" style="font-size: 0.78rem;">${user.resume_count} Resumes</span>
        </td>
        <td>
          <span class="badge badge-ai" style="font-size: 0.78rem;">${user.analysis_count} Analyses</span>
        </td>
        <td style="color: var(--text-dim); font-size: 0.82rem;">
          ${dateFormatted}
        </td>
        <td>
          <div class="actions-cell">
            ${isSelf ? `
              <span style="font-size: 0.78rem; color: var(--text-dim); font-style: italic;">Active Session</span>
            ` : `
              <button type="button" class="${toggleRoleBtnClass} btn-toggle-role" 
                data-id="${user.id}" 
                data-name="${escapeHtml(user.full_name)}" 
                data-current-role="${user.role}" 
                data-next-role="${nextRole}"
                style="padding: 5px 12px; font-size: 0.78rem;">
                ${toggleRoleLabel}
              </button>
              <button type="button" class="action-icon-btn btn-delete-user" 
                data-id="${user.id}" 
                data-name="${escapeHtml(user.full_name)}"
                title="Delete User Account" 
                style="color: #fb7185;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }

  function attachUserActionHandlers() {
    // Role change buttons
    document.querySelectorAll('.btn-toggle-role').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const nextRole = btn.getAttribute('data-next-role');

        const actionText = nextRole === 'admin' ? 'promote' : 'demote';
        showConfirmModal({
          title: `Confirm Role Change`,
          message: `Are you sure you want to ${actionText} <strong>${escapeHtml(name)}</strong> to <strong>${nextRole.toUpperCase()}</strong>?`,
          actionLabel: `Yes, ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
          onConfirm: async () => {
            try {
              const res = await API.updateUserRole(userId, nextRole);
              if (res.success) {
                showToast(`Role updated for ${name}.`, 'success');
                await loadUsersTable();
                await loadStatsAndHealth();
              } else {
                showToast(res.message || 'Failed to update role.', 'error');
              }
            } catch (err) {
              console.error('Update role error:', err);
              showToast('Error changing user role.', 'error');
            }
          }
        });
      });
    });

    // Delete user buttons
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');

        showConfirmModal({
          title: `Delete User Account`,
          message: `Are you sure you want to permanently delete <strong>${escapeHtml(name)}</strong>? All associated resumes, uploaded files, and ATS analysis history will be permanently erased.`,
          actionLabel: `Delete Account`,
          isDestructive: true,
          onConfirm: async () => {
            try {
              const res = await API.deleteUser(userId);
              if (res.success) {
                showToast(`User account deleted.`, 'info');
                await loadUsersTable();
                await loadStatsAndHealth();
                await loadActivityFeed();
              } else {
                showToast(res.message || 'Failed to delete user.', 'error');
              }
            } catch (err) {
              console.error('Delete user error:', err);
              showToast('Error deleting user account.', 'error');
            }
          }
        });
      });
    });
  }

  // 7. Search & Filter Event Listeners
  const searchInput = document.getElementById('user-search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentSearch = searchInput.value.trim();
        loadUsersTable();
      }, 300);
    });
  }

  const roleFilterBtns = document.querySelectorAll('.role-filter-btn');
  roleFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      roleFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRoleFilter = btn.getAttribute('data-role');
      loadUsersTable();
    });
  });

  // 8. Global Activity Feed Stream
  async function loadActivityFeed() {
    const container = document.getElementById('activity-feed-container');
    if (!container) return;

    try {
      const res = await API.getAdminActivity(15);
      if (!res.success) {
        container.innerHTML = `<div style="color: #fb7185; text-align: center; padding: 20px;">Failed to load activity log.</div>`;
        return;
      }

      const activities = res.activity || [];
      if (activities.length === 0) {
        container.innerHTML = `<div style="color: var(--text-dim); text-align: center; padding: 24px;">No platform events recorded yet.</div>`;
        return;
      }

      container.innerHTML = activities.map(a => {
        const isUpload = a.type === 'resume_upload';
        const iconPill = isUpload
          ? `<div class="activity-icon-pill upload">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
             </div>`
          : `<div class="activity-icon-pill analysis">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
             </div>`;

        const actionDescription = isUpload
          ? `Uploaded document: <strong>${escapeHtml(a.title)}</strong> (${escapeHtml(a.meta || 'file').toUpperCase()})`
          : `Generated ATS analysis for <strong>${escapeHtml(a.title)}</strong> (${escapeHtml(a.meta || '')})`;

        const timeFormatted = formatTimeAgo(new Date(a.timestamp));

        return `
          <div class="activity-item">
            <div class="activity-main">
              ${iconPill}
              <div class="activity-details">
                <span class="activity-title">${actionDescription}</span>
                <span class="activity-user">by ${escapeHtml(a.user_name || 'Candidate')} (${escapeHtml(a.user_email || '')})</span>
              </div>
            </div>
            <span class="activity-time">${timeFormatted}</span>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error('Error fetching activity:', err);
      container.innerHTML = `<div style="color: #fb7185; text-align: center; padding: 20px;">Error loading activity feed.</div>`;
    }
  }

  // 9. Confirm Modal Implementation
  const confirmModal = document.getElementById('confirm-modal');
  const confirmTitle = document.getElementById('confirm-modal-title');
  const confirmMessage = document.getElementById('confirm-modal-message');
  const confirmActionBtn = document.getElementById('confirm-modal-action-btn');
  const confirmCancelBtn = document.getElementById('confirm-modal-cancel');
  const confirmCloseBtn = document.getElementById('confirm-modal-close');

  let activeConfirmAction = null;

  function showConfirmModal({ title, message, actionLabel = 'Confirm', isDestructive = false, onConfirm }) {
    if (!confirmModal) return;
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.innerHTML = message;
    if (confirmActionBtn) {
      confirmActionBtn.textContent = actionLabel;
      confirmActionBtn.className = isDestructive ? 'btn btn-primary' : 'btn btn-primary';
      if (isDestructive) {
        confirmActionBtn.style.background = '#ef4444';
      } else {
        confirmActionBtn.style.background = '';
      }
    }

    activeConfirmAction = onConfirm;
    confirmModal.classList.add('active');
  }

  function closeConfirmModal() {
    if (confirmModal) confirmModal.classList.remove('active');
    activeConfirmAction = null;
  }

  if (confirmCloseBtn) confirmCloseBtn.addEventListener('click', closeConfirmModal);
  if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', closeConfirmModal);
  if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) closeConfirmModal();
    });
  }

  if (confirmActionBtn) {
    confirmActionBtn.addEventListener('click', async () => {
      if (typeof activeConfirmAction === 'function') {
        const action = activeConfirmAction;
        closeConfirmModal();
        await action();
      }
    });
  }

  // 10. Global Event Handlers
  const refreshAllBtn = document.getElementById('btn-refresh-all');
  if (refreshAllBtn) {
    refreshAllBtn.addEventListener('click', refreshTelemetry);
  }

  const refreshFeedBtn = document.getElementById('btn-refresh-feed');
  if (refreshFeedBtn) {
    refreshFeedBtn.addEventListener('click', async () => {
      showToast('Refreshing activity feed...', 'info');
      await loadActivityFeed();
    });
  }

  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await API.logout();
        showToast('Logged out of admin console.', 'info');
        setTimeout(() => {
          window.location.href = '/pages/login.html';
        }, 500);
      } catch (err) {
        console.error('Logout error:', err);
      }
    });
  }

  // Helper Utilities
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
});

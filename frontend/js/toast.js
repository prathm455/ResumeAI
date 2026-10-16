// frontend/js/toast.js
// -------------------------------------------------------
// Global modern toast notification system
// -------------------------------------------------------

function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  const icon = document.createElement('span');
  icon.style.fontWeight = 'bold';
  icon.style.fontSize = '1.1rem';
  icon.textContent = iconMap[type] || 'ℹ';

  const text = document.createElement('span');
  text.textContent = message;
  text.style.flex = '1';

  toast.appendChild(icon);
  toast.appendChild(text);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// utils.js - Utility functions

// HTML escaping
export function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Format text with @mentions highlighted
export function formatMentions(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/@(jimmy|kenny)/gi, '<span class="mention">@$1</span>');
}

// Toast notifications
export function showToast(type, title, message, duration = 5000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'error' ? '⚠️' : '✓';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// Custom confirm modal
let confirmCallback = null;

export function showConfirm(message, onConfirm) {
  const confirmModal = document.getElementById('confirm-modal');
  const confirmMessage = document.getElementById('confirm-message');
  confirmMessage.textContent = message;
  confirmCallback = onConfirm;
  confirmModal.classList.add('active');
}

export function hideConfirm() {
  const confirmModal = document.getElementById('confirm-modal');
  confirmModal.classList.remove('active');
  confirmCallback = null;
}

export function getConfirmCallback() {
  return confirmCallback;
}

export function initConfirmModal() {
  const confirmModal = document.getElementById('confirm-modal');
  const confirmCancel = document.getElementById('confirm-cancel');
  const confirmOk = document.getElementById('confirm-ok');
  
  confirmCancel.addEventListener('click', hideConfirm);
  confirmOk.addEventListener('click', () => {
    const cb = getConfirmCallback();
    if (cb) cb();
    hideConfirm();
  });
  
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) hideConfirm();
  });
}

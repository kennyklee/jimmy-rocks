// theme.js - Theme handling

const themeOrder = ['dark', 'light', 'system'];
const themeIcons = { dark: '🌙', light: '☀️', system: '💻' };

export function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  setTheme(saved);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', cycleTheme);
  }
}

export function cycleTheme() {
  const current = localStorage.getItem('theme') || 'dark';
  const idx = themeOrder.indexOf(current);
  const next = themeOrder[(idx + 1) % themeOrder.length];
  setTheme(next);
}

export function setTheme(theme) {
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = themeIcons[theme];
    btn.title = theme.charAt(0).toUpperCase() + theme.slice(1) + ' mode';
  }
}

// Initialize theme immediately to prevent flash
(function() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

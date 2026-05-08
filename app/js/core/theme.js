import { readTheme } from './storage.js';

export function initTheme() {
  const s = readTheme('dark');
  document.body.dataset.theme = s;
  updateThemeIcon(s);
}

export function updateThemeIcon(theme) {
  const b = document.getElementById('themeBtn');
  if (!b) return;
  const i = b.querySelector('i');
  if (i) i.className = theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
}

export function apexTheme() {
  return { mode: document.body.dataset.theme === 'dark' ? 'dark' : 'light' };
}

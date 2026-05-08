import { t, curLang } from './core/i18n.js';

export function moveNavSlider(activeEl) {
  const slider = document.getElementById('navSlider');
  const nav = document.getElementById('sidebarNav');
  if (!slider || !activeEl || !nav) return;
  const items = Array.from(document.querySelectorAll('#sidebarNav .nav-item'));
  if (items.indexOf(activeEl) < 0) return;
  const navRect = nav.getBoundingClientRect();
  const itemRect = activeEl.getBoundingClientRect();
  const top = itemRect.top - navRect.top;
  const h = itemRect.height;
  slider.style.transform = `translateY(${top}px)`;
  slider.style.height = `${h}px`;
  slider.style.opacity = '1';
}

export function initNavSlider() {
  const activeNav = document.querySelector('.nav-item.active');
  if (activeNav) moveNavSlider(activeNav);
}

export function updateLastUp() {
  const nodes = document.querySelectorAll('[data-last-up]');
  if (!nodes.length) return;
  const loc = curLang === 'zh' ? 'zh-CN' : 'en-US';
  const text =
    t('updated') +
    new Date().toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  nodes.forEach((el) => {
    el.textContent = text;
  });
}

import { writePage } from './core/storage.js';
import { moveNavSlider } from './shell.js';
import { bindNavigate } from './navigate.js';
import { loadOverview } from './pages/overview.js';
import { syncBacktestForm } from './pages/backtest.js';
import { loadSpotPage } from './pages/spot.js';
import { loadSaved } from './pages/saved.js';
import { loadSettingsPage } from './pages/settings.js';
import { flushHoldingsPersistNow, loadHoldings } from './pages/holdings.js';
import { initCalcPage } from './pages/calc.js';

export function switchPage(pageId) {
  if (pageId === 'calc') pageId = 'overview';
  const leavingHoldings =
    document.querySelector('.page.active')?.id === 'page-holdings' && pageId !== 'holdings';
  if (leavingHoldings) void flushHoldingsPersistNow();

  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + pageId);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navEl) navEl.classList.add('active');
  moveNavSlider(navEl);
  writePage(pageId);
  if (pageId === 'overview') {
    loadOverview();
    initCalcPage();
  }
  if (pageId === 'spot') loadSpotPage();
  if (pageId === 'strategy') {
    loadSettingsPage();
    loadSaved();
  }
  if (pageId === 'backtest') syncBacktestForm();
  if (pageId === 'holdings') void loadHoldings();
}

bindNavigate(switchPage);

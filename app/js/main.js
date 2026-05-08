import { notyf } from './core/notyf.js';
import { initTheme } from './core/theme.js';
import { applyI18n } from './core/i18n.js';
import { readPage } from './core/storage.js';
import { hideLoading } from './core/loading.js';
import { initNavSlider, updateLastUp } from './shell.js';
import { switchPage } from './router.js';
import { doCalculate, fillFromSpot, refreshOverviewLastPrice } from './pages/overview.js';

console.log('Kanvas initializing...');

try {
  initTheme();
  console.log('Theme initialized');
  
  applyI18n();
  console.log('i18n applied');
  
  updateLastUp();
  console.log('Last updated');
  
  const page = readPage('overview');
  console.log('Page:', page);
  
  switchPage(page);
  console.log('Page switched');
  
  hideLoading();
  console.log('Loading hidden');
  
  setTimeout(initNavSlider, 300);
  console.log('Nav slider scheduled');
  
  window.switchPage = switchPage;
  window.doCalculate = doCalculate;
  window.fillFromSpot = fillFromSpot;
  window.refreshOverviewLastPrice = refreshOverviewLastPrice;
  console.log('Global functions bound');
  
  console.log('Kanvas initialized successfully!');
} catch (error) {
  console.error('Kanvas init error:', error);
  notyf.error('初始化失败: ' + error.message);
}

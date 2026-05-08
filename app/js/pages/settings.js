import { api } from '../core/api.js';
import { notyf } from '../core/notyf.js';
import { t, curLang } from '../core/i18n.js';
import { getSettingsSnapshot, setSettingsSnapshot } from '../state.js';
import { updateLastUp } from '../shell.js';
import { loadOverview } from './overview.js';

function cloneCfg(c) {
  return JSON.parse(JSON.stringify(c || {}));
}

function settingsErr(zh, en) {
  return curLang === 'zh' ? zh : en;
}

export function renderSettingsTpRows(levels) {
  const wrap = document.getElementById('tpLevelsWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const arr = Array.isArray(levels) && levels.length ? levels : [{ profit: 10, sell_percent: 20 }];
  arr.forEach((lev, idx) => {
    const row = document.createElement('div');
    row.className = 'settings-tp-row';
    row.innerHTML = `
      <span class="settings-tp-badge">${idx + 1}</span>
      <div class="settings-tp-fields">
        <div class="filter-group">
          <label>${t('stTpProfit')}</label>
          <input type="number" class="filter-input st-tp-profit" step="any" value="${lev.profit ?? ''}">
        </div>
        <div class="filter-group">
          <label>${t('stTpSell')}</label>
          <input type="number" class="filter-input st-tp-sell" step="any" value="${lev.sell_percent ?? ''}">
        </div>
        <button type="button" class="btn settings-tp-del" onclick="removeSettingsTpRow(this)">${t('del')}</button>
      </div>`;
    wrap.appendChild(row);
  });
}

export function addSettingsTpRow() {
  const wrap = document.getElementById('tpLevelsWrap');
  if (!wrap) return;
  const row = document.createElement('div');
  row.className = 'settings-tp-row';
  const n = wrap.children.length + 1;
  row.innerHTML = `
    <span class="settings-tp-badge">${n}</span>
    <div class="settings-tp-fields">
      <div class="filter-group">
        <label>${t('stTpProfit')}</label>
        <input type="number" class="filter-input st-tp-profit" step="any" value="10">
      </div>
      <div class="filter-group">
        <label>${t('stTpSell')}</label>
        <input type="number" class="filter-input st-tp-sell" step="any" value="20">
      </div>
      <button type="button" class="btn settings-tp-del" onclick="removeSettingsTpRow(this)">${t('del')}</button>
    </div>`;
  wrap.appendChild(row);
  syncTpSectionsEnabledState();
}

export function removeSettingsTpRow(btn) {
  const wrap = document.getElementById('tpLevelsWrap');
  if (!wrap || wrap.children.length <= 1) {
    notyf.error(settingsErr('至少保留一行止盈档位', 'Keep at least one tier'));
    return;
  }
  const row = btn.closest('.settings-tp-row');
  if (row) row.remove();
  wrap.querySelectorAll('.settings-tp-badge').forEach((el, i) => {
    el.textContent = String(i + 1);
  });
  syncTpSectionsEnabledState();
}

let _tpEnableBound = false;

/** 根据勾选状态禁用分档/回撤子区域；配置仍会保存，回测按此处启用项模拟卖出。 */
export function syncTpSectionsEnabledState() {
  const elL = document.getElementById('stTpLevelsEnabled');
  const elP = document.getElementById('stTpPullbackEnabled');
  const lOn = elL ? elL.checked : true;
  const pOn = elP ? elP.checked : true;
  document.getElementById('tpLevelsBlock')?.classList.toggle('settings-tp-block-off', !lOn);
  document.getElementById('tpPullbackBlock')?.classList.toggle('settings-tp-block-off', !pOn);
  document.querySelectorAll('#tpLevelsBlock input, #tpLevelsBlock button').forEach((node) => {
    node.disabled = !lOn;
  });
  document.querySelectorAll('#stTpPbPct, #stTpPbSell').forEach((node) => {
    node.disabled = !pOn;
  });
}

function bindTpEnableTogglesOnce() {
  if (_tpEnableBound) return;
  _tpEnableBound = true;
  document.getElementById('stTpLevelsEnabled')?.addEventListener('change', syncTpSectionsEnabledState);
  document.getElementById('stTpPullbackEnabled')?.addEventListener('change', syncTpSectionsEnabledState);
}

function collectSettingsTakeProfitFromDom() {
  const rows = document.querySelectorAll('#tpLevelsWrap .settings-tp-row');
  const levels = [];
  for (const row of rows) {
    const p = parseFloat(row.querySelector('.st-tp-profit')?.value);
    const s = parseFloat(row.querySelector('.st-tp-sell')?.value);
    if (Number.isNaN(p) || Number.isNaN(s)) {
      throw new Error(settingsErr('止盈档位含有无效数字', 'Invalid number in take-profit row'));
    }
    if (p < 0 || s < 0 || s > 100) {
      throw new Error(settingsErr('止盈：浮盈≥0，卖出比例 0～100', 'TP: profit ≥ 0, sell 0–100'));
    }
    levels.push({ profit: p, sell_percent: s });
  }
  const pbPct = parseFloat(document.getElementById('stTpPbPct')?.value);
  const pbSell = parseFloat(document.getElementById('stTpPbSell')?.value);
  if (Number.isNaN(pbPct) || Number.isNaN(pbSell)) {
    throw new Error(settingsErr('回撤卖出含有无效数字', 'Invalid pullback number'));
  }
  if (pbPct < 0 || pbSell < 0 || pbSell > 100) {
    throw new Error(settingsErr('回撤：比例须在 0～100', 'Pullback: 0–100'));
  }
  const baseAmt = parseFloat(document.getElementById('stTpBaseAmount')?.value);
  if (Number.isNaN(baseAmt) || baseAmt < 0) {
    throw new Error(settingsErr('底仓须为 ≥0 的数字', 'Base floor must be a number ≥ 0'));
  }
  const elL = document.getElementById('stTpLevelsEnabled');
  const elP = document.getElementById('stTpPullbackEnabled');
  return {
    levels_enabled: elL ? elL.checked : true,
    pullback_enabled: elP ? elP.checked : true,
    base_position_amount: baseAmt,
    levels,
    pullback: { percent: pbPct, sell_percent: pbSell },
  };
}

function collectSettingsConfigFromForm() {
  const snap = getSettingsSnapshot();
  if (!snap || typeof snap !== 'object') {
    throw new Error(settingsErr('配置未加载', 'Config not loaded'));
  }
  const c = cloneCfg(snap);
  const base = parseInt(document.getElementById('stBaseAmount')?.value, 10);
  if (Number.isNaN(base) || base <= 0) {
    throw new Error(settingsErr('基础金额须为大于 0 的整数', 'Base amount must be a positive integer'));
  }
  c.base_amount = base;

  const ma = parseInt(document.getElementById('stMaPeriod')?.value, 10);
  if (Number.isNaN(ma) || ma < 2 || ma > 600) {
    throw new Error(settingsErr('均线周期须在 2～600 之间', 'MA period must be 2–600'));
  }
  c.ma_period = ma;

  const thSnap = Array.isArray(snap.thresholds) ? snap.thresholds : [];
  const thresholds = [];
  for (let i = 0; i < 5; i++) {
    const min = parseFloat(document.getElementById(`th${i}min`)?.value);
    const max = parseFloat(document.getElementById(`th${i}max`)?.value);
    const mult = parseFloat(document.getElementById(`th${i}mult`)?.value);
    if (Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(mult)) {
      throw new Error(settingsErr('偏离度表格含有无效数字', 'Invalid threshold number'));
    }
    if (min > max) {
      throw new Error(settingsErr(`第 ${i + 1} 行：最小偏离不能大于最大偏离`, 'Min deviation > max'));
    }
    thresholds.push({
      min,
      max,
      multiplier: mult,
      action: (thSnap[i] && thSnap[i].action) || '',
    });
  }
  c.thresholds = thresholds;

  c.take_profit = collectSettingsTakeProfitFromDom();

  return c;
}

function syncSettingsJsonTextarea() {
  const ta = document.getElementById('cfgJson');
  const snap = getSettingsSnapshot();
  if (!ta || !snap) return;
  ta.value = JSON.stringify(snap, null, 2);
}

function fillSettingsFormFromSnapshot() {
  const c = getSettingsSnapshot();
  if (!c) return;

  const elB = document.getElementById('stBaseAmount');
  if (elB) elB.value = c.base_amount ?? 500;
  const elM = document.getElementById('stMaPeriod');
  if (elM) elM.value = c.ma_period ?? 20;

  const th = Array.isArray(c.thresholds) ? c.thresholds : [];
  for (let i = 0; i < 5; i++) {
    const row = th[i] || {};
    const mn = document.getElementById(`th${i}min`);
    const mx = document.getElementById(`th${i}max`);
    const mu = document.getElementById(`th${i}mult`);
    if (mn) mn.value = row.min != null ? row.min : '';
    if (mx) mx.value = row.max != null ? row.max : '';
    if (mu) mu.value = row.multiplier != null ? row.multiplier : '';
  }

  const tp = c.take_profit || { levels: [], pullback: { percent: 0, sell_percent: 0 } };
  renderSettingsTpRows(tp.levels);
  const elBase = document.getElementById('stTpBaseAmount');
  if (elBase) {
    const v = tp.base_position_amount != null ? tp.base_position_amount : tp.base_position_g;
    elBase.value = v != null ? v : 0;
  }
  const pp = document.getElementById('stTpPbPct');
  const ps = document.getElementById('stTpPbSell');
  if (pp) pp.value = tp.pullback?.percent ?? 0;
  if (ps) ps.value = tp.pullback?.sell_percent ?? 0;
  const elL = document.getElementById('stTpLevelsEnabled');
  const elP = document.getElementById('stTpPullbackEnabled');
  if (elL) elL.checked = tp.levels_enabled !== false;
  if (elP) elP.checked = tp.pullback_enabled !== false;
  bindTpEnableTogglesOnce();
  syncTpSectionsEnabledState();

  syncSettingsJsonTextarea();
}

export async function loadSettingsPage() {
  const res = await api('/api/config');
  if (!res.ok) return;
  setSettingsSnapshot(cloneCfg(res.config));
  fillSettingsFormFromSnapshot();
  updateLastUp();
}

export async function saveSettingsForm() {
  let c;
  try {
    c = collectSettingsConfigFromForm();
  } catch (e) {
    notyf.error(e.message || 'Error');
    return;
  }
  const res = await api('/api/config', { method: 'POST', body: JSON.stringify(c) });
  if (!res.ok) {
    notyf.error(res.error || 'fail');
    return;
  }
  setSettingsSnapshot(cloneCfg(c));
  syncSettingsJsonTextarea();

  const snap = await api('/api/backtest/save', { method: 'POST', body: JSON.stringify({ note: '' }) });
  if (!snap.ok) {
    notyf.error(snap.error || settingsErr('配置已保存，但写入记录列表失败', 'Settings saved but log append failed'));
    loadOverview();
    return;
  }
  try {
    const { loadSaved } = await import('./saved.js');
    loadSaved();
  } catch {
    /* ignore table refresh */
  }
  notyf.success(t('settingsSaveOk'));
  loadOverview();
}

export async function saveConfigJson() {
  let obj;
  try {
    obj = JSON.parse(document.getElementById('cfgJson').value);
  } catch {
    notyf.error(curLang === 'zh' ? 'JSON 格式错误' : 'Invalid JSON');
    return;
  }
  if (!obj || typeof obj !== 'object') {
    notyf.error(curLang === 'zh' ? '须为 JSON 对象' : 'Must be a JSON object');
    return;
  }
  const res = await api('/api/config', { method: 'POST', body: JSON.stringify(obj) });
  if (!res.ok) {
    notyf.error(res.error || 'fail');
    return;
  }
  setSettingsSnapshot(cloneCfg(obj));
  fillSettingsFormFromSnapshot();
  notyf.success('OK');
  loadOverview();
}

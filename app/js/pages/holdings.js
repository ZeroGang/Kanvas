import { api } from '../core/api.js';
import { notyf } from '../core/notyf.js';
import { curLang, t } from '../core/i18n.js';
import { updateLastUp } from '../shell.js';

const TARGET_OPTIONS = [3, 5, 10, 20];
const SAVE_DEBOUNCE_MS = 400;

let _saveTimer = null;
let _suppressHoldingsPersist = false;
let _unloadHooksBound = false;

function scheduleHoldingsPersist() {
  if (_suppressHoldingsPersist) return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    void persistHoldingsSilent();
  }, SAVE_DEBOUNCE_MS);
}

/** 取消防抖并立即写入（失焦、离开页、关标签前使用，避免未落盘就刷新） */
export async function flushHoldingsPersistNow() {
  if (_suppressHoldingsPersist) return;
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  await persistHoldingsSilent();
}

async function persistHoldingsSilent() {
  if (_suppressHoldingsPersist) return;
  const items = collectItems();
  const res = await api('/api/holdings', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    notyf.error(res.error || (curLang === 'zh' ? '自动保存失败' : 'Auto-save failed'));
    return;
  }
  updateLastUp();
}

function bindUnloadFlushOnce() {
  if (_unloadHooksBound) return;
  _unloadHooksBound = true;
  window.addEventListener('pagehide', () => {
    void flushHoldingsPersistNow();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushHoldingsPersistNow();
  });
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 根据净值输入框的原始字符串取小数位数（如 100、100.5、100.50 → 0、1、2） */
function decimalPlacesFromNavInputString(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  const dot = s.indexOf('.');
  if (dot < 0) return 0;
  return Math.min(18, Math.max(0, s.length - dot - 1));
}

function fmtMoneyWithDecimals(x, decimals) {
  if (x == null || !Number.isFinite(Number(x))) return '—';
  const n = Number(x);
  const locale = curLang === 'zh' ? 'zh-CN' : 'en-US';
  const d0 = Number(decimals);
  const d = Math.max(0, Math.min(18, Number.isFinite(d0) ? Math.floor(d0) : 0));
  return n.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** 净值 = 成本 × (1 + 收益率/100) → 成本 = 净值 / (1 + 收益率/100) */
function costFromNavYield(nav, yieldPct) {
  const n = Number(nav);
  const y = Number(yieldPct);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return 0;
  const den = 1 + y / 100;
  if (!Number.isFinite(den) || Math.abs(den) < 1e-12) return null;
  const c = n / den;
  return Number.isFinite(c) && c >= 0 ? c : null;
}

/** 目标净值 = 成本净值 × (1 + 目标收益率/100) */
function targetNavFromCost(cost, targetPct) {
  const c = Number(cost);
  const p = Number(targetPct);
  if (!Number.isFinite(c) || c < 0 || !Number.isFinite(p)) return null;
  return c * (1 + p / 100);
}

function targetPctFromRow(row) {
  const v = Number(row.target_return_pct);
  return TARGET_OPTIONS.includes(v) ? v : 5;
}

function selectOptionsHtml(selected) {
  const sel = targetPctFromRow({ target_return_pct: selected });
  return TARGET_OPTIONS.map((p) => `<option value="${p}"${p === sel ? ' selected' : ''}>${p}%</option>`).join('');
}

/** 载入行数据：优先 current_yield_pct；旧版 JSON 曾用 cost_nav 存成本，可结合 current_nav 反推收益率 */
function effectiveYieldPct(row) {
  if (row == null) return 0;
  if (row.current_yield_pct != null && String(row.current_yield_pct).trim() !== '') {
    const y = Number(row.current_yield_pct);
    if (Number.isFinite(y)) return y;
  }
  const cost = Number(row.cost_nav);
  const nav = Number(row.current_nav);
  if (cost > 0 && Number.isFinite(nav) && nav >= 0) return (nav / cost - 1) * 100;
  return 0;
}

function rowInnerHtml(row) {
  const sym = esc(row.symbol ?? '');
  const cur = Number(row.current_nav);
  const tp = targetPctFromRow(row);
  const y = effectiveYieldPct(row);
  const curStr = Number.isFinite(cur) ? String(cur) : '';
  const yStr = Number.isFinite(y) ? String(y) : '';
  const cost = costFromNavYield(Number.isFinite(cur) ? cur : NaN, Number.isFinite(y) ? y : 0);
  const tn = cost != null ? targetNavFromCost(cost, tp) : null;
  const navDec = decimalPlacesFromNavInputString(curStr);
  const costText = cost == null ? '—' : fmtMoneyWithDecimals(cost, navDec);
  const tnText = tn == null ? '—' : fmtMoneyWithDecimals(tn, navDec);
  return `
    <td><input type="text" class="filter-input hs-symbol" value="${sym}" autocomplete="off" /></td>
    <td><input type="number" class="filter-input hs-current" min="0" step="any" value="${curStr}" placeholder="0" /></td>
    <td><input type="number" class="filter-input hs-yield" step="any" value="${yStr}" placeholder="0" /></td>
    <td class="hs-cost mono">${cost == null ? '—' : esc(costText)}</td>
    <td><select class="filter-select hs-target-pct">${selectOptionsHtml(tp)}</select></td>
    <td class="hs-target-nav mono">${esc(tnText)}</td>
    <td><button type="button" class="btn btn-sm holdings-del-btn" onclick="deleteHoldingsRow(this)"><i class="ph ph-trash"></i> <span data-i="holdingsDel">${esc(t('holdingsDel'))}</span></button></td>
  `;
}

function renderEmptyRow() {
  const tb = document.getElementById('holdingsTbody');
  if (!tb) return;
  tb.innerHTML = `<tr class="hs-empty-row"><td colspan="7"><span class="hs-empty" data-i="holdingsEmpty">${esc(t('holdingsEmpty'))}</span></td></tr>`;
}

function refreshRowComputed(tr) {
  if (!tr || !tr.dataset.id) return;
  const curEl = tr.querySelector('.hs-current');
  const yEl = tr.querySelector('.hs-yield');
  const costEl = tr.querySelector('.hs-cost');
  const pctEl = tr.querySelector('.hs-target-pct');
  const navEl = tr.querySelector('.hs-target-nav');
  if (!curEl || !yEl || !costEl || !pctEl || !navEl) return;
  const rawNav = curEl.value;
  const nav = parseFloat(rawNav);
  const y = parseFloat(yEl.value);
  const navOk = Number.isFinite(nav) && nav >= 0;
  const yOk = Number.isFinite(y);
  const cost = navOk && yOk ? costFromNavYield(nav, y) : null;
  const navDec = decimalPlacesFromNavInputString(rawNav);
  costEl.textContent = cost == null ? '—' : fmtMoneyWithDecimals(cost, navDec);
  const pct = parseFloat(pctEl.value);
  const tn = cost != null ? targetNavFromCost(cost, pct) : null;
  navEl.textContent = tn == null ? '—' : fmtMoneyWithDecimals(tn, navDec);
  syncRowYieldBand(tr, y);
}

/** 整行底纹：当前收益率 >0 红，<0 绿，=0 或非数保持默认（下拉与输入框单独恢复为默认底色） */
function syncRowYieldBand(tr, yieldVal) {
  tr.classList.remove('hs-row-yield-pos', 'hs-row-yield-neg');
  if (!Number.isFinite(yieldVal) || yieldVal === 0) return;
  tr.classList.add(yieldVal > 0 ? 'hs-row-yield-pos' : 'hs-row-yield-neg');
}

let _delegationBound = false;

function bindTableDelegation() {
  if (_delegationBound) return;
  const tbl = document.getElementById('holdingsTable');
  if (!tbl) return;
  _delegationBound = true;
  bindUnloadFlushOnce();
  tbl.addEventListener('input', (ev) => {
    const el = ev.target;
    if (!el || !el.classList) return;
    if (el.classList.contains('hs-current') || el.classList.contains('hs-yield') || el.classList.contains('hs-symbol')) {
      const tr = el.closest('tr');
      if (tr) refreshRowComputed(tr);
      scheduleHoldingsPersist();
    }
  });
  tbl.addEventListener('change', (ev) => {
    const el = ev.target;
    if (!el || !el.classList) return;
    const tr = el.closest('tr');
    if (el.classList.contains('hs-target-pct')) {
      if (tr) refreshRowComputed(tr);
      void flushHoldingsPersistNow();
      return;
    }
    if (el.classList.contains('hs-yield') || el.classList.contains('hs-current') || el.classList.contains('hs-symbol')) {
      if (tr) refreshRowComputed(tr);
      void flushHoldingsPersistNow();
    }
  });
}

function stripEmptyRow() {
  const tb = document.getElementById('holdingsTbody');
  const empty = tb && tb.querySelector('.hs-empty-row');
  if (empty) empty.remove();
}

export function addHoldingsRow() {
  const tb = document.getElementById('holdingsTbody');
  if (!tb) return;
  bindTableDelegation();
  stripEmptyRow();
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `h${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tr = document.createElement('tr');
  tr.dataset.id = id;
  tr.innerHTML = rowInnerHtml({
    id,
    symbol: '',
    current_nav: 0,
    current_yield_pct: 0,
    target_return_pct: 5,
  });
  tb.appendChild(tr);
  refreshRowComputed(tr);
  scheduleHoldingsPersist();
}

export function deleteHoldingsRow(btn) {
  const tr = btn && btn.closest ? btn.closest('tr') : null;
  const tb = document.getElementById('holdingsTbody');
  if (!tr || !tb || !tr.dataset.id) return;
  tr.remove();
  if (!tb.querySelector('tr[data-id]')) renderEmptyRow();
  scheduleHoldingsPersist();
}

function collectItems() {
  const tb = document.getElementById('holdingsTbody');
  if (!tb) return [];
  const out = [];
  tb.querySelectorAll('tr[data-id]').forEach((tr) => {
    const id = tr.dataset.id;
    const symbol = (tr.querySelector('.hs-symbol') && tr.querySelector('.hs-symbol').value) || '';
    const curEl = tr.querySelector('.hs-current');
    const yEl = tr.querySelector('.hs-yield');
    const rawCur = curEl ? String(curEl.value).trim() : '';
    const rawY = yEl ? String(yEl.value).trim() : '';
    const current = rawCur === '' ? NaN : parseFloat(rawCur);
    const y = rawY === '' || rawY === '-' ? NaN : parseFloat(rawY);
    const pct = parseInt((tr.querySelector('.hs-target-pct') && tr.querySelector('.hs-target-pct').value) || '5', 10);
    out.push({
      id,
      symbol: symbol.trim(),
      current_nav: Number.isFinite(current) && current >= 0 ? current : 0,
      current_yield_pct: Number.isFinite(y) ? y : 0,
      target_return_pct: TARGET_OPTIONS.includes(pct) ? pct : 5,
    });
  });
  return out;
}

export async function loadHoldings() {
  bindTableDelegation();
  const res = await api('/api/holdings');
  const tb = document.getElementById('holdingsTbody');
  if (!tb) return;
  if (!res.ok) {
    notyf.error(res.error || (curLang === 'zh' ? '加载失败' : 'Load failed'));
    return;
  }
  const items = Array.isArray(res.items) ? res.items : [];
  _suppressHoldingsPersist = true;
  try {
    if (!items.length) {
      renderEmptyRow();
      updateLastUp();
      return;
    }
    tb.innerHTML = '';
    for (const row of items) {
      const tr = document.createElement('tr');
      let rid = row.id != null && String(row.id).trim() ? String(row.id).trim() : '';
      if (!rid) {
        rid =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `h${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }
      tr.dataset.id = rid;
      tr.innerHTML = rowInnerHtml({ ...row, id: rid });
      tb.appendChild(tr);
      refreshRowComputed(tr);
    }
    updateLastUp();
  } finally {
    _suppressHoldingsPersist = false;
  }
}

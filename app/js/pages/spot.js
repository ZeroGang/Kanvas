import { api } from '../core/api.js';
import { notyf } from '../core/notyf.js';
import { t, curLang, applyI18n } from '../core/i18n.js';
import { apexTheme } from '../core/theme.js';
import { charts, setSettingsSnapshot } from '../state.js';
import { updateLastUp } from '../shell.js';
import { loadOverview } from './overview.js';
import { openCnAIndexModal } from './cn_a_index_settings.js';
import { SPOT_MARKET_TAB_KEY, getSpotMarketTab } from '../core/spotMarketTab.js';

const READONLY_FIELDS = ['id', 'label_zh', 'label_en', 'unit_zh', 'unit_en'];

let _spotInstrBound = false;
/** @type {Array<{id:string,label_zh:string,label_en:string,unit_zh:string,unit_en:string}>} */
let _spotCatalog = [];

function refreshSpotInstrOrderButtons() {
  const rows = document.querySelectorAll('#spotInstrTbody .spot-instr-row');
  rows.forEach((tr, i) => {
    const up = tr.querySelector('.spot-instr-up');
    const down = tr.querySelector('.spot-instr-down');
    if (up) up.disabled = i === 0;
    if (down) down.disabled = i === rows.length - 1;
  });
}

function currentSpotInstrIds() {
  return [...document.querySelectorAll('#spotInstrTbody .spot-instr-row')]
    .map((tr) => tr.dataset.symbol)
    .filter(Boolean);
}

function refreshSpotInstrPickSelect() {
  const sel = document.getElementById('spotInstrPick');
  if (!sel) return;
  const used = new Set(currentSpotInstrIds());
  const cur = sel.value;
  sel.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = t('spotInstrPickPlaceholder');
  sel.appendChild(opt0);
  for (const row of _spotCatalog) {
    if (used.has(row.id)) continue;
    const opt = document.createElement('option');
    opt.value = row.id;
    opt.textContent = curLang === 'zh' ? `${row.id} · ${row.label_zh}` : `${row.id} · ${row.label_en}`;
    sel.appendChild(opt);
  }
  if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
}

function appendInstrReadonlyRow(tbody, item) {
  const tr = document.createElement('tr');
  tr.className = 'spot-instr-row';
  tr.dataset.symbol = item.id;
  const tdOrder = document.createElement('td');
  tdOrder.className = 'spot-instr-td-order';
  const moveWrap = document.createElement('div');
  moveWrap.className = 'spot-instr-move-wrap';
  const upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.className = 'btn btn-ghost btn-sm spot-instr-up';
  upBtn.innerHTML = '<i class="ph ph-caret-up"></i>';
  upBtn.title = t('spotInstrMoveUp');
  upBtn.setAttribute('aria-label', t('spotInstrMoveUp'));
  upBtn.addEventListener('click', () => {
    const prev = tr.previousElementSibling;
    if (prev) {
      tr.parentNode.insertBefore(tr, prev);
      refreshSpotInstrOrderButtons();
      refreshSpotInstrPickSelect();
    }
  });
  const downBtn = document.createElement('button');
  downBtn.type = 'button';
  downBtn.className = 'btn btn-ghost btn-sm spot-instr-down';
  downBtn.innerHTML = '<i class="ph ph-caret-down"></i>';
  downBtn.title = t('spotInstrMoveDown');
  downBtn.setAttribute('aria-label', t('spotInstrMoveDown'));
  downBtn.addEventListener('click', () => {
    const next = tr.nextElementSibling;
    if (next) {
      tr.parentNode.insertBefore(next, tr);
      refreshSpotInstrOrderButtons();
      refreshSpotInstrPickSelect();
    }
  });
  moveWrap.appendChild(upBtn);
  moveWrap.appendChild(downBtn);
  tdOrder.appendChild(moveWrap);
  tr.appendChild(tdOrder);
  for (const f of READONLY_FIELDS) {
    const td = document.createElement('td');
    td.className = 'spot-instr-readonly';
    td.textContent = item[f] != null ? String(item[f]) : '';
    tr.appendChild(td);
  }
  const tdAct = document.createElement('td');
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'btn btn-ghost btn-sm spot-instr-del';
  del.textContent = t('del');
  del.addEventListener('click', () => {
    tr.remove();
    refreshSpotInstrOrderButtons();
    refreshSpotInstrPickSelect();
  });
  tdAct.appendChild(del);
  tr.appendChild(tdAct);
  tbody.appendChild(tr);
}

function fillSpotInstrTbody(items) {
  const tbody = document.getElementById('spotInstrTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const list = Array.isArray(items) && items.length ? items : [];
  for (const it of list) {
    if (it && it.id) appendInstrReadonlyRow(tbody, it);
  }
  refreshSpotInstrOrderButtons();
  refreshSpotInstrPickSelect();
}

function bindSpotInstrumentsModal() {
  if (_spotInstrBound) return;
  _spotInstrBound = true;
  const ov = document.getElementById('spotInstrumentsModal');
  const closeBtn = document.getElementById('spotInstrumentsClose');
  const cancelBtn = document.getElementById('spotInstrCancel');
  const saveBtn = document.getElementById('spotInstrSave');
  const resetBtn = document.getElementById('spotInstrReset');
  const addBtn = document.getElementById('spotInstrAddBtn');
  if (!ov || !closeBtn) return;
  closeBtn.addEventListener('click', closeSpotInstrumentsModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeSpotInstrumentsModal);
  ov.addEventListener('click', (e) => {
    if (e.target === ov) closeSpotInstrumentsModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ov.classList.contains('is-open')) closeSpotInstrumentsModal();
  });
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const sel = document.getElementById('spotInstrPick');
      const id = sel && sel.value ? String(sel.value).trim() : '';
      if (!id) {
        notyf.error(t('spotInstrPickFirst'));
        return;
      }
      const row = _spotCatalog.find((x) => x.id === id);
      if (!row) return;
      const tbody = document.getElementById('spotInstrTbody');
      if (!tbody) return;
      appendInstrReadonlyRow(tbody, row);
      sel.value = '';
      refreshSpotInstrOrderButtons();
      refreshSpotInstrPickSelect();
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!window.confirm(t('spotInstrResetConfirm'))) return;
      const res = await api('/api/spot/instruments', {
        method: 'POST',
        body: JSON.stringify({ reset_default: true }),
      });
      if (!res.ok) {
        notyf.error(res.error || 'fail');
        return;
      }
      notyf.success(t('spotInstrSaveOk'));
      const full = await api('/api/config');
      if (full.ok && full.config) setSettingsSnapshot(full.config);
      closeSpotInstrumentsModal();
      await loadSpotPage();
    });
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const ids = currentSpotInstrIds();
      if (!ids.length) {
        notyf.error(t('spotInstrNeedOneId'));
        return;
      }
      const res = await api('/api/spot/instruments', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        notyf.error(res.error || 'fail');
        return;
      }
      notyf.success(t('spotInstrSaveOk'));
      const full = await api('/api/config');
      if (full.ok && full.config) setSettingsSnapshot(full.config);
      closeSpotInstrumentsModal();
      await loadSpotPage();
    });
  }
}

export function closeSpotInstrumentsModal() {
  const ov = document.getElementById('spotInstrumentsModal');
  if (!ov) return;
  ov.classList.remove('is-open');
  ov.setAttribute('aria-hidden', 'true');
}

export async function openSpotInstrumentsModal() {
  bindSpotInstrumentsModal();
  applyI18n();
  const inst = await api('/api/spot/instruments');
  if (!inst.ok || !Array.isArray(inst.items)) {
    notyf.error(inst.error || 'fail');
    return;
  }
  _spotCatalog = Array.isArray(inst.catalog) && inst.catalog.length ? inst.catalog : inst.items;
  fillSpotInstrTbody(inst.items);
  const ov = document.getElementById('spotInstrumentsModal');
  const closeBtn = document.getElementById('spotInstrumentsClose');
  if (closeBtn) closeBtn.setAttribute('aria-label', t('spotInstrCancel'));
  const sel = document.getElementById('spotInstrPick');
  if (sel) sel.setAttribute('aria-label', t('spotInstrPickPlaceholder'));
  if (ov) {
    ov.classList.add('is-open');
    ov.setAttribute('aria-hidden', 'false');
  }
}

function renderInstrumentList(items, activeId) {
  const wrap = document.getElementById('spotInstrumentList');
  if (!wrap || !Array.isArray(items)) return;
  wrap.innerHTML = '';
  for (const it of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'spot-instrument-item' + (it.id === activeId ? ' is-active' : '');
    btn.dataset.symbol = it.id;
    const zh = it.label_zh || it.id;
    const en = it.label_en || it.id;
    btn.textContent = curLang === 'zh' ? zh : en;
    btn.addEventListener('click', () => selectSpotInstrument(it.id));
    wrap.appendChild(btn);
  }
  const setBtn = document.createElement('button');
  setBtn.type = 'button';
  setBtn.className = 'spot-instrument-settings';
  setBtn.setAttribute('aria-label', t('spotInstrSettingsAria'));
  setBtn.title = t('spotInstrSettingsAria');
  setBtn.innerHTML = '<i class="ph ph-gear"></i>';
  setBtn.addEventListener('click', () => openSpotInstrumentsModal());
  wrap.appendChild(setBtn);
}

function normCnIndexId(id) {
  const s = String(id || '').trim();
  if (!s) return '';
  return /^\d+$/.test(s) ? s.padStart(6, '0') : s;
}

function renderCnIndexInstrumentList(items, activeId) {
  const wrap = document.getElementById('cnIndexInstrumentList');
  if (!wrap || !Array.isArray(items)) return;
  const want = normCnIndexId(activeId);
  wrap.innerHTML = '';
  for (const it of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'spot-instrument-item' + (normCnIndexId(it.id) === want ? ' is-active' : '');
    btn.dataset.symbol = it.id;
    const zh = it.label_zh || it.id;
    const en = it.label_en || it.id;
    btn.textContent = curLang === 'zh' ? zh : en;
    btn.addEventListener('click', () => selectCnIndexChart(it.id));
    wrap.appendChild(btn);
  }
  const setBtn = document.createElement('button');
  setBtn.type = 'button';
  setBtn.className = 'spot-instrument-settings';
  setBtn.setAttribute('aria-label', t('cnIndexManage'));
  setBtn.title = t('cnIndexManage');
  setBtn.innerHTML = '<i class="ph ph-gear"></i>';
  setBtn.addEventListener('click', () => openCnAIndexModal());
  wrap.appendChild(setBtn);
}

function setSpotMarketTab(tab) {
  try {
    localStorage.setItem(SPOT_MARKET_TAB_KEY, tab);
  } catch {
    /* ignore */
  }
}

function setSpotMarketTabUI(tab) {
  document.querySelectorAll('.spot-market-tab').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.spotTab === tab);
  });
  const metalSec = document.getElementById('spotMetalSection');
  const cnSec = document.getElementById('spotCnIndexSection');
  if (metalSec) metalSec.style.display = tab === 'metal' ? '' : 'none';
  if (cnSec) cnSec.style.display = tab === 'cn' ? '' : 'none';
  document.querySelectorAll('.spot-metal-only').forEach((el) => {
    el.style.display = tab === 'metal' ? '' : 'none';
  });
}

export function switchSpotMarketTab(tab) {
  if (tab !== 'metal' && tab !== 'cn') return;
  setSpotMarketTab(tab);
  setSpotMarketTabUI(tab);
  void refreshSpotPageContent();
}

async function refreshSpotPageContent() {
  if (getSpotMarketTab() === 'cn') {
    await loadCnIndexMeta();
    await renderCnIndexChart();
  } else {
    await loadSpotMeta();
    await renderSpotChart();
  }
  await loadOverview();
}

async function selectSpotInstrument(id) {
  const res = await api('/api/config', {
    method: 'POST',
    body: JSON.stringify({
      spot_symbol: id,
      gold_data_source: String(id).toUpperCase() === 'XAU' ? 'london' : 'shanghai',
    }),
  });
  if (!res.ok) {
    notyf.error(res.error || 'fail');
    return;
  }
  const full = await api('/api/config');
  if (full.ok && full.config) setSettingsSnapshot(full.config);
  document.querySelectorAll('#spotInstrumentList .spot-instrument-item').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.symbol === id);
  });
  await refreshSpotPageContent();
}

async function selectCnIndexChart(id) {
  const sid = normCnIndexId(id);
  const res = await api('/api/config', {
    method: 'POST',
    body: JSON.stringify({ cn_a_chart_id: sid }),
  });
  if (!res.ok) {
    notyf.error(res.error || 'fail');
    return;
  }
  const full = await api('/api/config');
  if (full.ok && full.config) setSettingsSnapshot(full.config);
  document.querySelectorAll('#cnIndexInstrumentList .spot-instrument-item').forEach((el) => {
    el.classList.toggle('is-active', normCnIndexId(el.dataset.symbol) === sid);
  });
  await refreshSpotPageContent();
}

export async function loadSpotPage() {
  bindSpotInstrumentsModal();
  const tab = getSpotMarketTab();
  const [inst, cnRes, st, cfg] = await Promise.all([
    api('/api/spot/instruments'),
    api('/api/cn-a-index/instruments'),
    api('/api/market/status'),
    api('/api/config'),
  ]);
  if (inst.ok && Array.isArray(inst.items) && inst.items.length) {
    const ids = new Set(inst.items.map((x) => x.id));
    const sym = st.ok && st.symbol && ids.has(st.symbol) ? st.symbol : inst.items[0].id;
    renderInstrumentList(inst.items, sym);
  } else {
    const w = document.getElementById('spotInstrumentList');
    if (w) w.innerHTML = '';
  }
  let cnActive = '';
  if (cfg.ok && cfg.config && cfg.config.cn_a_chart_id != null) {
    cnActive = normCnIndexId(cfg.config.cn_a_chart_id);
  }
  if (cnRes.ok && Array.isArray(cnRes.items) && cnRes.items.length) {
    const ids = new Set(cnRes.items.map((x) => normCnIndexId(x.id)));
    if (!cnActive || !ids.has(cnActive)) cnActive = normCnIndexId(cnRes.items[0].id);
    renderCnIndexInstrumentList(cnRes.items, cnActive);
  } else {
    const w = document.getElementById('cnIndexInstrumentList');
    if (w) w.innerHTML = '';
  }
  setSpotMarketTabUI(tab);
  await refreshSpotPageContent();
}

export async function loadSpotMeta() {
  const mkt = await api('/api/market/status');
  const el = document.getElementById('spotMeta');
  if (!el) return;
  if (mkt.ok) {
    const lbl = curLang === 'zh' ? (mkt.label_zh || mkt.label || '') : (mkt.label_en || mkt.label || '');
    const u = curLang === 'zh' ? (mkt.unit_zh || mkt.unit || '') : (mkt.unit_en || mkt.unit || '');
    let line = `${lbl} · ${mkt.bar_count ?? 0} bars · ${mkt.last_bar_date || '—'}`;
    if (u) line += ` · ${u}`;
    el.textContent = line;
  } else {
    el.textContent = '—';
  }
}

export async function exportSpotAkshareInstrumentsCsv() {
  const res = await api('/api/market/export-spot-instruments-csv', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    notyf.error(res.error || 'fail');
    return;
  }
  const f = res.file || 'spot_instruments_akshare.csv';
  const n = res.rows ?? '';
  notyf.success(
    curLang === 'zh'
      ? `已写入 excels/${f}（${n} 条）`
      : `Wrote excels/${f} (${n} rows)`
  );
}

export async function fetchMarket() {
  const res = await api('/api/market/fetch', { method: 'POST', body: JSON.stringify({}) });
  if (!res.ok) {
    notyf.error(res.error || 'AkShare / network');
    return;
  }
  let msg = (curLang === 'zh' ? '已拉取 ' : 'Rows ') + (res.rows ?? '');
  if (res.catalog_rows != null) {
    msg +=
      curLang === 'zh'
        ? ` · 品类表 ${res.catalog_rows} 条→excels/`
        : ` · catalog ${res.catalog_rows} rows→excels/`;
  }
  notyf.success(msg);
  await loadSpotMeta();
  await loadOverview();
  await renderSpotChart();
}

export async function loadCnIndexMeta() {
  const mkt = await api('/api/cn-index/status');
  const el = document.getElementById('spotMeta');
  if (!el) return;
  if (mkt.ok) {
    const lbl = curLang === 'zh' ? (mkt.label_zh || mkt.symbol || '') : (mkt.label_en || mkt.symbol || '');
    const ex = curLang === 'zh' ? (mkt.exchange_zh || '') : (mkt.exchange_en || '');
    let line = `${lbl} · ${mkt.bar_count ?? 0} bars · ${mkt.last_bar_date || '—'}`;
    if (ex) line += ` · ${ex}`;
    el.textContent = line;
  } else {
    el.textContent = '—';
  }
}

export async function fetchCnIndexMarket() {
  const res = await api('/api/cn-index/fetch', { method: 'POST', body: JSON.stringify({}) });
  if (!res.ok) {
    notyf.error(res.error || 'AkShare / network');
    return;
  }
  notyf.success((curLang === 'zh' ? '已拉取指数 ' : 'Index rows ') + (res.rows ?? ''));
  await loadCnIndexMeta();
  await renderCnIndexChart();
}

export async function refreshActiveSpotMarket() {
  if (getSpotMarketTab() === 'cn') return fetchCnIndexMarket();
  return fetchMarket();
}

export async function renderSpotChart() {
  const days = parseInt(document.getElementById('spotDays').value, 10) || 60;
  const d = await api(`/api/spot-series?days=${days}`);
  const el = document.querySelector('#chartSpot');
  if (!el) return;
  if (!d.ok) {
    el.innerHTML = `<p style="padding:24px;color:var(--text-2)">${d.error || 'No data'}</p>`;
    return;
  }
  const opts = {
    chart: { type: 'line', height: 380, fontFamily: 'Inter, sans-serif', toolbar: { show: true }, zoom: { enabled: true } },
    theme: apexTheme(),
    stroke: { width: [2, 2], curve: 'smooth' },
    colors: ['#60a5fa', '#34d399'],
    grid: { borderColor: 'rgba(148,163,184,0.08)' },
    legend: { labels: { colors: '#9ca3b0' } },
    xaxis: { categories: d.dates, labels: { style: { colors: '#6b7280' }, rotate: -45, maxHeight: 80 } },
    yaxis: { labels: { style: { colors: '#6b7280' } } },
    dataLabels: { enabled: false },
    tooltip: { theme: document.body.dataset.theme, shared: true },
    series: [
      { name: curLang === 'zh' ? '收盘' : 'Close', data: d.closes },
      { name: 'MA' + (d.ma_period || 20), data: d.ma.map((v) => (v == null ? null : v)) },
    ],
  };
  el.innerHTML = '';
  if (charts.spot) charts.spot.destroy();
  charts.spot = new ApexCharts(el, opts);
  charts.spot.render();
  updateLastUp();
}

export async function renderCnIndexChart() {
  const days = parseInt(document.getElementById('spotDays').value, 10) || 60;
  const d = await api(`/api/cn-index-series?days=${days}`);
  const el = document.querySelector('#chartSpot');
  if (!el) return;
  if (!d.ok) {
    el.innerHTML = `<p style="padding:24px;color:var(--text-2)">${d.error || 'No data'}</p>`;
    return;
  }
  const opts = {
    chart: { type: 'line', height: 380, fontFamily: 'Inter, sans-serif', toolbar: { show: true }, zoom: { enabled: true } },
    theme: apexTheme(),
    stroke: { width: [2, 2], curve: 'smooth' },
    colors: ['#60a5fa', '#34d399'],
    grid: { borderColor: 'rgba(148,163,184,0.08)' },
    legend: { labels: { colors: '#9ca3b0' } },
    xaxis: { categories: d.dates, labels: { style: { colors: '#6b7280' }, rotate: -45, maxHeight: 80 } },
    yaxis: { labels: { style: { colors: '#6b7280' } } },
    dataLabels: { enabled: false },
    tooltip: { theme: document.body.dataset.theme, shared: true },
    series: [
      { name: curLang === 'zh' ? '收盘' : 'Close', data: d.closes },
      { name: 'MA' + (d.ma_period || 20), data: d.ma.map((v) => (v == null ? null : v)) },
    ],
  };
  el.innerHTML = '';
  if (charts.spot) charts.spot.destroy();
  charts.spot = new ApexCharts(el, opts);
  charts.spot.render();
  updateLastUp();
}

export async function renderActiveSpotChart() {
  if (getSpotMarketTab() === 'cn') return renderCnIndexChart();
  return renderSpotChart();
}

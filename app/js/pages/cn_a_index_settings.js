import { api } from '../core/api.js';
import { notyf } from '../core/notyf.js';
import { t, curLang, applyI18n } from '../core/i18n.js';
import { setSettingsSnapshot } from '../state.js';

const READONLY_FIELDS = ['id', 'label_zh', 'label_en', 'exchange_zh', 'exchange_en'];

let _cnBound = false;
/** @type {Array<Record<string,string>>} */
let _cnCatalog = [];

function refreshCnOrderButtons() {
  const rows = document.querySelectorAll('#cnAIndexTbody .cn-a-index-row');
  rows.forEach((tr, i) => {
    const up = tr.querySelector('.cn-a-index-up');
    const down = tr.querySelector('.cn-a-index-down');
    if (up) up.disabled = i === 0;
    if (down) down.disabled = i === rows.length - 1;
  });
}

function currentCnIds() {
  return [...document.querySelectorAll('#cnAIndexTbody .cn-a-index-row')]
    .map((tr) => tr.dataset.symbol)
    .filter(Boolean);
}

function refreshCnPickSelect() {
  const sel = document.getElementById('cnAIndexPick');
  if (!sel) return;
  const used = new Set(currentCnIds());
  const cur = sel.value;
  sel.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = t('cnIndexPickPlaceholder');
  sel.appendChild(opt0);
  for (const row of _cnCatalog) {
    if (used.has(row.id)) continue;
    const opt = document.createElement('option');
    opt.value = row.id;
    opt.textContent = curLang === 'zh' ? `${row.id} · ${row.label_zh}` : `${row.id} · ${row.label_en}`;
    sel.appendChild(opt);
  }
  if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
}

function appendCnRow(tbody, item) {
  const tr = document.createElement('tr');
  tr.className = 'cn-a-index-row spot-instr-row';
  tr.dataset.symbol = item.id;
  const tdOrder = document.createElement('td');
  tdOrder.className = 'spot-instr-td-order';
  const moveWrap = document.createElement('div');
  moveWrap.className = 'spot-instr-move-wrap';
  const upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.className = 'btn btn-ghost btn-sm cn-a-index-up spot-instr-up';
  upBtn.innerHTML = '<i class="ph ph-caret-up"></i>';
  upBtn.title = t('spotInstrMoveUp');
  upBtn.setAttribute('aria-label', t('spotInstrMoveUp'));
  upBtn.addEventListener('click', () => {
    const prev = tr.previousElementSibling;
    if (prev) {
      tr.parentNode.insertBefore(tr, prev);
      refreshCnOrderButtons();
      refreshCnPickSelect();
    }
  });
  const downBtn = document.createElement('button');
  downBtn.type = 'button';
  downBtn.className = 'btn btn-ghost btn-sm cn-a-index-down spot-instr-down';
  downBtn.innerHTML = '<i class="ph ph-caret-down"></i>';
  downBtn.title = t('spotInstrMoveDown');
  downBtn.setAttribute('aria-label', t('spotInstrMoveDown'));
  downBtn.addEventListener('click', () => {
    const next = tr.nextElementSibling;
    if (next) {
      tr.parentNode.insertBefore(next, tr);
      refreshCnOrderButtons();
      refreshCnPickSelect();
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
    refreshCnOrderButtons();
    refreshCnPickSelect();
  });
  tdAct.appendChild(del);
  tr.appendChild(tdAct);
  tbody.appendChild(tr);
}

function fillCnTbody(items) {
  const tbody = document.getElementById('cnAIndexTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const list = Array.isArray(items) && items.length ? items : [];
  for (const it of list) {
    if (it && it.id) appendCnRow(tbody, it);
  }
  refreshCnOrderButtons();
  refreshCnPickSelect();
}

function bindCnAIndexModal() {
  if (_cnBound) return;
  _cnBound = true;
  const ov = document.getElementById('cnAIndexModal');
  const closeBtn = document.getElementById('cnAIndexClose');
  const cancelBtn = document.getElementById('cnAIndexCancel');
  const saveBtn = document.getElementById('cnAIndexSave');
  const resetBtn = document.getElementById('cnAIndexReset');
  const addBtn = document.getElementById('cnAIndexAddBtn');
  if (!ov || !closeBtn) return;
  closeBtn.addEventListener('click', closeCnAIndexModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeCnAIndexModal);
  ov.addEventListener('click', (e) => {
    if (e.target === ov) closeCnAIndexModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ov.classList.contains('is-open')) closeCnAIndexModal();
  });
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const sel = document.getElementById('cnAIndexPick');
      const id = sel && sel.value ? String(sel.value).trim() : '';
      if (!id) {
        notyf.error(t('cnIndexPickFirst'));
        return;
      }
      const row = _cnCatalog.find((x) => x.id === id);
      if (!row) return;
      const tbody = document.getElementById('cnAIndexTbody');
      if (!tbody) return;
      appendCnRow(tbody, row);
      sel.value = '';
      refreshCnOrderButtons();
      refreshCnPickSelect();
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!window.confirm(t('cnIndexResetConfirm'))) return;
      const res = await api('/api/cn-a-index/instruments', {
        method: 'POST',
        body: JSON.stringify({ reset_default: true }),
      });
      if (!res.ok) {
        notyf.error(res.error || 'fail');
        return;
      }
      notyf.success(t('cnIndexSaveOk'));
      const full = await api('/api/config');
      if (full.ok && full.config) setSettingsSnapshot(full.config);
      closeCnAIndexModal();
      try {
        const { loadSettingsPage } = await import('./settings.js');
        await loadSettingsPage();
      } catch {
        /* ignore */
      }
      try {
        if (document.getElementById('page-spot')?.classList.contains('active')) {
          const { loadSpotPage } = await import('./spot.js');
          await loadSpotPage();
        }
      } catch {
        /* ignore */
      }
    });
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const ids = currentCnIds();
      if (!ids.length) {
        notyf.error(t('cnIndexNeedOne'));
        return;
      }
      const res = await api('/api/cn-a-index/instruments', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        notyf.error(res.error || 'fail');
        return;
      }
      notyf.success(t('cnIndexSaveOk'));
      const full = await api('/api/config');
      if (full.ok && full.config) setSettingsSnapshot(full.config);
      closeCnAIndexModal();
      try {
        const { loadSettingsPage } = await import('./settings.js');
        await loadSettingsPage();
      } catch {
        /* ignore */
      }
      try {
        if (document.getElementById('page-spot')?.classList.contains('active')) {
          const { loadSpotPage } = await import('./spot.js');
          await loadSpotPage();
        }
      } catch {
        /* ignore */
      }
    });
  }
}

export function closeCnAIndexModal() {
  const ov = document.getElementById('cnAIndexModal');
  if (!ov) return;
  ov.classList.remove('is-open');
  ov.setAttribute('aria-hidden', 'true');
}

export async function openCnAIndexModal() {
  bindCnAIndexModal();
  applyI18n();
  const res = await api('/api/cn-a-index/instruments');
  if (!res.ok || !Array.isArray(res.items)) {
    notyf.error(res.error || 'fail');
    return;
  }
  _cnCatalog = Array.isArray(res.catalog) && res.catalog.length ? res.catalog : res.items;
  fillCnTbody(res.items);
  const ov = document.getElementById('cnAIndexModal');
  const closeBtn = document.getElementById('cnAIndexClose');
  if (closeBtn) closeBtn.setAttribute('aria-label', t('spotInstrCancel'));
  const sel = document.getElementById('cnAIndexPick');
  if (sel) sel.setAttribute('aria-label', t('cnIndexPickPlaceholder'));
  if (ov) {
    ov.classList.add('is-open');
    ov.setAttribute('aria-hidden', 'false');
  }
}

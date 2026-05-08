import { api } from '../core/api.js';
import { notyf } from '../core/notyf.js';
import { t } from '../core/i18n.js';
import { navigate } from '../navigate.js';
import { applyReplayResult } from './backtest.js';
import { loadSettingsPage } from './settings.js';
import { loadOverview } from './overview.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

let _modalReady = false;
let _savedModalEntryId = null;

export function closeSavedDetailModal() {
  const ov = document.getElementById('savedDetailModal');
  if (!ov) return;
  ov.classList.remove('is-open');
  ov.setAttribute('aria-hidden', 'true');
  _savedModalEntryId = null;
}

function updateSavedModalActions(detail) {
  const applyBtn = document.getElementById('savedDetailApply');
  if (!applyBtn) return;
  const canApply = Array.isArray(detail?.thresholds) && detail.thresholds.length > 0;
  applyBtn.disabled = !canApply;
  applyBtn.title = canApply ? '' : t('savedApplyDisabled');
}

function bindSavedDetailModal() {
  if (_modalReady) return;
  _modalReady = true;
  const ov = document.getElementById('savedDetailModal');
  const closeBtn = document.getElementById('savedDetailClose');
  const replayBtn = document.getElementById('savedDetailReplay');
  const applyBtn = document.getElementById('savedDetailApply');
  const delBtn = document.getElementById('savedDetailDelete');
  if (!ov || !closeBtn) return;
  closeBtn.setAttribute('aria-label', t('savedModalClose'));
  closeBtn.addEventListener('click', closeSavedDetailModal);
  ov.addEventListener('click', (e) => {
    if (e.target === ov) closeSavedDetailModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ov.classList.contains('is-open')) closeSavedDetailModal();
  });

  if (replayBtn) {
    replayBtn.addEventListener('click', async () => {
      const id = _savedModalEntryId;
      if (!id) return;
      closeSavedDetailModal();
      await replaySaved(id);
    });
  }
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      const id = _savedModalEntryId;
      if (!id || applyBtn.disabled) return;
      const res = await api('/api/backtest/saved/apply', { method: 'POST', body: JSON.stringify({ id }) });
      if (!res.ok) {
        notyf.error(res.error || 'fail');
        return;
      }
      notyf.success(t('savedApplyOk'));
      closeSavedDetailModal();
      await loadSaved();
      await loadOverview();
      await loadSettingsPage();
    });
  }
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      const id = _savedModalEntryId;
      if (!id) return;
      await api('/api/backtest/saved/delete', { method: 'POST', body: JSON.stringify({ ids: [id] }) });
      notyf.success(t('savedDeletedOk'));
      closeSavedDetailModal();
      loadSaved();
    });
  }
}

function renderDetailHtml(d) {
  const parts = [];
  parts.push(`<div class="saved-detail-meta"><span class="saved-detail-k">${esc(t('detailMeta'))}</span> <span class="mono">${esc(d.saved_at)}</span></div>`);
  if (d.legacy) {
    parts.push(`<div class="saved-detail-banner">${esc(t('savedDetailLegacyHint'))}</div>`);
  }
  const th = d.thresholds;
  const tp = d.take_profit;
  const hasTh = Array.isArray(th) && th.length > 0;
  if (hasTh) {
    parts.push(`<h4 class="saved-detail-h">${esc(t('detailSectionMa'))}</h4>`);
    parts.push(`<p class="saved-detail-p">MA${esc(String(d.ma_period != null ? d.ma_period : '—'))}</p>`);
    parts.push(`<h4 class="saved-detail-h">${esc(t('detailSectionTh'))}</h4>`);
    parts.push('<table class="saved-detail-table"><thead><tr>');
    parts.push(`<th>${esc(t('thColZone'))}</th><th>${esc(t('thColMin'))}</th><th>${esc(t('thColMax'))}</th><th>${esc(t('thColMult'))}</th><th>${esc(t('colAction'))}</th>`);
    parts.push('</tr></thead><tbody>');
    for (const row of th) {
      if (!row || typeof row !== 'object') continue;
      parts.push(
        `<tr><td>—</td><td class="mono">${esc(row.min)}</td><td class="mono">${esc(row.max)}</td><td class="mono">${esc(row.multiplier)}</td><td>${esc(row.action || '')}</td></tr>`
      );
    }
    parts.push('</tbody></table>');
  }
  if (tp && typeof tp === 'object') {
    const levels = Array.isArray(tp.levels) ? tp.levels : [];
    const pb = tp.pullback && typeof tp.pullback === 'object' ? tp.pullback : {};
    parts.push(`<h4 class="saved-detail-h">${esc(t('detailSectionTp'))}</h4>`);
    const baseAmt =
      tp.base_position_amount != null ? parseFloat(tp.base_position_amount) : parseFloat(tp.base_position_g);
    if (Number.isFinite(baseAmt) && baseAmt > 0) {
      parts.push(
        `<p class="saved-detail-p">${esc(t('detailTpBaseFloor'))}: &gt; ${esc(String(baseAmt))} ${esc(t('detailTpBaseUnit'))}</p>`
      );
    }
    if (levels.length) {
      parts.push('<ul class="saved-detail-list">');
      for (const lv of levels) {
        if (!lv || typeof lv !== 'object') continue;
        parts.push(
          `<li><span class="saved-detail-k">${esc(t('detailTpLevel'))} ${esc(lv.profit)}%</span> → ${esc(t('detailTpSell'))} ${esc(lv.sell_percent)}%</li>`
        );
      }
      parts.push('</ul>');
    }
    const pbp = pb.percent != null ? pb.percent : 0;
    const pbs = pb.sell_percent != null ? pb.sell_percent : 0;
    if (Number(pbp) > 0 || Number(pbs) > 0) {
      parts.push(
        `<p class="saved-detail-p">${esc(t('detailPullback'))}: ${esc(pbp)}% → ${esc(t('detailTpSell'))} ${esc(pbs)}%</p>`
      );
    }
  }
  const hasTpLevels = tp && typeof tp === 'object' && Array.isArray(tp.levels) && tp.levels.length > 0;
  if (!hasTh && !hasTpLevels) {
    if (d.legacy_summary && typeof d.legacy_summary === 'object') {
      const ls = d.legacy_summary;
      parts.push('<div class="saved-detail-legacy-sum">');
      if (ls.ma_period != null) parts.push(`<div>MA${esc(String(ls.ma_period))}</div>`);
      if (ls.day_count != null) parts.push(`<div>${esc(t('detailLegacyDays'))}: ${esc(String(ls.day_count))}</div>`);
      if (ls.current_yield_pct != null) parts.push(`<div>${esc(t('detailLegacyYield'))}: ${esc(String(ls.current_yield_pct))}</div>`);
      parts.push(`<div>${esc(t('detailLegacyTp'))}: ${ls.use_take_profit ? '✓' : '—'}</div>`);
      parts.push('</div>');
    } else {
      parts.push(`<p class="saved-detail-p muted">${esc(t('savedDetailNoStrat'))}</p>`);
    }
  }
  return parts.join('');
}

export async function openSavedDetail(id) {
  bindSavedDetailModal();
  _savedModalEntryId = id;
  const ov = document.getElementById('savedDetailModal');
  const body = document.getElementById('savedDetailBody');
  if (!ov || !body) return;
  body.innerHTML = `<p class="saved-detail-loading">${esc(t('loading'))}</p>`;
  updateSavedModalActions({});
  ov.classList.add('is-open');
  ov.setAttribute('aria-hidden', 'false');
  const res = await api(`/api/backtest/saved/detail?id=${encodeURIComponent(id)}`);
  if (!res.ok || !res.detail) {
    body.innerHTML = `<p class="saved-detail-err">${esc(res.error || 'fail')}</p>`;
    notyf.error(res.error || 'fail');
    updateSavedModalActions({});
    const ab = document.getElementById('savedDetailApply');
    if (ab) {
      ab.disabled = true;
      ab.title = t('savedApplyDisabled');
    }
    return;
  }
  body.innerHTML = renderDetailHtml(res.detail);
  updateSavedModalActions(res.detail);
}

export async function loadSaved() {
  bindSavedDetailModal();
  const res = await api('/api/backtest/saved');
  const tb = document.getElementById('tbSaved');
  tb.innerHTML = '';
  if (!res.ok || !res.items || !res.items.length) {
    tb.innerHTML = `<tr><td colspan="3" class="saved-empty">${t('savedEmpty')}</td></tr>`;
    return;
  }
  for (const it of res.items) {
    const tr = document.createElement('tr');
    const id = it.id || '';
    const ma = (it.ma || '').replace(/</g, '&lt;');
    const inv = (it.invest || '').replace(/</g, '&lt;');
    const tp = (it.take_profit || '').replace(/</g, '&lt;');
    tr.innerHTML = `
      <td class="mono saved-td-time">${it.saved_at || ''}</td>
      <td class="saved-cell-strat">
        <div class="saved-strat-line"><span class="saved-strat-label">${t('maPeriod')}</span>${ma || '—'}</div>
        <div class="saved-strat-line"><span class="saved-strat-label">${t('colInvest')}</span>${inv || '—'}</div>
        <div class="saved-strat-line"><span class="saved-strat-label">${t('colTp')}</span>${tp || '—'}</div>
      </td>
      <td class="saved-td-actions">
        <button type="button" class="btn btn-sm btn-accent" data-detail="${id}">${t('savedDetailOpen')}</button>
      </td>
    `;
    tr.querySelector('[data-detail]').onclick = () => openSavedDetail(id);
    tb.appendChild(tr);
  }
}

export async function replaySaved(id) {
  const res = await api('/api/backtest/replay', { method: 'POST', body: JSON.stringify({ id }) });
  if (!res.ok || !res.result) {
    notyf.error(res.error || 'fail');
    return;
  }
  navigate('backtest');
  applyReplayResult(res.result);
  notyf.success(t('savedReloadOk'));
}

export async function deleteSaved(id) {
  await api('/api/backtest/saved/delete', { method: 'POST', body: JSON.stringify({ ids: [id] }) });
  loadSaved();
}

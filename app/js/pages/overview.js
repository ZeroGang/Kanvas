import { api } from '../core/api.js';
import { notyf } from '../core/notyf.js';
import { t, curLang } from '../core/i18n.js';
import { getSpotMarketTab } from '../core/spotMarketTab.js';
import { updateLastUp } from '../shell.js';

function formatPrice(x) {
  if (x == null || !Number.isFinite(Number(x))) return '—';
  const n = Number(x);
  const abs = Math.abs(n);
  const locale = curLang === 'zh' ? 'zh-CN' : 'en-US';
  if (abs >= 1000) {
    return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (abs >= 1) {
    return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return n.toLocaleString(locale, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function rtPriceHint() {
  return curLang === 'zh' ? '盘中参考（AkShare）' : 'Intraday ref. (AkShare)';
}

async function fetchOverviewRealtimePrice() {
  const tab = getSpotMarketTab();
  return api(`/api/market/realtime-price?tab=${encodeURIComponent(tab)}`);
}

function applyRealtimePriceToDom(res) {
  const el = document.getElementById('stLastPrice');
  const asOfEl = document.getElementById('ovLastPriceAsOf');
  if (!el) return false;
  if (!res.ok || !Number.isFinite(Number(res.price))) {
    el.textContent = '—';
    if (asOfEl) asOfEl.textContent = '';
    return false;
  }
  el.textContent = formatPrice(Number(res.price));
  if (asOfEl) {
    const hint = rtPriceHint();
    const t = (res.as_of || '').trim();
    asOfEl.textContent = t ? (curLang === 'zh' ? `${t} · ${hint}` : `${hint} · ${t}`) : hint;
  }
  return true;
}

function setOverviewLastPriceUnit(cfg) {
  const uEl = document.getElementById('ovLastPriceUnit');
  if (!uEl) return;
  const tab = getSpotMarketTab();
  if (tab === 'cn') {
    uEl.textContent = curLang === 'zh' ? '（点）' : ' (pts)';
    return;
  }
  if (cfg && cfg.ok) {
    const u = curLang === 'zh' ? (cfg.price_unit || '').trim() : (cfg.price_unit_en || cfg.price_unit || '').trim();
    uEl.textContent = u ? (curLang === 'zh' ? `（${u}）` : ` (${u})`) : '';
  } else {
    uEl.textContent = '';
  }
}

async function updateOverviewLastPriceDisplay() {
  try {
    const res = await fetchOverviewRealtimePrice();
    applyRealtimePriceToDom(res);
  } catch {
    applyRealtimePriceToDom({ ok: false });
  }
}

export async function refreshOverviewLastPrice() {
  const btn = document.getElementById('ovPriceRefreshBtn');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('is-busy');
  }
  try {
    const res = await fetchOverviewRealtimePrice();
    const ok = applyRealtimePriceToDom(res);
    if (ok) notyf.success(curLang === 'zh' ? '盘中参考价已更新' : 'Realtime quote updated');
    else notyf.error(res.error || (curLang === 'zh' ? '无法获取盘中价' : 'Failed to fetch'));
  } catch (e) {
    notyf.error(String(e));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('is-busy');
    }
  }
}

export async function loadOverview() {
  const [cfg, mkt] = await Promise.all([api('/api/config'), api('/api/market/status')]);
  if (cfg.ok) {
    document.getElementById('stMa').textContent = 'MA' + (cfg.ma_period ?? '—');
    const lm = document.getElementById('labelMa');
    if (lm) lm.textContent = 'MA' + (cfg.ma_period || 20);
    const symEl = document.getElementById('stSpotName');
    if (symEl) {
      const tab = getSpotMarketTab();
      let show = '—';
      if (tab === 'cn') {
        const zh = (cfg.cn_a_chart_label_zh || '').trim();
        const en = (cfg.cn_a_chart_label_en || '').trim();
        show = zh || en || '—';
      } else {
        const zh = (cfg.gold_data_source_label || '').trim();
        const en = (cfg.gold_data_source_label_en || '').trim();
        show = zh || en || '—';
      }
      symEl.textContent = show || '—';
    }
    setOverviewLastPriceUnit(cfg);
  } else {
    const uEl = document.getElementById('ovLastPriceUnit');
    if (uEl) uEl.textContent = '';
  }
  await updateOverviewLastPriceDisplay();
  if (mkt.ok) document.getElementById('stBars').textContent = String(mkt.bar_count ?? 0);
  updateLastUp();
}

export async function doCalculate() {
  const gp = parseFloat(document.getElementById('inGoldPrice').value);
  const ma = parseFloat(document.getElementById('inMa').value);
  const res = await api('/api/calculate', {
    method: 'POST',
    body: JSON.stringify({ gold_price: gp, ma20: ma, save: false }),
  });
  if (!res.ok) {
    notyf.error(res.error || 'Error');
    return;
  }
  const box = document.getElementById('calcResult');
  box.style.display = 'block';
  const r = res.result;
  box.innerHTML = `
    <div><span class="highlight">${r.deviation}%</span> <span style="color:var(--text-2)">${t('colDev')}</span></div>
    <div style="margin-top:8px">${t('colMult')}: <b>${r.multiplier}</b> · ${t('colAmt')}: <b>${r.amount}</b> 元</div>
    <div style="margin-top:8px;color:var(--text-1)">${r.action || ''}</div>
    <div class="kanvas-tp-pre">${(res.take_profit_text || '').replace(/</g, '&lt;')}</div>
  `;
  notyf.success(curLang === 'zh' ? '计算完成' : 'Done');
  loadOverview();
}

export async function fillFromSpot() {
  const cfg = await api('/api/config');
  const maP = cfg.ma_period || 20;
  const days = Math.max(maP + 10, 40);
  const tab = getSpotMarketTab();
  const [rt, d] = await Promise.all([
    api(`/api/market/realtime-price?tab=${encodeURIComponent(tab)}`),
    tab === 'cn'
      ? api(`/api/cn-index-series?days=${days}&refresh=1`)
      : api(`/api/spot-series?days=${days}&refresh=1`),
  ]);
  if (!d.ok) {
    notyf.error(d.error || (curLang === 'zh' ? '请先刷新行情数据' : 'Fetch market data first'));
    return;
  }
  const n = d.closes.length;
  if (!n) return;
  let close = rt.ok && Number.isFinite(Number(rt.price)) ? Number(rt.price) : null;
  if (close == null) close = d.closes[n - 1];
  let ma = d.ma[n - 1];
  if (ma == null && n >= maP) {
    let s = 0;
    for (let i = n - maP; i < n; i++) s += d.closes[i];
    ma = s / maP;
  }
  document.getElementById('inGoldPrice').value = close;
  document.getElementById('inMa').value = ma != null ? String(ma) : '';
  notyf.success(curLang === 'zh' ? '已填入' : 'Filled');
}

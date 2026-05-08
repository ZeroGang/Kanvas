import { api } from '../core/api.js';
import { notyf } from '../core/notyf.js';
import { curLang, t } from '../core/i18n.js';
import { apexTheme } from '../core/theme.js';
import { charts } from '../state.js';
import { updateLastUp } from '../shell.js';

/** 接口不可用时回测天数的兜底（与页面预设默认一致） */
const FALLBACK_BACKTEST_DAYS = 500;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtFin(x) {
  if (x == null || (typeof x === 'number' && !Number.isFinite(x))) return '—';
  return Number(x).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(x) {
  if (x == null || (typeof x === 'number' && !Number.isFinite(x))) return '—';
  return `${Number(x).toFixed(2)}%`;
}

function fmtRatio(x) {
  if (x == null || (typeof x === 'number' && !Number.isFinite(x))) return '—';
  return Number(x).toFixed(4);
}

/** 渲染回测返回中的全部摘要指标（兼容旧版快照缺字段）。 */
export function renderBacktestMetricsHTML(r) {
  if (!r || r.ok === false) return '';
  const sym = esc(r.symbol ?? '—');
  const unit = r.unit ? esc(r.unit) : '';
  const symLine = unit ? `${sym} · ${unit}` : sym;
  const maP = r.ma_period != null ? `MA${r.ma_period}` : '—';

  const cells = [];
  const add = (labelKey, valHtml) => {
    cells.push(
      `<div class="report-stat"><div class="report-stat-val">${valHtml}</div><div class="report-stat-label">${t(labelKey)}</div></div>`
    );
  };

  add('btMetricSymbol', symLine);
  add('btMetricRequestedDays', esc(String(r.requested_days ?? '—')));
  add('btMetricDayCount', esc(String(r.day_count ?? '—')));
  add('btMetricDaysShortfall', esc(String(r.days_shortfall ?? '—')));
  add('btMetricMaPeriod', esc(maP));
  add('btMetricBaseAmount', fmtFin(r.base_amount));
  add('btMetricMaUnavailable', esc(String(r.ma_unavailable_days ?? '—')));
  add('btMetricTotalInvested', fmtFin(r.total_invested));
  add('btMetricTotalBuy', fmtFin(r.total_buy));
  add('btMetricTotalSell', fmtFin(r.total_sell));
  add('btMetricNetInvest', fmtFin(r.net_invest_end));
  add('btMetricEndEquity', fmtFin(r.end_equity));
  add('btMetricCumProfit', fmtFin(r.cumulative_profit));
  add('btMetricReturnPct', fmtPct(r.current_yield_pct));
  add('btMetricAnnualPct', fmtPct(r.hist_yield_pct_annual));
  add('btMetricMaxDD', fmtPct(r.max_drawdown_pct));
  add('btMetricSharpe', fmtRatio(r.sharpe_ratio_annual));
  add('btMetricSortino', fmtRatio(r.sortino_ratio_annual));
  add('btMetricCalmar', fmtRatio(r.calmar_ratio));
  add('btMetricVolAnn', fmtPct(r.equity_volatility_annual_pct));
  add('btMetricEndGold', fmtFin(r.end_gold_grams));
  add('btMetricEndGoldValue', fmtFin(r.end_gold_market_value));
  add('btMetricEndCash', fmtFin(r.end_cash));
  add('btMetricTpLevelHits', esc(String(r.take_profit_level_count ?? '—')));
  add('btMetricTpPullbackHits', esc(String(r.take_profit_pullback_count ?? '—')));
  add('btMetricTpSellTotal', esc(String(r.take_profit_sell_count ?? '—')));
  const yn = r.use_take_profit ? t('btMetricYes') : t('btMetricNo');
  add('btMetricSimTp', esc(yn));

  return cells.join('');
}

function resolvedBacktestDays(c) {
  const fromCfg = Number(c?.config?.backtest_days);
  if (Number.isFinite(fromCfg) && fromCfg > 0) return Math.floor(fromCfg);
  const fromDef = Number(c?.default_backtest_days);
  if (Number.isFinite(fromDef) && fromDef > 0) return Math.floor(fromDef);
  return FALLBACK_BACKTEST_DAYS;
}

/** 与 equity 长度对齐；缺字段或旧快照用全 0 */
function alignSellFlags(eqLen, flags) {
  if (!Array.isArray(flags) || flags.length === 0) return new Array(eqLen).fill(0);
  if (flags.length >= eqLen) return flags.slice(0, eqLen);
  const out = flags.slice();
  while (out.length < eqLen) out.push(0);
  return out;
}

/** 用 markers.discrete 挂在「持有权益」序列上（该序列在组合中的 index，恒为最后一项）。 */
function buildSellDiscreteMarkers(levelFlags, pbFlags, holdingSeriesIndex) {
  const discrete = [];
  const n = levelFlags.length;
  const si = holdingSeriesIndex;
  for (let i = 0; i < n; i++) {
    const lv = levelFlags[i] > 0;
    const pb = pbFlags[i] > 0;
    const both = lv && pb;
    if (lv) {
      discrete.push({
        seriesIndex: si,
        dataPointIndex: i,
        size: 7,
        fillColor: '#f59e0b',
        strokeColor: 'rgba(255,255,255,0.9)',
        strokeWidth: 2,
        shape: 'triangle',
        offsetY: both ? -5 : 0,
      });
    }
    if (pb) {
      discrete.push({
        seriesIndex: si,
        dataPointIndex: i,
        size: 7,
        fillColor: '#38bdf8',
        strokeColor: 'rgba(255,255,255,0.9)',
        strokeWidth: 2,
        shape: 'square',
        offsetY: both ? 5 : 0,
      });
    }
  }
  return discrete;
}

/**
 * 净值（品种收盘）、累计投入（日定投累加）、持有权益（组合）；净值与金额分轴。
 * 止盈标记在「持有权益」序列上（最后一项）。
 */
export function buildEquityChartOptions(r, accentColor) {
  const dates = r.dates || [];
  const eq = r.equity_curve || [];
  const nav =
    (Array.isArray(r.instrument_nav_curve) && r.instrument_nav_curve.length === eq.length && r.instrument_nav_curve) ||
    (Array.isArray(r.closes) && r.closes.length === eq.length && r.closes) ||
    [];
  const cumRaw = r.cumulative;
  const inv =
    Array.isArray(cumRaw) && cumRaw.length === eq.length
      ? cumRaw.map((x) => {
          const n = typeof x === 'number' ? x : parseFloat(x);
          return Number.isFinite(n) ? n : 0;
        })
      : [];

  const hasNav = nav.length > 0 && eq.length > 0 && nav.length === eq.length;
  const hasInv = inv.length > 0 && eq.length > 0 && inv.length === eq.length;
  const useTp = !!r.use_take_profit;

  const series = [];
  if (hasNav) {
    series.push({ name: t('btChartSeriesPointCurve'), type: 'line', data: nav, yAxisIndex: 1 });
  }
  if (hasInv) {
    series.push({ name: t('btChartSeriesInvestCurve'), type: 'line', data: inv, yAxisIndex: 0 });
  }
  series.push({ name: t('btChartSeriesHoldingEquity'), type: 'area', data: eq, yAxisIndex: 0 });

  const holdingSeriesIndex = series.length - 1;
  const levelFlags = alignSellFlags(eq.length, r.take_profit_level_by_day);
  const pbFlags = alignSellFlags(eq.length, r.take_profit_pullback_by_day);
  const discrete =
    useTp && eq.length > 0 ? buildSellDiscreteMarkers(levelFlags, pbFlags, holdingSeriesIndex) : [];

  const nSer = series.length;
  const grad = {
    shadeIntensity: 0.4,
    opacityFrom: 0.35,
    opacityTo: 0.05,
  };

  const widths = Array.from({ length: nSer }, () => 2);
  const dashArray = Array.from({ length: nSer }, (_, i) => {
    if (!hasInv) return 0;
    const investIdx = hasNav ? 1 : 0;
    return i === investIdx ? 6 : 0;
  });

  const colors = [];
  if (hasNav) colors.push('#64748b');
  if (hasInv) colors.push('#ca8a04');
  colors.push(accentColor);

  let fill;
  if (nSer === 1) {
    fill = { type: 'gradient', gradient: grad };
  } else {
    const types = Array.from({ length: nSer - 1 }, () => 'solid');
    types.push('gradient');
    fill = { type: types, gradient: grad };
  }

  const opts = {
    chart: {
      type: nSer > 1 ? 'line' : 'area',
      height: 360,
      fontFamily: 'Inter, sans-serif',
      toolbar: { show: false },
      zoom: { enabled: true },
    },
    theme: apexTheme(),
    stroke: { curve: 'straight', width: widths, dashArray },
    fill,
    colors,
    markers: {
      size: 0,
      hover: { sizeOffset: 3 },
      discrete,
    },
    grid: { borderColor: 'rgba(148,163,184,0.08)' },
    xaxis: {
      categories: dates,
      labels: { style: { colors: '#6b7280' }, rotate: -45, maxHeight: 80 },
    },
    yaxis: hasNav
      ? [
          { labels: { show: false } },
          { opposite: true, labels: { show: false } },
        ]
      : { labels: { show: false } },
    dataLabels: { enabled: false },
    tooltip: { theme: document.body.dataset.theme, shared: true, intersect: false },
    legend: { labels: { colors: '#9ca3b0' } },
    series,
  };

  if (useTp && discrete.length > 0) {
    opts.subtitle = {
      text: t('btChartSellMarkersHint'),
      align: 'right',
      offsetY: 4,
      style: { fontSize: '11px', fontWeight: 400, color: '#9ca3b0' },
    };
  }

  return opts;
}

function syncBtDaysPresetHighlight() {
  const input = document.getElementById('btDays');
  if (!input) return;
  const v = parseInt(input.value, 10);
  document.querySelectorAll('.bt-days-preset').forEach((btn) => {
    const d = parseInt(btn.getAttribute('data-bt-days'), 10);
    const on = Number.isFinite(v) && Number.isFinite(d) && v === d;
    btn.classList.toggle('bt-days-preset--active', on);
  });
}

function initBtDaysControls() {
  const input = document.getElementById('btDays');
  if (!input || input.dataset.btInit === '1') return;
  input.dataset.btInit = '1';
  document.querySelectorAll('.bt-days-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const d = parseInt(btn.getAttribute('data-bt-days'), 10);
      if (Number.isFinite(d) && d >= 1) {
        input.value = String(d);
        syncBtDaysPresetHighlight();
      }
    });
  });
  input.addEventListener('input', () => syncBtDaysPresetHighlight());
  input.addEventListener('change', () => syncBtDaysPresetHighlight());
}

export function syncBacktestForm() {
  initBtDaysControls();
  api('/api/config').then((c) => {
    if (c.ok && c.config) {
      const el = document.getElementById('btDays');
      if (el) {
        el.value = String(resolvedBacktestDays(c));
        syncBtDaysPresetHighlight();
      }
    }
  });
}

export async function runBacktest() {
  let days = parseInt(document.getElementById('btDays').value, 10);
  const cfg = await api('/api/config');
  if (!Number.isFinite(days) || days < 1) {
    days = resolvedBacktestDays(cfg);
  }
  const tp = cfg.ok && cfg.config && typeof cfg.config.take_profit === 'object' ? cfg.config.take_profit : null;
  const res = await api('/api/backtest/run', {
    method: 'POST',
    body: JSON.stringify({
      backtest_days: days,
      use_take_profit: true,
      ...(tp ? { take_profit: tp } : {}),
    }),
  });
  if (!res.ok) {
    notyf.error(res.error || 'Backtest failed');
    return;
  }
  document.getElementById('btSummaryCard').style.display = 'block';
  document.getElementById('btChartCard').style.display = 'block';
  const m = document.getElementById('btMetrics');
  m.innerHTML = renderBacktestMetricsHTML(res);
  const opts = buildEquityChartOptions(res, '#34d399');
  const el = document.querySelector('#chartEquity');
  el.innerHTML = '';
  if (charts.equity) charts.equity.destroy();
  charts.equity = new ApexCharts(el, opts);
  charts.equity.render();
  notyf.success(curLang === 'zh' ? '回测完成' : 'Done');
  updateLastUp();
}

/** 策略页「重算回测」后复用：只渲染摘要 + 权益图 */
export function applyReplayResult(r) {
  document.getElementById('btSummaryCard').style.display = 'block';
  document.getElementById('btChartCard').style.display = 'block';
  const m = document.getElementById('btMetrics');
  m.innerHTML = renderBacktestMetricsHTML(r);
  const el = document.querySelector('#chartEquity');
  el.innerHTML = '';
  if (charts.equity) charts.equity.destroy();
  charts.equity = new ApexCharts(el, buildEquityChartOptions(r, '#a78bfa'));
  charts.equity.render();
}

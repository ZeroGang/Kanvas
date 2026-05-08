import { curLang } from '../core/i18n.js';

let _calcBound = false;
let _ciChart = null;

const MODAL_IDS = ['calcTodayModal', 'calcReturnModal', 'calcDrawdownModal', 'calcCompoundModal', 'calcLoanModal'];

function calcModalSize(kind) {
  const vw = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 1024);
  const vh = Math.max(420, window.innerHeight || document.documentElement.clientHeight || 720);
  const marginX = vw < 760 ? 24 : 48;
  const marginY = vh < 640 ? 24 : 56;
  if (kind === 'large') {
    return {
      width: Math.min(Math.max(980, vw * 0.88), vw - marginX),
      maxHeight: Math.min(860, vh - marginY),
    };
  }
  return {
    width: Math.min(640, vw - marginX),
    maxHeight: Math.min(560, vh - marginY),
  };
}

function fitCalcModalSize(modal) {
  const sheet = modal?.querySelector('.modal-sheet');
  if (!sheet) return;
  const size = calcModalSize(sheet.dataset.calcSize || 'standard');
  sheet.style.width = `${Math.max(280, Math.round(size.width))}px`;
  sheet.style.maxHeight = `${Math.max(360, Math.round(size.maxHeight))}px`;
}

function fitOpenCalcModals() {
  MODAL_IDS.forEach((id) => {
    const modal = document.getElementById(id);
    if (modal?.classList.contains('is-open')) fitCalcModalSize(modal);
  });
  if (document.getElementById('calcCompoundModal')?.classList.contains('is-open')) renderCompoundChart();
}

function openCalcModal(id) {
  closeCalcModals();
  const modal = document.getElementById(id);
  if (!modal) return;
  fitCalcModalSize(modal);
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  refreshCalcPage();
  if (id === 'calcCompoundModal') renderCompoundChart();
  const firstInput = modal.querySelector('input');
  if (firstInput) firstInput.focus();
}

function closeCalcModals() {
  MODAL_IDS.forEach((id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  });
}

function fmtPct(x) {
  if (x == null || !Number.isFinite(Number(x))) return '—';
  const n = Number(x);
  const loc = curLang === 'zh' ? 'zh-CN' : 'en-US';
  return `${n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
}

function fmtMoney(x, withCurrency = false) {
  if (x == null || !Number.isFinite(Number(x))) return '—';
  const n = Number(x);
  const loc = curLang === 'zh' ? 'zh-CN' : 'en-US';
  const s = n.toLocaleString(loc, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return withCurrency ? `￥ ${s}` : s;
}

export function runCalcTargetReturn() {
  const cur = parseFloat(document.getElementById('calcRetCurNav')?.value || '');
  const tgt = parseFloat(document.getElementById('calcRetTgtNav')?.value || '');
  const out = document.getElementById('calcRetOut');
  if (!out) return;
  if (!(cur > 0) || !Number.isFinite(tgt)) {
    out.textContent = '—';
    return;
  }
  const pct = (tgt / cur - 1) * 100;
  out.textContent = Number.isFinite(pct) ? fmtPct(pct) : '—';
}

export function runCalcDrawdown() {
  const high = parseFloat(document.getElementById('calcDdHighNav')?.value || '');
  const cur = parseFloat(document.getElementById('calcDdCurNav')?.value || '');
  const out = document.getElementById('calcDdOut');
  if (!out) return;
  if (!(high > 0) || !Number.isFinite(cur)) {
    out.textContent = '—';
    return;
  }
  const pct = ((high - cur) / high) * 100;
  out.textContent = Number.isFinite(pct) ? fmtPct(pct) : '—';
}

function buildCompoundData() {
  const principal = parseFloat(document.getElementById('calcCiPrincipal')?.value || '');
  const monthly = parseFloat(document.getElementById('calcCiMonthly')?.value || '');
  const annualRatePct = parseFloat(document.getElementById('calcCiRatePct')?.value || '');
  const mode = document.querySelector('input[name="calcCiMode"]:checked')?.value === 'yearly' ? 'yearly' : 'monthly';
  const note = document.getElementById('calcCiModeNote');
  if (note) note.textContent = mode === 'yearly' ? '计算基于年度复利，历史表现不代表未来收益。' : '计算基于月度复利，历史表现不代表未来收益。';
  const yearsRaw = document.getElementById('calcCiPeriods')?.value;
  const years = yearsRaw === '' || yearsRaw == null ? NaN : Number(yearsRaw);
  const label = document.getElementById('calcCiYearsLabel');
  if (label && Number.isFinite(years)) label.textContent = `${years} 年`;

  if (!(principal >= 0) || !(monthly >= 0) || !Number.isFinite(annualRatePct) || !Number.isFinite(years) || years < 1) {
    return null;
  }

  const annualRate = annualRatePct / 100;
  const monthlyRate = (1 + annualRate) ** (1 / 12) - 1;
  const labels = [];
  const assets = [];
  const invested = [];
  let total = principal;

  for (let y = 0; y <= years; y += 1) {
    if (y > 0) {
      if (mode === 'yearly') {
        total += monthly * 12;
        total *= 1 + annualRate;
      } else {
        for (let m = 0; m < 12; m += 1) {
          total = total * (1 + monthlyRate) + monthly;
        }
      }
    }
    labels.push(`${y}年`);
    assets.push(Math.round(total));
    invested.push(Math.round(principal + monthly * 12 * y));
  }

  const finalAsset = assets[assets.length - 1];
  const finalInvested = invested[invested.length - 1];
  const profit = finalAsset - finalInvested;
  const returnPct = finalInvested > 0 ? (profit / finalInvested) * 100 : NaN;
  return { labels, assets, invested, finalAsset, finalInvested, profit, returnPct };
}

function renderCompoundChart() {
  const el = document.getElementById('calcCiChart');
  if (!el || typeof ApexCharts === 'undefined') return;
  const data = buildCompoundData();
  if (!data) {
    if (_ciChart) _ciChart.updateSeries([{ data: [] }, { data: [] }]);
    return;
  }

  const opts = {
    chart: { type: 'line', height: 260, fontFamily: 'Inter, sans-serif', toolbar: { show: false }, zoom: { enabled: false } },
    series: [
      { name: '总资产增长', data: data.assets },
      { name: '本金投入', data: data.invested },
    ],
    xaxis: { categories: data.labels, labels: { style: { colors: 'var(--text-2)' } } },
    yaxis: { labels: { formatter: (v) => `${Math.round(v / 10000)}万`, style: { colors: 'var(--text-2)' } } },
    stroke: { width: [3, 4], curve: 'smooth', dashArray: [0, 0] },
    markers: { size: [4, 4], strokeWidth: 2, hover: { size: 6 } },
    colors: ['#ef4444', '#facc15'],
    fill: { type: 'solid', opacity: [0.10, 0.06] },
    grid: { borderColor: 'rgba(148,163,184,0.22)' },
    legend: { position: 'bottom', labels: { colors: ['#ef4444', '#facc15'] }, markers: { fillColors: ['#ef4444', '#facc15'] } },
    tooltip: {
      custom: ({ series, dataPointIndex, w }) => {
        const names = w.globals.seriesNames;
        const colors = w.globals.colors;
        const rows = series.map((s, i) => `
          <div style="display:flex;justify-content:space-between;gap:18px;color:${colors[i]};font-weight:600;">
            <span>${names[i]}</span><span>${fmtMoney(s[dataPointIndex], true)}</span>
          </div>
        `).join('');
        return `<div style="padding:8px 10px;background:var(--bg-2);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow-md);">
          <div style="margin-bottom:6px;color:var(--text-1);font-weight:600;">${data.labels[dataPointIndex]}</div>${rows}
        </div>`;
      },
    },
  };

  if (_ciChart) {
    _ciChart.updateOptions(opts, false, true);
  } else {
    _ciChart = new ApexCharts(el, opts);
    _ciChart.render();
  }
}

export function runCalcCompoundInterest() {
  const data = buildCompoundData();
  const totalOut = document.getElementById('calcCiTotalOut');
  const investedOut = document.getElementById('calcCiInvestedOut');
  const profitOut = document.getElementById('calcCiProfitOut');
  const returnOut = document.getElementById('calcCiReturnOut');
  if (!totalOut || !investedOut || !profitOut || !returnOut) return;
  if (!data) {
    totalOut.textContent = '—';
    investedOut.textContent = '—';
    profitOut.textContent = '—';
    returnOut.textContent = '—';
    renderCompoundChart();
    return;
  }
  totalOut.textContent = fmtMoney(data.finalAsset, true);
  investedOut.textContent = fmtMoney(data.finalInvested, true);
  profitOut.textContent = fmtMoney(data.profit, true);
  returnOut.textContent = Number.isFinite(data.returnPct) ? fmtPct(data.returnPct) : '—';
  renderCompoundChart();
}

function activeLoanMode() {
  return document.querySelector('#calcLoanModal [data-loan-mode].is-active')?.getAttribute('data-loan-mode') || 'commercial';
}

function syncLoanModeFields() {
  const isCombo = activeLoanMode() === 'combo';
  const single = document.getElementById('loanSingleFields');
  const combo = document.getElementById('loanComboFields');
  if (single) single.style.display = isCombo ? 'none' : '';
  if (combo) combo.style.display = isCombo ? '' : 'none';
}

function calcLoanPart(amountWan, annualRatePct, years, type) {
  if (!(amountWan > 0) || !Number.isFinite(annualRatePct) || !(years > 0)) return null;
  const principal = amountWan * 10000;
  const months = years * 12;
  const monthlyRate = annualRatePct / 100 / 12;
  const rows = [];
  let totalPay = 0;
  let remaining = principal;

  if (type === 'equal_principal') {
    const principalPart = principal / months;
    for (let i = 1; i <= months; i += 1) {
      const interest = remaining * monthlyRate;
      const payment = principalPart + interest;
      remaining = Math.max(0, remaining - principalPart);
      totalPay += payment;
      rows.push({ i, payment, principal: principalPart, interest, remaining });
    }
  } else {
    const payment = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate * (1 + monthlyRate) ** months / ((1 + monthlyRate) ** months - 1);
    for (let i = 1; i <= months; i += 1) {
      const interest = remaining * monthlyRate;
      const principalPart = payment - interest;
      remaining = Math.max(0, remaining - principalPart);
      totalPay += payment;
      rows.push({ i, payment, principal: principalPart, interest, remaining });
    }
  }
  return { principal, totalPay, rows };
}

function combineLoanParts(parts) {
  const valid = parts.filter(Boolean);
  if (!valid.length) return null;
  const rows = valid[0].rows.map((_, idx) => ({
    i: idx + 1,
    payment: valid.reduce((sum, p) => sum + p.rows[idx].payment, 0),
    principal: valid.reduce((sum, p) => sum + p.rows[idx].principal, 0),
    interest: valid.reduce((sum, p) => sum + p.rows[idx].interest, 0),
    remaining: valid.reduce((sum, p) => sum + p.rows[idx].remaining, 0),
  }));
  return {
    principal: valid.reduce((sum, p) => sum + p.principal, 0),
    totalPay: valid.reduce((sum, p) => sum + p.totalPay, 0),
    rows,
  };
}

function runLoanCalculator() {
  syncLoanModeFields();
  const mode = activeLoanMode();
  const years = parseInt(document.getElementById('loanYears')?.value || '', 10);
  const type = document.getElementById('loanRepayType')?.value || 'equal_payment';
  const monthlyOut = document.getElementById('loanMonthlyOut');
  const totalOut = document.getElementById('loanTotalOut');
  const interestOut = document.getElementById('loanInterestOut');
  const body = document.getElementById('loanScheduleBody');
  if (!monthlyOut || !totalOut || !interestOut || !body) return;

  body.innerHTML = '';
  let result = null;
  if (mode === 'combo') {
    result = combineLoanParts([
      calcLoanPart(parseFloat(document.getElementById('loanCommercialAmount')?.value || ''), parseFloat(document.getElementById('loanCommercialRate')?.value || ''), years, type),
      calcLoanPart(parseFloat(document.getElementById('loanFundAmount')?.value || ''), parseFloat(document.getElementById('loanFundRate')?.value || ''), years, type),
    ]);
  } else {
    result = calcLoanPart(
      parseFloat(document.getElementById('loanAmount')?.value || ''),
      parseFloat(document.getElementById('loanRate')?.value || ''),
      years,
      type,
    );
  }

  if (!result) {
    monthlyOut.textContent = '—';
    totalOut.textContent = '—';
    interestOut.textContent = '—';
    return;
  }

  monthlyOut.textContent = type === 'equal_principal'
    ? `${fmtMoney(result.rows[0]?.payment || 0)} 元起`
    : `${fmtMoney(result.rows[0]?.payment || 0)} 元`;
  totalOut.textContent = `${fmtMoney(result.totalPay)} 元`;
  interestOut.textContent = `${fmtMoney(result.totalPay - result.principal)} 元`;
  body.innerHTML = result.rows.map((r) => `<tr><td>第${r.i}期</td><td>${fmtMoney(r.payment)}</td><td>${fmtMoney(r.principal)}</td><td>${fmtMoney(r.interest)}</td><td>${fmtMoney(r.remaining)}</td></tr>`).join('');
}

export function refreshCalcPage() {
  runCalcTargetReturn();
  runCalcDrawdown();
  runCalcCompoundInterest();
  runLoanCalculator();
}

export function initCalcPage() {
  const root = document.getElementById('page-overview');
  if (!root) return;
  if (!_calcBound) {
    _calcBound = true;
    root.addEventListener('click', (evt) => {
      const targetEl = evt.target;
      if (!(targetEl instanceof Element)) return;
      const btn = targetEl.closest('[data-calc-modal]');
      if (!btn) return;
      evt.preventDefault();
      openCalcModal(btn.getAttribute('data-calc-modal'));
    });
    MODAL_IDS.forEach((id) => {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.addEventListener('input', () => refreshCalcPage());
      modal.addEventListener('click', (evt) => {
        const targetEl = evt.target;
        if (!(targetEl instanceof Element)) return;
        const preset = targetEl.closest('[data-ci-rate]');
        if (preset) {
          const rateInput = document.getElementById('calcCiRatePct');
          if (rateInput) rateInput.value = preset.getAttribute('data-ci-rate') || '';
          refreshCalcPage();
          return;
        }
        const loanModeBtn = targetEl.closest('[data-loan-mode]');
        if (loanModeBtn) {
          modal.querySelectorAll('[data-loan-mode]').forEach((btn) => btn.classList.toggle('is-active', btn === loanModeBtn));
          const rateInput = document.getElementById('loanRate');
          const mode = loanModeBtn.getAttribute('data-loan-mode');
          if (rateInput && mode === 'commercial') rateInput.value = '3.25';
          if (rateInput && mode === 'fund') rateInput.value = '2.85';
          syncLoanModeFields();
          refreshCalcPage();
          return;
        }
        if (targetEl.closest('#loanCalcBtn')) {
          refreshCalcPage();
          return;
        }
        if (targetEl === modal || targetEl.closest('[data-calc-close]')) closeCalcModals();
      });
    });
    document.addEventListener('keydown', (evt) => {
      if (evt.key === 'Escape') closeCalcModals();
    });
    window.addEventListener('resize', fitOpenCalcModals);
  }
  refreshCalcPage();
}

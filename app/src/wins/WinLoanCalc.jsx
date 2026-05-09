import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import WinModal from './WinModal';

export default function WinLoanCalc({ t, isOpen, onClose }) {
  const [loanMode, setLoanMode] = useState('commercial');
  const [loanAmount, setLoanAmount] = useState(33);
  const [loanCommercialAmount, setLoanCommercialAmount] = useState(70);
  const [loanCommercialRate, setLoanCommercialRate] = useState(3.05);
  const [loanFundAmount, setLoanFundAmount] = useState(30);
  const [loanFundRate, setLoanFundRate] = useState(2.85);
  const [loanYears, setLoanYears] = useState(10);
  const [loanRepayType, setLoanRepayType] = useState('equal_payment');
  const [loanResult, setLoanResult] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [themeKey, setThemeKey] = useState(0);
  const chartRef = useRef(null);

  const calculateLoan = () => {
    let totalAmount, rate;
    if (loanMode === 'commercial') {
      totalAmount = parseFloat(loanAmount) * 10000;
      rate = parseFloat(loanCommercialRate) / 100 / 12;
    } else if (loanMode === 'fund') {
      totalAmount = parseFloat(loanFundAmount) * 10000;
      rate = parseFloat(loanFundRate) / 100 / 12;
    } else {
      const cAmt = parseFloat(loanCommercialAmount) * 10000;
      const cRate = parseFloat(loanCommercialRate) / 100 / 12;
      const fAmt = parseFloat(loanFundAmount) * 10000;
      const fRate = parseFloat(loanFundRate) / 100 / 12;
      totalAmount = cAmt + fAmt;
      rate = (cAmt * cRate + fAmt * fRate) / totalAmount;
    }
    const months = parseInt(loanYears) * 12;
    let monthlyPayment, totalInterest, totalPayment;
    const schedule = [];

    if (loanRepayType === 'equal_payment') {
      const factor = Math.pow(1 + rate, months);
      monthlyPayment = (totalAmount * rate * factor) / (factor - 1);
      totalPayment = monthlyPayment * months;
      totalInterest = totalPayment - totalAmount;

      let remaining = totalAmount;
      for (let i = 0; i < months; i++) {
        const interest = remaining * rate;
        const principal = monthlyPayment - interest;
        remaining -= principal;
        schedule.push({
          month: i + 1,
          payment: monthlyPayment,
          principal: principal,
          interest: interest,
          remaining: Math.max(0, remaining)
        });
      }
    } else {
      const principalPerMonth = totalAmount / months;
      let interestSum = 0;
      let remaining = totalAmount;
      for (let i = 0; i < months; i++) {
        const interest = remaining * rate;
        interestSum += interest;
        const payment = principalPerMonth + interest;
        remaining -= principalPerMonth;
        schedule.push({
          month: i + 1,
          payment: payment,
          principal: principalPerMonth,
          interest: interest,
          remaining: Math.max(0, remaining)
        });
      }
      totalInterest = interestSum;
      totalPayment = totalAmount + totalInterest;
      monthlyPayment = totalPayment / months;
    }

    setLoanResult({
      totalAmount,
      monthlyPayment,
      totalPayment,
      totalInterest,
    });
    setScheduleData(schedule);
  };

  // Listen for theme changes to re-render chart
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeKey(k => k + 1);
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  }, []);

  const getChartOption = () => {
    if (!scheduleData) return {};

    const sampleInterval = Math.max(1, Math.floor(scheduleData.length / 36));
    const sampledData = scheduleData.filter((_, i) => i % sampleInterval === 0);

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9ca3b0' : '#4b5563';
    const borderColor = isDark ? 'rgba(148,163,184,0.07)' : 'rgba(15,23,42,0.07)';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        backgroundColor: isDark ? '#1a1e27' : '#ffffff',
        borderColor: borderColor,
        textStyle: {
          color: isDark ? '#e8ecf1' : '#111827'
        },
        formatter: (params) => {
          let result = `第${params[0].axisValue}期<br/>`;
          params.forEach(param => {
            result += `${param.marker} ${param.seriesName}: ¥${param.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: [t('calcLoanPrincipal'), t('calcLoanInterest'), t('calcLoanRemaining')],
        textStyle: {
          color: textColor
        },
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: sampledData.map(item => item.month),
        axisLabel: {
          color: textColor,
          formatter: (value) => {
            const year = Math.floor((value - 1) / 12) + 1;
            return `第${year}年`;
          }
        },
        axisLine: {
          lineStyle: {
            color: borderColor
          }
        },
        axisTick: {
          lineStyle: {
            color: borderColor
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: textColor,
          formatter: (value) => `¥${(value / 10000).toFixed(1)}万`
        },
        axisLine: {
          lineStyle: {
            color: borderColor
          }
        },
        splitLine: {
          lineStyle: {
            color: borderColor
          }
        }
      },
      series: [
        {
          name: t('calcLoanPrincipal'),
          type: 'line',
          smooth: true,
          data: sampledData.map(item => item.principal),
          itemStyle: {
            color: '#3b82f6'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
              ]
            }
          }
        },
        {
          name: t('calcLoanInterest'),
          type: 'line',
          smooth: true,
          data: sampledData.map(item => item.interest),
          itemStyle: {
            color: '#ef4444'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(239, 68, 68, 0.5)' },
                { offset: 1, color: 'rgba(239, 68, 68, 0.1)' }
              ]
            }
          }
        },
        {
          name: t('calcLoanRemaining'),
          type: 'line',
          smooth: true,
          data: sampledData.map(item => item.remaining),
          itemStyle: {
            color: '#22c55e'
          },
          yAxisIndex: 0
        }
      ]
    };
  };

  if (!isOpen) return null;

  return (
    <WinModal title={t('calcLoanTitle')} onClose={onClose} size="large">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <section>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            <i className="ph ph-sliders-horizontal" /> {t('calcLoanTitle')}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              type="button"
              className={`btn ${loanMode === 'commercial' ? 'btn-accent' : ''}`}
              onClick={() => setLoanMode('commercial')}
            >
              {t('calcLoanCommercial')}
            </button>
            <button
              type="button"
              className={`btn ${loanMode === 'fund' ? 'btn-accent' : ''}`}
              onClick={() => setLoanMode('fund')}
            >
              {t('calcLoanFund')}
            </button>
            <button
              type="button"
              className={`btn ${loanMode === 'combo' ? 'btn-accent' : ''}`}
              onClick={() => setLoanMode('combo')}
            >
              {t('calcLoanCombo')}
            </button>
          </div>

          {loanMode === 'commercial' && (
            <div className="kanvas-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="filter-group">
                <label><i className="ph ph-house" /> {t('calcLoanAmount')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanAmount}
                    onChange={e => setLoanAmount(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>￥</span>
                </div>
              </div>
              <div className="filter-group">
                <label><i className="ph ph-percent" /> {t('calcLoanRate')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanCommercialRate}
                    onChange={e => setLoanCommercialRate(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          )}

          {loanMode === 'fund' && (
            <div className="kanvas-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="filter-group">
                <label><i className="ph ph-bank" /> {t('calcLoanAmount')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanFundAmount}
                    onChange={e => setLoanFundAmount(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>￥</span>
                </div>
              </div>
              <div className="filter-group">
                <label><i className="ph ph-percent" /> {t('calcLoanRate')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanFundRate}
                    onChange={e => setLoanFundRate(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          )}

          {loanMode === 'combo' && (
            <div className="kanvas-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="filter-group">
                <label><i className="ph ph-building-office" /> {t('calcLoanCommercialAmount')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanCommercialAmount}
                    onChange={e => setLoanCommercialAmount(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>￥</span>
                </div>
              </div>
              <div className="filter-group">
                <label><i className="ph ph-percent" /> {t('calcLoanCommercialRate')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanCommercialRate}
                    onChange={e => setLoanCommercialRate(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="filter-group">
                <label><i className="ph ph-bank" /> {t('calcLoanFundAmount')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanFundAmount}
                    onChange={e => setLoanFundAmount(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>￥</span>
                </div>
              </div>
              <div className="filter-group">
                <label><i className="ph ph-percent" /> {t('calcLoanFundRate')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="filter-input"
                    value={loanFundRate}
                    onChange={e => setLoanFundRate(e.target.value)}
                    min="0"
                    step="any"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          )}

          <div className="kanvas-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div className="filter-group">
              <label><i className="ph ph-calendar" /> {t('calcLoanYears')}</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="filter-input"
                  value={loanYears}
                  onChange={e => setLoanYears(e.target.value)}
                  min="1"
                  max="40"
                  step="1"
                />
                <span>年</span>
              </div>
            </div>
            <div className="filter-group">
              <label><i className="ph ph-arrows-left-right" /> {t('calcLoanRepayType')}</label>
              <select
                className="filter-input"
                value={loanRepayType}
                onChange={e => setLoanRepayType(e.target.value)}
              >
                <option value="equal_payment">{t('calcLoanEqualPayment')}</option>
                <option value="equal_principal">{t('calcLoanEqualPrincipal')}</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-accent" onClick={calculateLoan}>
              <i className="ph ph-calculator" /> {t('btnCalc')}
            </button>
          </div>
        </section>
        <section>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            <i className="ph ph-chart-pie-slice" /> {t('calcLoanRepaymentOverview')}
          </div>
          <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span><i className="ph ph-money" /> {t('calcLoanMonthlyPayment')}</span>
              <b>{loanResult ? `¥${loanResult.monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span><i className="ph ph-stack" /> {t('calcLoanTotalPayment')}</span>
              <b>{loanResult ? `¥${loanResult.totalPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><i className="ph ph-percent" /> {t('calcLoanTotalInterest')}</span>
              <b>{loanResult ? `¥${loanResult.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</b>
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            <i className="ph ph-chart-line" /> {t('calcLoanRepaymentChart')}
          </div>
          <div style={{ height: '300px' }}>
            {scheduleData ? (
              <ReactECharts
                key={themeKey}
                ref={chartRef}
                option={getChartOption()}
                style={{ height: '100%', width: '100%' }}
              />
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-2)'
              }}>
                {t('calcLoanChartPlaceholder').replace('{btnCalc}', t('btnCalc'))}
              </div>
            )}
          </div>
        </section>
      </div>
    </WinModal>
  );
}

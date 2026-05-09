import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import WinModal from './WinModal';

export default function WinCompoundCalc({ t, isOpen, onClose }) {
  const [ciPrincipal, setCiPrincipal] = useState(500000);
  const [ciMonthly, setCiMonthly] = useState(10000);
  const [ciRatePct, setCiRatePct] = useState(15);
  const [ciMode, setCiMode] = useState('monthly');
  const [ciYears, setCiYears] = useState(10);
  const [ciResult, setCiResult] = useState(null);
  const [ciChartData, setCiChartData] = useState(null);
  const [themeKey, setThemeKey] = useState(0);

  const calculateCompound = () => {
    const p = parseFloat(ciPrincipal) || 0;
    const m = parseFloat(ciMonthly) || 0;
    const r = parseFloat(ciRatePct) / 100;
    const y = parseInt(ciYears) || 0;
    const periods = ciMode === 'monthly' ? y * 12 : y;
    const rate = ciMode === 'monthly' ? r / 12 : r;
    
    let total = p;
    let invested = p;
    const yearsData = [];
    const totalData = [];
    const investedData = [];
    
    yearsData.push(0);
    totalData.push(p);
    investedData.push(p);
    
    for (let i = 1; i <= periods; i++) {
      if (ciMode === 'monthly') {
        total = (total + m) * (1 + rate);
        invested += m;
      } else {
        total = total * (1 + rate) + m * 12;
        invested += m * 12;
      }
      
      if (ciMode === 'monthly' ? i % 12 === 0 : i % 1 === 0) {
        const year = ciMode === 'monthly' ? i / 12 : i;
        yearsData.push(year);
        totalData.push(total);
        investedData.push(invested);
      }
    }
    
    const profit = total - invested;
    const totalRet = invested > 0 ? (profit / invested) * 100 : 0;
    setCiResult({ total, invested, profit, totalRet });
    setCiChartData({ years: yearsData, total: totalData, invested: investedData });
  };

  useEffect(() => {
    if (isOpen && !ciChartData) {
      calculateCompound();
    }
  }, [isOpen]);

  // Listen for theme changes
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
    if (!ciChartData) return {};
    
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9ca3b0' : '#4b5563';
    const borderColor = isDark ? 'rgba(148,163,184,0.07)' : 'rgba(15,23,42,0.07)';
    
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1a1e27' : '#ffffff',
        borderColor: borderColor,
        textStyle: {
          color: isDark ? '#e8ecf1' : '#111827'
        },
        formatter: (params) => {
          let result = `${t('calcCompoundYears').replace('{years}', params[0].name)}<br/>`;
          params.forEach(param => {
            result += `${param.marker} ${param.seriesName}: ¥${param.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: [t('calcCompoundChartTotal'), t('calcCompoundChartInvested')],
        textStyle: {
          color: textColor
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ciChartData.years.map(y => `${y}`),
        axisLabel: {
          color: textColor
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
          formatter: (val) => `¥${(val / 10000).toFixed(0)}万`
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
          name: t('calcCompoundChartTotal'),
          type: 'line',
          smooth: true,
          data: ciChartData.total,
          itemStyle: {
            color: '#22c55e'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(34, 197, 94, 0.5)' },
                { offset: 1, color: 'rgba(34, 197, 94, 0.1)' }
              ]
            }
          }
        },
        {
          name: t('calcCompoundChartInvested'),
          type: 'line',
          smooth: true,
          data: ciChartData.invested,
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
        }
      ]
    };
  };

  if (!isOpen) return null;

  return (
    <WinModal title={t('calcCompoundTitle')} onClose={onClose} size="large">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <section>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div className="filter-group" style={{ flex: 1, minWidth: 0 }}>
              <label><i className="ph ph-piggy-bank" /> {t('calcCompoundPrincipal')}</label>
              <div className="calc-ci-input-wrap">
                <input
                  type="number"
                  className="filter-input"
                  value={ciPrincipal}
                  onChange={e => setCiPrincipal(e.target.value)}
                  min="0"
                  step="any"
                />
                <span>￥</span>
              </div>
            </div>
            <div className="filter-group" style={{ flex: 1, minWidth: 0 }}>
              <label><i className="ph ph-hand-coins" /> {t('calcCompoundMonthly')}</label>
              <div className="calc-ci-input-wrap">
                <input
                  type="number"
                  className="filter-input"
                  value={ciMonthly}
                  onChange={e => setCiMonthly(e.target.value)}
                  min="0"
                  step="any"
                />
                <span>￥</span>
              </div>
            </div>
            <div className="filter-group" style={{ flex: 1, minWidth: 0 }}>
              <label><i className="ph ph-percent" /> {t('calcCompoundRate')}</label>
              <div className="calc-ci-input-wrap">
                <input
                  type="number"
                  className="filter-input"
                  value={ciRatePct}
                  onChange={e => setCiRatePct(e.target.value)}
                  step="any"
                />
                <span>%</span>
              </div>
            </div>
          </div>
          <div className="filter-group">
            <label><i className="ph ph-repeat" /> {t('calcCompoundMode')}</label>
            <div role="radiogroup">
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                <input type="radio" name="calcCiMode" value="monthly" checked={ciMode === 'monthly'} onChange={() => setCiMode('monthly')} /> {t('calcCompoundMonthlyMode')}
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" name="calcCiMode" value="yearly" checked={ciMode === 'yearly'} onChange={() => setCiMode('yearly')} /> {t('calcCompoundYearlyMode')}
              </label>
            </div>
          </div>
          <div className="filter-group">
            <label><i className="ph ph-calendar" /> {t('calcCompoundYears')}: <b>{t('calcCompoundYearsLabel').replace('{years}', ciYears)}</b></label>
            <input
              type="range"
              value={ciYears}
              onChange={e => setCiYears(e.target.value)}
              min="1"
              max="30"
              step="1"
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button type="button" className="btn" onClick={() => setCiRatePct(10)}><i className="ph ph-chart-line-up" /> {t('calcCompoundSnp500')}</button>
            <button type="button" className="btn" onClick={() => setCiRatePct(15)}><i className="ph ph-rocket-launch" /> {t('calcCompoundNasdaq100')}</button>
            <button type="button" className="btn" onClick={() => setCiRatePct(3.5)}><i className="ph ph-shield-check" /> {t('calcCompoundStable')}</button>
          </div>
          <div>
            <button type="button" className="btn btn-accent" onClick={calculateCompound}>
              <i className="ph ph-calculator" /> {t('calcCompoundCalculate')}
            </button>
          </div>
        </section>
        <section>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', padding: '20px', background: 'var(--bg-2)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-2)', marginBottom: '8px' }}><i className="ph ph-flag-checkered" /> {t('calcCompoundTotalAssets')}</div>
            <div style={{ fontSize: '32px', fontWeight: '700' }}>
              {ciResult ? `¥${ciResult.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
            </div>
          </div>
          <div style={{ height: '250px', marginBottom: '16px' }}>
            {ciChartData ? (
              <ReactECharts
                key={themeKey}
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
                {t('calcCompoundChartPlaceholder').replace('{btnCalc}', t('calcCompoundCalculate'))}
              </div>
            )}
          </div>
          {ciResult && (
            <div style={{ background: 'var(--bg-2)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span><i className="ph ph-wallet" /> {t('calcCompoundTotalInvested')}</span>
                <b>¥{ciResult.invested.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span><i className="ph ph-coins" /> {t('calcCompoundProfit')}</span>
                <b style={{ color: ciResult.profit >= 0 ? '#22c55e' : '#ef4444' }}>¥{ciResult.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><i className="ph ph-trending-up" /> {t('calcCompoundTotalReturn')}</span>
                <b style={{ color: ciResult.totalRet >= 0 ? '#22c55e' : '#ef4444' }}>{ciResult.totalRet.toFixed(2)}%</b>
              </div>
            </div>
          )}
        </section>
      </div>
    </WinModal>
  );
}

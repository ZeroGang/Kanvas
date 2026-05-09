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

  const getChartOption = () => {
    if (!ciChartData) return {};
    
    return {
      title: {
        show: false
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          let result = `第${params[0].name}年<br/>`;
          params.forEach(param => {
            result += `${param.marker} ${param.seriesName}: ¥${param.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: ['总金额', '累计本金'],
        textStyle: {
          color: 'var(--text)'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ciChartData.years.map(y => `${y}年`),
        axisLabel: {
          color: 'var(--text-muted)'
        },
        axisLine: {
          lineStyle: {
            color: 'var(--border)'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: 'var(--text-muted)',
          formatter: (val) => `¥${(val / 10000).toFixed(0)}万`
        },
        axisLine: {
          lineStyle: {
            color: 'var(--border)'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'var(--border)'
          }
        }
      },
      series: [
        {
          name: '总金额',
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
          name: '累计本金',
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
    <WinModal title={t('calcCompoundToolBtn')} onClose={onClose} size="large">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <section>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            <i className="ph ph-sliders-horizontal" /> 策略配置
          </div>
          <div className="filter-group">
            <label><i className="ph ph-piggy-bank" /> 初始本金</label>
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
          <div className="filter-group">
            <label><i className="ph ph-hand-coins" /> 每月追加定投</label>
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
          <div className="filter-group">
            <label><i className="ph ph-percent" /> 预期年化收益率</label>
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
          <div className="filter-group">
            <label><i className="ph ph-repeat" /> 复利方式</label>
            <div role="radiogroup">
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                <input type="radio" name="calcCiMode" value="monthly" checked={ciMode === 'monthly'} onChange={() => setCiMode('monthly')} /> 按月复利
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" name="calcCiMode" value="yearly" checked={ciMode === 'yearly'} onChange={() => setCiMode('yearly')} /> 按年复利
              </label>
            </div>
          </div>
          <div className="filter-group">
            <label><i className="ph ph-calendar" /> 投资时长: <b>{ciYears} 年</b></label>
            <input
              type="range"
              value={ciYears}
              onChange={e => setCiYears(e.target.value)}
              min="1"
              max="30"
              step="1"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <i className="ph ph-clock-counter-clockwise" /> 参考历史指数
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={() => setCiRatePct(10)}><i className="ph ph-chart-line-up" /> 标普500 (10%)</button>
              <button type="button" className="btn" onClick={() => setCiRatePct(15)}><i className="ph ph-rocket-launch" /> 纳指100 (15%)</button>
              <button type="button" className="btn" onClick={() => setCiRatePct(3.5)}><i className="ph ph-shield-check" /> 稳健理财 (3.5%)</button>
            </div>
          </div>
          <div>
            <button type="button" className="btn btn-accent" onClick={calculateCompound}>
              <i className="ph ph-calculator" /> 立即计算
            </button>
          </div>
        </section>
        <section>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}><i className="ph ph-flag-checkered" /> 到期预估总资产</div>
            <div style={{ fontSize: '32px', fontWeight: '700' }}>
              {ciResult ? `¥${ciResult.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
            </div>
          </div>
          <div style={{ height: '220px', marginBottom: '16px' }}>
            {ciChartData ? (
              <ReactECharts
                option={getChartOption()}
                style={{ height: '100%', width: '100%' }}
              />
            ) : (
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--text-muted)' 
              }}>
                点击"立即计算"查看图表
              </div>
            )}
          </div>
          {ciResult && (
            <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span><i className="ph ph-wallet" /> 累计投入本金</span>
                <b>¥{ciResult.invested.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span><i className="ph ph-coins" /> 累计复利收益</span>
                <b style={{ color: '#22c55e' }}>¥{ciResult.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><i className="ph ph-trend-up" /> 复利收益率</span>
                <b>{ciResult.totalRet.toFixed(2)}%</b>
              </div>
            </div>
          )}
          <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
            <i className="ph ph-info" /> 计算基于月度复利，历史表现不代表未来收益。
          </div>
        </section>
      </div>
    </WinModal>
  );
}

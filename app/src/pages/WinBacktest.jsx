import React, { useRef, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';

export function WinBacktest({ t }) {
  const [showChart, setShowChart] = useState(false);
  
  const chartOption = {
    title: {
      text: t('equityCurve'),
      textStyle: {
        color: '#e8ecf1',
        fontSize: 16
      },
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
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
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
      axisLine: {
        lineStyle: {
          color: '#9ca3b0'
        }
      },
      axisLabel: {
        color: '#9ca3b0'
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#9ca3b0'
        }
      },
      axisLabel: {
        color: '#9ca3b0'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.1)'
        }
      }
    },
    series: [
      {
        name: t('btChartSeriesPointCurve'),
        type: 'line',
        smooth: true,
        data: [10000, 12000, 11000, 15000, 14000, 18000],
        lineStyle: {
          color: '#34d399',
          width: 2
        },
        itemStyle: {
          color: '#34d399'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(52, 211, 153, 0.3)' },
              { offset: 1, color: 'rgba(52, 211, 153, 0.05)' }
            ]
          }
        }
      }
    ]
  };

  const handleRunBacktest = () => {
    setShowChart(true);
  };

  return (
    <>
      <div className="card sec">
        <div className="sec-header">
          <div>
            <div className="sec-title"><i className="ph ph-chart-line-up"></i> <span>{t('backtestRun')}</span></div>
            <div className="sec-desc">{t('backtestRunDesc')}</div>
          </div>
        </div>
        <div className="kanvas-form-grid">
          <div className="filter-group">
            <label>{t('backtestDays')}</label>
            <input type="number" className="filter-input" id="btDays" min="1" defaultValue="120" />
          </div>
          <div className="filter-group">
            <button type="button" className="btn btn-accent" onClick={handleRunBacktest}>
              <i className="ph ph-play"></i> <span>{t('btnRunBacktest')}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="card chart-section" id="btSummaryCard" style={{ display: 'none' }}>
        <div className="chart-header">
          <div><div className="sec-title">{t('btMetrics')}</div></div>
        </div>
        <div id="btMetrics" className="report-grid"></div>
      </div>
      {showChart && (
        <div className="card chart-section" id="btChartCard">
          <div className="chart-header">
            <div><div className="sec-title">{t('equityCurve')}</div></div>
          </div>
          <div className="ch-wrap ch-wrap-tall">
            <ReactECharts
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
              theme="dark"
            />
          </div>
        </div>
      )}
    </>
  );
}

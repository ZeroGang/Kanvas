import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { api } from '../lib/api.js';

export function WinSpot({ t }) {
  const [activeTab, setActiveTab] = useState('metal');
  const [marketStatus, setMarketStatus] = useState(null);
  const [realtimePrice, setRealtimePrice] = useState(null);
  const [spotInstruments, setSpotInstruments] = useState([]);
  const [cnIndexInstruments, setCnIndexInstruments] = useState([]);
  const [seriesData, setSeriesData] = useState([]);
  const [days, setDays] = useState(60);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [spotCatalog, setSpotCatalog] = useState([]);
  const [cnCatalog, setCnCatalog] = useState([]);
  
  const chartRef = useRef(null);

  // 加载市场状态和实时价格
  const loadMarketData = async () => {
    try {
      const [statusRes, priceRes, spotRes, cnRes] = await Promise.all([
        api('/api/market/status'),
        api(`/api/market/realtime-price?tab=${activeTab}`),
        api('/api/spot/instruments'),
        api('/api/cn-a-index/instruments')
      ]);

      if (statusRes.ok) {
        // 适配后端API格式
        setMarketStatus({
          ma_period: 20,  // 默认值
          bars: statusRes.bar_count,
          active_name: statusRes.symbol,
          as_of: statusRes.last_bar_date,
          meta: `数据来源: ${statusRes.source}, 品种: ${statusRes.symbol}`,
          ...statusRes
        });
      }
      if (priceRes.ok) {
        // 适配后端API格式
        setRealtimePrice({
          last_price: priceRes.price,
          ...priceRes
        });
      }
      if (spotRes.ok) {
        if (spotRes.items) {
          setSpotInstruments(spotRes.items);
        }
        if (spotRes.catalog) {
          setSpotCatalog(spotRes.catalog);
        }
      }
      if (cnRes.ok) {
        if (cnRes.items) {
          setCnIndexInstruments(cnRes.items);
        }
        if (cnRes.catalog) {
          setCnCatalog(cnRes.catalog);
        }
      }
    } catch (err) {
      console.error('加载市场数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 切换品种选择
  const toggleInstrument = async (instrument, isSpot) => {
    const currentList = isSpot ? [...spotInstruments] : [...cnIndexInstruments];
    const updatedList = currentList.map(inst => {
      if (inst.id === instrument.id) {
        return { ...inst, active: !inst.active };
      }
      return inst;
    });
    
    if (isSpot) {
      setSpotInstruments(updatedList);
    } else {
      setCnIndexInstruments(updatedList);
    }
    
    // 保存到后端
    const endpoint = isSpot ? '/api/spot/instruments' : '/api/cn-a-index/instruments';
    await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({ 
        items: updatedList.filter(inst => inst.active).map(inst => inst.id) 
      })
    });
    
    // 刷新数据
    await loadMarketData();
    await loadChartData();
  };

  // 重置为默认品种
  const resetInstruments = async (isSpot) => {
    const endpoint = isSpot ? '/api/spot/instruments' : '/api/cn-a-index/instruments';
    await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({ reset_default: true })
    });
    await loadMarketData();
  };

  // 加载图表数据
  const loadChartData = async () => {
    try {
      const endpoint = activeTab === 'metal' 
        ? `/api/spot-series?days=${days}` 
        : `/api/cn-index-series?days=${days}`;
      
      const res = await api(endpoint);
      if (res.ok && res.series) {
        // 适配后端API格式：后端返回 [dates, prices]
        let mappedSeries = [];
        if (Array.isArray(res.series) && res.series.length === 2) {
          const [dates, prices] = res.series;
          // 计算MA20
          const ma20 = [];
          for (let i = 0; i < prices.length; i++) {
            let sum = 0;
            let count = 0;
            for (let j = Math.max(0, i - 19); j <= i; j++) {
              sum += prices[j];
              count++;
            }
            ma20.push(count > 0 ? sum / count : null);
          }
          // 转换为前端格式
          mappedSeries = dates.map((date, index) => ({
            date: date,
            price: prices[index],
            ma: ma20[index]
          }));
        } else if (Array.isArray(res.series) && res.series.length > 0 && res.series[0].date) {
          // 已经是正确格式
          mappedSeries = res.series;
        }
        setSeriesData(mappedSeries);
      } else {
        console.warn('图表数据加载失败:', res);
        setSeriesData([]);
      }
    } catch (err) {
      console.error('加载图表数据失败:', err);
      setSeriesData([]);
    }
  };

  // 获取市场数据
  const fetchMarketData = async () => {
    try {
      // 获取对应标签页的数据
      const fetchEndpoint = activeTab === 'metal' 
        ? '/api/market/fetch' 
        : '/api/cn-index/fetch';
      
      await api(fetchEndpoint, { method: 'POST', body: JSON.stringify({ force: true }) });
      
      // 重新加载所有数据
      await loadMarketData();
      await loadChartData();
    } catch (err) {
      console.error('获取市场数据失败:', err);
    }
  };

  // 初始化和切换标签时加载数据
  useEffect(() => {
    loadMarketData();
    loadChartData();
  }, [activeTab]);

  // 切换标签
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // 重新绘制图表
  const handleRedraw = () => {
    loadChartData();
  };

  // 图表配置
  const getChartOption = () => {
    if (!seriesData || !seriesData.length) {
      return {
        title: {
          text: '暂无数据，请先点击"获取数据"按钮',
          left: 'center',
          textStyle: { color: '#999' }
        }
      };
    }

    const dates = seriesData.map(d => d.date);
    const prices = seriesData.map(d => d.price);
    const maValues = seriesData.map(d => d.ma);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(20, 24, 35, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#fff' }
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
        data: dates,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: 'rgba(255, 255, 255, 0.6)' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: 'rgba(255, 255, 255, 0.6)' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      series: [
        {
          name: t('spotLastPrice') || '价格',
          type: 'line',
          data: prices,
          smooth: true,
          lineStyle: { color: '#c9a227', width: 2 },
          itemStyle: { color: '#c9a227' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(201, 162, 39, 0.3)' },
                { offset: 1, color: 'rgba(201, 162, 39, 0)' }
              ]
            }
          }
        },
        {
          name: `MA${marketStatus?.ma_period || 20}`,
          type: 'line',
          data: maValues,
          smooth: true,
          lineStyle: { color: '#4f9fff', width: 1.5 },
          itemStyle: { color: '#4f9fff' }
        }
      ]
    };
  };

  // 获取统计卡片显示值
  const getStatValue = (value, fallback = '—') => {
    if (value == null || value === '') return fallback;
    return value;
  };

  return (
    <>
      <div className="stat-cards" style={{ marginBottom: '16px' }}>
        <div className="stat-card card">
          <div className="stat-header">
            <div className="stat-icon si-a"><i className="ph ph-currency-circle-dollar" /></div>
            <button 
              type="button" 
              className="stat-refresh-btn" 
              title={t('ovRefreshPrice')} 
              aria-label={t('ovRefreshPrice')}
              onClick={fetchMarketData}
            >
              <i className="ph ph-arrows-clockwise" />
            </button>
          </div>
          <div className="stat-value">
            {getStatValue(realtimePrice?.last_price, '—')}
          </div>
          <div className="stat-value-asof">
            {marketStatus?.asof ? `更新于 ${marketStatus.asof}` : ''}
          </div>
          <div className="stat-label stat-label--with-suffix">
            <span>{t('ovLastPrice')}</span>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-header">
            <div className="stat-icon si-b"><i className="ph ph-chart-bar" /></div>
          </div>
          <div className="stat-value">
            {getStatValue(marketStatus?.ma_period, '—')}
          </div>
          <div className="stat-label">{t('maPeriod')}</div>
        </div>
        <div className="stat-card card">
          <div className="stat-header">
            <div className="stat-icon si-g"><i className="ph ph-database" /></div>
          </div>
          <div className="stat-value">
            {getStatValue(marketStatus?.bars, '—')}
          </div>
          <div className="stat-label">{t('spotBars')}</div>
        </div>
        <div className="stat-card card">
          <div className="stat-header">
            <div className="stat-icon si-p"><i className="ph ph-tag" /></div>
          </div>
          <div className="stat-value stat-value--spot-name">
            {getStatValue(marketStatus?.active_name, '—')}
          </div>
          <div className="stat-label">{t('spotActiveName')}</div>
        </div>
      </div>

      <div className="card sec">
        <div className="sec-header">
          <div>
            <div className="sec-title">
              <i className="ph ph-chart-line"></i> <span>{t('spotTitle')}</span>
            </div>
            <div className="sec-desc" id="spotMeta">
              {marketStatus?.meta || '—'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn btn-accent"
              onClick={fetchMarketData}
            >
              <i className="ph ph-arrows-clockwise"></i> <span>{t('btnFetch')}</span>
            </button>
            {activeTab === 'metal' && (
              <button 
                type="button" 
                className="btn spot-metal-only" 
                title={t('btnExportSpotAkCsv')}
              >
                <i className="ph ph-download-simple"></i> <span>{t('btnExportSpotAkCsv')}</span>
              </button>
            )}
          </div>
        </div>
        <div className="spot-market-tabs" role="tablist" aria-label="market kind">
          <button 
            type="button" 
            className={`spot-market-tab ${activeTab === 'metal' ? 'is-active' : ''}`} 
            role="tab" 
            data-spot-tab="metal"
            onClick={() => handleTabChange('metal')}
          >
            {t('spotTabMetal')}
          </button>
          <button 
            type="button" 
            className={`spot-market-tab ${activeTab === 'cn' ? 'is-active' : ''}`} 
            role="tab" 
            data-spot-tab="cn"
            onClick={() => handleTabChange('cn')}
          >
            {t('spotTabCnIndex')}
          </button>
        </div>
        <div 
          className="spot-instruments-block" 
          id="spotMetalSection"
          style={{ display: activeTab === 'metal' ? 'block' : 'none' }}
        >
          <div className="spot-instruments-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('spotCategory')}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)' }}
                onClick={() => resetInstruments(true)}
                title="重置默认"
              >
                <i className="ph ph-arrow-counter-clockwise"></i>
              </button>
              <button 
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}
                onClick={() => setShowAddModal({ type: 'spot' })}
                title="管理品种"
              >
                <i className="ph ph-plus-circle"></i>
              </button>
            </div>
          </div>
          <div className="spot-instrument-list" id="spotInstrumentList" role="list">
            {spotInstruments.map((inst, idx) => (
              <div 
                key={idx}
                className={`spot-instrument ${inst.active ? 'is-active' : ''}`}
                role="listitem"
              >
                <input 
                  type="checkbox" 
                  className="spot-instrument-check" 
                  checked={inst.active || false}
                  onChange={() => toggleInstrument(inst, true)}
                  id={`spot-inst-${idx}`}
                />
                <label htmlFor={`spot-inst-${idx}`} className="spot-instrument-label">
                  {inst.name_zh}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div 
          className="spot-instruments-block" 
          id="spotCnIndexSection"
          style={{ display: activeTab === 'cn' ? 'block' : 'none' }}
        >
          <div className="spot-instruments-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('spotCnCategory')}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)' }}
                onClick={() => resetInstruments(false)}
                title="重置默认"
              >
                <i className="ph ph-arrow-counter-clockwise"></i>
              </button>
              <button 
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}
                onClick={() => setShowAddModal({ type: 'cn' })}
                title="管理品种"
              >
                <i className="ph ph-plus-circle"></i>
              </button>
            </div>
          </div>
          <div className="spot-instrument-list" id="cnIndexInstrumentList" role="list">
            {cnIndexInstruments.map((inst, idx) => (
              <div 
                key={idx}
                className={`spot-instrument ${inst.active ? 'is-active' : ''}`}
                role="listitem"
              >
                <input 
                  type="checkbox" 
                  className="spot-instrument-check" 
                  checked={inst.active || false}
                  onChange={() => toggleInstrument(inst, false)}
                  id={`cn-inst-${idx}`}
                />
                <label htmlFor={`cn-inst-${idx}`} className="spot-instrument-label">
                  {inst.name_zh}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* 品种管理弹窗 */}
        {showAddModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }} onClick={() => setShowAddModal(null)}>
            <div style={{
              backgroundColor: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '400px',
              maxHeight: '80vh',
              overflow: 'auto'
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>
                  {showAddModal.type === 'spot' ? '管理黄金品种' : '管理指数品种'}
                </h3>
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px' }}
                  onClick={() => setShowAddModal(null)}
                >
                  &times;
                </button>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}>
                {(showAddModal.type === 'spot' ? spotCatalog : cnCatalog).map((item, idx) => {
                  const isActive = (showAddModal.type === 'spot' ? spotInstruments : cnIndexInstruments)
                    .find(inst => inst.id === item.id)?.active;
                  
                  return (
                    <label key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: isActive ? 'var(--accent-bg)' : 'transparent',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={isActive || false}
                        onChange={async () => {
                          const currentList = showAddModal.type === 'spot' ? [...spotInstruments] : [...cnIndexInstruments];
                          
                          let updatedList;
                          const existing = currentList.find(inst => inst.id === item.id);
                          
                          if (existing) {
                            updatedList = currentList.map(inst => {
                              if (inst.id === item.id) {
                                return { ...inst, active: !inst.active };
                              }
                              return inst;
                            });
                          } else {
                            updatedList = [...currentList, { ...item, active: true }];
                          }
                          
                          if (showAddModal.type === 'spot') {
                            setSpotInstruments(updatedList);
                          } else {
                            setCnIndexInstruments(updatedList);
                          }
                          
                          const endpoint = showAddModal.type === 'spot' 
                            ? '/api/spot/instruments' 
                            : '/api/cn-a-index/instruments';
                          await api(endpoint, {
                            method: 'POST',
                            body: JSON.stringify({ 
                              items: updatedList.filter(inst => inst.active).map(inst => inst.id) 
                            })
                          });
                          await loadMarketData();
                          await loadChartData();
                        }}
                      />
                      <span>{item.name_zh}</span>
                    </label>
                  );
                })}
              </div>
              
              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button 
                  type="button"
                  className="btn"
                  onClick={() => setShowAddModal(null)}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="kanvas-form-grid" style={{ maxWidth: '400px' }}>
          <div className="filter-group">
            <label>{t('spotDays')}</label>
            <input 
              type="number" 
              className="filter-input" 
              id="spotDays" 
              min="7" 
              max="365" 
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 60)}
            />
          </div>
          <div className="filter-group">
            <button 
              type="button" 
              className="btn"
              onClick={handleRedraw}
            >
              <i className="ph ph-arrows-clockwise"></i> <span>{t('btnRedraw')}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="card chart-section">
        <div className="ch-wrap ch-wrap-tall">
          <ReactECharts 
            ref={chartRef}
            option={getChartOption()} 
            style={{ height: '100%', minHeight: '400px' }}
            theme="dark"
          />
        </div>
      </div>
    </>
  );
}

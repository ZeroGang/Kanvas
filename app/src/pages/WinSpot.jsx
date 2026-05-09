import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { api } from '../lib/api.js';

export function WinSpot({ t }) {
  const [marketList, setMarketList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [spotInstruments, setSpotInstruments] = useState([]);
  const [cnIndexInstruments, setCnIndexInstruments] = useState([]);
  const [spotCatalog, setSpotCatalog] = useState([]);
  const [cnCatalog, setCnCatalog] = useState([]);
  const chartRef = useRef(null);

  // 加载基础数据
  const loadBaseData = async () => {
    try {
      const [spotRes, cnRes] = await Promise.all([
        api('/api/spot/instruments'),
        api('/api/cn-a-index/instruments')
      ]);

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
      console.error('加载基础数据失败:', err);
    }
  };

  // 加载品种行情列表（同时加载黄金和指数）
  const loadMarketList = async () => {
    try {
      const [metalRes, cnRes] = await Promise.all([
        api('/api/instruments/market-list?tab=metal'),
        api('/api/instruments/market-list?tab=cn')
      ]);
      
      const metalList = metalRes.ok && metalRes.instruments ? metalRes.instruments : [];
      const cnList = cnRes.ok && cnRes.instruments ? cnRes.instruments : [];
      
      setMarketList([...metalList, ...cnList]);
    } catch (err) {
      console.error('加载品种行情列表失败:', err);
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
    await loadMarketList();
  };

  // 加载品种历史数据
  const loadInstrumentSeries = async (instrument) => {
    const isSpot = spotCatalog.some(item => item.id === instrument.id);
    const tab = isSpot ? 'metal' : 'cn';
    return api(`/api/instrument-series?symbol=${instrument.id}&days=30&tab=${tab}`);
  };

  // 点击品种行打开图表
  const handleInstrumentClick = async (instrument) => {
    setSelectedInstrument(instrument);
    setShowChartModal(true);
    setLoadingChart(true);
    setChartData([]); // 先清空，然后显示加载状态
    try {
      const res = await loadInstrumentSeries(instrument);
      console.log('API响应:', res); // 添加调试
      if (res.ok && res.series) {
        setChartData(res.series);
      } else {
        console.log('数据为空:', res);
      }
    } catch (err) {
      console.error('加载历史数据失败:', err);
    } finally {
      setLoadingChart(false);
    }
  };

  // 初始化时加载数据
  useEffect(() => {
    loadBaseData();
    loadMarketList();
  }, []);

  // 图表配置
  const getChartOption = () => {
    if (loadingChart) {
      return {
        title: {
          text: '加载中...',
          left: 'center',
          textStyle: { color: '#999' }
        }
      };
    }
    
    if (!chartData || !chartData.length) {
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          textStyle: { color: '#999' }
        }
      };
    }

    const dates = chartData.map(d => d.date);
    const prices = chartData.map(d => d.price);

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
          name: '价格',
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
        }
      ]
    };
  };

  return (
    <>
      <div className="card sec">
        {/* 按钮区域 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button 
            type="button" 
            className="btn"
            onClick={loadMarketList}
          >
            <i className="ph ph-arrows-clockwise"></i> <span>刷新</span>
          </button>
          <button 
            type="button" 
            className="btn"
            onClick={() => setShowAddModal(true)}
          >
            <i className="ph ph-plus-circle"></i> <span>新增</span>
          </button>
        </div>

        {/* 品种行情列表 */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>品种</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>净值</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>涨跌幅</th>
              </tr>
            </thead>
            <tbody>
              {marketList.map((inst, idx) => {
                // 格式化更新时间为 mm-dd 格式
                let updateTimeStr = '';
                if (inst.update_time) {
                  const date = new Date(inst.update_time);
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  updateTimeStr = `${month}-${day}`;
                }
                
                return (
                  <tr 
                    key={idx} 
                    style={{ 
                      borderBottom: '1px solid var(--border-l)', 
                      transition: 'background-color 0.2s',
                      cursor: 'pointer'
                    }} 
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-2)'} 
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => handleInstrumentClick(inst)}
                  >
                    <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '500' }}>{inst.name_zh}({inst.id})</div>
                  </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', fontFamily: 'var(--mono)' }}>
                      {inst.price !== null ? (
                        <>
                          <div style={{ fontSize: '18px', fontWeight: '500' }}>{inst.price}</div>
                          {updateTimeStr && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{updateTimeStr}</div>}
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px' }}>
                      {inst.change !== null ? (
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          backgroundColor: inst.change >= 0 ? '#f87171' : '#4ade80',
                          color: '#fff',
                          fontWeight: '500',
                          fontFamily: 'var(--mono)',
                          fontSize: '13px'
                        }}>
                          {inst.change >= 0 ? '+' : ''}{inst.change.toFixed(2)}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>管理品种</h3>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px' }}
                onClick={() => setShowAddModal(false)}
              >
                &times;
              </button>
            </div>
            
            {/* 黄金品种 */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>黄金品种</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}>
                {spotCatalog.map((item, idx) => {
                  const isActive = spotInstruments.find(inst => inst.id === item.id)?.active;
                  
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
                          const currentList = [...spotInstruments];
                          
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
                          
                          setSpotInstruments(updatedList);
                          
                          const endpoint = '/api/spot/instruments';
                          await api(endpoint, {
                            method: 'POST',
                            body: JSON.stringify({ 
                              items: updatedList.filter(inst => inst.active).map(inst => inst.id) 
                            })
                          });
                          await loadMarketList();
                        }}
                      />
                      <span>{item.label_zh}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 指数品种 */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>指数品种</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}>
                {cnCatalog.map((item, idx) => {
                  const isActive = cnIndexInstruments.find(inst => inst.id === item.id)?.active;
                  
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
                          const currentList = [...cnIndexInstruments];
                          
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
                          
                          setCnIndexInstruments(updatedList);
                          
                          const endpoint = '/api/cn-a-index/instruments';
                          await api(endpoint, {
                            method: 'POST',
                            body: JSON.stringify({ 
                              items: updatedList.filter(inst => inst.active).map(inst => inst.id) 
                            })
                          });
                          await loadMarketList();
                        }}
                      />
                      <span>{item.label_zh}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            
            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button 
                type="button"
                className="btn"
                onClick={() => setShowAddModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 图表弹窗 */}
      {showChartModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--bg-0)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-1)'
          }}>
            <button 
              className="settings-back-btn"
              onClick={() => setShowChartModal(false)}
            >
              <i className="ph ph-arrow-left"></i>
            </button>
            <h1 className="settings-title" style={{ marginLeft: '16px' }}>
              {selectedInstrument?.name_zh}({selectedInstrument?.id})
            </h1>
          </div>
          <div style={{ flex: 1, padding: '24px', backgroundColor: 'var(--bg-0)' }}>
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <ReactECharts 
                key={`${selectedInstrument?.id || 'empty'}-${loadingChart}-${chartData.length}`}
                ref={chartRef}
                option={getChartOption()} 
                style={{ height: '100%', width: '100%' }}
                theme="dark"
                notMerge={true}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

export function WinSpot({ t }) {
  const [activeTab, setActiveTab] = useState('metal');
  const [spotInstruments, setSpotInstruments] = useState([]);
  const [cnIndexInstruments, setCnIndexInstruments] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [spotCatalog, setSpotCatalog] = useState([]);
  const [cnCatalog, setCnCatalog] = useState([]);
  const [marketList, setMarketList] = useState([]);

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

  // 加载品种行情列表
  const loadMarketList = async () => {
    try {
      const res = await api(`/api/instruments/market-list?tab=${activeTab}`);
      if (res.ok && res.instruments) {
        setMarketList(res.instruments);
      }
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

  // 重置为默认品种
  const resetInstruments = async (isSpot) => {
    const endpoint = isSpot ? '/api/spot/instruments' : '/api/cn-a-index/instruments';
    await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({ reset_default: true })
    });
    await loadBaseData();
  };

  // 初始化和切换标签时加载数据
  useEffect(() => {
    loadBaseData();
    loadMarketList();
  }, [activeTab]);

  // 切换标签
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <>
      <div className="card sec">
        <div className="sec-header">
          <div>
            <div className="sec-title">
              <i className="ph ph-chart-line"></i> <span>{t('spotTitle')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn"
              onClick={loadMarketList}
            >
              <i className="ph ph-arrows-clockwise"></i> <span>刷新</span>
            </button>
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
                          await loadMarketList();
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

        {/* 品种行情列表 */}
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="sec-header">
            <div>
              <div className="sec-title">
                <i className="ph ph-list"></i> <span>品种行情</span>
              </div>
              <div className="sec-desc">
                实时价格及涨跌幅
              </div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>品种</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>最新价格</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>涨跌幅</th>
                </tr>
              </thead>
              <tbody>
                {marketList.map((inst, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-l)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-2)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500' }}>{inst.name_zh}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{inst.name_en}</div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', fontFamily: 'var(--mono)' }}>
                      {inst.price !== null ? (
                        <span>
                          {inst.price.toLocaleString()}
                          {inst.unit && <span style={{ marginLeft: '4px', color: 'var(--text-muted)' }}>{inst.unit}</span>}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px' }}>
                      {inst.change !== null ? (
                        <span style={{ 
                          color: inst.change >= 0 ? '#4ade80' : '#f87171',
                          fontWeight: '500',
                          fontFamily: 'var(--mono)'
                        }}>
                          {inst.change >= 0 ? '+' : ''}{inst.change.toFixed(2)}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

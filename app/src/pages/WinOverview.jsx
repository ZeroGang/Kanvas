import React, { useState } from 'react';
import WinTodayCalc from '../wins/WinTodayCalc';
import WinReturnCalc from '../wins/WinReturnCalc';
import WinDrawdownCalc from '../wins/WinDrawdownCalc';
import WinCompoundCalc from '../wins/WinCompoundCalc';
import WinLoanCalc from '../wins/WinLoanCalc';

export function WinOverview({ t }) {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <>
      <div className="card sec" style={{ marginBottom: '16px' }}>
        <div className="sec-header">
          <div>
            <div className="sec-title"><i className="ph ph-wallet" /> <span>{t('totalAssets')}</span></div>
          </div>
        </div>
        <div className="stat-value" style={{ fontSize: '32px', marginTop: '8px' }}>¥ 0.00</div>
      </div>

      <div className="card sec" style={{ marginBottom: '16px' }}>
        <div className="sec-header">
          <div>
            <div className="sec-title"><i className="ph ph-list" /> <span>{t('assetDetails')}</span></div>
          </div>
        </div>
        <div style={{ color: 'var(--text-2)', padding: '16px 0' }}>
          暂无资产明细
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card card">
          <div className="stat-header">
            <div className="stat-icon si-a"><i className="ph ph-currency-circle-dollar" /></div>
            <button type="button" className="stat-refresh-btn" title={t('ovRefreshPrice')} aria-label={t('ovRefreshPrice')}>
              <i className="ph ph-arrows-clockwise" />
            </button>
          </div>
          <div className="stat-value">—</div>
          <div className="stat-value-asof" />
          <div className="stat-label stat-label--with-suffix"><span>{t('ovLastPrice')}</span></div>
        </div>
        <div className="stat-card card">
          <div className="stat-header"><div className="stat-icon si-b"><i className="ph ph-chart-bar" /></div></div>
          <div className="stat-value">—</div>
          <div className="stat-label">{t('maPeriod')}</div>
        </div>
        <div className="stat-card card">
          <div className="stat-header"><div className="stat-icon si-g"><i className="ph ph-database" /></div></div>
          <div className="stat-value">—</div>
          <div className="stat-label">{t('spotBars')}</div>
        </div>
        <div className="stat-card card">
          <div className="stat-header"><div className="stat-icon si-p"><i className="ph ph-tag" /></div></div>
          <div className="stat-value stat-value--spot-name">—</div>
          <div className="stat-label">{t('spotActiveName')}</div>
        </div>
      </div>

      <div className="card sec">
        <div className="sec-header">
          <div>
            <div className="sec-title"><i className="ph ph-calculator" /> <span>{t('calcPageTitle')}</span></div>
            <div className="sec-desc">{t('calcPageDesc')}</div>
          </div>
        </div>
        <div className="calc-tool-grid">
          <button type="button" className="calc-tool-card" onClick={() => setActiveModal('today')}>
            <i className="ph ph-play" /> <span>{t('todayCalc')}</span>
          </button>
          <button type="button" className="calc-tool-card" onClick={() => setActiveModal('return')}>
            <i className="ph ph-trend-up" /> <span>{t('calcBlock1Title')}</span>
          </button>
          <button type="button" className="calc-tool-card" onClick={() => setActiveModal('drawdown')}>
            <i className="ph ph-trend-down" /> <span>{t('calcBlock2Title')}</span>
          </button>
          <button type="button" className="calc-tool-card" onClick={() => setActiveModal('compound')}>
            <i className="ph ph-coins" /> <span>{t('calcCompoundToolBtn')}</span>
          </button>
          <button type="button" className="calc-tool-card" onClick={() => setActiveModal('loan')}>
            <i className="ph ph-house-line" /> <span>贷款计算器</span>
          </button>
        </div>
      </div>

      <WinTodayCalc t={t} isOpen={activeModal === 'today'} onClose={() => setActiveModal(null)} />
      <WinReturnCalc t={t} isOpen={activeModal === 'return'} onClose={() => setActiveModal(null)} />
      <WinDrawdownCalc t={t} isOpen={activeModal === 'drawdown'} onClose={() => setActiveModal(null)} />
      <WinCompoundCalc t={t} isOpen={activeModal === 'compound'} onClose={() => setActiveModal(null)} />
      <WinLoanCalc isOpen={activeModal === 'loan'} onClose={() => setActiveModal(null)} />
    </>
  );
}

import React, { useState } from 'react';
import WinTodayCalc from '../wins/WinTodayCalc';
import WinReturnCalc from '../wins/WinReturnCalc';
import WinDrawdownCalc from '../wins/WinDrawdownCalc';
import WinCompoundCalc from '../wins/WinCompoundCalc';
import WinLoanCalc from '../wins/WinLoanCalc';

export function WinHoldings({ t }) {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <>
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

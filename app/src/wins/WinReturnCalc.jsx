import React, { useState } from 'react';
import WinModal from './WinModal';
import { CompInput, CompFormGrid } from '../components/CompIndex';

export default function WinReturnCalc({ t, isOpen, onClose }) {
  const [retCurNav, setRetCurNav] = useState('');
  const [retTgtNav, setRetTgtNav] = useState('');
  const [retResult, setRetResult] = useState(null);

  const calculateReturn = () => {
    const cur = parseFloat(retCurNav);
    const tgt = parseFloat(retTgtNav);
    if (!cur || !tgt || cur <= 0) return;
    const ret = ((tgt - cur) / cur) * 100;
    setRetResult({ cur, tgt, ret });
  };

  if (!isOpen) return null;

  return (
    <WinModal title={t('calcBlock1Title')} onClose={onClose}>
      <div className="calc-sub-desc">{t('calcBlock1Desc')}</div>
      <CompFormGrid>
        <CompInput
          label={t('calcLabelCurNav')}
          value={retCurNav}
          onChange={e => setRetCurNav(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && calculateReturn()}
          min="0"
        />
        <CompInput
          label={t('calcLabelTgtNav')}
          value={retTgtNav}
          onChange={e => setRetTgtNav(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && calculateReturn()}
          min="0"
        />
        <div className="filter-group">
          <label>{t('calcLabelResultReturn')}</label>
          <div className="calc-out mono">{retResult ? `${retResult.ret.toFixed(2)}%` : '—'}</div>
        </div>
      </CompFormGrid>
    </WinModal>
  );
}

import React, { useState } from 'react';
import WinModal from './WinModal';
import { CompInput, CompFormGrid } from '../components/CompIndex';

export default function WinDrawdownCalc({ t, isOpen, onClose }) {
  const [ddHighNav, setDdHighNav] = useState('');
  const [ddCurNav, setDdCurNav] = useState('');
  const [ddResult, setDdResult] = useState(null);

  const calculateDrawdown = () => {
    const high = parseFloat(ddHighNav);
    const cur = parseFloat(ddCurNav);
    if (!high || !cur || high <= 0) return;
    const dd = ((high - cur) / high) * 100;
    setDdResult({ high, cur, dd });
  };

  if (!isOpen) return null;

  return (
    <WinModal title={t('calcBlock2Title')} onClose={onClose}>
      <div className="calc-sub-desc">{t('calcBlock2Desc')}</div>
      <CompFormGrid>
        <CompInput
          label={t('calcLabelHighNav')}
          value={ddHighNav}
          onChange={e => setDdHighNav(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && calculateDrawdown()}
          min="0"
        />
        <CompInput
          label={t('calcLabelDdCurNav')}
          value={ddCurNav}
          onChange={e => setDdCurNav(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && calculateDrawdown()}
          min="0"
        />
        <div className="filter-group">
          <label>{t('calcLabelResultDrawdown')}</label>
          <div className="calc-out mono">{ddResult ? `${ddResult.dd.toFixed(2)}%` : '—'}</div>
        </div>
      </CompFormGrid>
    </WinModal>
  );
}

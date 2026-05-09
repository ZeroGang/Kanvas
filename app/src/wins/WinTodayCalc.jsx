import React, { useState } from 'react';
import WinModal from './WinModal';
import { CompInput, CompButton, CompFormGrid, CompResultBox, CompResultRow } from '../components/CompIndex';

export default function WinTodayCalc({ t, isOpen, onClose }) {
  const [todayPrice, setTodayPrice] = useState('');
  const [todayMa, setTodayMa] = useState('');
  const [todayResult, setTodayResult] = useState(null);

  const calculateToday = () => {
    const price = parseFloat(todayPrice);
    const ma = parseFloat(todayMa);
    if (!price || !ma || ma <= 0) return;
    const dev = ((price - ma) / ma) * 100;
    let mult = 1.0;
    if (dev < -8) mult = 3.0;
    else if (dev < -5) mult = 2.0;
    else if (dev < -2) mult = 1.5;
    else if (dev > 8) mult = 0.0;
    else if (dev > 5) mult = 0.5;
    else if (dev > 2) mult = 0.8;
    setTodayResult({ price, ma, dev, mult });
  };

  if (!isOpen) return null;

  return (
    <WinModal title={t('calcMaDevTitle')} onClose={onClose}>
      <CompFormGrid>
        <CompInput
          label={t('calcMaLabelPrice')}
          value={todayPrice}
          onChange={e => setTodayPrice(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && calculateToday()}
        />
        <CompInput
          label="MA20"
          value={todayMa}
          onChange={e => setTodayMa(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && calculateToday()}
        />
        <div className="filter-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <CompButton
            accent
            icon="play"
            onClick={calculateToday}
          >
            {t('btnCalc')}
          </CompButton>
        </div>
      </CompFormGrid>
      {todayResult && (
        <CompResultBox>
          <CompResultRow
            label={t('calcMaLabelPrice')}
            value={todayResult.price.toFixed(2)}
          />
          <CompResultRow
            label={t('calcMaLabelMa')}
            value={todayResult.ma.toFixed(2)}
          />
          <CompResultRow
            label={t('calcMaLabelDev')}
            value={`${todayResult.dev.toFixed(2)}%`}
            color={todayResult.dev < 0 ? '#ef4444' : '#22c55e'}
          />
          <CompResultRow
            label={t('calcMaLabelMult')}
            value={`${todayResult.mult.toFixed(1)}x`}
            highlight
          />
        </CompResultBox>
      )}
    </WinModal>
  );
}

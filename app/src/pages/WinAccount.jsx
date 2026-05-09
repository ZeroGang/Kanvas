import React from 'react';

export function WinAccount({ t }) {
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-2)', borderRadius: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#1677FF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>
              <i className="ph ph-credit-card"></i>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{t('assetAlipay')}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>¥ 0.00</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-2)', borderRadius: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#07C160', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>
              <i className="ph ph-chat-circle-text"></i>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{t('assetWechat')}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>¥ 0.00</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-2)', borderRadius: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#E4393C', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>
              <i className="ph ph-bag"></i>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{t('assetJd')}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>¥ 0.00</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-2)', borderRadius: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#333333', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>
              <i className="ph ph-bank"></i>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{t('assetBank')}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>¥ 0.00</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

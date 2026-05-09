export function WinHoldings({ t }) {
  return (
    <>
      <div className="card sec">
        <div className="sec-header">
          <div>
            <div className="sec-title"><i className="ph ph-wallet"></i> <span>{t('navHoldings')}</span></div>
          </div>
        </div>
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="ph ph-wallet" style={{ fontSize: '48px', opacity: 0.5, display: 'block', marginBottom: '12px' }}></i>
          {t('navHoldings')}
        </div>
      </div>
    </>
  );
}

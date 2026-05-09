export function WinSpot({ t }) {
  return (
    <>
      <div className="card sec">
        <div className="sec-header">
          <div>
            <div className="sec-title"><i className="ph ph-chart-line"></i> <span>{t('spotTitle')}</span></div>
            <div className="sec-desc" id="spotMeta">—</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn btn-accent"><i className="ph ph-arrows-clockwise"></i> <span>{t('btnFetch')}</span></button>
            <button type="button" className="btn spot-metal-only" title={t('btnExportSpotAkCsv')}><i className="ph ph-download-simple"></i> <span>{t('btnExportSpotAkCsv')}</span></button>
          </div>
        </div>
        <div className="spot-market-tabs" role="tablist" aria-label="market kind">
          <button type="button" className="spot-market-tab is-active" role="tab" data-spot-tab="metal">{t('spotTabMetal')}</button>
          <button type="button" className="spot-market-tab" role="tab" data-spot-tab="cn">{t('spotTabCnIndex')}</button>
        </div>
        <div className="spot-instruments-block" id="spotMetalSection">
          <div className="spot-instruments-label">{t('spotCategory')}</div>
          <div className="spot-instrument-list" id="spotInstrumentList" role="list"></div>
        </div>
        <div className="spot-instruments-block" id="spotCnIndexSection" style={{ display: 'none' }}>
          <div className="spot-instruments-label">{t('spotCnCategory')}</div>
          <div className="spot-instrument-list" id="cnIndexInstrumentList" role="list"></div>
        </div>
        <div className="kanvas-form-grid" style={{ maxWidth: '400px' }}>
          <div className="filter-group">
            <label>{t('spotDays')}</label>
            <input type="number" className="filter-input" id="spotDays" min="7" max="365" defaultValue="60" />
          </div>
          <div className="filter-group">
            <button type="button" className="btn"><i className="ph ph-arrows-clockwise"></i> <span>{t('btnRedraw')}</span></button>
          </div>
        </div>
      </div>
      <div className="card chart-section">
        <div className="ch-wrap ch-wrap-tall"><div id="chartSpot"></div></div>
      </div>
    </>
  );
}

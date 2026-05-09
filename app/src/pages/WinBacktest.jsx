export function WinBacktest({ t }) {
  return (
    <>
      <div className="card sec">
        <div className="sec-header">
          <div>
            <div className="sec-title"><i className="ph ph-chart-line-up"></i> <span>{t('backtestRun')}</span></div>
            <div className="sec-desc">{t('backtestRunDesc')}</div>
          </div>
        </div>
        <div className="kanvas-form-grid">
          <div className="filter-group">
            <label>{t('backtestDays')}</label>
            <input type="number" className="filter-input" id="btDays" min="1" defaultValue="120" />
          </div>
          <div className="filter-group">
            <button type="button" className="btn btn-accent"><i className="ph ph-play"></i> <span>{t('btnRunBacktest')}</span></button>
          </div>
        </div>
      </div>
      <div className="card chart-section" id="btSummaryCard" style={{ display: 'none' }}>
        <div className="chart-header">
          <div><div className="sec-title">{t('btMetrics')}</div></div>
        </div>
        <div id="btMetrics" className="report-grid"></div>
      </div>
      <div className="card chart-section" id="btChartCard" style={{ display: 'none' }}>
        <div className="chart-header">
          <div><div className="sec-title">{t('equityCurve')}</div></div>
        </div>
        <div className="ch-wrap ch-wrap-tall"><div id="chartEquity"></div></div>
      </div>
    </>
  );
}

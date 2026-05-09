export function WinStrategy({ t }) {
  return (
    <>
      <div className="settings-page">
        <div className="card sec">
          <div className="sec-header">
            <div>
              <div className="sec-title"><i className="ph ph-sliders"></i> <span>{t('settingsTitle')}</span></div>
            </div>
            <div className="sec-header-right">
              <button type="button" className="btn btn-accent"><i className="ph ph-floppy-disk"></i> <span>{t('btnSaveSettings')}</span></button>
            </div>
          </div>
          <div className="settings-params-inner">
            <div className="kanvas-form-grid settings-form-tight">
              <div className="filter-group">
                <label>{t('stLabelBase')}</label>
                <input type="number" className="filter-input" id="stBaseAmount" min="1" step="1" />
              </div>
              <div className="filter-group">
                <label>{t('stLabelMa')}</label>
                <input type="number" className="filter-input" id="stMaPeriod" min="2" max="600" step="1" />
              </div>
            </div>
          </div>
        </div>

        <div className="card sec settings-subcard">
          <div className="settings-subcard-title">{t('settingsTh')}</div>
          <div className="tw settings-th-scroll">
            <table className="settings-th-table">
              <thead>
                <tr>
                  <th>{t('thColZone')}</th>
                  <th>{t('thColMin')}</th>
                  <th>{t('thColMax')}</th>
                  <th>{t('thColMult')}</th>
                </tr>
              </thead>
              <tbody id="tbStThresholds">
                <tr><td><span>{t('thZone0')}</span></td><td><input type="number" className="filter-input settings-th-input" id="th0min" step="any" /></td><td><input type="number" className="filter-input settings-th-input" id="th0max" step="any" /></td><td><input type="number" className="filter-input settings-th-input" id="th0mult" step="any" /></td></tr>
                <tr><td><span>{t('thZone1')}</span></td><td><input type="number" className="filter-input settings-th-input" id="th1min" step="any" /></td><td><input type="number" className="filter-input settings-th-input" id="th1max" step="any" /></td><td><input type="number" className="filter-input settings-th-input" id="th1mult" step="any" /></td></tr>
                <tr><td><span>{t('thZone2')}</span></td><td><input type="number" className="filter-input settings-th-input" id="th2min" step="any" /></td><td><input type="number" className="filter-input settings-th-input" id="th2max" step="any" /></td><td><input type="number" className="filter-input settings-th-input" id="th2mult" step="any" /></td></tr>
                <tr><td><span>{t('thZone3')}</span></td><td><input type="number" className="filter-input settings-th-input" id="th3min" step="any" /></td><td><input type="number" className="filter-input settings-th-input" id="th3max" step="any" /></td><td><input type="number" className="filter-input settings-th-input" id="th3mult" step="any" /></td></tr>
                <tr><td><span>{t('thZone4')}</span></td><td><input type="number" className="filter-input settings-th-input" id="th4min" step="any" /></td><td><input type="number" className="filter-input settings-th-input" id="th4max" step="any" /></td><td><input type="number" className="filter-input settings-th-input" id="th4mult" step="any" /></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <details className="card sec settings-json-details" id="stJsonDetails">
          <summary className="settings-json-summary"><i className="ph ph-code"></i> <span>{t('settingsJsonHint')}</span></summary>
          <p className="settings-hint">{t('settingsJsonWarn')}</p>
          <textarea id="cfgJson" className="search-input settings-json-textarea" spellCheck="false"></textarea>
          <div style={{ marginTop: '12px' }}>
            <button type="button" className="btn"><i className="ph ph-floppy-disk"></i> <span>{t('saveJson')}</span></button>
          </div>
        </details>

        <div className="card sec strategy-records-card">
          <div className="sec-header">
            <div className="saved-page-head">
              <div className="sec-title"><i className="ph ph-clock-counter"></i> <span>{t('recordsTitle')}</span></div>
            </div>
          </div>
          <div className="tw saved-table-wrap">
            <table className="saved-strategy-table">
              <thead>
                <tr>
                  <th>{t('colSavedAt')}</th>
                  <th>{t('colStratSummary')}</th>
                  <th className="saved-th-act"></th>
                </tr>
              </thead>
              <tbody id="tbSaved"></tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

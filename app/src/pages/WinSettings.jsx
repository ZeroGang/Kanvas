import React from 'react';

export function WinSettings({ t, lang, toggleLang, theme, toggleTheme, onBack }) {
  return (
    <div className="settings-page">
      <div className="settings-header">
        <button 
          className="settings-back-btn"
          onClick={onBack}
        >
          <i className="ph ph-arrow-left"></i>
          <span>{t('settingsBack')}</span>
        </button>
        <h1 className="settings-title">{t('settingsPageTitle')}</h1>
      </div>
      
      <div className="settings-content">
        <div className="settings-section">
          <div className="settings-item">
            <div className="settings-item-label">
              <i className="ph ph-translate"></i>
              <span>{t('settingsLanguage')}</span>
            </div>
            <button 
              className="settings-toggle-btn"
              onClick={toggleLang}
            >
              <span>{lang === 'zh' ? '中文' : 'English'}</span>
              <i className="ph ph-caret-right"></i>
            </button>
          </div>
          
          <div className="settings-item">
            <div className="settings-item-label">
              <i className={theme === 'dark' ? 'ph ph-moon' : 'ph ph-sun'}></i>
              <span>{t('settingsTheme')}</span>
            </div>
            <button 
              className="settings-toggle-btn"
              onClick={toggleTheme}
            >
              <span>{t(theme === 'dark' ? 'settingsThemeDark' : 'settingsThemeLight')}</span>
              <i className="ph ph-caret-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useHashPage } from './hooks/useHashPage.js';
import { useI18n } from './hooks/useI18n.js';
import { useTheme } from './hooks/useTheme.js';
import { WinAccount } from './pages/WinAccount.jsx';
import { WinSpot } from './pages/WinSpot.jsx';
import { WinHoldings } from './pages/WinHoldings.jsx';
import { WinStrategy } from './pages/WinStrategy.jsx';
import { WinBacktest } from './pages/WinBacktest.jsx';

function LoadingScreen({ t }) {
  return (
    <div className="ld-ov">
      <img className="ld-logo-icon" src="app.png" alt="" width="72" height="72" decoding="async" />
      <div className="ld-brand">Kanvas</div>
      <div className="ld-txt" data-i="loading">{t('loading')}</div>
      <div className="ld-bar-wrap"><div className="ld-bar-fill"></div></div>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { page, setPage } = useHashPage();
  const { t, lang, toggleLang } = useI18n();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    setTimeout(() => setLoading(false), 300);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return <LoadingScreen t={t} />;
  }

  const navItems = [
    { id: 'spot', icon: 'chart-line', label: t('navSpot') },
    { id: 'holdings', icon: 'calculator', label: t('navHoldings') },
    { id: 'strategy', icon: 'sliders', label: t('navStrategy') },
    { id: 'backtest', icon: 'chart-line-up', label: t('navBacktest') },
    { id: 'account', icon: 'squares-four', label: t('navOverview') },
  ];

  const getPageTitle = () => {
    const item = navItems.find(n => n.id === page);
    return item ? item.label : t('navOverview');
  };

  function renderPage() {
    switch (page) {
      case 'account':
        return <WinAccount t={t} />;
      case 'spot':
        return <WinSpot t={t} />;
      case 'holdings':
        return <WinHoldings t={t} />;
      case 'strategy':
        return <WinStrategy t={t} />;
      case 'backtest':
        return <WinBacktest t={t} />;
      default:
        return <WinAccount t={t} />;
    }
  }

  return (
    <>
      {/* 桌面端侧边栏导航 */}
      {!isMobile && (
        <aside className="sidebar" id="sidebar">
          <div className="sidebar-header">
            <img className="kanvas-logo-icon" src="app.png" alt="" width="36" height="36" decoding="async" />
            <div className="sidebar-brand">
              <span className="sidebar-title">Kanvas</span>
              <span className="sidebar-subtitle" data-i="subTitle">{t('subTitle')}</span>
              <span className="meta sidebar-last-up" data-last-up></span>
            </div>
          </div>
          <nav className="sidebar-nav" id="sidebarNav">
            <div className="nav-slider" id="navSlider"></div>
            {navItems.map((item) => (
              <a
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                data-page={item.id}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage(item.id);
                }}
              >
                <i className={`ph ph-${item.icon}`}></i>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button type="button" className="sidebar-btn" onClick={toggleLang} title="Language">
              <i className="ph ph-translate"></i> <span>{lang === 'zh' ? 'EN' : '中'}</span>
            </button>
            <button type="button" className="sidebar-btn" onClick={toggleTheme} title="Theme">
              <i className={theme === 'dark' ? 'ph ph-moon' : 'ph ph-sun'}></i>
            </button>
            <button type="button" className="sidebar-btn" title="Refresh">
              <i className="ph ph-arrows-clockwise"></i>
            </button>
          </div>
        </aside>
      )}

      {/* 主内容区域 */}
      <main className={`main ${isMobile ? 'mobile-main' : ''}`} id="main">
        {/* 移动端顶部header */}
        {isMobile && (
          <header className="mobile-header">
            <div className="mobile-header-content">
              <div className="mobile-header-actions">
                <button type="button" className="mobile-header-btn" onClick={toggleLang} title="Language">
                  <i className="ph ph-translate"></i>
                </button>
                <button type="button" className="mobile-header-btn" onClick={toggleTheme} title="Theme">
                  <i className={theme === 'dark' ? 'ph ph-moon' : 'ph ph-sun'}></i>
                </button>
              </div>
            </div>
          </header>
        )}

        {/* 桌面端页面header */}
        {!isMobile && (
          <header className="page-header">
            <div className="page-header-left">
              <span className="meta page-header-last-up-narrow" data-last-up aria-hidden="true"></span>
            </div>
          </header>
        )}

        <div className={isMobile ? 'mobile' : ''}>
          {renderPage()}
        </div>
      </main>

      {/* 移动端底部Tab导航 */}
      {isMobile && (
        <nav className="mobile-tab-bar">
          <div className="tab-bar-container">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tab-bar-item ${page === item.id ? 'active' : ''}`}
                data-page={item.id}
                onClick={() => setPage(item.id)}
                aria-label={item.label}
              >
                <i className={`ph ph-${item.icon}`}></i>
                <span>{item.label}</span>
                <div className="tab-bar-indicator-dot"></div>
              </button>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}

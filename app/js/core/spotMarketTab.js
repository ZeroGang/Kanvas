/** 与行情页「贵金属 / A 股指数」Tab 一致，供概览等模块读取当前侧重的品类上下文 */
export const SPOT_MARKET_TAB_KEY = 'kanvas_spot_market_tab';

export function getSpotMarketTab() {
  try {
    const v = localStorage.getItem(SPOT_MARKET_TAB_KEY);
    if (v === 'metal' || v === 'cn') return v;
  } catch {
    /* ignore */
  }
  return 'metal';
}

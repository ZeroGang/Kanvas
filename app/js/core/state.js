/**
 * 统一状态管理：集中管理应用状态
 */

const state = {
  charts: {
    spot: null,
    equity: null,
  },
  settings: {
    snapshot: null,
  },
  holdings: {
    items: [],
    version: 1,
  },
  backtest: {
    lastResult: null,
  },
  market: {
    tab: 'metal',
  },
};

export function getChart(name) {
  return state.charts[name];
}

export function setChart(name, chart) {
  state.charts[name] = chart;
}

export function getSettingsSnapshot() {
  return state.settings.snapshot;
}

export function setSettingsSnapshot(snapshot) {
  state.settings.snapshot = snapshot;
}

export function getHoldings() {
  return state.holdings;
}

export function setHoldings(items, version = 1) {
  state.holdings.items = items;
  state.holdings.version = version;
}

export function getLastBacktestResult() {
  return state.backtest.lastResult;
}

export function setLastBacktestResult(result) {
  state.backtest.lastResult = result;
}

export function getMarketTab() {
  return state.market.tab;
}

export function setMarketTab(tab) {
  state.market.tab = tab;
}

export function clearState() {
  state.charts.spot = null;
  state.charts.equity = null;
  state.settings.snapshot = null;
  state.holdings.items = [];
  state.holdings.version = 1;
  state.backtest.lastResult = null;
  state.market.tab = 'metal';
}

export default state;

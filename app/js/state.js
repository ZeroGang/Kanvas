/**
 * 跨页面共享的可变状态（图表实例、设置页快照）
 * 
 * 向后兼容层：保留原有接口，内部使用新的状态管理
 */

import {
  getChart,
  setChart,
  getSettingsSnapshot as _getSettingsSnapshot,
  setSettingsSnapshot as _setSettingsSnapshot,
  getHoldings as _getHoldings,
  setHoldings as _setHoldings,
  getLastBacktestResult as _getLastBacktestResult,
  setLastBacktestResult as _setLastBacktestResult,
  getMarketTab as _getMarketTab,
  setMarketTab as _setMarketTab,
  clearState as _clearState,
} from './core/state.js';

export const charts = {
  get spot() {
    return getChart('spot');
  },
  set spot(chart) {
    setChart('spot', chart);
  },
  get equity() {
    return getChart('equity');
  },
  set equity(chart) {
    setChart('equity', chart);
  },
};

export function getSettingsSnapshot() {
  return _getSettingsSnapshot();
}

export function setSettingsSnapshot(s) {
  _setSettingsSnapshot(s);
}

export function getHoldings() {
  return _getHoldings();
}

export function setHoldings(items, version) {
  _setHoldings(items, version);
}

export function getLastBacktestResult() {
  return _getLastBacktestResult();
}

export function setLastBacktestResult(result) {
  _setLastBacktestResult(result);
}

export function getMarketTab() {
  return _getMarketTab();
}

export function setMarketTab(tab) {
  _setMarketTab(tab);
}

export function clearState() {
  _clearState();
}

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""行情服务：统一管理行情数据获取、刷新。"""

from __future__ import annotations

from typing import Any, Dict, List

from core.calculator import KanvasInvestmentCalculator
from core.cn_a_indices import (
    cn_a_index_catalog,
    cn_a_indices,
    cn_index_hist_bar_count,
    cn_index_last_bar_date,
    fetch_cn_index_hist,
    get_cn_index_close_last_days,
    normalize_and_validate_cn_a_index_ids,
    read_cn_a_chart_id,
    _cn_catalog_by_id,
)
from core.market import (
    fetch_hist_by_symbol,
    get_spot_close_last_days,
    get_instruments_market_data,
    load_spot_hist_csv,
    normalize_and_validate_spot_instrument_ids,
    read_gold_data_source,
    read_spot_symbol,
    spot_hist_bar_count,
    spot_hist_bar_count_from_df,
    spot_instrument_catalog,
    spot_instruments,
    gold_data_source_for_spot_symbol,
)
from core.realtime_price import fetch_realtime_display_price


class MarketService:
    """行情服务：封装行情数据获取、状态查询。"""

    def __init__(self) -> None:
        self._calc: KanvasInvestmentCalculator | None = None

    @property
    def calc(self) -> KanvasInvestmentCalculator:
        if self._calc is None:
            self._calc = KanvasInvestmentCalculator()
        return self._calc

    def get_market_status(self, config: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """获取行情状态（K线数量、最后日期）。"""
        if config is None:
            config = self.calc.config
        source = read_gold_data_source(config)
        sym = read_spot_symbol(config)
        n = spot_hist_bar_count(sym)
        from core.market import _last_bar_date_from_df

        df = load_spot_hist_csv(sym)
        last = _last_bar_date_from_df(df) if df is not None else None
        return {
            "bar_count": n,
            "last_bar_date": last.isoformat() if last else None,
            "source": source,
            "symbol": sym,
        }

    def get_realtime_price(self, tab: str, config: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """获取实时价格。"""
        if config is None:
            config = self.calc.config
        return fetch_realtime_display_price(tab, config)

    def fetch_market_data(self, config: Dict[str, Any] | None = None, force: bool = False) -> Dict[str, Any]:
        """拉取行情数据。"""
        if config is None:
            config = self.calc.config
        source = read_gold_data_source(config)
        sym = read_spot_symbol(config)
        df = fetch_hist_by_symbol(sym, save_to_dist=True, config=config, force_network=force)
        rows = spot_hist_bar_count_from_df(df) if df is not None else 0
        return {"rows": rows, "symbol": sym, "source": source}

    def get_spot_series(self, days: int, config: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
        """获取现货价格序列。"""
        if config is None:
            config = self.calc.config
        sym = read_spot_symbol(config)
        return get_spot_close_last_days(sym, days, config=config)

    def get_spot_instruments(self, config: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """获取现货品种列表。"""
        if config is None:
            config = self.calc.config
        return {
            "items": spot_instruments(config),
            "catalog": spot_instrument_catalog(),
        }

    def update_spot_instruments(self, ids: List[str] | None, reset: bool = False) -> Dict[str, Any]:
        """更新现货品种配置。"""
        calc = self.calc
        if reset:
            calc.config.pop("spot_instrument_ids", None)
            calc.config.pop("spot_instruments", None)
            sym = read_spot_symbol(calc.config)
            calc.config["spot_symbol"] = sym
            calc.config["gold_data_source"] = gold_data_source_for_spot_symbol(sym)
            calc.save_config()
            return {"items": spot_instruments(calc.config)}

        if ids is None:
            raise ValueError("缺少品种 ID 列表")

        items = normalize_and_validate_spot_instrument_ids(ids)
        calc.config["spot_instrument_ids"] = [x["id"] for x in items]
        calc.config.pop("spot_instruments", None)
        ids_set = {x["id"] for x in items}
        sk = str(calc.config.get("spot_symbol", "")).strip()
        if sk not in ids_set:
            calc.config["spot_symbol"] = items[0]["id"]
            calc.config["gold_data_source"] = gold_data_source_for_spot_symbol(items[0]["id"])
        calc.save_config()
        return {"items": spot_instruments(calc.config)}

    def get_cn_index_status(self, config: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """获取 A 股指数状态。"""
        if config is None:
            config = self.calc.config
        sym = read_cn_a_chart_id(config)
        meta = _cn_catalog_by_id().get(sym, {})
        n = cn_index_hist_bar_count(sym)
        last = cn_index_last_bar_date(sym)
        return {
            "symbol": sym,
            "bar_count": n,
            "last_bar_date": last.isoformat() if last else None,
            "label_zh": meta.get("label_zh", sym),
            "label_en": meta.get("label_en", sym),
            "exchange_zh": meta.get("exchange_zh", ""),
            "exchange_en": meta.get("exchange_en", ""),
        }

    def fetch_cn_index_data(self, config: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """拉取 A 股指数数据。"""
        if config is None:
            config = self.calc.config
        sym = read_cn_a_chart_id(config)
        df = fetch_cn_index_hist(sym, save=True)
        rows = len(df.index) if df is not None else 0
        return {"rows": rows, "symbol": sym}

    def get_cn_index_series(self, days: int, config: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
        """获取 A 股指数序列。"""
        if config is None:
            config = self.calc.config
        sym = read_cn_a_chart_id(config)
        return get_cn_index_close_last_days(sym, days)

    def get_cn_a_index_instruments(self, config: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """获取 A 股指数列表。"""
        if config is None:
            config = self.calc.config
        return {
            "items": cn_a_indices(config),
            "catalog": cn_a_index_catalog(),
        }

    def update_cn_a_index_instruments(self, ids: List[str] | None, reset: bool = False) -> Dict[str, Any]:
        """更新 A 股指数配置。"""
        from core.cn_a_indices import ensure_cn_a_chart_id_valid

        calc = self.calc
        if reset:
            calc.config.pop("cn_a_index_ids", None)
            calc.config.pop("cn_a_indices", None)
            ensure_cn_a_chart_id_valid(calc.config)
            calc.save_config()
            return {"items": cn_a_indices(calc.config)}

        if ids is None:
            raise ValueError("缺少指数 ID 列表")

        items = normalize_and_validate_cn_a_index_ids(ids)
        calc.config["cn_a_index_ids"] = [x["id"] for x in items]
        calc.config.pop("cn_a_indices", None)
        ensure_cn_a_chart_id_valid(calc.config)
        calc.save_config()
        return {"items": cn_a_indices(calc.config)}

    def get_instruments_market_list(self, tab: str = "metal", config: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """获取品种行情列表，包含名称、最新价格、涨跌幅。"""
        if config is None:
            config = self.calc.config
        
        if tab == "metal":
            instruments = spot_instruments(config)
            market_data = get_instruments_market_data(instruments, config)
        else:
            instruments = cn_a_indices(config)
            market_data = self._get_cn_instruments_market_data(instruments, config)
        
        return {
            "tab": tab,
            "instruments": market_data
        }

    def _get_cn_instruments_market_data(self, instruments: List[Dict[str, str]], config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """获取 A 股指数的行情数据。"""
        from core.cn_a_indices import load_cn_index_hist_csv
        
        result = []
        for inst in instruments:
            try:
                df = load_cn_index_hist_csv(inst["id"])
                if df is None or df.empty:
                    result.append({
                        "id": inst["id"],
                        "name_zh": inst["label_zh"],
                        "name_en": inst["label_en"],
                        "price": None,
                        "change": None,
                        "unit": "",
                        "has_data": False,
                        "update_time": None
                    })
                    continue
                
                import pandas as pd
                close_col = "close"
                if "收盘" in df.columns:
                    close_col = "收盘"
                elif "收盘价" in df.columns:
                    close_col = "收盘价"
                
                date_col = "date"
                if "日期" in df.columns:
                    date_col = "日期"
                elif "时间" in df.columns:
                    date_col = "时间"
                
                d = df.copy()
                last_date = None
                if date_col in df.columns:
                    d[date_col] = pd.to_datetime(d[date_col], errors="coerce")
                    d = d.dropna(subset=[date_col]).sort_values(date_col)
                    if len(d) > 0:
                        last_date = d[date_col].iloc[-1]
                
                closes = pd.to_numeric(d[close_col], errors="coerce").dropna()
                
                if len(closes) < 2:
                    result.append({
                        "id": inst["id"],
                        "name_zh": inst["label_zh"],
                        "name_en": inst["label_en"],
                        "price": float(closes.iloc[-1]) if len(closes) >= 1 else None,
                        "change": None,
                        "unit": "",
                        "has_data": len(closes) >= 1,
                        "update_time": last_date
                    })
                    continue
                
                last_price = float(closes.iloc[-1])
                prev_price = float(closes.iloc[-2])
                change = ((last_price - prev_price) / prev_price) * 100 if prev_price != 0 else None
                
                result.append({
                    "id": inst["id"],
                    "name_zh": inst["label_zh"],
                    "name_en": inst["label_en"],
                    "price": last_price,
                    "change": change,
                    "unit": "",
                    "has_data": True,
                    "update_time": last_date
                })
            except Exception as e:
                from logging import getLogger
                logger = getLogger("Kanvas")
                logger.warning(f"获取指数 {inst['id']} 行情失败: {e}")
                result.append({
                    "id": inst["id"],
                    "name_zh": inst["label_zh"],
                    "name_en": inst["label_en"],
                    "price": None,
                    "change": None,
                    "unit": "",
                    "has_data": False,
                    "update_time": None
                })
        
        return result

    def get_instrument_series(self, symbol: str, days: int = 30, tab: str = "metal") -> List[Dict[str, Any]]:
        """获取单个品种的历史价格序列。"""
        if tab == "metal":
            from core.market import get_spot_close_last_days
            dates, prices = get_spot_close_last_days(symbol, days)
        else:
            from core.cn_a_indices import get_cn_index_close_last_days
            dates, prices = get_cn_index_close_last_days(symbol, days)
        
        return [{"date": d, "price": p} for d, p in zip(dates, prices)]

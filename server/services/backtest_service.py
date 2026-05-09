#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""回测服务：统一管理回测执行、方案保存。"""

from __future__ import annotations

from typing import Any, Dict, List

from core.backtest import run_spot_backtest
from core.backtest_store import (
    apply_saved_scheme_to_config,
    build_scheme_entry,
    default_auto_note_scheme,
    delete_by_ids,
    get_by_id,
    load_all,
    replay_or_restore_entry,
    save_all,
)
from core.calculator import KanvasInvestmentCalculator
from core.market import load_spot_hist_csv, read_spot_symbol, spot_hist_bar_count_from_df


class BacktestService:
    """回测服务：封装回测执行、方案管理。"""

    def __init__(self) -> None:
        self._calc: KanvasInvestmentCalculator | None = None

    @property
    def calc(self) -> KanvasInvestmentCalculator:
        if self._calc is None:
            self._calc = KanvasInvestmentCalculator()
        return self._calc

    def run_backtest(
        self,
        days: int,
        use_take_profit: bool = False,
        config: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """执行回测。"""
        if config is None:
            config = self.calc.config
        sym = read_spot_symbol(config)
        df = load_spot_hist_csv(sym)
        n_bar = spot_hist_bar_count_from_df(df) if df is not None else 0
        actual_days = min(days, n_bar) if n_bar > 0 else days

        calc = KanvasInvestmentCalculator()
        calc.config = config.copy()
        calc.base_amount = int(config.get("base_amount", 500))

        return run_spot_backtest(calc, actual_days, df=df, symbol=sym, use_take_profit=use_take_profit)

    def get_saved_backtests(self) -> List[Dict[str, Any]]:
        """获取已保存的回测方案列表。"""
        return load_all()

    def get_saved_backtest_detail(self, entry_id: str) -> Dict[str, Any] | None:
        """获取单个回测方案详情。"""
        return get_by_id(entry_id)

    def save_backtest(self, note: str = "", config: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """保存当前回测方案。"""
        if config is None:
            config = self.calc.config
        from core.backtest_store import build_scheme_dict

        scheme = build_scheme_dict(calc_config=config)
        auto_note = default_auto_note_scheme(scheme) if not note else note
        entry = build_scheme_entry(scheme=scheme, note=auto_note)
        if save_all([entry] + load_all()):
            return entry
        raise RuntimeError("保存失败")

    def delete_saved_backtests(self, ids: List[str]) -> int:
        """删除回测方案。"""
        return delete_by_ids(ids)

    def replay_saved_backtest(self, entry_id: str) -> Dict[str, Any]:
        """重放回测方案。"""
        entry = get_by_id(entry_id)
        if not entry:
            raise ValueError("未找到回测方案")
        result, err = replay_or_restore_entry(entry, base_calc=self.calc)
        if err:
            raise RuntimeError(err)
        return result

    def apply_saved_scheme(self, entry_id: str) -> bool:
        """应用回测方案到当前配置。"""
        entry = get_by_id(entry_id)
        if not entry:
            raise ValueError("未找到回测方案")
        scheme = entry.get("scheme")
        ok, err = apply_saved_scheme_to_config(scheme)
        if err:
            raise RuntimeError(err)
        return ok

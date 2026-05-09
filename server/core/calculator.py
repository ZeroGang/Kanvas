#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
定投策略计算器。

职责：
  - 定投策略计算逻辑（偏离度、倍数、金额）
  - 止盈策略文本生成
  - 兼容旧版配置/记录管理接口

配置与记录持久化已分离到：
  - core/config_manager.py
  - core/records_manager.py
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

from core.config_manager import (
    DEFAULT_BACKTEST_DAYS,
    _default_config,
    get_base_amount,
    get_ma_period,
    load_config,
    save_config as save_config_file,
)
from core.records_manager import (
    add_record as add_record_to_list,
    clear_all_records,
    delete_records_by_datetimes,
    load_records,
    save_records,
)


def take_profit_base_amount(tp: Any) -> float:
    """
    止盈底仓阈值（与定投、持仓货值同币种）：与「当前持仓货值」= 克×收盘 比较。
    优先 base_position_amount；否则兼容旧键 base_position_g（曾误用键名，语义同为金额）。
    """
    if not isinstance(tp, dict):
        return 0.0
    try:
        if "base_position_amount" in tp:
            v = float(tp["base_position_amount"])
        elif "base_position_g" in tp:
            v = float(tp["base_position_g"])
        else:
            v = 0.0
    except (TypeError, ValueError):
        v = 0.0
    if not math.isfinite(v) or v < 0:
        v = 0.0
    return v


class KanvasInvestmentCalculator:
    """
    定投策略计算器。

    保持向后兼容性：
      - config 属性：配置字典
      - base_amount 属性：基础金额
      - records 属性：历史记录列表
      - save_config()、load_records()、save_record() 等方法
    """

    def __init__(self) -> None:
        self.config: Dict[str, Any] = load_config()
        self.base_amount: int = get_base_amount(self.config)
        self.records: List[Dict[str, Any]] = load_records()

    def get_ma_period(self) -> int:
        return get_ma_period(self.config)

    def calculate_deviation(self, gold_price: float, ma20: float) -> float:
        if ma20 is None or abs(float(ma20)) < 1e-12:
            return 0.0
        return (float(gold_price) - float(ma20)) / float(ma20) * 100.0

    def get_multiplier_and_action(self, deviation: float) -> Tuple[float, str]:
        th = self.config.get("thresholds")
        if not isinstance(th, list):
            return 1.0, "未配置阈值"
        d = float(deviation)
        for row in th:
            if not isinstance(row, dict):
                continue
            try:
                lo = float(row.get("min", -1e9))
                hi = float(row.get("max", 1e9))
            except (TypeError, ValueError):
                continue
            if lo <= d <= hi:
                try:
                    mult = float(row.get("multiplier", 1.0))
                except (TypeError, ValueError):
                    mult = 1.0
                act = str(row.get("action", "") or "")
                return mult, act
        return 1.0, "无匹配区间"

    def calculate_amount(self, mult: float) -> int:
        try:
            m = float(mult)
        except (TypeError, ValueError):
            m = 1.0
        return int(round(float(self.base_amount) * m))

    def calculate(self, gold_price: float, ma20: float) -> Dict[str, Any]:
        dev = self.calculate_deviation(gold_price, ma20)
        mult, action = self.get_multiplier_and_action(dev)
        amt = self.calculate_amount(mult)
        return {
            "gold_price": float(gold_price),
            "ma20": float(ma20),
            "deviation": dev,
            "multiplier": mult,
            "amount": amt,
            "action": action,
        }

    def get_take_profit_text(self) -> str:
        tp = self.config.get("take_profit")
        if not isinstance(tp, dict):
            return ""
        lines: List[str] = ["【止盈与回撤】"]
        base_amt = take_profit_base_amount(tp)
        if base_amt > 1e-12:
            lines.append(f"  底仓前提：持仓货值 > {base_amt:g}（与品种报价同币种）时启用止盈/回撤")
        levels_on = bool(tp.get("levels_enabled", True))
        pullback_on = bool(tp.get("pullback_enabled", True))
        levels = tp.get("levels")
        if levels_on and isinstance(levels, list) and levels:
            for i, lv in enumerate(levels, 1):
                if not isinstance(lv, dict):
                    continue
                try:
                    p = float(lv.get("profit", 0))
                    sp = float(lv.get("sell_percent", 0))
                except (TypeError, ValueError):
                    continue
                lines.append(f"  档位{i}：浮盈 ≥ {p:.0f}% 时卖出持仓的 {sp:.0f}%")
        elif not levels_on:
            lines.append("  分档止盈：未启用")
        pb = tp.get("pullback")
        if pullback_on and isinstance(pb, dict):
            try:
                pct = float(pb.get("percent", 0))
                sell = float(pb.get("sell_percent", 0))
            except (TypeError, ValueError):
                pct, sell = 0.0, 0.0
            if pct > 0 or sell > 0:
                lines.append(f"  回撤：从高点回撤 ≥ {pct:.0f}% 时卖出 {sell:.0f}% 仓位")
        elif not pullback_on:
            lines.append("  回撤卖出：未启用")
        return "\n".join(lines) if len(lines) > 1 else ""

    def get_strategy_text(self) -> str:
        lines = [
            "【当前策略】",
            f"基础日额: {self.base_amount} 元",
            f"均线周期: MA{self.get_ma_period()}",
            "",
            "偏离度阈值:",
        ]
        th = self.config.get("thresholds")
        if isinstance(th, list):
            for row in th:
                if not isinstance(row, dict):
                    continue
                lines.append(
                    f"  [{row.get('min')}%, {row.get('max')}%] ×{row.get('multiplier')} → {row.get('action', '')}"
                )
        lines.append("")
        lines.append(self.get_take_profit_text())
        return "\n".join(lines)

    def get_history(self) -> str:
        rows = self.get_history_data()
        if not rows:
            return "暂无历史记录。"
        lines = ["【历史记录】"]
        for r in rows:
            lines.append(
                f"  {r.get('datetime')} | 价 {r.get('gold_price')} | MA {r.get('ma20')} | "
                f"偏离 {float(r.get('deviation', 0)):.2f}% | ×{r.get('multiplier')} | {r.get('amount')} 元 | {r.get('action', '')}"
            )
        return "\n".join(lines)

    def load_records(self) -> List[Dict[str, Any]]:
        return load_records()

    def _save_records_file(self, records: List[Dict[str, Any]]) -> bool:
        return save_records(records)

    def get_history_data(self) -> List[Dict[str, Any]]:
        mp = self.get_ma_period()
        out: List[Dict[str, Any]] = []
        for r in self.records:
            row = dict(r)
            row.setdefault("ma_period", mp)
            out.append(row)
        return out

    def save_record(self, result: Dict[str, Any]) -> bool:
        return add_record_to_list(self.records, result, self.get_ma_period())

    def delete_records_by_datetimes(self, datetimes: List[str]) -> int:
        return delete_records_by_datetimes(self.records, datetimes)

    def clear_all_records(self) -> bool:
        return clear_all_records(self.records)

    def recalculate_all_records(self) -> None:
        new_list: List[Dict[str, Any]] = []
        for r in self.records:
            try:
                gp = float(r.get("gold_price"))
                ma = float(r.get("ma20"))
            except (TypeError, ValueError):
                new_list.append(r)
                continue
            res = self.calculate(gp, ma)
            u = dict(r)
            u["deviation"] = res["deviation"]
            u["multiplier"] = res["multiplier"]
            u["amount"] = res["amount"]
            u["action"] = res["action"]
            u["ma_period"] = self.get_ma_period()
            new_list.append(u)
        self.records = new_list
        self._save_records_file(self.records)

    def save_config(self) -> bool:
        self.config["base_amount"] = int(self.base_amount)
        return save_config_file(self.config)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""配置服务：统一管理配置读写、策略参数。"""

from __future__ import annotations

from typing import Any, Dict

from core.calculator import KanvasInvestmentCalculator
from core.cn_a_indices import (
    cn_a_indices_from_config,
    ensure_cn_a_chart_id_valid,
    read_cn_a_chart_id,
)
from core.market import (
    gold_data_source_for_spot_symbol,
    meta_for_spot_symbol,
    read_spot_symbol,
)


class ConfigService:
    """配置管理服务：封装配置读写、参数验证。"""

    def __init__(self) -> None:
        self._calc: KanvasInvestmentCalculator | None = None

    @property
    def calc(self) -> KanvasInvestmentCalculator:
        if self._calc is None:
            self._calc = KanvasInvestmentCalculator()
        return self._calc

    def get_config(self) -> Dict[str, Any]:
        """获取完整配置及元数据。"""
        calc = self.calc
        sym = read_spot_symbol(calc.config)
        meta = meta_for_spot_symbol(sym, calc.config)
        src = gold_data_source_for_spot_symbol(sym)
        cn_id = read_cn_a_chart_id(calc.config)
        cn_meta = None
        for row in cn_a_indices_from_config(calc.config):
            if row.get("id") == cn_id:
                cn_meta = row
                break
        cn_label_zh = (cn_meta or {}).get("label_zh") or cn_id
        cn_label_en = (cn_meta or {}).get("label_en") or cn_label_zh
        from core.calculator import DEFAULT_BACKTEST_DAYS

        return {
            "config": calc.config,
            "default_backtest_days": DEFAULT_BACKTEST_DAYS,
            "base_amount": calc.base_amount,
            "ma_period": calc.get_ma_period(),
            "gold_data_source": src,
            "gold_data_source_label": meta["label_zh"],
            "gold_data_source_label_en": meta["label_en"],
            "price_unit": meta["unit_zh"],
            "price_unit_en": meta["unit_en"],
            "cn_a_chart_label_zh": cn_label_zh,
            "cn_a_chart_label_en": cn_label_en,
        }

    def update_config(self, updates: Dict[str, Any]) -> bool:
        """更新配置项。"""
        from core.market import _allowed_spot_symbols

        calc = self.calc
        if not isinstance(updates, dict):
            return False
        for key, val in updates.items():
            calc.config[key] = val
        ss = calc.config.get("spot_symbol")
        if ss is not None:
            sk = str(ss).strip()
            if sk in _allowed_spot_symbols(calc.config):
                calc.config["gold_data_source"] = gold_data_source_for_spot_symbol(sk)
        ensure_cn_a_chart_id_valid(calc.config)
        calc.base_amount = int(calc.config.get("base_amount", 500))
        return calc.save_config()

    def get_records(self) -> list:
        """获取历史记录。"""
        return self.calc.get_history_data()

    def calculate(self, gold_price: float, ma20: float, save: bool = False) -> Dict[str, Any]:
        """执行计算。"""
        if gold_price <= 0 or ma20 <= 0:
            raise ValueError("金价与均线须为正数")
        result = self.calc.calculate(gold_price, ma20)
        if save:
            self.calc.save_record(result)
        return {"result": result, "take_profit_text": self.calc.get_take_profit_text()}

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""持仓服务：统一管理持仓数据。"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from core import holdings_store as hs
from core.calculator import KanvasInvestmentCalculator


class HoldingsService:
    """持仓服务：封装持仓数据管理。"""

    def __init__(self) -> None:
        self._calc: KanvasInvestmentCalculator | None = None

    @property
    def calc(self) -> KanvasInvestmentCalculator:
        if self._calc is None:
            self._calc = KanvasInvestmentCalculator()
        return self._calc

    def get_holdings(self) -> Dict[str, Any]:
        """获取持仓数据。"""
        doc = hs.load_document(self.calc.config)
        return {
            "version": doc.get("version", 1),
            "items": doc.get("items", []),
        }

    def update_holdings(self, data: Dict[str, Any]) -> Tuple[bool, str | None]:
        """更新持仓数据。"""
        doc, err = hs.normalize_document(data if isinstance(data, dict) else {})
        if err:
            return False, err
        hs.save_document(doc)
        return True, None

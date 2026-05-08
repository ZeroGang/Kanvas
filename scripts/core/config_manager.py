#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""配置管理：配置文件读写、默认配置、配置验证。"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any, Dict

from paths import dist_config_dir

CONFIG_FILENAME = "config.json"

DEFAULT_BACKTEST_DAYS = 3650


def _default_config() -> Dict[str, Any]:
    return {
        "base_amount": 500,
        "thresholds": [
            {"min": -999.0, "max": -5.0, "multiplier": 3.0, "action": "深度超跌，大幅加仓"},
            {"min": -5.0, "max": -3.0, "multiplier": 2.0, "action": "相对低估，积极加仓"},
            {"min": -3.0, "max": 2.0, "multiplier": 1.0, "action": "正常区间，标准定投"},
            {"min": 2.0, "max": 5.0, "multiplier": 0.5, "action": "相对高估，谨慎投入"},
            {"min": 5.0, "max": 999.0, "multiplier": 0.0, "action": "明显高估，暂停买入"},
        ],
        "take_profit": {
            "levels_enabled": True,
            "pullback_enabled": True,
            "levels": [
                {"profit": 10.0, "sell_percent": 20.0},
                {"profit": 20.0, "sell_percent": 20.0},
                {"profit": 30.0, "sell_percent": 20.0},
            ],
            "pullback": {"percent": 0.0, "sell_percent": 0.0},
        },
        "ma_period": 20,
        "backtest_days": DEFAULT_BACKTEST_DAYS,
        "backtest_use_take_profit": False,
        "backtest_show_chart": True,
        "gold_data_source": "shanghai",
        "spot_symbol": "Au99.99",
        "cn_a_chart_id": "000001",
    }


def _config_path() -> Path:
    return dist_config_dir() / CONFIG_FILENAME


def _deep_merge(base: Dict[str, Any], over: Dict[str, Any]) -> Dict[str, Any]:
    out = copy.deepcopy(base)
    for k, v in over.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


def load_config() -> Dict[str, Any]:
    """加载配置文件，合并默认值。"""
    path = _config_path()
    if not path.is_file():
        return _default_config()
    try:
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw) if raw.strip() else {}
        if not isinstance(data, dict):
            data = {}
        return _deep_merge(_default_config(), data)
    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        return _default_config()


def save_config(config: Dict[str, Any]) -> bool:
    """保存配置文件。"""
    try:
        path = _config_path()
        path.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
        return True
    except (OSError, TypeError, ValueError):
        return False


def get_base_amount(config: Dict[str, Any]) -> int:
    """获取基础金额。"""
    try:
        return int(float(config.get("base_amount", 500)))
    except (TypeError, ValueError):
        return 500


def get_ma_period(config: Dict[str, Any]) -> int:
    """获取均线周期。"""
    try:
        v = int(float(config.get("ma_period", 20)))
    except (TypeError, ValueError):
        v = 20
    return max(2, min(600, v))

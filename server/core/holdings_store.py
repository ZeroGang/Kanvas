#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""持有列表：品种、净值、当前收益率、目标收益率等，持久化 holdings.json（不再写入 cost_nav，成本由净值与收益率推算）。"""

from __future__ import annotations

import json
import math
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from paths import dist_config_dir

FILENAME = "holdings.json"
VERSION = 1
ALLOWED_TARGET_PCT = frozenset((3, 5, 10, 20))


def holdings_path() -> Path:
    return dist_config_dir() / FILENAME


def _default_items_from_config(config: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    if not config:
        return items
    symbols = config.get("spot_instrument_ids")
    if isinstance(symbols, list):
        for s in symbols:
            ss = str(s).strip() if s is not None else ""
            if not ss:
                continue
            items.append(
                {
                    "id": str(uuid.uuid4()),
                    "symbol": ss,
                    "current_nav": 0.0,
                    "current_yield_pct": 0.0,
                    "target_return_pct": 5,
                }
            )
    if not items:
        sym = config.get("spot_symbol")
        if sym:
            ss = str(sym).strip()
            if ss:
                items.append(
                    {
                        "id": str(uuid.uuid4()),
                        "symbol": ss,
                        "current_nav": 0.0,
                        "current_yield_pct": 0.0,
                        "target_return_pct": 5,
                    }
                )
    return items


def default_document(config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {"version": VERSION, "items": _default_items_from_config(config)}


def load_document(config_for_seed: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    path = holdings_path()
    if not path.is_file():
        return default_document(config_for_seed)
    try:
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw) if raw.strip() else {}
        if not isinstance(data, dict):
            return default_document(config_for_seed)
        items = data.get("items")
        if not isinstance(items, list):
            items = []
        out = {"version": int(data.get("version", VERSION)), "items": items}
        return out
    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        return default_document(config_for_seed)


def _float_nonneg(raw: Any, default: float = 0.0) -> float:
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return default
    if v < 0:
        return 0.0
    return v


def _int_target_pct(raw: Any) -> int:
    try:
        v = int(float(raw))
    except (TypeError, ValueError):
        return 5
    return v if v in ALLOWED_TARGET_PCT else 5


def _finite_float(raw: Any, default: float = 0.0) -> float:
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(v):
        return default
    return v


def _yield_pct_from_row(nav: float, row: Dict[str, Any]) -> float:
    # 前端 POST 会带 current_yield_pct；优先采用（含 0），避免仅依赖旧 cost_nav 反推
    if "current_yield_pct" in row:
        raw = row.get("current_yield_pct")
        if raw is not None and not (isinstance(raw, str) and not str(raw).strip()):
            return _finite_float(raw, 0.0)
    # 旧版：仅有 cost_nav（成本）+ current_nav 时反推收益率
    cost_legacy = _float_nonneg(row.get("cost_nav"))
    if cost_legacy > 0 and math.isfinite(nav) and nav >= 0:
        return (nav / cost_legacy - 1.0) * 100.0
    return 0.0


def normalize_item(row: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(row, dict):
        return None
    sym = str(row.get("symbol", "")).strip()
    if not sym:
        return None
    rid = str(row.get("id", "")).strip()
    if not rid:
        rid = str(uuid.uuid4())
    nav = _float_nonneg(row.get("current_nav"))
    y_pct = _yield_pct_from_row(nav, row)
    return {
        "id": rid,
        "symbol": sym,
        "current_nav": nav,
        "current_yield_pct": y_pct,
        "target_return_pct": _int_target_pct(row.get("target_return_pct")),
    }


def normalize_document(body: Any) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    if not isinstance(body, dict):
        return None, "无效 JSON"
    raw_items = body.get("items")
    if not isinstance(raw_items, list):
        return None, "缺少 items 数组"
    items: List[Dict[str, Any]] = []
    for row in raw_items:
        one = normalize_item(row)
        if one:
            items.append(one)
    return {"version": VERSION, "items": items}, None


def save_document(doc: Dict[str, Any]) -> None:
    path = holdings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")

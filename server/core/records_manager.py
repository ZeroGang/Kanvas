#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""历史记录管理：记录的持久化与查询。"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from paths import dist_config_dir

RECORDS_FILENAME = "records.json"


def _records_path() -> Path:
    return dist_config_dir() / RECORDS_FILENAME


def load_records() -> List[Dict[str, Any]]:
    """加载历史记录。"""
    path = _records_path()
    if not path.is_file():
        return []
    try:
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw) if raw.strip() else {}
        rec = data.get("records") if isinstance(data, dict) else None
        if not isinstance(rec, list):
            return []
        return [x for x in rec if isinstance(x, dict)]
    except (OSError, json.JSONDecodeError, TypeError):
        return []


def save_records(records: List[Dict[str, Any]]) -> bool:
    """保存历史记录。"""
    try:
        path = _records_path()
        path.write_text(
            json.dumps({"records": records}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return True
    except OSError:
        return False


def add_record(records: List[Dict[str, Any]], result: Dict[str, Any], ma_period: int) -> bool:
    """添加一条记录。"""
    rec = dict(result)
    rec["datetime"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    rec["ma_period"] = ma_period
    records.append(rec)
    ok = save_records(records)
    if not ok:
        records.pop()
    return ok


def delete_records_by_datetimes(records: List[Dict[str, Any]], datetimes: List[str]) -> int:
    """按时间戳删除记录。"""
    if not datetimes:
        return 0
    kill = {str(x) for x in datetimes}
    before = len(records)
    records[:] = [r for r in records if str(r.get("datetime", "")) not in kill]
    n = before - len(records)
    if n:
        save_records(records)
    return n


def clear_all_records(records: List[Dict[str, Any]]) -> bool:
    """清空所有记录。"""
    records.clear()
    return save_records(records)

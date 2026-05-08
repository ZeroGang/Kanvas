#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""项目路径：持久化在 app/dist/ 下分 config/（JSON）与 excels/（行情 CSV）。"""

from __future__ import annotations

import shutil
from pathlib import Path

_JSON_IN_CONFIG = frozenset({"config.json", "records.json", "saved_backtests.json", "holdings.json"})


def project_root() -> Path:
    """仓库根目录（含 main.py、app/、scripts/）。"""
    return Path(__file__).resolve().parent.parent


def _maybe_migrate_root_dist_to_app_dist(new_p: Path, old_p: Path) -> None:
    """若仍存在旧版根目录 dist/ 且 app/dist 尚无配置，则将旧文件迁入 app/dist 根下（再由子目录迁移整理）。"""
    if not old_p.is_dir():
        return
    if old_p.resolve() == new_p.resolve():
        return
    cfg_here = (new_p / "config.json").is_file() or (new_p / "config" / "config.json").is_file()
    if cfg_here:
        return
    cfg_old = old_p / "config.json"
    if not cfg_old.is_file():
        return
    try:
        for item in list(old_p.iterdir()):
            dest = new_p / item.name
            if not dest.exists():
                shutil.move(str(item), str(dest))
    except OSError:
        pass


def _maybe_migrate_flat_dist_to_subdirs(dist_root: Path) -> None:
    """将 app/dist 根下的 json 迁入 config/、csv 迁入 excels/（不覆盖目标已有文件）。"""
    cfg_dir = dist_root / "config"
    exc_dir = dist_root / "excels"
    try:
        cfg_dir.mkdir(parents=True, exist_ok=True)
        exc_dir.mkdir(parents=True, exist_ok=True)
        for item in list(dist_root.iterdir()):
            if item.is_dir():
                continue
            if not item.is_file():
                continue
            name = item.name
            if name in _JSON_IN_CONFIG:
                dest = cfg_dir / name
                if not dest.exists():
                    shutil.move(str(item), str(dest))
            elif name.lower().endswith(".csv"):
                dest = exc_dir / name
                if not dest.exists():
                    shutil.move(str(item), str(dest))
    except OSError:
        pass


def data_dist_dir() -> Path:
    """app/dist 根目录（确保存在并完成迁移）。"""
    root = project_root()
    p = root / "app" / "dist"
    p.mkdir(parents=True, exist_ok=True)
    _maybe_migrate_root_dist_to_app_dist(p, root / "dist")
    _maybe_migrate_flat_dist_to_subdirs(p)
    return p


def dist_config_dir() -> Path:
    """JSON 配置：config.json、records.json、saved_backtests.json 等。"""
    d = data_dist_dir() / "config"
    d.mkdir(parents=True, exist_ok=True)
    return d


def dist_excels_dir() -> Path:
    """行情 CSV 等（如 spot_hist_*.csv）。"""
    d = data_dist_dir() / "excels"
    d.mkdir(parents=True, exist_ok=True)
    return d

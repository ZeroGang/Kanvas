#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kanvas 项目根入口：
  python main.py        → Web 面板（server.py + app/）
  python main.py --cli  → 命令行交互（scripts/main.py）
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def _run_web() -> None:
    import runpy

    runpy.run_path(str(ROOT / "server.py"), run_name="__main__")


def _run_cli(argv_tail: list[str]) -> None:
    import runpy

    sys.argv = [str(ROOT / "scripts" / "main.py"), "--cli"] + argv_tail
    runpy.run_path(str(ROOT / "scripts" / "main.py"), run_name="__main__")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        _run_cli(sys.argv[2:])
    else:
        _run_web()

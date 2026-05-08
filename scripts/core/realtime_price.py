#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
概览「最新价」用 AkShare 提供的盘中参考价（数据源有延迟，非交易所官方 tick）。

- 上金所现货：ak.spot_quotations_sge(symbol=…)，取末行「现价」。
- 伦敦金 XAU：ak.futures_foreign_commodity_realtime(symbol=\"XAU\")，取「最新价」。
- A 股指数：ak.stock_zh_index_spot_sina()，按新浪代码匹配「最新价」。
"""

from __future__ import annotations

from typing import Any, Dict, Tuple

import pandas as pd

from core.akshare_net import run_akshare_with_proxy_fallback
from core.cn_a_indices import _norm_cn_index_id, _sina_symbol_from_em_id, read_cn_a_chart_id
from core.market import SYMBOL_LONDON, read_spot_symbol

def _find_column(df: pd.DataFrame, *needles: str) -> str:
    """按 needles 先后顺序匹配列名（优先更长、更精确的子串）。"""
    for n in needles:
        for c in df.columns:
            if n in str(c):
                return str(c)
    raise ValueError("未找到列: %s，实际列: %s" % (needles, list(df.columns)))


def _sge_spot_realtime(symbol: str) -> Tuple[float, str, str]:
    import akshare as ak

    sym = str(symbol).strip()
    df = run_akshare_with_proxy_fallback(lambda: ak.spot_quotations_sge(symbol=sym))
    if df is None or getattr(df, "empty", True):
        raise ValueError("上金所实时行情无返回（spot_quotations_sge）")
    last = df.iloc[-1]
    pc = _find_column(df, "现价", "最新价")
    tc = _find_column(df, "更新时间", "时间")
    price = float(pd.to_numeric(last[pc], errors="coerce"))
    if pd.isna(price):
        raise ValueError("上金所现价无法解析")
    as_of = str(last[tc]).strip() if tc in last.index else ""
    return price, as_of, "spot_quotations_sge"


def _london_xau_realtime() -> Tuple[float, str, str]:
    import akshare as ak

    df = run_akshare_with_proxy_fallback(lambda: ak.futures_foreign_commodity_realtime(symbol=SYMBOL_LONDON))
    if df is None or getattr(df, "empty", True):
        raise ValueError("伦敦金实时行情无返回（futures_foreign_commodity_realtime）")
    row = df.iloc[0]
    pc = _find_column(df, "最新价", "现价")
    price = float(pd.to_numeric(row[pc], errors="coerce"))
    if pd.isna(price):
        raise ValueError("伦敦金最新价无法解析")
    as_of = ""
    for needle in ("行情时间", "更新时间", "时间", "日期"):
        try:
            tc = _find_column(df, needle)
            as_of = str(row[tc]).strip()
            if as_of:
                break
        except ValueError:
            continue
    return price, as_of, "futures_foreign_commodity_realtime"


def _cn_index_realtime(config: Dict[str, Any]) -> Tuple[float, str, str]:
    import akshare as ak

    em = read_cn_a_chart_id(config)
    sina_sym = _sina_symbol_from_em_id(em)
    df = run_akshare_with_proxy_fallback(ak.stock_zh_index_spot_sina)
    if df is None or getattr(df, "empty", True):
        raise ValueError("新浪指数快照无返回（stock_zh_index_spot_sina）")
    code_col = _find_column(df, "代码")
    price_col = _find_column(df, "最新价", "现价")
    codes = df[code_col].astype(str).str.strip()
    hit = df[codes == sina_sym]
    if hit.empty:
        tail = _norm_cn_index_id(em)
        hit = df[codes.str.endswith(tail, na=False)]
    if hit.empty:
        raise ValueError("新浪指数快照中未找到代码 %s" % sina_sym)
    row = hit.iloc[0]
    price = float(pd.to_numeric(row[price_col], errors="coerce"))
    if pd.isna(price):
        raise ValueError("指数最新价无法解析")
    return price, "", "stock_zh_index_spot_sina"


def fetch_realtime_display_price(tab: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    tab: 'metal' | 'cn'
    返回 price, as_of（可为空）, source（AkShare 接口说明）.
    """
    t = (tab or "metal").strip().lower()
    if t == "cn":
        price, as_of, src = _cn_index_realtime(config)
        return {"price": price, "as_of": as_of, "source": src, "kind": "cn_index"}

    sym = read_spot_symbol(config)
    if str(sym).upper() == SYMBOL_LONDON:
        price, as_of, src = _london_xau_realtime()
    else:
        price, as_of, src = _sge_spot_realtime(sym)
    return {"price": price, "as_of": as_of, "source": src, "kind": "metal"}

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
国内 A 股相关指数 — 系统目录仍为 6 位代码（与行情展示一致）。

日线仅通过 ak.stock_zh_index_daily（新浪财经，sh/sz + 6 位）拉取；
写出 CSV 使用统一中文列名（日期、开盘、收盘等）供读盘与画线。
"""

from __future__ import annotations

import logging
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, TYPE_CHECKING

from paths import dist_excels_dir

from core.akshare_net import run_akshare_with_proxy_fallback

if TYPE_CHECKING:
    import pandas as pd

_logger = logging.getLogger("Kanvas")

# id：6 位指数代码；名称与交易所说明供展示；新浪拉取用 exchange_zh 映射 sh/sz
CN_A_INDEX_CATALOG: List[Dict[str, str]] = [
    {"id": "000001", "label_zh": "上证指数", "label_en": "SSE Composite", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "399001", "label_zh": "深证成指", "label_en": "SZSE Component", "exchange_zh": "深圳", "exchange_en": "Shenzhen"},
    {"id": "399006", "label_zh": "创业板指", "label_en": "ChiNext", "exchange_zh": "深圳", "exchange_en": "Shenzhen"},
    {"id": "000688", "label_zh": "科创50", "label_en": "STAR 50", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "000300", "label_zh": "沪深300", "label_en": "CSI 300", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "000016", "label_zh": "上证50", "label_en": "SSE 50", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "000010", "label_zh": "上证180", "label_en": "SSE 180", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "000905", "label_zh": "中证500", "label_en": "CSI 500", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "000852", "label_zh": "中证1000", "label_en": "CSI 1000", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "399303", "label_zh": "国证2000", "label_en": "CNI 2000", "exchange_zh": "深圳", "exchange_en": "Shenzhen"},
    {"id": "000015", "label_zh": "红利指数", "label_en": "SSE Dividend", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "000922", "label_zh": "中证红利", "label_en": "CSI Dividend", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "399673", "label_zh": "创业板50", "label_en": "ChiNext 50", "exchange_zh": "深圳", "exchange_en": "Shenzhen"},
    {"id": "000933", "label_zh": "中证医药", "label_en": "CSI Healthcare", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "000932", "label_zh": "中证消费", "label_en": "CSI Consumer", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "000934", "label_zh": "中证金融", "label_en": "CSI Financials", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "000941", "label_zh": "中证新能源", "label_en": "CSI New Energy", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "000993", "label_zh": "全指信息", "label_en": "CSI All Share IT", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "000986", "label_zh": "全指能源", "label_en": "CSI All Share Energy", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "399975", "label_zh": "证券公司", "label_en": "CSI Securities", "exchange_zh": "深圳", "exchange_en": "Shenzhen"},
    {"id": "399967", "label_zh": "中证军工", "label_en": "CSI Defense", "exchange_zh": "深圳", "exchange_en": "Shenzhen"},
    {"id": "399808", "label_zh": "中证新能车", "label_en": "CSI NEV", "exchange_zh": "深圳", "exchange_en": "Shenzhen"},
    {"id": "000985", "label_zh": "中证全指", "label_en": "CSI All Share", "exchange_zh": "上海", "exchange_en": "Shanghai"},
    {"id": "399296", "label_zh": "创成长", "label_en": "ChiNext Growth", "exchange_zh": "深圳", "exchange_en": "Shenzhen"},
    {"id": "000043", "label_zh": "超大盘", "label_en": "SSE Mega-Cap", "exchange_zh": "上海", "exchange_en": "Shanghai"},
]

CN_A_INDEX_DEFAULT_IDS: List[str] = [
    "000001",
    "399001",
    "000300",
    "399006",
    "000688",
]

_CN_CATALOG_BY_ID: Optional[Dict[str, Dict[str, str]]] = None


def _cn_catalog_by_id() -> Dict[str, Dict[str, str]]:
    global _CN_CATALOG_BY_ID
    if _CN_CATALOG_BY_ID is None:
        _CN_CATALOG_BY_ID = {row["id"]: dict(row) for row in CN_A_INDEX_CATALOG}
    return _CN_CATALOG_BY_ID


def cn_a_index_catalog() -> List[Dict[str, str]]:
    return [dict(x) for x in CN_A_INDEX_CATALOG]


def _builtin_cn_a_indices() -> List[Dict[str, str]]:
    cat = _cn_catalog_by_id()
    out: List[Dict[str, str]] = []
    for sid in CN_A_INDEX_DEFAULT_IDS:
        if sid in cat:
            out.append(dict(cat[sid]))
    return out if out else [dict(CN_A_INDEX_CATALOG[0])]


def _norm_cn_index_id(s: str) -> str:
    t = s.strip()
    if t.isdigit():
        return t.zfill(6)
    return t


def _ordered_cn_a_index_ids_from_config(config: Dict) -> Optional[List[str]]:
    raw_ids = config.get("cn_a_index_ids")
    if isinstance(raw_ids, list) and len(raw_ids) > 0:
        return [_norm_cn_index_id(str(x)) for x in raw_ids if str(x).strip()]
    legacy = config.get("cn_a_indices")
    if isinstance(legacy, list) and len(legacy) > 0:
        ids: List[str] = []
        for entry in legacy:
            if isinstance(entry, str):
                s = _norm_cn_index_id(entry)
                if s:
                    ids.append(s)
            elif isinstance(entry, dict) and entry.get("id") is not None:
                s = _norm_cn_index_id(str(entry["id"]))
                if s:
                    ids.append(s)
        return ids or None
    return None


def cn_a_indices_from_config(config: Dict) -> List[Dict[str, str]]:
    ids = _ordered_cn_a_index_ids_from_config(config)
    if not ids:
        return _builtin_cn_a_indices()
    cat = _cn_catalog_by_id()
    out: List[Dict[str, str]] = []
    seen: set = set()
    for sid in ids:
        if sid not in cat or sid in seen:
            continue
        seen.add(sid)
        out.append(dict(cat[sid]))
    return out if out else _builtin_cn_a_indices()


def cn_a_indices(config: Optional[Dict] = None) -> List[Dict[str, str]]:
    if config is None:
        return _builtin_cn_a_indices()
    return cn_a_indices_from_config(config)


def index_hist_csv_path(symbol: str) -> Path:
    s = _norm_cn_index_id(str(symbol))
    return dist_excels_dir() / f"index_hist_{s}.csv"


def read_cn_a_chart_id(config: Dict) -> str:
    """行情页当前展示的指数代码（须在用户配置的 cn_a_index_ids 列表内）。"""
    items = cn_a_indices_from_config(config)
    allowed = {x["id"] for x in items}
    raw = config.get("cn_a_chart_id")
    if raw is not None:
        sid = _norm_cn_index_id(str(raw))
        if sid in allowed:
            return sid
    return items[0]["id"] if items else "000001"


def ensure_cn_a_chart_id_valid(config: Dict) -> None:
    """若 cn_a_chart_id 不在当前可选指数列表中，则回退为列表首项。"""
    items = cn_a_indices_from_config(config)
    if not items:
        return
    allowed = {x["id"] for x in items}
    raw = config.get("cn_a_chart_id")
    sid = _norm_cn_index_id(str(raw)) if raw is not None else ""
    if sid not in allowed:
        config["cn_a_chart_id"] = items[0]["id"]


def _index_df_ok(df: Any) -> bool:
    return df is not None and not getattr(df, "empty", True)


def _sina_symbol_from_em_id(six: str) -> str:
    """6 位代码 → 新浪 stock_zh_index_daily 的 symbol（如 sh000001、sz399001）。"""
    s = _norm_cn_index_id(six)
    if len(s) != 6 or not s.isdigit():
        raise ValueError(f"无效指数代码: {six}")
    meta = _cn_catalog_by_id().get(s) or {}
    ex = str(meta.get("exchange_zh", "")).strip()
    if ex == "深圳":
        return "sz" + s
    if ex == "上海":
        return "sh" + s
    if s.startswith("39"):
        return "sz" + s
    return "sh" + s


def _normalize_sina_index_df_to_em_columns(df: "pd.DataFrame") -> "pd.DataFrame":
    """新浪列名多为英文，转成统一中文列，便于 load_cn_index_hist_csv / 画线。"""
    import pandas as pd

    d = df.copy()
    lower_to_orig = {str(c).lower(): c for c in d.columns}

    def col(*candidates: str) -> Optional[str]:
        for name in candidates:
            if name in d.columns:
                return name
            lo = name.lower()
            if lo in lower_to_orig:
                return lower_to_orig[lo]
        return None

    c_date = col("date", "日期")
    c_close = col("close", "收盘")
    if not c_date or not c_close:
        raise ValueError("新浪指数数据缺少日期或收盘价列")

    rename: Dict[str, str] = {c_date: "日期", c_close: "收盘"}
    c_open = col("open", "开盘")
    c_high = col("high", "最高")
    c_low = col("low", "最低")
    c_vol = col("volume", "成交量")
    if c_open:
        rename[c_open] = "开盘"
    if c_high:
        rename[c_high] = "最高"
    if c_low:
        rename[c_low] = "最低"
    if c_vol:
        rename[c_vol] = "成交量"
    d = d.rename(columns=rename)

    for opt in ("开盘", "最高", "最低", "成交量"):
        if opt not in d.columns:
            d[opt] = pd.NA
    if "成交额" not in d.columns:
        d["成交额"] = pd.NA

    d["日期"] = pd.to_datetime(d["日期"], errors="coerce")
    d["收盘"] = pd.to_numeric(d["收盘"], errors="coerce")
    d = d.dropna(subset=["日期", "收盘"]).sort_values("日期")
    d["日期"] = d["日期"].dt.strftime("%Y-%m-%d")
    return d


def fetch_cn_index_hist(symbol: str, save: bool = True) -> "pd.DataFrame":
    import akshare as ak

    s = _norm_cn_index_id(str(symbol))
    sina_sym = _sina_symbol_from_em_id(s)
    df_si = run_akshare_with_proxy_fallback(lambda: ak.stock_zh_index_daily(symbol=sina_sym))
    if not _index_df_ok(df_si):
        raise RuntimeError(f"指数 {s} 新浪返回无有效数据（symbol={sina_sym}）")

    df_out = _normalize_sina_index_df_to_em_columns(df_si)
    if save:
        path = index_hist_csv_path(s)
        df_out.to_csv(path, index=False, encoding="utf-8-sig")
        _logger.info("指数 %s 日线（新浪 %s）已写入 %s", s, sina_sym, path)
    return df_out


def load_cn_index_hist_csv(symbol: str) -> Optional["pd.DataFrame"]:
    import pandas as pd

    path = index_hist_csv_path(_norm_cn_index_id(str(symbol)))
    if not path.is_file():
        return None
    return pd.read_csv(path, encoding="utf-8-sig")


def cn_index_hist_bar_count(symbol: str) -> int:
    df = load_cn_index_hist_csv(symbol)
    if df is None or getattr(df, "empty", True):
        return 0
    import pandas as pd

    close_col = "收盘" if "收盘" in df.columns else None
    if not close_col:
        for name in ("close", "Close"):
            if name in df.columns:
                close_col = name
                break
    if not close_col:
        return 0
    date_col = "日期" if "日期" in df.columns else None
    d = df.copy()
    if date_col:
        d[date_col] = pd.to_datetime(d[date_col], errors="coerce")
        d = d.dropna(subset=[date_col])
    ser = pd.to_numeric(d[close_col], errors="coerce")
    return int(ser.notna().sum())


def cn_index_last_bar_date(symbol: str) -> Optional[date]:
    df = load_cn_index_hist_csv(symbol)
    if df is None or getattr(df, "empty", True):
        return None
    import pandas as pd

    date_col = "日期" if "日期" in df.columns else None
    if not date_col:
        return None
    d = df.copy()
    d[date_col] = pd.to_datetime(d[date_col], errors="coerce")
    d = d.dropna(subset=[date_col]).sort_values(date_col)
    if d.empty:
        return None
    ts = d[date_col].iloc[-1]
    if hasattr(ts, "date"):
        return ts.date()
    return None


def get_cn_index_close_last_days(
    symbol: str, days: int, *, force_network: bool = False
) -> Tuple[List[str], List[float]]:
    import pandas as pd

    sym = _norm_cn_index_id(str(symbol))
    if force_network:
        df = fetch_cn_index_hist(sym, save=True)
    else:
        df = load_cn_index_hist_csv(sym)
        if df is None or getattr(df, "empty", True):
            df = fetch_cn_index_hist(sym, save=True)
    if df is None or getattr(df, "empty", True):
        raise ValueError("无指数数据，请先点击「刷新」拉取指数日线")

    close_col = None
    for name in ("收盘", "close", "Close"):
        if name in df.columns:
            close_col = name
            break
    if not close_col:
        raise ValueError("无法识别指数收盘价列")

    date_col = "日期" if "日期" in df.columns else None
    d = df.copy()
    if date_col:
        d[date_col] = pd.to_datetime(d[date_col], errors="coerce")
        d = d.dropna(subset=[date_col]).sort_values(date_col)
    else:
        d = d.reset_index(drop=True)

    n = max(7, min(365, int(days)))
    d = d.tail(n)
    if d.empty:
        raise ValueError("筛选后无数据")

    close_series = pd.to_numeric(d[close_col], errors="coerce")
    if date_col:
        date_series = d[date_col].dt.strftime("%Y-%m-%d")
    else:
        date_series = pd.Series([str(i) for i in range(len(d))])

    dates: List[str] = []
    closes: List[float] = []
    for i in range(len(d)):
        c = close_series.iloc[i]
        if pd.isna(c):
            continue
        dates.append(str(date_series.iloc[i]))
        closes.append(float(c))
    if not closes:
        raise ValueError("收盘价无效")
    return dates, closes


def normalize_and_validate_cn_a_index_ids(raw: Any) -> List[Dict[str, str]]:
    if not isinstance(raw, list) or len(raw) == 0:
        raise ValueError("至少保留一个指数")
    if len(raw) > 40:
        raise ValueError("指数数量过多（最多 40 个）")
    cat = _cn_catalog_by_id()
    out: List[Dict[str, str]] = []
    seen: set = set()
    for entry in raw:
        if isinstance(entry, dict):
            sid = _norm_cn_index_id(str(entry.get("id", "")))
        else:
            sid = _norm_cn_index_id(str(entry))
        if not sid:
            raise ValueError("存在空的指数代码")
        if sid not in cat:
            raise ValueError(f"未知指数代码（不在系统目录内）: {sid}")
        if sid in seen:
            raise ValueError(f"重复的代码: {sid}")
        seen.add(sid)
        out.append(dict(cat[sid]))
    return out

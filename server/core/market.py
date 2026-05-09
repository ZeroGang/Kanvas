#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通过 AkShare 获取黄金相关历史行情（免费）。

- **上海金**：上海黄金交易所现货（如 Au99.99），单位 **元/克**。
- **伦敦金**：新浪外盘 XAU 日线，单位 **美元/盎司**。

与「计算」页手填价格时请与所选数据源单位一致，勿混用。
"""

from __future__ import annotations

import logging
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, TYPE_CHECKING

from paths import dist_excels_dir as _dist_excels_dir

from core.akshare_net import run_akshare_with_proxy_fallback

_logger = logging.getLogger("Kanvas")

if TYPE_CHECKING:
    import pandas as pd

# --- 数据源标识（写入 config.json gold_data_source）---
SPOT_SOURCE_SHANGHAI = "shanghai"
SPOT_SOURCE_LONDON = "london"
SYMBOL_SHANGHAI = "Au99.99"
SYMBOL_LONDON = "XAU"

# 系统品类目录（与 AkShare spot_symbol_table_sge / spot_hist_sge + 伦敦 XAU 一致）
SPOT_INSTRUMENT_CATALOG: List[Dict[str, str]] = [
    {"id": "Au99.99", "label_zh": "上海金 Au99.99", "label_en": "SGE Au 99.99", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "Au99.95", "label_zh": "上海金 Au99.95", "label_en": "SGE Au 99.95", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "Au100g", "label_zh": "100 克金条", "label_en": "Au 100g bar", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "Pt99.95", "label_zh": "铂金 Pt99.95", "label_en": "SGE Pt 99.95", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "Ag(T+D)", "label_zh": "白银 T+D", "label_en": "Silver T+D", "unit_zh": "元/千克", "unit_en": "CNY/kg"},
    {"id": "Au(T+D)", "label_zh": "黄金 T+D", "label_en": "Gold T+D", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "mAu(T+D)", "label_zh": "迷你黄金 T+D", "label_en": "Mini gold T+D", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "Au(T+N1)", "label_zh": "黄金 T+N1", "label_en": "Gold T+N1", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "Au(T+N2)", "label_zh": "黄金 T+N2", "label_en": "Gold T+N2", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "Ag99.99", "label_zh": "白银 Ag99.99", "label_en": "SGE Ag 99.99", "unit_zh": "元/千克", "unit_en": "CNY/kg"},
    {"id": "iAu99.99", "label_zh": "国际板 Au99.99", "label_en": "Intl board Au 99.99", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "Au99.5", "label_zh": "上海金 Au99.5", "label_en": "SGE Au 99.5", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "iAu100g", "label_zh": "国际板 100 克", "label_en": "Intl board Au 100g", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "iAu99.5", "label_zh": "国际板 Au99.5", "label_en": "Intl board Au 99.5", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "PGC30g", "label_zh": "熊猫普制金 30g", "label_en": "Panda gold 30g", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "NYAuTN06", "label_zh": "纽约金 TN06", "label_en": "NY gold TN06", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "NYAuTN12", "label_zh": "纽约金 TN12", "label_en": "NY gold TN12", "unit_zh": "元/克", "unit_en": "CNY/g"},
    {"id": "XAU", "label_zh": "伦敦金 XAU", "label_en": "London XAU", "unit_zh": "美元/盎司", "unit_en": "USD/oz"},
]

# AkShare 拉取品种表后写入 excels 的文件名（列：id,label_zh,label_en,unit_zh,unit_en）
SPOT_AKSHARE_EXPORT_CSV = "spot_instruments_akshare.csv"

# 无配置时的默认展示顺序（与历史版本一致）
SPOT_INSTRUMENT_DEFAULT_IDS: List[str] = [
    "Au99.99",
    "Au99.95",
    "Au100g",
    "Au(T+D)",
    "Ag(T+D)",
    "XAU",
]

_SPOT_CATALOG_BY_ID: Optional[Dict[str, Dict[str, str]]] = None


def _spot_catalog_by_id() -> Dict[str, Dict[str, str]]:
    global _SPOT_CATALOG_BY_ID
    if _SPOT_CATALOG_BY_ID is None:
        _SPOT_CATALOG_BY_ID = {row["id"]: dict(row) for row in SPOT_INSTRUMENT_CATALOG}
    return _SPOT_CATALOG_BY_ID


def spot_instrument_catalog() -> List[Dict[str, str]]:
    """全部可添加的系统品类（只读元数据）。"""
    return [dict(x) for x in SPOT_INSTRUMENT_CATALOG]


def _row_for_akshare_export(sid: str) -> Dict[str, str]:
    """AkShare 返回的代码 → 导出用五行；目录有则用目录，否则按代码推断单位。"""
    s = str(sid).strip()
    cat = _spot_catalog_by_id()
    if s in cat:
        return dict(cat[s])
    ul = s.upper()
    if ul == SYMBOL_LONDON:
        return dict(cat[SYMBOL_LONDON])
    if ul.startswith("AG"):
        return {"id": s, "label_zh": s, "label_en": s, "unit_zh": "元/千克", "unit_en": "CNY/kg"}
    return {"id": s, "label_zh": s, "label_en": s, "unit_zh": "元/克", "unit_en": "CNY/g"}


def export_akshare_spot_instruments_csv() -> Tuple[Path, int]:
    """
    调用 AkShare spot_symbol_table_sge 获取上金所现货品种代码，
    合并系统目录中的中英文与单位，写入 app/dist/excels/spot_instruments_akshare.csv。
    另附一行伦敦金 XAU（不在 SGE 表中，走 futures_foreign_hist）。
    """
    import akshare as ak
    import pandas as pd

    df = run_akshare_with_proxy_fallback(ak.spot_symbol_table_sge)
    sym_col = "品种"
    if sym_col not in df.columns:
        for c in df.columns:
            if "品" in str(c):
                sym_col = c
                break
        else:
            sym_col = list(df.columns)[-1]

    ids: List[str] = []
    for x in df[sym_col].tolist():
        t = str(x).strip()
        if t:
            ids.append(t)

    rows: List[Dict[str, str]] = [_row_for_akshare_export(i) for i in ids]

    seen_u = {str(r["id"]).upper() for r in rows}
    if SYMBOL_LONDON not in seen_u:
        rows.append(dict(_spot_catalog_by_id()[SYMBOL_LONDON]))

    cols = ["id", "label_zh", "label_en", "unit_zh", "unit_en"]
    out = _dist_excels_dir() / SPOT_AKSHARE_EXPORT_CSV
    pd.DataFrame(rows, columns=cols).to_csv(out, index=False, encoding="utf-8-sig")
    n = len(rows)
    _logger.info("AkShare 品种表已写入 %s（%d 条）", out, n)
    return out, n


def _builtin_spot_instruments() -> List[Dict[str, str]]:
    cat = _spot_catalog_by_id()
    out: List[Dict[str, str]] = []
    for sid in SPOT_INSTRUMENT_DEFAULT_IDS:
        if sid in cat:
            out.append(dict(cat[sid]))
    return out if out else [dict(SPOT_INSTRUMENT_CATALOG[0])]


def _ordered_ids_from_config(config: Dict) -> Optional[List[str]]:
    raw_ids = config.get("spot_instrument_ids")
    if isinstance(raw_ids, list) and len(raw_ids) > 0:
        return [str(x).strip() for x in raw_ids if str(x).strip()]
    raw = config.get("spot_instruments")
    if not isinstance(raw, list) or len(raw) == 0:
        return None
    ids: List[str] = []
    for entry in raw:
        if isinstance(entry, str):
            s = entry.strip()
            if s:
                ids.append(s)
        elif isinstance(entry, dict) and entry.get("id") is not None:
            s = str(entry["id"]).strip()
            if s:
                ids.append(s)
    return ids or None


def spot_instruments_from_config(config: Dict) -> List[Dict[str, str]]:
    """按配置中的 id 顺序，从系统目录展开；未知 id 跳过；空或全无效则回退默认。"""
    ids = _ordered_ids_from_config(config)
    if not ids:
        return _builtin_spot_instruments()
    cat = _spot_catalog_by_id()
    out: List[Dict[str, str]] = []
    seen: set = set()
    for sid in ids:
        if sid not in cat or sid in seen:
            continue
        seen.add(sid)
        out.append(dict(cat[sid]))
    return out if out else _builtin_spot_instruments()


def spot_instruments(config: Optional[Dict] = None) -> List[Dict[str, str]]:
    """供 Web 展示的可选交易品类列表。"""
    if config is None:
        return _builtin_spot_instruments()
    return spot_instruments_from_config(config)


def normalize_and_validate_spot_instrument_ids(raw: Any) -> List[Dict[str, str]]:
    """保存：仅允许系统目录中的代码，至少一条、无重复；返回目录中的完整条目。"""
    if not isinstance(raw, list) or len(raw) == 0:
        raise ValueError("至少保留一个交易品类")
    if len(raw) > 40:
        raise ValueError("品类数量过多（最多 40 条）")
    cat = _spot_catalog_by_id()
    out: List[Dict[str, str]] = []
    seen: set = set()
    for entry in raw:
        if isinstance(entry, dict):
            sid = str(entry.get("id", "")).strip()
        else:
            sid = str(entry).strip()
        if not sid:
            raise ValueError("存在空的品种代码")
        if sid not in cat:
            raise ValueError(f"未知品种代码（不在系统目录内）: {sid}")
        if sid in seen:
            raise ValueError(f"重复的代码: {sid}")
        seen.add(sid)
        out.append(dict(cat[sid]))
    return out


def _allowed_spot_symbols(config: Optional[Dict] = None) -> set:
    return {x["id"] for x in spot_instruments(config)}


def read_spot_symbol(config: Dict) -> str:
    """全局行情品种：优先 config.spot_symbol（白名单），否则按 gold_data_source 推断默认代码。"""
    raw = config.get("spot_symbol")
    if raw is not None:
        s = str(raw).strip()
        if s in _allowed_spot_symbols(config):
            return s
    return symbol_for_data_source(read_gold_data_source(config))


def gold_data_source_for_spot_symbol(symbol: str) -> str:
    """与 spot_symbol 对齐的 gold_data_source（XAU→london，其余→shanghai）。"""
    return SPOT_SOURCE_LONDON if str(symbol).upper() == SYMBOL_LONDON else SPOT_SOURCE_SHANGHAI


def meta_for_spot_symbol(symbol: str, config: Optional[Dict] = None) -> Dict[str, str]:
    sym = str(symbol).strip()
    for row in spot_instruments(config):
        if row["id"] == sym:
            return {
                "label_zh": row["label_zh"],
                "label_en": row["label_en"],
                "unit_zh": row["unit_zh"],
                "unit_en": row["unit_en"],
            }
    return {"label_zh": sym, "label_en": sym, "unit_zh": "", "unit_en": ""}


def data_dist_dir() -> Path:
    """行情 CSV 落地目录（app/dist/excels/）。"""
    return _dist_excels_dir()


def read_gold_data_source(config: Dict) -> str:
    """从配置读取数据源，非法值回退上海金。"""
    v = config.get("gold_data_source", SPOT_SOURCE_SHANGHAI)
    if v == SPOT_SOURCE_LONDON:
        return SPOT_SOURCE_LONDON
    return SPOT_SOURCE_SHANGHAI


def symbol_for_data_source(source_id: str) -> str:
    """数据源对应的行情代码（用于 CSV 文件名与回测）。"""
    return SYMBOL_LONDON if source_id == SPOT_SOURCE_LONDON else SYMBOL_SHANGHAI


def price_unit_for_data_source(source_id: str) -> str:
    return "美元/盎司" if source_id == SPOT_SOURCE_LONDON else "元/克"


def display_name_for_data_source(source_id: str) -> str:
    return "伦敦金 XAU" if source_id == SPOT_SOURCE_LONDON else "上海金 Au99.99"


def price_unit_for_symbol(symbol: str) -> str:
    """按行情代码返回价格单位（用于回测结果展示）。"""
    return "美元/盎司" if str(symbol).upper() == SYMBOL_LONDON else "元/克"


def spot_hist_csv_path(symbol: str) -> Path:
    """某代码对应的本地缓存 CSV 路径。"""
    return _dist_excels_dir() / f"spot_hist_{_symbol_to_filename(symbol)}.csv"


def _symbol_to_filename(symbol: str) -> str:
    return symbol.replace(".", "_").replace("/", "-")


def _save_fetched_spot_to_dist(df: "pd.DataFrame", symbol: str) -> Path:
    path = spot_hist_csv_path(symbol)
    df.to_csv(path, index=False, encoding="utf-8-sig")
    return path


def load_spot_hist_csv(symbol: str = "Au99.99") -> Optional["pd.DataFrame"]:
    """读取 app/dist/excels/ 下现货 CSV；不存在则返回 None。"""
    import pandas as pd

    path = spot_hist_csv_path(symbol)
    if not path.is_file():
        return None
    return pd.read_csv(path, encoding="utf-8-sig")


def _last_bar_date_from_df(df: "pd.DataFrame") -> Optional[date]:
    """CSV / DataFrame 中最后一根 K 线对应的日历日期（按日期列最大值）。"""
    import pandas as pd

    col = _pick_date_column(df)
    if not col:
        return None
    try:
        series = pd.to_datetime(df[col], errors="coerce").dropna()
        if series.empty:
            return None
        ts = series.max()
        if pd.isna(ts):
            return None
        if isinstance(ts, pd.Timestamp):
            return ts.date()
        if hasattr(ts, "date"):
            return ts.date()  # type: ignore[no-any-return]
        return pd.Timestamp(ts).date()
    except Exception:
        return None


def _local_csv_is_fresh_enough(last_bar: date, today: date) -> bool:
    """
    按「当前日期」判断本地日线是否已视为最新、可跳过 AkShare。
    - 末条日期 ≥ 今天：已含当日（或未来数据异常时也跳过拉取）。
    - 末条 ≥ 今天往前遇到的第一个工作日：常规日更已跟上。
    - 周一：若末条为上周五及之后，避免周末/早盘重复拉同一批数据。
    """
    if last_bar >= today:
        return True
    exp = today
    while exp.weekday() >= 5:
        exp -= timedelta(days=1)
    if last_bar >= exp:
        return True
    if today.weekday() == 0 and last_bar >= today - timedelta(days=3):
        return True
    return False


def _try_load_fresh_local_spot(symbol: str) -> Optional["pd.DataFrame"]:
    """若本地 CSV 相对今天已足够新，返回其 DataFrame，否则 None。"""
    df = load_spot_hist_csv(symbol)
    if df is None or df.empty:
        return None
    last_d = _last_bar_date_from_df(df)
    if last_d is None:
        return None
    today = date.today()
    if _local_csv_is_fresh_enough(last_d, today):
        return df
    return None


def fetch_sge_spot_hist(symbol: str = "Au99.99", save_to_dist: bool = True) -> "pd.DataFrame":
    """拉取上金所现货历史 K 线。需安装: pip install akshare。"""
    import akshare as ak

    df = run_akshare_with_proxy_fallback(lambda: ak.spot_hist_sge(symbol=symbol))
    if df is None or df.empty:
        raise ValueError("未返回任何行情数据")
    if save_to_dist:
        try:
            _save_fetched_spot_to_dist(df, symbol)
        except OSError:
            pass
    n = len(df.index)
    _logger.info("AkShare 拉取完成：上海金 %s，共 %d 条记录", symbol, n)
    return df


def normalize_london_xau_df(df: "pd.DataFrame") -> "pd.DataFrame":
    """新浪外盘 XAU 日线转为与本项目列名兼容（日期 / 收盘价）。"""
    import pandas as pd

    d = df.copy()
    if "date" in d.columns and "日期" not in d.columns:
        d = d.rename(columns={"date": "日期"})
    if "close" in d.columns and "收盘价" not in d.columns:
        d["收盘价"] = pd.to_numeric(d["close"], errors="coerce")
    return d


def fetch_london_xau_hist(save_to_dist: bool = True) -> "pd.DataFrame":
    """拉取伦敦金 XAU 日线（美元/盎司）。需 akshare。"""
    import akshare as ak

    df = run_akshare_with_proxy_fallback(lambda: ak.futures_foreign_hist(symbol=SYMBOL_LONDON))
    if df is None or df.empty:
        raise ValueError("伦敦金未返回行情数据")
    out = normalize_london_xau_df(df)
    if save_to_dist:
        try:
            _save_fetched_spot_to_dist(out, SYMBOL_LONDON)
        except OSError:
            pass
    n = len(out.index)
    _logger.info("AkShare 拉取完成：伦敦金 %s，共 %d 条记录", SYMBOL_LONDON, n)
    return out


def fetch_hist_by_data_source(
    source_id: str, save_to_dist: bool = True, *, force_network: bool = False
) -> "pd.DataFrame":
    """按数据源获取完整历史：若本地 CSV 相对当前日期已是最新则跳过联网，否则 AkShare 拉取。"""
    sym = symbol_for_data_source(source_id)
    cached = None if force_network else _try_load_fresh_local_spot(sym)
    if cached is not None:
        last_d = _last_bar_date_from_df(cached)
        n_local = len(cached.index)
        _logger.info(
            "跳过 AkShare 拉取：本地 %s 已是最新数据（末条日期 %s；检查时刻 %s；共 %d 条）",
            sym,
            last_d.isoformat() if last_d else "?",
            datetime.now().replace(microsecond=0).isoformat(sep=" "),
            n_local,
        )
        return cached.copy()

    if source_id == SPOT_SOURCE_LONDON:
        return fetch_london_xau_hist(save_to_dist=save_to_dist)
    return fetch_sge_spot_hist(symbol=SYMBOL_SHANGHAI, save_to_dist=save_to_dist)


def fetch_gold_spot_hist(source_id: str, save_to_dist: bool = True) -> "pd.DataFrame":
    """按数据源拉取日线历史并可选写入 app/dist/excels/ CSV（供回测「拉取」等）。"""
    return fetch_hist_by_data_source(source_id, save_to_dist=save_to_dist)


def fetch_hist_by_symbol(
    symbol: str,
    save_to_dist: bool = True,
    config: Optional[Dict] = None,
    *,
    force_network: bool = False,
) -> "pd.DataFrame":
    """按行情代码拉取：XAU 走伦敦金，其余走上金所现货。force_network=True 时跳过本地「仍新鲜」缓存，强制联网更新。"""
    sym = str(symbol).strip()
    if str(sym).upper() == SYMBOL_LONDON:
        return fetch_hist_by_data_source(
            SPOT_SOURCE_LONDON, save_to_dist=save_to_dist, force_network=force_network
        )
    if sym not in _allowed_spot_symbols(config):
        raise ValueError(f"不支持的行情代码: {sym}")
    if not force_network:
        cached = _try_load_fresh_local_spot(sym)
        if cached is not None:
            last_d = _last_bar_date_from_df(cached)
            n_local = len(cached.index)
            _logger.info(
                "跳过 AkShare 拉取：本地 %s 已是最新数据（末条日期 %s；检查时刻 %s；共 %d 条）",
                sym,
                last_d.isoformat() if last_d else "?",
                datetime.now().replace(microsecond=0).isoformat(sep=" "),
                n_local,
            )
            return cached.copy()
    return fetch_sge_spot_hist(symbol=sym, save_to_dist=save_to_dist)


def _pick_close_column(df: "pd.DataFrame") -> str:
    for name in ("收盘价", "close", "收盘"):
        if name in df.columns:
            return name
    raise ValueError(f"无法识别收盘价列，当前列: {list(df.columns)}")


def _pick_date_column(df: "pd.DataFrame") -> Optional[str]:
    for name in ("日期", "date", "时间"):
        if name in df.columns:
            return name
    return None


def spot_hist_bar_count_from_df(df: "pd.DataFrame") -> int:
    """与回测相同的清洗：按日期排序后统计有效收盘价行数。"""
    import pandas as pd

    if df is None or getattr(df, "empty", True):
        return 0
    try:
        close_col = _pick_close_column(df)
    except ValueError:
        return 0
    date_col = _pick_date_column(df)
    d = df.copy()
    if date_col:
        d[date_col] = pd.to_datetime(d[date_col], errors="coerce")
        d = d.dropna(subset=[date_col]).sort_values(date_col)
    else:
        d = d.reset_index(drop=True)
    d["_close"] = pd.to_numeric(d[close_col], errors="coerce")
    d = d.dropna(subset=["_close"])
    return int(len(d))


def spot_hist_bar_count(symbol: str) -> int:
    """本地 CSV 有效 K 线条数；无文件或无法解析则 0。"""
    df = load_spot_hist_csv(symbol)
    return spot_hist_bar_count_from_df(df)


def close_and_ma20_from_hist(
    df: "pd.DataFrame",
    ma_window: int = 20,
) -> Tuple[float, float]:
    import pandas as pd

    close_col = _pick_close_column(df)
    d = df.copy()
    date_col = _pick_date_column(d)
    if date_col:
        d[date_col] = pd.to_datetime(d[date_col], errors="coerce")
        d = d.dropna(subset=[date_col]).sort_values(date_col)
    else:
        d = d.reset_index(drop=True)

    series = pd.to_numeric(d[close_col], errors="coerce").dropna()
    if series.empty:
        raise ValueError("收盘价列为空或无法解析为数字")

    n = min(ma_window, len(series))
    if n < 1:
        raise ValueError("数据不足")

    last_close = float(series.iloc[-1])
    ma = float(series.iloc[-n:].mean())
    return last_close, ma


def fetch_latest_close_and_ma20(
    source_id: str = SPOT_SOURCE_SHANGHAI,
    ma_window: int = 20,
) -> Tuple[float, float]:
    sid = SPOT_SOURCE_LONDON if source_id == SPOT_SOURCE_LONDON else SPOT_SOURCE_SHANGHAI
    df = fetch_hist_by_data_source(sid, save_to_dist=True)
    return close_and_ma20_from_hist(df, ma_window=ma_window)


def fetch_latest_close_and_ma20_from_config(config: Dict, ma_window: int = 20) -> Tuple[float, float]:
    sym = read_spot_symbol(config)
    df = fetch_hist_by_symbol(sym, save_to_dist=True, config=config)
    return close_and_ma20_from_hist(df, ma_window=ma_window)


def _tail_dates_closes_from_df(df: "pd.DataFrame", days: int) -> Tuple[List[str], List[float]]:
    import pandas as pd

    close_col = _pick_close_column(df)
    date_col = _pick_date_column(df)
    d = df.copy()
    if date_col:
        d[date_col] = pd.to_datetime(d[date_col], errors="coerce")
        d = d.dropna(subset=[date_col]).sort_values(date_col)
    else:
        d = d.reset_index(drop=True)

    n = max(1, int(days))
    d = d.tail(n)
    if d.empty:
        raise ValueError("筛选后无数据")

    closes = pd.to_numeric(d[close_col], errors="coerce")
    if closes.isna().all():
        raise ValueError("收盘价无法解析")

    if date_col:
        date_strs = d[date_col].dt.strftime("%Y-%m-%d").tolist()
    else:
        date_strs = [str(i) for i in range(len(d))]

    return date_strs, [float(x) for x in closes.tolist()]


def get_spot_close_last_days(
    symbol: str,
    days: int = 30,
    config: Optional[Dict] = None,
    *,
    force_network: bool = False,
) -> Tuple[List[str], List[float]]:
    df = fetch_hist_by_symbol(symbol, save_to_dist=True, config=config, force_network=force_network)
    return _tail_dates_closes_from_df(df, days)


def get_gold_close_last_days(source_id: str, days: int = 30) -> Tuple[List[str], List[float]]:
    return get_spot_close_last_days(symbol_for_data_source(source_id), days=days)


def get_sge_close_last_days(
    symbol: str = "Au99.99",
    days: int = 30,
) -> Tuple[List[str], List[float]]:
    """兼容旧调用：按 symbol 取最近交易日收盘价序列。"""
    return get_spot_close_last_days(symbol, days=days)

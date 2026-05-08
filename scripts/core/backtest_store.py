#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""回测方案持久化：保存参数快照，查看/对比时按当前本地行情重算。"""

from __future__ import annotations

import copy
import json
import math
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from core.calculator import DEFAULT_BACKTEST_DAYS, take_profit_base_amount
from paths import dist_config_dir

STORE_VERSION = 2
FILENAME = "saved_backtests.json"

SCHEME_FORMAT = "backtest_scheme"
# v3：thresholds + take_profit；v4：+ ma_period（均线方案）
SCHEME_VERSION = 4


def _clamp_ma_period(raw: Any, default: int = 20) -> int:
    try:
        v = int(float(raw))
    except (TypeError, ValueError):
        v = default
    return max(2, min(600, v))


def format_scheme_column_ma(strat: Dict[str, Any]) -> str:
    """列表「均线」列：scheme.strategy 子字典。"""
    if strat.get("ma_period") is None:
        return "—"
    return f"MA{_clamp_ma_period(strat.get('ma_period'))}"


def format_scheme_column_invest(strat: Dict[str, Any], max_len: int = 220) -> str:
    """列表「投入策略」列：偏离度阈值各档（简写）。"""
    th = strat.get("thresholds")
    if not isinstance(th, list) or not th:
        return "—"
    segs: List[str] = []
    for row in th:
        if not isinstance(row, dict):
            continue
        segs.append(f"{row.get('min')}~{row.get('max')}%×{row.get('multiplier')}")
    s = "/".join(segs) if segs else "—"
    if len(s) > max_len:
        s = s[: max_len - 1] + "…"
    return s


def format_scheme_column_take_profit(strat: Dict[str, Any], max_len: int = 220) -> str:
    """列表「止盈策略」列。"""
    tp = strat.get("take_profit")
    if not isinstance(tp, dict):
        return "—"
    levels = tp.get("levels")
    lv_bits: List[str] = []
    if bool(tp.get("levels_enabled", True)) and isinstance(levels, list) and levels:
        for lv in levels:
            if not isinstance(lv, dict):
                continue
            try:
                p = float(lv.get("profit", 0))
                sp = float(lv.get("sell_percent", 0))
            except (TypeError, ValueError):
                continue
            lv_bits.append(f"{p:.0f}%卖{sp:.0f}%")
    pb = tp.get("pullback")
    pb_bit = ""
    if bool(tp.get("pullback_enabled", True)) and isinstance(pb, dict):
        try:
            pct = float(pb.get("percent", 0))
            sell = float(pb.get("sell_percent", 0))
            pb_bit = f"回撤{pct:.0f}%卖{sell:.0f}%"
        except (TypeError, ValueError):
            pass
    hints: List[str] = []
    bg = take_profit_base_amount(tp)
    if bg > 0:
        hints.append(f"底>{bg:g}")
    if tp.get("levels_enabled") is False:
        hints.append("档关")
    if tp.get("pullback_enabled") is False:
        hints.append("回撤关")
    prefix = ("[" + "·".join(hints) + "] ") if hints else ""
    parts = [x for x in (",".join(lv_bits) if lv_bits else "", pb_bit) if x]
    s = prefix + ("·".join(parts) if parts else "—")
    if len(s) > max_len:
        s = s[: max_len - 1] + "…"
    return s


def format_saved_list_columns(entry: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    已保存列表三列：均线、投入策略、止盈策略。
    新方案来自 scheme.strategy；旧版仅 result 快照时均线来自 result，其余列仅摘要。
    """
    sch = entry.get("scheme")
    if isinstance(sch, dict) and sch.get("format") == SCHEME_FORMAT:
        st = sch.get("strategy") if isinstance(sch.get("strategy"), dict) else {}
        return (
            format_scheme_column_ma(st),
            format_scheme_column_invest(st),
            format_scheme_column_take_profit(st),
        )
    res = entry.get("result")
    if isinstance(res, dict):
        ma = format_scheme_column_ma({"ma_period": res.get("ma_period")})
        tp_lbl = "模拟止盈" if res.get("use_take_profit") else "未模拟止盈"
        return (ma, "—", tp_lbl)
    return ("—", "—", "—")


def describe_thresholds_and_take_profit_one_line(config: Dict[str, Any], max_len: int = 200) -> str:
    """保存方案对话框默认备注：均线 | 投入 | 止盈（单行；无内容的段省略）。"""
    strat = {
        "ma_period": config.get("ma_period"),
        "thresholds": config.get("thresholds"),
        "take_profit": config.get("take_profit"),
    }
    bits = [
        format_scheme_column_ma(strat),
        format_scheme_column_invest(strat),
        format_scheme_column_take_profit(strat),
    ]
    s = " | ".join(b for b in bits if b != "—") or "—"
    if len(s) > max_len:
        s = s[: max_len - 1] + "…"
    return s


def _backtest_days_from_config(cfg: Dict[str, Any], *, max_days: Optional[int] = None) -> int:
    raw = cfg.get("backtest_days", DEFAULT_BACKTEST_DAYS)
    try:
        d = int(float(raw))
    except (TypeError, ValueError):
        d = DEFAULT_BACKTEST_DAYS
    d = max(1, d)
    if max_days is not None:
        cap = max(1, int(max_days))
        d = min(d, cap)
    return d


def store_path() -> Path:
    return dist_config_dir() / FILENAME


def _json_safe_value(x: Any) -> Any:
    if isinstance(x, float) and (math.isnan(x) or math.isinf(x)):
        return None
    if isinstance(x, list):
        return [_json_safe_value(i) for i in x]
    if isinstance(x, dict):
        return {k: _json_safe_value(v) for k, v in x.items()}
    return x


def make_json_safe_result(res: Dict[str, Any]) -> Dict[str, Any]:
    """旧版：完整结果快照。"""
    out = dict(res)
    out.pop("ok", None)
    return _json_safe_value(out)


def restore_result(data: Dict[str, Any]) -> Dict[str, Any]:
    """旧版快照还原。"""
    res = dict(data)
    ma20s = res.get("ma20s")
    if isinstance(ma20s, list):
        res["ma20s"] = [float("nan") if v is None else float(v) for v in ma20s]
    res["ok"] = True
    return res


def build_scheme_dict(*, calc_config: Dict[str, Any]) -> Dict[str, Any]:
    """构造可 JSON 序列化的方案：均线 ma_period + 偏离度 thresholds + 止盈 take_profit（不含行情 K 线）。"""
    th = calc_config.get("thresholds")
    if not isinstance(th, list):
        th = []
    tp = calc_config.get("take_profit")
    if not isinstance(tp, dict):
        tp = {}
    ma_period = _clamp_ma_period(calc_config.get("ma_period"))
    return {
        "format": SCHEME_FORMAT,
        "format_version": SCHEME_VERSION,
        "strategy": {
            "ma_period": ma_period,
            "thresholds": copy.deepcopy(th),
            "take_profit": copy.deepcopy(tp),
        },
    }


def build_scheme_entry(*, scheme: Dict[str, Any], note: str = "") -> Dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "saved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "note": (note or "").strip(),
        "scheme": scheme,
    }


def default_auto_note_scheme(scheme: Dict[str, Any]) -> str:
    st = scheme.get("strategy") if isinstance(scheme.get("strategy"), dict) else {}
    pseudo: Dict[str, Any] = {
        "ma_period": st.get("ma_period"),
        "thresholds": st.get("thresholds"),
        "take_profit": st.get("take_profit"),
    }
    return describe_thresholds_and_take_profit_one_line(pseudo)


def default_auto_note_legacy_result(res: Dict[str, Any]) -> str:
    d = int(res.get("day_count", 0))
    tp = bool(res.get("use_take_profit"))
    y = float(res.get("current_yield_pct", 0.0))
    return f"{d}日 · {'模拟止盈' if tp else '无止盈'} · 区间收益{y:.2f}%（旧版快照）"


def replay_scheme(
    scheme: Dict[str, Any],
    *,
    base_calc: Optional[Any] = None,
) -> Tuple[Optional[Dict[str, Any]], str]:
    """
    用方案中的 ma_period、偏离度 thresholds 与止盈 take_profit，其余参数来自 base_calc（或磁盘默认配置）；
    再按当前 app/dist/excels/ 下本地 CSV 跑回测。
    返回 (result, error_message)；成功时 error 为空串。
    """
    if not isinstance(scheme, dict) or scheme.get("format") != SCHEME_FORMAT:
        return None, "不是有效的回测方案数据。"

    from core.backtest import run_spot_backtest
    from core.calculator import KanvasInvestmentCalculator
    from core.market import load_spot_hist_csv, read_spot_symbol, spot_hist_bar_count_from_df

    if base_calc is not None:
        calc = KanvasInvestmentCalculator()
        calc.config = copy.deepcopy(base_calc.config)
        calc.base_amount = int(getattr(base_calc, "base_amount", calc.config.get("base_amount", 500)))
    else:
        calc = KanvasInvestmentCalculator()

    strat = scheme.get("strategy") if isinstance(scheme.get("strategy"), dict) else {}
    if "ma_period" in strat and strat.get("ma_period") is not None:
        calc.config["ma_period"] = _clamp_ma_period(strat.get("ma_period"))
    th = strat.get("thresholds")
    if isinstance(th, list) and th:
        calc.config["thresholds"] = copy.deepcopy(th)
    tp = strat.get("take_profit")
    if isinstance(tp, dict) and tp:
        calc.config["take_profit"] = copy.deepcopy(tp)

    sym = read_spot_symbol(calc.config)
    use_tp = True

    df = load_spot_hist_csv(sym)
    n_bar = spot_hist_bar_count_from_df(df) if df is not None and not getattr(df, "empty", True) else 0
    days = _backtest_days_from_config(calc.config, max_days=n_bar if n_bar > 0 else 1)
    res = run_spot_backtest(calc, days, df=df, symbol=sym, use_take_profit=use_tp)
    if not res.get("ok"):
        return None, str(res.get("error", "回测失败"))
    return res, ""


def replay_or_restore_entry(
    entry: Dict[str, Any],
    *,
    base_calc: Optional[Any] = None,
) -> Tuple[Optional[Dict[str, Any]], str]:
    """
    新条目：按 scheme 重算（套用方案中的 ma_period、thresholds 与 take_profit，缺省项沿用当前配置）。
    旧条目：仅有 result 时直接还原快照（无法保证与现行情一致）。
    """
    sch = entry.get("scheme")
    if isinstance(sch, dict) and sch.get("format") == SCHEME_FORMAT:
        return replay_scheme(sch, base_calc=base_calc)
    if entry.get("result"):
        return restore_result(entry["result"]), ""
    return None, "记录中无方案或结果数据。"


def entry_is_legacy_snapshot(entry: Dict[str, Any]) -> bool:
    return bool(entry.get("result")) and not (
        isinstance(entry.get("scheme"), dict) and entry["scheme"].get("format") == SCHEME_FORMAT
    )


def load_all() -> List[Dict[str, Any]]:
    p = store_path()
    if not p.is_file():
        return []
    try:
        with open(p, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        items = raw.get("items")
        if isinstance(items, list):
            return items
    return []


def save_all(items: List[Dict[str, Any]]) -> bool:
    try:
        p = store_path()
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump({"version": STORE_VERSION, "items": items}, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def append_entry(entry: Dict[str, Any]) -> bool:
    items = load_all()
    items.insert(0, entry)
    return save_all(items)


def delete_by_ids(ids: List[str]) -> int:
    if not ids:
        return 0
    rm = set(str(i) for i in ids)
    items = load_all()
    new_items = [e for e in items if str(e.get("id", "")) not in rm]
    deleted = len(items) - len(new_items)
    if deleted == 0:
        return 0
    return deleted if save_all(new_items) else 0


def apply_saved_scheme_to_config(scheme: Optional[Dict[str, Any]]) -> Tuple[bool, str]:
    """
    将已保存 scheme 中的 ma_period、thresholds、take_profit 写入当前 app/dist/config/config.json。
    不改变 base_amount、gold_data_source、backtest_* 等其它字段。
    """
    if not isinstance(scheme, dict) or scheme.get("format") != SCHEME_FORMAT:
        return False, "记录中无可应用的策略方案。"
    from core.calculator import KanvasInvestmentCalculator

    calc = KanvasInvestmentCalculator()
    strat = scheme.get("strategy") if isinstance(scheme.get("strategy"), dict) else {}
    if "ma_period" in strat and strat.get("ma_period") is not None:
        calc.config["ma_period"] = _clamp_ma_period(strat.get("ma_period"))
    th = strat.get("thresholds")
    if not isinstance(th, list) or not th:
        return False, "方案中缺少偏离度档位。"
    calc.config["thresholds"] = copy.deepcopy(th)
    tp = strat.get("take_profit")
    if isinstance(tp, dict) and tp:
        calc.config["take_profit"] = copy.deepcopy(tp)
    if not calc.save_config():
        return False, "保存配置失败。"
    return True, ""


def get_by_id(entry_id: str) -> Optional[Dict[str, Any]]:
    for e in load_all():
        if str(e.get("id", "")) == str(entry_id):
            return e
    return None


# 兼容旧代码名的薄封装（仅方案，不再写入 result）
def build_entry(*, scheme: Dict[str, Any], note: str = "") -> Dict[str, Any]:
    return build_scheme_entry(scheme=scheme, note=note)

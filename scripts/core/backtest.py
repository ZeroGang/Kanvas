#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""现货金历史 K 线 + 当前定投策略参数的回测（单位随品种：元/克 或 美元/盎司）。"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

from core.calculator import KanvasInvestmentCalculator, take_profit_base_amount
from core.market import (
    _pick_close_column,
    _pick_date_column,
    load_spot_hist_csv,
    price_unit_for_symbol,
)


def _max_drawdown(equity: List[float]) -> float:
    """权益序列的最大回撤（0~1，正数表示下跌幅度）。"""
    if not equity:
        return 0.0
    peak = equity[0]
    mdd = 0.0
    for v in equity:
        if v > peak:
            peak = v
        if peak > 0:
            dd = (peak - v) / peak
            if dd > mdd:
                mdd = dd
    return mdd


def _equity_daily_simple_returns(equity: List[float]) -> List[float]:
    """相邻两日权益简单收益率；含定投入账时日收益为近似（业界常见简化）。"""
    out: List[float] = []
    for i in range(1, len(equity)):
        prev = equity[i - 1]
        if prev > 1e-12:
            out.append((equity[i] - prev) / prev)
    return out


def _pstdev(xs: List[float]) -> float:
    if len(xs) < 2:
        return 0.0
    m = sum(xs) / len(xs)
    v = sum((x - m) ** 2 for x in xs) / len(xs)
    return math.sqrt(v)


def _sharpe_ratio_annualized(daily_rets: List[float], periods: int = 252) -> float:
    """年化夏普：无风险利率按 0；日收益标准差为总体标准差。"""
    if len(daily_rets) < 2:
        return 0.0
    mu = sum(daily_rets) / len(daily_rets)
    sd = _pstdev(daily_rets)
    if sd <= 1e-12 or not math.isfinite(sd):
        return 0.0
    return (math.sqrt(float(periods)) * mu / sd) if math.isfinite(mu) else 0.0


def _sortino_ratio_annualized(daily_rets: List[float], periods: int = 252) -> float:
    """年化索提诺：仅对低于目标收益（0）的波动惩罚。"""
    if len(daily_rets) < 2:
        return 0.0
    mu = sum(daily_rets) / len(daily_rets)
    downs = [min(0.0, r) ** 2 for r in daily_rets]
    ddv = sum(downs) / len(downs)
    dsd = math.sqrt(ddv) if ddv > 0 else 0.0
    if dsd <= 1e-12:
        return 0.0
    return (math.sqrt(float(periods)) * mu / dsd) if math.isfinite(mu) else 0.0


def _annualized_volatility_pct(daily_rets: List[float], periods: int = 252) -> float:
    """日收益年化波动率（百分比）。"""
    if len(daily_rets) < 2:
        return 0.0
    sd = _pstdev(daily_rets)
    if not math.isfinite(sd):
        return 0.0
    return sd * math.sqrt(float(periods)) * 100.0


def _calmar_ratio(cagr_decimal: float, max_drawdown_fraction: float) -> float:
    """Calmar = 年化收益率(CAGR) / 最大回撤（二者均为小数，回撤取正）。"""
    if not math.isfinite(cagr_decimal):
        return 0.0
    dd = abs(float(max_drawdown_fraction))
    if dd <= 1e-12:
        return 0.0
    r = cagr_decimal / dd
    return r if math.isfinite(r) else 0.0


def _annualized_return(total_return: float, n_days: int) -> float:
    """按交易日复利折算年化（252 交易日/年）；用 log 避免大样本下幂运算溢出/失真。"""
    if n_days <= 0:
        return 0.0
    years = n_days / 252.0
    if years <= 0:
        return 0.0
    if not math.isfinite(total_return):
        return 0.0
    if total_return <= -1.0:
        return 0.0
    x = 1.0 + float(total_return)
    if x <= 0.0:
        return 0.0
    try:
        t = math.log(x) / years
        if t > 700.0:
            return float("inf")
        return math.exp(t) - 1.0
    except (ValueError, OverflowError):
        return 0.0


def _simulate_portfolio(
    closes: List[float],
    amounts: List[int],
    calc: KanvasInvestmentCalculator,
    use_take_profit: bool,
) -> Tuple[
        List[float],
        float,
        float,
        float,
        float,
        float,
        float,
        float,
        float,
        float,
        float,
        List[int],
        List[int],
    ]:
    """
    每日先按定投金额买入，再可选按止盈规则卖出（按持仓克数比例）。

    返回:
        equity_curve, total_buy, total_sell, end_equity,
        period_yield_pct, annual_yield_pct, max_dd_pct,
        net_invest_end, period_total_return,
        end_gold_grams, end_cash,
        take_profit_level_by_day, take_profit_pullback_by_day（与每日对齐；未启用止盈时全 0）

        equity_curve: 当日持有总权益（黄金货值 + 现金）。
    """
    n = len(closes)
    if n == 0 or len(amounts) != n:
        return [], 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, [], []

    gold_g = 0.0
    cost_basis = 0.0
    cash = 0.0
    total_buy = 0.0
    total_sell = 0.0

    tp = calc.config.get("take_profit", {})
    levels_enabled = bool(tp.get("levels_enabled", True))
    pullback_enabled = bool(tp.get("pullback_enabled", True))
    levels = list(tp.get("levels", []))
    levels.sort(key=lambda x: float(x.get("profit", 0)))
    pb = tp.get("pullback", {"percent": 8, "sell_percent": 50})
    pb_pct = float(pb.get("percent", 8))
    pb_sell = float(pb.get("sell_percent", 50))
    base_position_amt = take_profit_base_amount(tp)

    levels_fired = [False] * len(levels)
    peak_price = 0.0

    equity_curve: List[float] = []
    take_profit_level_by_day = [0] * n
    take_profit_pullback_by_day = [0] * n
    _eps = 1e-6

    for i in range(n):
        price = closes[i]
        amt = float(amounts[i])

        if amt > 0 and price > 0:
            buy_g = amt / price
            gold_g += buy_g
            cost_basis += amt
            total_buy += amt

        if use_take_profit and price > 0 and gold_g > 0:
            # 底仓前提：当前持仓货值（克×收盘）高于阈值时才启用止盈/回撤；0 表示不限制
            position_mtm = gold_g * price
            tp_allowed = base_position_amt <= 1e-12 or position_mtm > base_position_amt
            if tp_allowed:
                if levels_enabled:
                    while True:
                        mv = gold_g * price
                        if cost_basis <= 1e-9:
                            break
                        profit_pct = (mv - cost_basis) / cost_basis * 100.0
                        fired = False
                        for li, lv in enumerate(levels):
                            if levels_fired[li]:
                                continue
                            need = float(lv.get("profit", 0))
                            sp = float(lv.get("sell_percent", 0))
                            if profit_pct >= need and sp > 0:
                                sell_ratio = min(100.0, max(0.0, sp)) / 100.0
                                sold_g = gold_g * sell_ratio
                                proceeds = sold_g * price
                                gold_g -= sold_g
                                cost_basis *= 1.0 - sell_ratio
                                cash += proceeds
                                total_sell += proceeds
                                levels_fired[li] = True
                                fired = True
                                if proceeds > _eps:
                                    take_profit_level_by_day[i] += 1
                                break
                        if not fired:
                            break

                peak_price = max(peak_price, price)
                if pullback_enabled and peak_price > 0 and gold_g > 0:
                    thr = peak_price * (1.0 - pb_pct / 100.0)
                    if price <= thr:
                        sr = min(100.0, max(0.0, pb_sell)) / 100.0
                        sold_g = gold_g * sr
                        proceeds = sold_g * price
                        gold_g -= sold_g
                        cost_basis *= 1.0 - sr
                        cash += proceeds
                        total_sell += proceeds
                        peak_price = price
                        if proceeds > _eps:
                            take_profit_pullback_by_day[i] += 1

        equity = (gold_g * price + cash) if price > 0 else cash
        equity_curve.append(equity)

    last_p = closes[-1]
    end_equity = gold_g * last_p + cash
    net_end = total_buy - total_sell

    # 收益率分母用「累计买入」：卖出回款已体现在 end_equity 的现金中，若用 (买入−卖出) 作分母会与止盈场景矛盾，
    # 且在净投入≤0 时原逻辑会把收益强行置 0。
    invested = total_buy
    if invested > 1e-9:
        period_total_return = end_equity / invested - 1.0
    else:
        period_total_return = 0.0
    period_yield_pct = period_total_return * 100.0
    annual_yield_pct = _annualized_return(period_total_return, n) * 100.0

    max_dd_pct = _max_drawdown(equity_curve) * 100.0

    return (
        equity_curve,
        total_buy,
        total_sell,
        end_equity,
        period_yield_pct,
        annual_yield_pct,
        max_dd_pct,
        net_end,
        period_total_return,
        gold_g,
        cash,
        take_profit_level_by_day,
        take_profit_pullback_by_day,
    )


def run_spot_backtest(
    calc: KanvasInvestmentCalculator,
    days: int,
    *,
    df: Optional[Any] = None,
    symbol: str = "Au99.99",
    use_take_profit: bool = False,
) -> Dict[str, Any]:
    """
    使用与「计算」页相同的偏离度阈值、基础金额与均线周期，对每日收盘价与当日均线做定投测算。
    仅使用 **已有有效均线** 的交易日参与回测，避免在 K 线不足时混入「按基础投入」从而扭曲长区间收益。
    若本地数据不足以覆盖请求天数，则按 **实际可用天数**（≤ 请求值）回测并在结果中给出 ``requested_days`` / ``days_shortfall``。

    - ``use_take_profit``：是否按配置中的止盈档位与回撤规则模拟卖出（简化：按持仓克数比例）。
    """
    import pandas as pd

    if df is None:
        df = load_spot_hist_csv(symbol)
    if df is None or getattr(df, "empty", True):
        return {
            "ok": False,
            "error": f"无本地行情数据。请在「行情」页「刷新」拉取 {symbol}，或在回测页点击「回测」自动拉取。",
        }

    close_col = _pick_close_column(df)
    date_col = _pick_date_column(df)
    d = df.copy()
    if date_col:
        d[date_col] = pd.to_datetime(d[date_col], errors="coerce")
        d = d.dropna(subset=[date_col]).sort_values(date_col)
    else:
        d = d.reset_index(drop=True)

    n_requested = max(1, int(days))

    d["_close"] = pd.to_numeric(d[close_col], errors="coerce")
    d = d.dropna(subset=["_close"])
    if d.empty:
        return {"ok": False, "error": "收盘价有效数据为空。"}

    ma_period = calc.get_ma_period()
    warmup = max(0, ma_period - 1)
    want_rows = n_requested + warmup
    d_work = d.tail(min(len(d), want_rows)).copy()
    d_work["_ma"] = d_work["_close"].rolling(window=ma_period, min_periods=ma_period).mean()
    valid = d_work.dropna(subset=["_ma"])
    if valid.empty:
        return {
            "ok": False,
            "error": (
                f"无法计算 MA{ma_period}：至少需要 {ma_period} 根有效收盘价，"
                f"当前窗口内有效数据不足。请拉取更长历史或减少均线周期/回测天数。"
            ),
        }
    usable = min(n_requested, len(valid))
    d = valid.tail(usable).copy().reset_index(drop=True)
    if d.empty:
        return {"ok": False, "error": "筛选后无数据。"}

    dates: List[str] = []
    closes: List[float] = []
    ma20s: List[float] = []
    deviations: List[float] = []
    multipliers: List[float] = []
    amounts: List[int] = []
    actions: List[str] = []
    ma_unavailable_days = 0

    base_amt = int(calc.base_amount)
    for _, row in d.iterrows():
        close = float(row["_close"])
        ma_raw = row["_ma"]
        if pd.isna(ma_raw):
            ma_unavailable_days += 1
            dev = 0.0
            mult = 1.0
            action = "均线不足，按基础投入"
            amt = base_amt
            ma20s.append(float("nan"))
        else:
            ma20 = float(ma_raw)
            dev = calc.calculate_deviation(close, ma20)
            mult, action = calc.get_multiplier_and_action(dev)
            amt = calc.calculate_amount(mult)
            ma20s.append(ma20)

        if date_col:
            dt = row[date_col]
            if hasattr(dt, "strftime"):
                ds = dt.strftime("%Y-%m-%d")
            else:
                ds = str(dt)[:10]
        else:
            ds = "?"

        dates.append(ds)
        closes.append(close)
        deviations.append(dev)
        multipliers.append(mult)
        amounts.append(amt)
        actions.append(action)

    total_buy_only = int(sum(amounts))
    cum: List[int] = []
    s = 0
    for a in amounts:
        s += a
        cum.append(s)

    (
        equity_curve,
        total_buy,
        total_sell,
        end_equity,
        period_yield_pct,
        annual_yield_pct,
        max_dd_pct,
        net_invest_end,
        period_total_return,
        end_gold_grams,
        end_cash,
        take_profit_level_by_day,
        take_profit_pullback_by_day,
    ) = _simulate_portfolio(closes, amounts, calc, use_take_profit)

    take_profit_events_by_day = [
        take_profit_level_by_day[i] + take_profit_pullback_by_day[i] for i in range(len(take_profit_level_by_day))
    ]
    # 盈亏相对外部累计投入（买入）；与区间收益率口径一致。净投入(net_invest_end)仍保留作「扣减卖出后占用」展示。
    cumulative_profit = end_equity - total_buy
    take_profit_level_count = sum(take_profit_level_by_day) if use_take_profit else 0
    take_profit_pullback_count = sum(take_profit_pullback_by_day) if use_take_profit else 0
    take_profit_sell_count = take_profit_level_count + take_profit_pullback_count

    if not math.isfinite(period_yield_pct):
        period_yield_pct = 0.0
    if not math.isfinite(annual_yield_pct):
        annual_yield_pct = 0.0
    if not math.isfinite(period_total_return):
        period_total_return = 0.0

    daily_rets = _equity_daily_simple_returns(equity_curve)
    sharpe = _sharpe_ratio_annualized(daily_rets)
    sortino = _sortino_ratio_annualized(daily_rets)
    vol_ann_pct = _annualized_volatility_pct(daily_rets)
    calmar = _calmar_ratio(annual_yield_pct / 100.0, max_dd_pct / 100.0)
    if not math.isfinite(sharpe):
        sharpe = 0.0
    if not math.isfinite(sortino):
        sortino = 0.0
    if not math.isfinite(vol_ann_pct):
        vol_ann_pct = 0.0
    if not math.isfinite(calmar):
        calmar = 0.0
    if not math.isfinite(end_gold_grams):
        end_gold_grams = 0.0
    if not math.isfinite(end_cash):
        end_cash = 0.0

    last_close = float(closes[-1]) if closes else 0.0
    if not math.isfinite(last_close):
        last_close = 0.0
    end_gold_market_value = end_gold_grams * last_close
    if not math.isfinite(end_gold_market_value):
        end_gold_market_value = 0.0

    days_shortfall = max(0, n_requested - len(dates))

    return {
        "ok": True,
        "symbol": symbol,
        "unit": price_unit_for_symbol(symbol),
        "requested_days": n_requested,
        "days_shortfall": days_shortfall,
        "day_count": len(dates),
        "total_invested": total_buy_only,
        "dates": dates,
        "closes": closes,
        "ma20s": ma20s,
        "deviations": deviations,
        "multipliers": multipliers,
        "amounts": amounts,
        "actions": actions,
        "cumulative": cum,
        "base_amount": calc.base_amount,
        "ma_period": ma_period,
        "ma_unavailable_days": ma_unavailable_days,
        "use_take_profit": use_take_profit,
        "equity_curve": equity_curve,
        "instrument_nav_curve": closes,
        "total_buy": total_buy,
        "total_sell": total_sell,
        "end_equity": end_equity,
        "cumulative_profit": cumulative_profit,
        "current_yield_pct": period_yield_pct,
        "hist_yield_pct_annual": annual_yield_pct,
        "max_drawdown_pct": max_dd_pct,
        "sharpe_ratio_annual": sharpe,
        "sortino_ratio_annual": sortino,
        "calmar_ratio": calmar,
        "equity_volatility_annual_pct": vol_ann_pct,
        "net_invest_end": net_invest_end,
        "period_total_return": period_total_return,
        "end_gold_grams": end_gold_grams,
        "end_gold_market_value": end_gold_market_value,
        "end_cash": end_cash,
        "take_profit_events_by_day": take_profit_events_by_day,
        "take_profit_level_by_day": take_profit_level_by_day,
        "take_profit_pullback_by_day": take_profit_pullback_by_day,
        "take_profit_level_count": take_profit_level_count,
        "take_profit_pullback_count": take_profit_pullback_count,
        "take_profit_sell_count": take_profit_sell_count,
    }

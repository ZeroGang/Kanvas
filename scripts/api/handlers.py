#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""API 处理器：统一处理 HTTP 请求，调用服务层。"""

from __future__ import annotations

import json
import math
from typing import Any, Callable, Dict

from services.config_service import ConfigService
from services.market_service import MarketService
from services.backtest_service import BacktestService
from services.holdings_service import HoldingsService


def _json_safe(obj: Any) -> Any:
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(v) for v in obj]
    return obj


class APIHandlers:
    """API 处理器：封装所有 API 端点的处理逻辑。"""

    def __init__(self) -> None:
        self.config_svc = ConfigService()
        self.market_svc = MarketService()
        self.backtest_svc = BacktestService()
        self.holdings_svc = HoldingsService()

    def _send_json(self, data: Dict[str, Any], status: int = 200) -> Dict[str, Any]:
        return {"status": status, "body": _json_safe(data)}

    def _error(self, msg: str, status: int = 400) -> Dict[str, Any]:
        return self._send_json({"ok": False, "error": msg}, status)

    def _success(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self._send_json({"ok": True, **data})

    def config_get(self) -> Dict[str, Any]:
        try:
            cfg = self.config_svc.get_config()
            return self._success(cfg)
        except Exception as e:
            return self._error(str(e), 500)

    def config_post(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if not isinstance(body, dict):
                return self._error("无效 JSON", 400)
            ok = self.config_svc.update_config(body)
            return self._success({}) if ok else self._error("保存失败", 500)
        except Exception as e:
            return self._error(str(e), 500)

    def calculate(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            gp = float(body.get("gold_price"))
            ma = float(body.get("ma20"))
        except (TypeError, ValueError):
            return self._error("请输入有效金价与均线", 400)

        if gp <= 0 or ma <= 0:
            return self._error("金价与均线须为正数", 400)

        try:
            result = self.config_svc.calculate(gp, ma, save=bool(body.get("save")))
            return self._success(result)
        except Exception as e:
            return self._error(str(e), 500)

    def records_get(self) -> Dict[str, Any]:
        try:
            records = self.config_svc.get_records()
            return self._success({"records": records})
        except Exception as e:
            return self._error(str(e), 500)

    def market_status(self, query: Dict[str, str]) -> Dict[str, Any]:
        try:
            status = self.market_svc.get_market_status()
            return self._success(status)
        except Exception as e:
            return self._error(str(e), 500)

    def market_realtime_price(self, query: Dict[str, str]) -> Dict[str, Any]:
        try:
            tab = query.get("tab", "metal")
            res = self.market_svc.get_realtime_price(tab)
            return self._success(res)
        except Exception as e:
            import traceback
            print(f"[API WARN] /api/market/realtime-price: {e}")
            traceback.print_exc()
            return self._error(str(e), 200)

    def market_fetch(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            force = bool(body.get("force", False))
            res = self.market_svc.fetch_market_data(force=force)
            return self._success(res)
        except Exception as e:
            return self._error(str(e), 500)

    def spot_instruments_get(self) -> Dict[str, Any]:
        try:
            res = self.market_svc.get_spot_instruments()
            return self._success(res)
        except Exception as e:
            return self._error(str(e), 500)

    def spot_instruments_post(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            reset = bool(body.get("reset_default", False))
            if reset:
                res = self.market_svc.update_spot_instruments(None, reset=True)
                return self._success(res)

            raw_ids = body.get("ids")
            if raw_ids is None and isinstance(body.get("items"), list):
                raw_ids = []
                for e in body["items"]:
                    if isinstance(e, dict) and e.get("id") is not None:
                        raw_ids.append(str(e["id"]).strip())
                    elif isinstance(e, str):
                        raw_ids.append(e.strip())
                raw_ids = [x for x in raw_ids if x]

            res = self.market_svc.update_spot_instruments(raw_ids)
            return self._success(res)
        except ValueError as e:
            return self._error(str(e), 400)
        except Exception as e:
            return self._error(str(e), 500)

    def cn_a_index_instruments_get(self) -> Dict[str, Any]:
        try:
            res = self.market_svc.get_cn_a_index_instruments()
            return self._success(res)
        except Exception as e:
            return self._error(str(e), 500)

    def cn_a_index_instruments_post(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            reset = bool(body.get("reset_default", False))
            if reset:
                res = self.market_svc.update_cn_a_index_instruments(None, reset=True)
                return self._success(res)

            raw_ids = body.get("ids")
            if raw_ids is None and isinstance(body.get("items"), list):
                raw_ids = []
                for e in body["items"]:
                    if isinstance(e, dict) and e.get("id") is not None:
                        raw_ids.append(str(e["id"]).strip())
                    elif isinstance(e, str):
                        raw_ids.append(e.strip())
                raw_ids = [x for x in raw_ids if x]

            res = self.market_svc.update_cn_a_index_instruments(raw_ids)
            return self._success(res)
        except ValueError as e:
            return self._error(str(e), 400)
        except Exception as e:
            return self._error(str(e), 500)

    def cn_index_status(self, query: Dict[str, str]) -> Dict[str, Any]:
        try:
            res = self.market_svc.get_cn_index_status()
            return self._success(res)
        except Exception as e:
            return self._error(str(e), 500)

    def cn_index_fetch(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            res = self.market_svc.fetch_cn_index_data()
            return self._success(res)
        except Exception as e:
            return self._error(str(e), 500)

    def cn_index_series(self, query: Dict[str, str]) -> Dict[str, Any]:
        try:
            days = int(query.get("days", "60"))
            series = self.market_svc.get_cn_index_series(days)
            return self._success({"series": series})
        except Exception as e:
            return self._error(str(e), 500)

    def spot_series(self, query: Dict[str, str]) -> Dict[str, Any]:
        try:
            days = int(query.get("days", "30"))
            series = self.market_svc.get_spot_series(days)
            return self._success({"series": series})
        except Exception as e:
            return self._error(str(e), 500)

    def backtest_run(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            days = int(body.get("days", 3650))
            use_tp = bool(body.get("use_take_profit", False))
            res = self.backtest_svc.run_backtest(days, use_tp)
            return self._send_json(res)
        except Exception as e:
            return self._error(str(e), 500)

    def backtest_saved_get(self) -> Dict[str, Any]:
        try:
            items = self.backtest_svc.get_saved_backtests()
            return self._success({"items": items})
        except Exception as e:
            return self._error(str(e), 500)

    def backtest_saved_detail(self, query: Dict[str, str]) -> Dict[str, Any]:
        try:
            entry_id = query.get("id", "")
            entry = self.backtest_svc.get_saved_backtest_detail(entry_id)
            if not entry:
                return self._error("未找到", 404)
            return self._success(entry)
        except Exception as e:
            return self._error(str(e), 500)

    def backtest_save(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            note = str(body.get("note", "")).strip()
            entry = self.backtest_svc.save_backtest(note=note)
            return self._success(entry)
        except Exception as e:
            return self._error(str(e), 500)

    def backtest_replay(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            entry_id = str(body.get("id", "")).strip()
            result = self.backtest_svc.replay_saved_backtest(entry_id)
            return self._send_json(result)
        except Exception as e:
            return self._error(str(e), 500)

    def backtest_saved_delete(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            ids = body.get("ids", [])
            if not isinstance(ids, list):
                return self._error("ids 必须为数组", 400)
            n = self.backtest_svc.delete_saved_backtests(ids)
            return self._success({"deleted": n})
        except Exception as e:
            return self._error(str(e), 500)

    def backtest_saved_apply(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            entry_id = str(body.get("id", "")).strip()
            ok = self.backtest_svc.apply_saved_scheme(entry_id)
            return self._success({}) if ok else self._error("应用失败", 500)
        except Exception as e:
            return self._error(str(e), 500)

    def holdings_get(self) -> Dict[str, Any]:
        try:
            res = self.holdings_svc.get_holdings()
            return self._success(res)
        except Exception as e:
            return self._error(str(e), 500)

    def holdings_post(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            ok, err = self.holdings_svc.update_holdings(body)
            if err:
                return self._error(err, 400)
            return self._success({})
        except Exception as e:
            return self._error(str(e), 500)

    def export_spot_instruments_csv(self, body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            from core.market import export_akshare_spot_instruments_csv

            path, n = export_akshare_spot_instruments_csv()
            return self._success({"path": str(path), "rows": n})
        except Exception as e:
            return self._error(str(e), 500)

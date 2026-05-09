#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kanvas Web 面板：Python 标准库 HTTP + ./app 静态资源。

架构：
  - HTTP 层：路由分发、请求解析、响应封装
  - API 层：请求处理、参数验证（api/handlers.py）
  - 服务层：业务逻辑封装（services/）
  - 核心层：计算、行情、存储（core/）
"""

from __future__ import annotations

import io
import json
import sys

if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from socketserver import ThreadingMixIn

ROOT = Path(__file__).resolve().parent
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

APP_BUILD_DIR = (ROOT / "app_build").resolve()
APP_SRC_DIR = (ROOT / "app").resolve()
APP_DIR = APP_BUILD_DIR if APP_BUILD_DIR.exists() else APP_SRC_DIR

_FAVICON_SVG_BYTES = (
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">'
    b'<circle cx="16" cy="16" r="14" fill="#c9a227" stroke="#8b6914" stroke-width="1.5"/>'
    b'<circle cx="16" cy="16" r="10" fill="#e8d48b" opacity="0.35"/></svg>'
)


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class KanvasHandler(SimpleHTTPRequestHandler):
    """HTTP 请求处理器：路由分发与响应封装。"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def __getattr__(self, name):
        if name == "_api_handlers":
            import sys
            from pathlib import Path
            scripts_path = Path(__file__).parent / "scripts"
            if str(scripts_path) not in sys.path:
                sys.path.insert(0, str(scripts_path))
            from api.handlers import APIHandlers

            self._api_handlers = APIHandlers()
            return self._api_handlers
        raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")

    @property
    def api_handlers(self):
        return self._api_handlers

    def log_message(self, fmt, *args):
        print(f"  [{self.command}] {fmt % args}")

    def _location_with_qs(self, parsed, path: str) -> str:
        loc = path
        if parsed.query:
            loc += "?" + parsed.query
        if parsed.fragment:
            loc += "#" + parsed.fragment
        return loc

    def _maybe_legacy_redirect(self, parsed) -> bool:
        path = parsed.path or "/"
        if path in ("/web", "/web/"):
            self.send_response(302)
            self.send_header("Location", self._location_with_qs(parsed, "/"))
            self.end_headers()
            return True
        if path.startswith("/web/"):
            tail = path[5:].lstrip("/")
            self.send_response(302)
            self.send_header("Location", self._location_with_qs(parsed, "/" + tail if tail else "/"))
            self.end_headers()
            return True
        if path in ("/app", "/app/"):
            self.send_response(302)
            self.send_header("Location", self._location_with_qs(parsed, "/"))
            self.end_headers()
            return True
        if path.startswith("/app/"):
            tail = path[5:].lstrip("/")
            self.send_response(302)
            self.send_header("Location", self._location_with_qs(parsed, "/" + tail if tail else "/"))
            self.end_headers()
            return True
        return False

    def _rewrite_index_path(self, parsed) -> None:
        path = parsed.path or "/"
        if path in ("/", ""):
            self.path = self._location_with_qs(parsed, "/index.html")

    @staticmethod
    def _normalized_path(parsed: urllib.parse.ParseResult) -> str:
        p = urllib.parse.unquote((parsed.path or "/").strip())
        while "//" in p:
            p = p.replace("//", "/")
        if not p.startswith("/"):
            p = "/" + p.lstrip("/")
        if len(p) > 1:
            p = p.rstrip("/")
        p = p or "/"
        if p.startswith("/api/"):
            p = p.lower()
        return p

    @staticmethod
    def _is_blocked_public_dist_path(path: str) -> bool:
        p = (path or "/").strip().lower()
        return p == "/dist" or p.startswith("/dist/")

    @staticmethod
    def _is_favicon_ico_path(path: str) -> bool:
        p = (path or "/").strip()
        while "//" in p:
            p = p.replace("//", "/")
        return p.lower().rstrip("/") == "/favicon.ico"

    def _send_favicon_ico(self) -> None:
        body = _FAVICON_SVG_BYTES
        self.send_response(200)
        self.send_header("Content-Type", "image/svg+xml; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        if n <= 0:
            return {}
        raw = self.rfile.read(n)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if self._maybe_legacy_redirect(parsed):
            return

        path = self._normalized_path(parsed)
        qs = urllib.parse.parse_qs(parsed.query)
        query = {k: (v[0] if v else "") for k, v in qs.items()}

        if self._is_favicon_ico_path(path):
            self._send_favicon_ico()
            return

        if path.startswith("/api/"):
            try:
                print(f"[API GET] {path}")
                result = self._handle_api_get(path, query)
                self.send_json(result["body"], result.get("status", 200))
            except Exception as e:
                import traceback
                print(f"[API ERROR] {path}: {e}")
                traceback.print_exc()
                self.send_json({"ok": False, "error": str(e)}, 500)
            return

        if self._is_blocked_public_dist_path(path):
            self.send_error(403)
            return

        self._rewrite_index_path(parsed)
        super().do_GET()

    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        if self._maybe_legacy_redirect(parsed):
            return
        path = self._normalized_path(parsed)
        if self._is_favicon_ico_path(path):
            self._send_favicon_ico()
            return
        if self._is_blocked_public_dist_path(path):
            self.send_error(403)
            return
        self._rewrite_index_path(parsed)
        super().do_HEAD()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = self._normalized_path(parsed)
        body = self._read_json()

        if path.startswith("/api/"):
            try:
                print(f"[API POST] {path}")
                result = self._handle_api_post(path, body)
                self.send_json(result["body"], result.get("status", 200))
            except Exception as e:
                import traceback
                print(f"[API ERROR] {path}: {e}")
                traceback.print_exc()
                self.send_json({"ok": False, "error": str(e)}, 500)
            return

        self.send_error(404)

    def _handle_api_get(self, path: str, query: dict) -> dict:
        """GET API 路由分发。"""
        h = self.api_handlers

        routes = {
            "/api/config": h.config_get,
            "/api/records": h.records_get,
            "/api/market/status": lambda: h.market_status(query),
            "/api/market/realtime-price": lambda: h.market_realtime_price(query),
            "/api/spot/instruments": h.spot_instruments_get,
            "/api/cn-a-index/instruments": h.cn_a_index_instruments_get,
            "/api/cn-index/status": lambda: h.cn_index_status(query),
            "/api/cn-index-series": lambda: h.cn_index_series(query),
            "/api/spot-series": lambda: h.spot_series(query),
            "/api/backtest/saved": h.backtest_saved_get,
            "/api/backtest/saved/detail": lambda: h.backtest_saved_detail(query),
            "/api/holdings": h.holdings_get,
        }

        handler = routes.get(path)
        if handler:
            return handler()
        return {"status": 404, "body": {"ok": False, "error": "Not found"}}

    def _handle_api_post(self, path: str, body: dict) -> dict:
        """POST API 路由分发。"""
        h = self.api_handlers

        routes = {
            "/api/config": lambda: h.config_post(body),
            "/api/calculate": lambda: h.calculate(body),
            "/api/spot/instruments": lambda: h.spot_instruments_post(body),
            "/api/cn-a-index/instruments": lambda: h.cn_a_index_instruments_post(body),
            "/api/market/fetch": lambda: h.market_fetch(body),
            "/api/market/export-spot-instruments-csv": lambda: h.export_spot_instruments_csv(body),
            "/api/cn-index/fetch": lambda: h.cn_index_fetch(body),
            "/api/backtest/run": lambda: h.backtest_run(body),
            "/api/backtest/save": lambda: h.backtest_save(body),
            "/api/backtest/replay": lambda: h.backtest_replay(body),
            "/api/backtest/saved/delete": lambda: h.backtest_saved_delete(body),
            "/api/backtest/saved/apply": lambda: h.backtest_saved_apply(body),
            "/api/holdings": lambda: h.holdings_post(body),
        }

        handler = routes.get(path)
        if handler:
            return handler()
        return {"status": 404, "body": {"ok": False, "error": "Not found"}}


def main():
    host = "127.0.0.1"
    port = 8100

    try:
        server = ThreadedHTTPServer((host, port), KanvasHandler)
    except OSError as e:
        print(f"无法启动服务器: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"\nKanvas Web 面板已启动: http://{host}:{port}/\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
        server.shutdown()


if __name__ == "__main__":
    main()

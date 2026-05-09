#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AkShare 底层走 requests，会读取系统/环境变量中的 HTTP(S)_PROXY。
若代理不可用，常出现 ProxyError；若对端在未返回完整 HTTP 响应前关连接，会出现
Connection aborted / RemoteDisconnected（防火墙、中间代理、服务端限流、TLS 探测等均可能）。
此处：先按环境正常请求；若判定为可恢复的网络类失败，则临时去掉代理并直连重试一次。
"""

from __future__ import annotations

import logging
import os
import threading
import urllib.request
from contextlib import contextmanager
from typing import Callable, TypeVar

_logger = logging.getLogger("Kanvas")

T = TypeVar("T")

_thread_local = threading.local()
_real_getproxies = urllib.request.getproxies
_getproxies_wrapper_installed = False


def _getproxies_maybe_bypass():
    if getattr(_thread_local, "akshare_direct", False):
        return {}
    return _real_getproxies()


def _install_getproxies_patch_once():
    global _getproxies_wrapper_installed
    if _getproxies_wrapper_installed:
        return
    urllib.request.getproxies = _getproxies_maybe_bypass
    _getproxies_wrapper_installed = True

# 不删除 NO_PROXY，避免误伤「仅部分域名不走代理」的配置
_PROXY_ENV_KEYS = (
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
)


@contextmanager
def _proxy_env_cleared():
    saved = {k: os.environ[k] for k in _PROXY_ENV_KEYS if k in os.environ}
    try:
        for k in saved:
            del os.environ[k]
        yield
    finally:
        os.environ.update(saved)


@contextmanager
def _thread_local_direct_http():
    """仅当前线程视为「无系统代理」，不影响其它线程的 requests。"""
    _install_getproxies_patch_once()
    prev = getattr(_thread_local, "akshare_direct", False)
    _thread_local.akshare_direct = True
    try:
        yield
    finally:
        _thread_local.akshare_direct = prev


@contextmanager
def _force_direct_http():
    with _proxy_env_cleared(), _thread_local_direct_http():
        yield


def _is_proxy_related_failure(exc: BaseException) -> bool:
    seen: set[int] = set()
    e: BaseException | None = exc
    while e is not None and id(e) not in seen:
        seen.add(id(e))
        name = type(e).__name__
        if "Proxy" in name:
            return True
        low = str(e).lower()
        if "proxy" in low and (
            "unable to connect" in low
            or "tunnel connection failed" in low
            or "remote end closed connection" in low
            or "connection refused" in low
        ):
            return True
        e = e.__cause__ or e.__context__
    return False


def _chain_includes_remote_disconnect(exc: BaseException) -> bool:
    """urllib3 RemoteDisconnected 常嵌在 ConnectionError.args 里，需顺带扫 args。"""
    seen: set[int] = set()

    def visit(e: BaseException | None) -> bool:
        if e is None or id(e) in seen:
            return False
        seen.add(id(e))
        name = type(e).__name__
        if name == "RemoteDisconnected":
            return True
        low = str(e).lower()
        if "remote end closed connection" in low and "without response" in low:
            return True
        if "connection aborted" in low:
            return True
        for a in getattr(e, "args", ()) or ():
            if isinstance(a, BaseException) and visit(a):
                return True
        if visit(getattr(e, "__cause__", None)):
            return True
        ctx = getattr(e, "__context__", None)
        if ctx is not getattr(e, "__cause__", None) and visit(ctx):
            return True
        return False

    return visit(exc)


def _should_retry_with_direct_http(exc: BaseException) -> bool:
    return _is_proxy_related_failure(exc) or _chain_includes_remote_disconnect(exc)


def run_akshare_with_proxy_fallback(func: Callable[[], T]) -> T:
    """执行无参数的 AkShare 调用；遇代理/被掐断等可恢复错误时去掉环境/系统代理后重试一次。"""
    try:
        return func()
    except Exception as e:
        if not _should_retry_with_direct_http(e):
            raise
        _logger.warning("AkShare 网络异常（代理或对端断连），已改用直连重试一次: %s", e)
        with _force_direct_http():
            return func()

"""Tests for the watchdog transient-error retry (TAAK 3, 2026-09-13).

Proves _retry_read absorbs a transient Supabase-edge 5xx (the INDXR-BACKEND-90/-96 504s) on an
idempotent read via truncated exponential backoff + full jitter, logs each retry, and only re-raises
non-transient errors or after exhausting attempts. Also covers the transient classifier.

2026-10-15 addendum (Sentry 95ce43205e864621bf91ff672dc16b4b, 2026-10-14 14:50 UTC): a bare
httpx ReadTimeout on Pass 2b ("The read operation timed out") only ever got ONE attempt — the
120s write-client timeout it shared meant a single failed attempt already blew the 20s
_retry_read-deadline before a second try could happen. Fixed by giving the watchdog's reads a
dedicated 10s client (get_watchdog_read_client, credit_manager.py) instead of the 120s one.
test_retry_gives_up_after_one_long_attempt_like_the_1014_incident reproduces the old (broken)
timing; test_retry_actually_retries_when_attempt_is_short_relative_to_deadline proves the fixed
timing (short attempt -> deadline has room -> genuine retries happen).
"""
import logging
import time

import pytest

import worker

pytestmark = pytest.mark.anyio


class FakeAPIError(Exception):
    """Mimics supabase-py APIError: carries a numeric `code` like the 504 we saw in prod."""
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


# ── _is_transient classifier ────────────────────────────────────────────────────
def test_is_transient_by_code():
    assert worker._is_transient(FakeAPIError(504, "Gateway Timeout"))
    assert worker._is_transient(FakeAPIError(502, "Bad Gateway"))
    assert worker._is_transient(FakeAPIError(503, "Service Unavailable"))


def test_is_transient_by_message():
    # The real -96 error: APIError {'message': 'JSON could not be generated', 'code': 504, ...}
    assert worker._is_transient(Exception("JSON could not be generated"))
    assert worker._is_transient(Exception("504 Gateway Timeout"))
    assert worker._is_transient(Exception("Server disconnected without sending a response"))
    assert worker._is_transient(Exception("RemoteProtocolError: <ConnectionTerminated>"))


def test_not_transient_for_real_errors():
    assert not worker._is_transient(FakeAPIError(400, "Bad Request"))
    assert not worker._is_transient(FakeAPIError(404, "Not Found"))
    assert not worker._is_transient(KeyError("status"))
    assert not worker._is_transient(ValueError("bad value"))


# ── _retry_read behaviour ───────────────────────────────────────────────────────
async def test_retry_absorbs_one_transient_then_succeeds(caplog):
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        if calls["n"] == 1:
            raise FakeAPIError(504, "Gateway Timeout")  # first attempt: the transient blip
        return "OK"  # retry succeeds

    with caplog.at_level(logging.WARNING, logger="indxr-worker"):
        result = await worker._retry_read(fn, "1a", base=0.01, cap=0.02, max_attempts=4)

    assert result == "OK"
    assert calls["n"] == 2  # exactly one retry
    retry_logs = [r for r in caplog.records if "WATCHDOG retry" in r.getMessage()]
    assert len(retry_logs) == 1
    assert "retry over" in retry_logs[0].getMessage()  # backoff delay logged


async def test_retry_reraises_after_exhausting_attempts():
    def fn():
        raise FakeAPIError(504, "Gateway Timeout")  # always transient

    with pytest.raises(FakeAPIError):
        await worker._retry_read(fn, "2", base=0.01, cap=0.02, max_attempts=3)


async def test_retry_does_not_retry_non_transient():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        raise KeyError("status")  # a real bug — must NOT be retried

    with pytest.raises(KeyError):
        await worker._retry_read(fn, "1b", base=0.01, cap=0.02, max_attempts=4)
    assert calls["n"] == 1  # no retries for non-transient errors


async def test_retry_returns_immediately_on_success():
    def fn():
        return {"data": [1, 2, 3]}

    result = await worker._retry_read(fn, "0a")
    assert result == {"data": [1, 2, 3]}


async def test_retry_gives_up_after_one_long_attempt_like_the_1014_incident():
    """Reproduces the exact prod log line ('opgegeven na 1 poging(en), elapsed 120.1s') from
    Sentry 95ce43205e864621bf91ff672dc16b4b: when a single failed attempt already consumes (close
    to) the whole deadline, _retry_read gives up after that ONE attempt — the 4x-backoff retry it
    was designed to do never actually runs. This is the bug the 10s watchdog-read-client fixes
    (the attempt itself is now short, not the deadline math)."""
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        time.sleep(0.12)  # stand-in for "attempt consumed ~the whole deadline" (was 120.1s vs 20s)
        raise FakeAPIError(504, "The read operation timed out")

    with pytest.raises(FakeAPIError):
        await worker._retry_read(fn, "2b", base=0.01, cap=0.02, max_attempts=4, deadline=0.1)
    assert calls["n"] == 1  # exactly the broken behaviour: no retry ever happened


async def test_retry_actually_retries_when_attempt_is_short_relative_to_deadline():
    """With a short per-attempt timeout (the fix: a dedicated 10s client instead of the shared
    120s one) relative to the deadline, _retry_read gets real room to retry multiple times."""
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        time.sleep(0.01)  # short attempt, like the new 10s read-timeout vs a much larger deadline
        raise FakeAPIError(504, "The read operation timed out")

    with pytest.raises(FakeAPIError):
        await worker._retry_read(fn, "2b", base=0.01, cap=0.02, max_attempts=4, deadline=0.1)
    assert calls["n"] > 1  # the retry actually ran this time


# ── 3b: alert-drempel op OPEENVOLGENDE gedegradeerde runs ────────────────────────
from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402


def _raising_supabase():
    """supabase-mock waarvan elke read een NIET-transiente fout gooit → elke pass faalt → degraded run."""
    def _chain(*a, **k):
        c = MagicMock()
        for m in ("select", "eq", "in_", "is_", "lt", "gt", "gte", "or_", "update", "upsert", "limit"):
            getattr(c, m).side_effect = lambda *a, **k: c
        c.not_.is_.side_effect = lambda *a, **k: c
        c.execute.side_effect = RuntimeError("boom (non-transient)")  # niet in _RETRYABLE → geen retry
        return c
    m = MagicMock()
    m.table.side_effect = lambda *a, **k: _chain()
    m.rpc.side_effect = lambda *a, **k: _chain()
    return m


async def _run_watchdog_with_streak(streak_value):
    redis = AsyncMock()
    redis.incr.return_value = streak_value
    captured = {}

    def _capture(msg, level=None):
        captured["level"] = level
        captured["msg"] = msg

    with patch("worker.get_supabase_client", return_value=_raising_supabase()), \
         patch("worker.get_watchdog_read_client", return_value=_raising_supabase()), \
         patch("worker.sentry_sdk.capture_message", side_effect=_capture):
        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})
    return captured, redis


async def test_degraded_below_threshold_is_warning():
    captured, redis = await _run_watchdog_with_streak(2)  # 2 < _DEGRADED_ERROR_AT (3)
    assert captured.get("level") == "warning", captured
    redis.incr.assert_awaited()  # streak bijgehouden


async def test_degraded_at_threshold_is_error():
    captured, _ = await _run_watchdog_with_streak(3)  # 3 >= _DEGRADED_ERROR_AT
    assert captured.get("level") == "error", captured


# ── per-pass isolation: a ReadTimeout confined to one pass must not abort the run ───────────────
async def test_one_pass_timeout_does_not_abort_the_rest_of_the_run():
    """Sentry 95ce43205e864621bf91ff672dc16b4b: a ReadTimeout confined to Pass 2b (playlist
    auto-refund) must not prevent Pass 0a/0b/1a/1b/2/2c/summary-reaper/reap-running from running
    in the same cycle — the watchdog must finish (degraded, not crashed) and flag EXACTLY pass
    '2b', nothing else. _retry_read itself is mocked per pass_name so this isolates the
    try/except-per-pass control flow in watchdog_interrupted_jobs from the retry mechanics
    (covered separately above)."""
    redis = AsyncMock()
    redis.incr.return_value = 1
    captured = {}

    def _capture(msg, level=None, **kw):
        captured["level"] = level
        captured["msg"] = msg

    empty = MagicMock()
    empty.data = []

    async def _fake_retry_read(fn, pass_name, **kwargs):
        if pass_name == "2b":
            raise FakeAPIError(504, "The read operation timed out")
        return empty

    with patch("worker.get_supabase_client", return_value=MagicMock()), \
         patch("worker.get_watchdog_read_client", return_value=MagicMock()), \
         patch("worker._retry_read", side_effect=_fake_retry_read), \
         patch("worker.sentry_sdk.capture_message", side_effect=_capture):
        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})  # must not raise

    assert captured.get("level") == "warning"  # streak=1 -> self-healing warning, not error
    assert "2b" in captured.get("msg", "")
    # only the playlist pass failed — every other pass name must be absent from the message
    for other_pass in ("0a", "0b", "1a", "1b", "2", "2c", "summary-reaper", "reap-running"):
        assert f"{other_pass}:" not in captured.get("msg", "")

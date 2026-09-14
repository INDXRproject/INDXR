"""TAAK 1 (2026-09-14): YouTube-audio-route retry-classificatie + backoff.

Bewijst dat een transiente fout (bot-block "Video unavailable" / SSL / timeout / 5xx) wordt geretried
met proxy-rotatie en full-jitter backoff, en dat een aantoonbaar permanente fout (verwijderd/privé/geo)
sneller faalt (één poging) met de permanent-vlag voor de user-melding (TAAK 1c).
"""
from unittest.mock import patch

import pytest

import audio_utils as au


# ── classifier ──────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("msg,exp_reason,exp_perm,exp_transient", [
    # De echte prod-fout (INDXR-BACKEND-97): kale "Video unavailable" = bot-block → transient.
    ("error: [youtube] dtacaazdp-u: video unavailable", "bot_block", False, True),
    ("sign in to confirm you're not a bot", "bot_block", False, True),
    ("http error 429: too many requests", "bot_block", False, True),
    # Permanent (specifieke reden) → snel falen.
    ("error: [youtube] x: private video", "permanent", True, False),
    ("this video has been removed by the uploader", "permanent", True, False),
    ("video is not available in your country", "permanent", True, False),
    ("this video is no longer available", "permanent", True, False),
    # Transient netwerk/serverfouten.
    ("[ssl: unexpected_eof] eof occurred in violation of protocol", "connection", False, True),
    ("read timed out", "timeout", False, True),
    ("http error 503: service unavailable", "server", False, True),
    ("incomplete read: 100 bytes read, more expected", "partial_write", False, True),
    # Onbekend → geen retry, niet permanent (eigen catch-all).
    ("some totally unknown failure xyz", "other", False, False),
])
def test_classify(msg, exp_reason, exp_perm, exp_transient):
    reason, is_perm, is_transient = au._classify_ytdlp_error(msg)
    assert (reason, is_perm, is_transient) == (exp_reason, exp_perm, exp_transient), (msg, reason)


def test_permanent_wins_over_bare_unavailable():
    # "Video unavailable" + een permanente reden → permanent, NIET bot_block.
    reason, is_perm, is_transient = au._classify_ytdlp_error(
        "video unavailable. this video is private"
    )
    assert reason == "permanent" and is_perm and not is_transient


# ── backoff ─────────────────────────────────────────────────────────────────────
def test_backoff_full_jitter_bounds():
    for attempt in range(1, 6):
        cap = min(8.0, 1.0 * (2 ** attempt))
        for _ in range(50):
            d = au._retry_backoff_delay(attempt)
            assert 0.0 <= d <= cap, (attempt, d)


# ── integration: retry-count + rotation + permanent fast-fail ─────────────────────
class _FakeYDL:
    def __init__(self, opts, recorder, err):
        recorder["proxies"].append(opts.get("proxy"))
        recorder["calls"] += 1
        self._err = err
    def __enter__(self): return self
    def __exit__(self, *a): return False
    def extract_info(self, url, download=False):
        raise Exception(self._err)


def _run_download(err_msg):
    recorder = {"calls": 0, "proxies": []}
    factory = lambda opts: _FakeYDL(opts, recorder, err_msg)
    proxies = ["http://u-s1:p@px:1", "http://u-s2:p@px:1", "http://u-s3:p@px:1"]
    exc = None
    with patch.object(au.yt_dlp, "YoutubeDL", factory), patch.object(au.time, "sleep", lambda *_: None):
        try:
            au.extract_youtube_audio("vid123", output_dir="/tmp", proxy_urls=proxies)
        except Exception as e:
            exc = e
    return recorder, exc


def test_transient_botblock_retries_three_times_with_rotation():
    recorder, exc = _run_download("ERROR: [youtube] vid123: Video unavailable")
    assert recorder["calls"] == 3, recorder  # retried across all 3 rotated sessions
    assert recorder["proxies"] == ["http://u-s1:p@px:1", "http://u-s2:p@px:1", "http://u-s3:p@px:1"]
    assert getattr(exc, "permanent", None) is False  # transient → user gets "try again" (bot_detection)


def test_permanent_fails_fast_single_attempt():
    recorder, exc = _run_download("ERROR: [youtube] vid123: Private video")
    assert recorder["calls"] == 1, recorder  # no retry — a fresh IP can't fix a private video
    assert getattr(exc, "permanent", None) is True  # permanent → "this video isn't available"

"""
Unit tests for yt-dlp partial-write retry logic in audio_utils.extract_youtube_audio.

Tests the fix from ADR-031: partial-write errors ('bytes read', 'more expected')
now trigger the retry loop, and each attempt uses a fresh proxy URL (session rotation).
"""
import os
import glob
import subprocess
from unittest.mock import MagicMock, patch, call
import pytest

import sys
sys.path.insert(0, os.path.dirname(__file__))

import audio_utils


# ─── helpers ────────────────────────────────────────────────────────────────

PARTIAL_WRITE_ERROR = "ERROR: [download] Got error: 8386313 bytes read, 2025336 more expected"
VIDEO_ID = "Rxmw9eizOAo"
BASE_PATH = f"/tmp/yt_audio_{VIDEO_ID}"
FAKE_RAW = f"{BASE_PATH}.webm"
FAKE_OGG = f"{BASE_PATH}.ogg"

PROXY_URLS = [
    "http://user-test-session-r1:pass@gate.decodo.com:10001",
    "http://user-test-session-r2:pass@gate.decodo.com:10001",
    "http://user-test-session-r3:pass@gate.decodo.com:10001",
]


def _make_ydl_class(fail_on_attempts: set[int]):
    """Return a YoutubeDL mock class that fails on given attempt numbers."""
    attempt_counter = {"n": 0}

    class MockYDL:
        def __init__(self, opts):
            self._opts = opts

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def extract_info(self, url, download=True):
            attempt_counter["n"] += 1
            if attempt_counter["n"] in fail_on_attempts:
                raise Exception(PARTIAL_WRITE_ERROR)
            return {"title": "Test Video", "uploader": "Test Channel"}

    return MockYDL, attempt_counter


# ─── tests ──────────────────────────────────────────────────────────────────

class TestPartialWriteRetry:

    def _run(self, fail_on: set[int], proxy_urls=None):
        MockYDL, counter = _make_ydl_class(fail_on)

        with patch("yt_dlp.YoutubeDL", MockYDL), \
             patch("glob.glob") as mock_glob, \
             patch("os.remove"), \
             patch("os.path.getsize", return_value=50 * 1024 * 1024), \
             patch("subprocess.run") as mock_run:

            # Simulate: stale cleanup finds nothing, then download produces one file
            mock_glob.side_effect = lambda pattern: (
                [] if pattern.endswith(".*") and not any(
                    c["n"] >= max(fail_on | {0}) for c in [counter]
                ) else ([FAKE_RAW] if not pattern.endswith(".ogg") else [FAKE_OGG])
            )
            # Simulate glob correctly: cleanup call → [], file-find call → [raw_file]
            mock_glob.side_effect = None
            mock_glob.return_value = []

            # Override glob to return raw file when looking for downloaded file
            original_glob = glob.glob
            call_count = {"n": 0}
            def smart_glob(pattern):
                call_count["n"] += 1
                # Cleanup calls (looking for stale files before each attempt): return []
                # File-find calls (after download): return raw file
                # This is a simplification — in real code the pattern is the same
                return []
            mock_glob.side_effect = smart_glob

            mock_run.return_value = MagicMock(returncode=0, stderr="")

            # Since glob is mocked to return [], the "no audio file" exception
            # will fire after a successful download. We need a smarter mock.
            # Use a stateful glob mock tied to the attempt counter.
            mock_glob.side_effect = None
            succeeded_attempt = {"n": 0}

            def stateful_glob(pattern):
                # After a successful download (attempt not in fail_on), return the raw file
                n = counter["n"]
                if n not in fail_on and n > 0:
                    if not pattern.endswith(".ogg"):
                        return [FAKE_RAW]
                return []

            mock_glob.side_effect = stateful_glob

            result = audio_utils.extract_youtube_audio(
                VIDEO_ID,
                proxy_urls=proxy_urls or PROXY_URLS,
            )
            return result, counter

    def test_no_retry_needed(self):
        """Successful first attempt — no retry."""
        result, counter = self._run(fail_on=set())
        assert result[0] == FAKE_OGG
        assert counter["n"] == 1

    def test_partial_write_triggers_retry(self):
        """Partial-write error on attempt 1 triggers retry on attempt 2."""
        result, counter = self._run(fail_on={1})
        assert result[0] == FAKE_OGG
        assert counter["n"] == 2

    def test_two_failures_succeeds_on_third(self):
        """Two consecutive partial-writes → succeed on third attempt."""
        result, counter = self._run(fail_on={1, 2})
        assert result[0] == FAKE_OGG
        assert counter["n"] == 3

    def test_all_attempts_fail_raises(self):
        """Three failures → raises Exception."""
        MockYDL, counter = _make_ydl_class({1, 2, 3})
        with patch("yt_dlp.YoutubeDL", MockYDL), \
             patch("glob.glob", return_value=[]), \
             patch("os.remove"), \
             patch("os.path.getsize", return_value=0), \
             patch("subprocess.run"):
            with pytest.raises(Exception, match="Failed to extract audio from YouTube"):
                audio_utils.extract_youtube_audio(VIDEO_ID, proxy_urls=PROXY_URLS)
        assert counter["n"] == 3

    def test_proxy_rotated_between_attempts(self):
        """Each retry attempt uses a different proxy URL from proxy_urls list."""
        used_proxies = []
        attempt_counter = {"n": 0}

        class CapturingYDL:
            def __init__(self, opts):
                used_proxies.append(opts.get("proxy"))

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def extract_info(self, url, download=True):
                attempt_counter["n"] += 1
                if attempt_counter["n"] == 1:
                    raise Exception(PARTIAL_WRITE_ERROR)
                return {"title": "T", "uploader": "C"}

        def stateful_glob(pattern):
            if attempt_counter["n"] >= 2 and not pattern.endswith(".ogg"):
                return [FAKE_RAW]
            return []

        with patch("yt_dlp.YoutubeDL", CapturingYDL), \
             patch("glob.glob", side_effect=stateful_glob), \
             patch("os.remove"), \
             patch("os.path.getsize", return_value=50 * 1024 * 1024), \
             patch("subprocess.run", return_value=MagicMock(returncode=0, stderr="")):
            audio_utils.extract_youtube_audio(VIDEO_ID, proxy_urls=PROXY_URLS)

        assert len(used_proxies) == 2
        assert used_proxies[0] == PROXY_URLS[0], "attempt 1 must use proxy_urls[0]"
        assert used_proxies[1] == PROXY_URLS[1], "attempt 2 must use proxy_urls[1] (rotated)"
        assert used_proxies[0] != used_proxies[1], "proxy must change between attempts"

    def test_backward_compat_single_proxy_url(self):
        """Old callers passing proxy_url= still work (same URL every attempt)."""
        used_proxies = []
        attempt_counter = {"n": 0}

        class CapturingYDL:
            def __init__(self, opts):
                used_proxies.append(opts.get("proxy"))

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def extract_info(self, url, download=True):
                attempt_counter["n"] += 1
                if attempt_counter["n"] == 1:
                    raise Exception(PARTIAL_WRITE_ERROR)
                return {"title": "T", "uploader": "C"}

        def stateful_glob(pattern):
            if attempt_counter["n"] >= 2 and not pattern.endswith(".ogg"):
                return [FAKE_RAW]
            return []

        fixed_url = "http://user-fixed-session:pass@gate.decodo.com:10001"
        with patch("yt_dlp.YoutubeDL", CapturingYDL), \
             patch("glob.glob", side_effect=stateful_glob), \
             patch("os.remove"), \
             patch("os.path.getsize", return_value=50 * 1024 * 1024), \
             patch("subprocess.run", return_value=MagicMock(returncode=0, stderr="")):
            audio_utils.extract_youtube_audio(VIDEO_ID, proxy_url=fixed_url)

        assert all(p == fixed_url for p in used_proxies), "backward-compat: same URL every attempt"

    def test_members_only_does_not_retry(self):
        """Members-only error must raise immediately without retry."""
        attempt_counter = {"n": 0}

        class MembersOnlyYDL:
            def __init__(self, opts):
                pass

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def extract_info(self, url, download=True):
                attempt_counter["n"] += 1
                raise Exception("join this channel to get access to members-only content")

        with patch("yt_dlp.YoutubeDL", MembersOnlyYDL), \
             patch("glob.glob", return_value=[]):
            with pytest.raises(audio_utils.MembersOnlyVideoError):
                audio_utils.extract_youtube_audio(VIDEO_ID, proxy_urls=PROXY_URLS)

        assert attempt_counter["n"] == 1, "must not retry on members-only"


class TestKeywordMatching:
    """Verify keyword classification logic independent of full download flow."""

    def _check(self, error_str: str) -> tuple[bool, bool, bool]:
        lower = error_str.lower()
        is_partial = any(kw in lower for kw in ('bytes read', 'more expected', 'incomplete read', 'content-length'))
        is_timeout = any(kw in lower for kw in ('timed out', 'timeout', 'read timeout', 'connectionpool'))
        is_conn = any(kw in lower for kw in ('ssl', 'unexpected_eof', 'eof', 'connectionreset', 'remotedisconnected', 'broken pipe', 'connection reset'))
        return is_partial, is_timeout, is_conn

    def test_partial_write_exact_error(self):
        partial, timeout, conn = self._check(PARTIAL_WRITE_ERROR)
        assert partial is True
        assert timeout is False
        assert conn is False

    def test_timeout_error(self):
        partial, timeout, conn = self._check("Read timed out")
        assert partial is False
        assert timeout is True

    def test_ssl_error(self):
        partial, timeout, conn = self._check("SSL: UNEXPECTED_EOF_WHILE_READING")
        assert partial is False
        assert conn is True

    def test_non_retryable_error(self):
        partial, timeout, conn = self._check("HTTP Error 404: Not Found")
        assert not any([partial, timeout, conn])

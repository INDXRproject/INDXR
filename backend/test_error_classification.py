"""
Fix A: transient connection/network download failures classify as the retryable 'timeout'
family (so they get an inline Retry button + Retry-all + auto-retry), while permanent errors
stay non-retryable. Run: venv/bin/python -m pytest test_error_classification.py -v
"""
from transcription_pipeline import _classify_download_error

# The retry-eligible set (mirror worker.py process_playlist_video / RPC v_has_retryable).
RETRYABLE = {"bot_detection", "timeout"}


def test_connection_like_errors_are_retryable_timeout():
    for msg in (
        "HTTPSConnectionPool(host='...'): Connection reset by peer",
        "Connection aborted., RemoteDisconnected('Remote end closed connection without response')",
        "Connection refused",
        "('Connection broken: IncompleteRead',)",   # note: also retryable via connection kw
        "[Errno 104] ECONNRESET",
        "urllib.error: Temporary failure in name resolution",
        "Network is unreachable",
        "HTTP Error 502: Bad Gateway",
        "HTTP Error 503: Service Unavailable",
        "The service is temporarily unavailable, please try again",
        "Read timed out.",
    ):
        et = _classify_download_error(msg)
        assert et == "timeout", f"{msg!r} -> {et}, expected 'timeout'"
        assert et in RETRYABLE


def test_permanent_errors_stay_non_retryable():
    assert _classify_download_error("This video is age-restricted") == "age_restricted"
    assert _classify_download_error("This video is members-only content") == "members_only"
    # A plain "unavailable" (permanent) must NOT be captured by the connection bucket.
    assert _classify_download_error("Video unavailable") == "youtube_restricted"
    for permanent in ("age_restricted", "members_only", "youtube_restricted"):
        assert permanent not in RETRYABLE


def test_bot_detection_still_wins():
    assert _classify_download_error("Sign in to confirm you're not a bot") == "bot_detection"
    assert _classify_download_error("HTTP Error 429: Too Many Requests") == "bot_detection"


def test_genuinely_unknown_stays_extraction_error():
    # The unknown catch-all is NOT made blindly retryable (stays 'error' in the UI, no button).
    et = _classify_download_error("some totally novel failure mode with no known keyword")
    assert et == "extraction_error"
    assert et not in RETRYABLE

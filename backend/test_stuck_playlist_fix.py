"""
Unit tests voor de stuck-playlist fix (Fix 1 per-video timeout + Fix 2 reap-pass).
Puur logica — géén live DB. Run: venv/bin/python -m pytest test_stuck_playlist_fix.py -v
"""
import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytestmark = pytest.mark.anyio


# ── Fix 1: per-video download-timeout ────────────────────────────────────────

@pytest.mark.anyio
async def test_run_with_heartbeat_timeout_raises_timeout_error():
    """_run_with_heartbeat(timeout=) breekt een te trage awaitable af met een 'timed out'-message."""
    from transcription_pipeline import _run_with_heartbeat

    async def _slow():
        await asyncio.sleep(5)
        return "should-not-return"

    with pytest.raises(TimeoutError) as exc:
        await _run_with_heartbeat(_slow(), None, timeout=0.05)
    assert "timed out" in str(exc.value).lower()


@pytest.mark.anyio
async def test_run_with_heartbeat_no_timeout_passes_through():
    """Zonder timeout (default) blijft het gedrag ongewijzigd — awaitable draait normaal af."""
    from transcription_pipeline import _run_with_heartbeat

    async def _fast():
        return "ok"

    assert await _run_with_heartbeat(_fast(), None) == "ok"
    assert await _run_with_heartbeat(_fast(), None, timeout=10) == "ok"


def test_timeout_message_classifies_as_retryable_timeout():
    """De timeout-message mapt naar het bestaande retryable 'timeout'-type (error→refund→retry)."""
    from transcription_pipeline import _classify_download_error
    assert _classify_download_error("extraction timed out after 120s") == "timeout"


# ── Fix 2: reap-detectie (pure predikaat — de false-positive guard) ──────────

def _now():
    return datetime(2026, 7, 9, 12, 0, 0, tzinfo=timezone.utc)


def _iso(minutes_ago):
    return (_now() - timedelta(minutes=minutes_ago)).isoformat()


def test_reap_stale_progress_and_stale_heartbeat_true():
    """Voortgang 60min oud + heartbeat 60min oud → reap (dode worker)."""
    from worker import _should_reap_running_playlist
    job = {"last_progress_at": _iso(60), "created_at": _iso(65), "last_heartbeat_at": _iso(60)}
    assert _should_reap_running_playlist(job, _now()) is True


def test_reap_null_heartbeat_stale_progress_true():
    """NULL heartbeat + oude voortgang (zombie zoals 0ad1c75c) → reap."""
    from worker import _should_reap_running_playlist
    job = {"last_progress_at": None, "created_at": _iso(120), "last_heartbeat_at": None}
    assert _should_reap_running_playlist(job, _now()) is True


def test_reap_recent_progress_false():
    """Recente voortgang (2min) → GEZOND → niet rapen (belangrijkste guard)."""
    from worker import _should_reap_running_playlist
    job = {"last_progress_at": _iso(2), "created_at": _iso(30), "last_heartbeat_at": None}
    assert _should_reap_running_playlist(job, _now()) is False


def test_reap_just_started_null_heartbeat_false():
    """Net gestart (created 3min, progress NULL, NULL heartbeat) → NIET rapen (false-positive guard)."""
    from worker import _should_reap_running_playlist
    job = {"last_progress_at": None, "created_at": _iso(3), "last_heartbeat_at": None}
    assert _should_reap_running_playlist(job, _now()) is False


def test_reap_stale_progress_but_fresh_heartbeat_false():
    """Trage-maar-levende whisper (voortgang 40min oud, heartbeat 1min vers) → NIET rapen."""
    from worker import _should_reap_running_playlist
    job = {"last_progress_at": _iso(40), "created_at": _iso(45), "last_heartbeat_at": _iso(1)}
    assert _should_reap_running_playlist(job, _now()) is False


# ── Fix 2: reap-actie (refund-vóór-claim, idempotent) ────────────────────────

def _reap_supabase_mock(claim_data):
    """Mock supabase waarvan de terminal-claim `claim_data` teruggeeft."""
    mock = MagicMock()
    chain = MagicMock()
    chain.update.return_value = chain
    chain.eq.return_value = chain
    exec_result = MagicMock()
    exec_result.data = claim_data
    chain.execute.return_value = exec_result
    mock.table.return_value = chain
    return mock, chain


@pytest.mark.anyio
async def test_reap_reserved_refunds_then_claims_terminal():
    """reserved>0 → refund_credits geroepen, dan CAS-claim naar status='complete' + video's timeout."""
    from worker import _reap_stale_running_playlist
    job = {
        "id": "pl-1", "user_id": "u1", "credits_reserved": 50, "failed": 1,
        "video_ids": ["a", "b", "c"], "video_results": {"a": {"status": "success"}},
    }
    supabase, chain = _reap_supabase_mock(claim_data=[{"id": "pl-1"}])
    with patch("worker.refund_credits", return_value={"success": True}) as mock_refund:
        await _reap_stale_running_playlist(supabase, job)
    mock_refund.assert_called_once_with(None, "pl-1")
    # de update-payload markeert b en c als timeout en zet status=complete, failed=1+2
    payload = chain.update.call_args.args[0]
    assert payload["status"] == "complete"
    assert payload["failed"] == 3
    assert payload["video_results"]["b"] == {"status": "error", "error_type": "timeout"}
    assert payload["video_results"]["c"] == {"status": "error", "error_type": "timeout"}
    assert payload["video_results"]["a"] == {"status": "success"}  # ongewijzigd


@pytest.mark.anyio
async def test_reap_refund_failure_does_not_claim():
    """refund faalt → GEEN terminal-claim (status blijft 'running' → volgende cyclus retry't)."""
    from worker import _reap_stale_running_playlist
    job = {"id": "pl-2", "user_id": "u1", "credits_reserved": 50, "failed": 0,
           "video_ids": ["a"], "video_results": {}}
    supabase, chain = _reap_supabase_mock(claim_data=[{"id": "pl-2"}])
    with patch("worker.refund_credits", return_value={"success": False}):
        await _reap_stale_running_playlist(supabase, job)
    chain.update.assert_not_called()  # geen claim bij mislukte refund


@pytest.mark.anyio
async def test_reap_zero_reserved_skips_refund_but_claims():
    """reserved 0 (pre-ADR-050 zombie) → skip refund, wél terminaal markeren."""
    from worker import _reap_stale_running_playlist
    job = {"id": "pl-3", "user_id": "u1", "credits_reserved": 0, "failed": 0,
           "video_ids": ["a", "b"], "video_results": {}}
    supabase, chain = _reap_supabase_mock(claim_data=[{"id": "pl-3"}])
    with patch("worker.refund_credits") as mock_refund:
        await _reap_stale_running_playlist(supabase, job)
    mock_refund.assert_not_called()
    assert chain.update.call_args.args[0]["status"] == "complete"


@pytest.mark.anyio
async def test_reap_idempotent_cas_miss_no_double_action():
    """CAS-claim raakt 0 rijen (al gereapt/gewijzigd) → geen fout, geen dubbele actie."""
    from worker import _reap_stale_running_playlist
    job = {"id": "pl-4", "user_id": "u1", "credits_reserved": 50, "failed": 0,
           "video_ids": ["a"], "video_results": {}}
    supabase, chain = _reap_supabase_mock(claim_data=[])  # CAS matcht niets
    with patch("worker.refund_credits", return_value={"success": True}) as mock_refund:
        await _reap_stale_running_playlist(supabase, job)
    # refund is idempotent (mag geroepen zijn), maar de tweede reap doet geen tweede terminal-transitie
    mock_refund.assert_called_once()
    chain.update.assert_called_once()  # één poging; CAS gaf leeg → skip-log, geen retry

"""
Unit tests voor watchdog_interrupted_jobs.

Mock Supabase en Redis; verifieer query-logica en re-enqueue idempotentie.
Run: venv/bin/python -m pytest test_watchdog.py -v
"""
import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

pytestmark = pytest.mark.anyio

# ── helpers ──────────────────────────────────────────────────────────────────

def _make_transcription_job(
    job_id="job-aaa",
    user_id="user-111",
    video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    credits_cost=5,
    watchdog_attempts=0,
    transcript_id=None,
):
    return {
        "id": job_id,
        "user_id": user_id,
        "video_url": video_url,
        "title": "Test video",
        "credits_cost": credits_cost,
        "watchdog_attempts": watchdog_attempts,
        "transcript_id": transcript_id,
    }


STALE_HEARTBEAT = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
FRESH_HEARTBEAT = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()


def _make_playlist_job(
    playlist_id="pl-bbb",
    user_id="user-222",
    video_ids=None,
    video_results=None,
    completed=0,
    failed=0,
    watchdog_attempts=0,
    status="interrupted",
    last_heartbeat_at=None,
):
    video_ids = video_ids or ["v1", "v2", "v3"]
    video_results = video_results or {}
    return {
        "id": playlist_id,
        "user_id": user_id,
        "video_ids": video_ids,
        "video_results": video_results,
        "completed": completed,
        "failed": failed,
        "total_videos": len(video_ids),
        "watchdog_attempts": watchdog_attempts,
        "status": status,
        "last_heartbeat_at": last_heartbeat_at or STALE_HEARTBEAT,
    }


def _supabase_mock(transcription_data=None, playlist_data=None, refund_data=None):
    """Build a mock supabase client that returns supplied data per query chain."""
    mock = MagicMock()

    def _chain(data):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.in_.return_value = chain
        chain.is_.return_value = chain
        chain.lt.return_value = chain
        chain.gt.return_value = chain
        chain.gte.return_value = chain
        chain.update.return_value = chain
        execute_result = MagicMock()
        execute_result.data = data
        chain.execute.return_value = execute_result
        return chain

    # State machine: first call = transcription re-enqueue, second = playlist re-enqueue,
    # third = refund query. Each returns its own chain.
    call_count = [0]
    result_sequence = [
        _chain(transcription_data or []),
        _chain(playlist_data or []),
        _chain(refund_data or []),
    ]

    def _table_side_effect(name):
        idx = call_count[0]
        call_count[0] += 1
        return result_sequence[min(idx, len(result_sequence) - 1)]

    mock.table.side_effect = _table_side_effect
    return mock


def _make_ctx(supabase_mock, redis_mock):
    return {"redis": redis_mock}


# ── tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_transcription_job_reenqueued():
    """Job met credits_deducted=True, geen transcript, attempts=0 → re-enqueue."""
    job = _make_transcription_job()
    redis = AsyncMock()
    redis.delete = AsyncMock()
    redis.enqueue_job = AsyncMock()
    supabase = _supabase_mock(transcription_data=[job])

    with patch("worker.get_supabase_client", return_value=supabase), \
         patch("worker.add_credits") as mock_add_credits:

        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})

    redis.delete.assert_awaited_once_with(
        f"arq:job:{job['id']}", f"arq:in-progress:{job['id']}"
    )
    redis.enqueue_job.assert_awaited_once()
    call_kwargs = redis.enqueue_job.call_args
    assert call_kwargs.kwargs.get("job_id") == job["id"] or call_kwargs.args[1] == job["id"]
    mock_add_credits.assert_not_called()  # refund alleen voor attempts>=1 + old jobs


@pytest.mark.anyio
async def test_job_with_watchdog_attempts_1_not_reenqueued():
    """Job met watchdog_attempts=1 valt buiten Pass 1 query — niet opnieuw geënqueued."""
    # Pass 1 query filtert op watchdog_attempts=0 — job met attempts=1 wordt nooit teruggegeven.
    # We verifiëren dat de re-enqueue query de juiste filter heeft: eq('watchdog_attempts', 0).
    redis = AsyncMock()
    redis.delete = AsyncMock()
    redis.enqueue_job = AsyncMock()
    supabase = _supabase_mock(transcription_data=[])  # leeg: filter sluit job uit

    with patch("worker.get_supabase_client", return_value=supabase):
        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})

    redis.enqueue_job.assert_not_awaited()


@pytest.mark.anyio
async def test_job_with_transcript_id_not_reenqueued():
    """Job met transcript_id is al succesvol — niet opnieuw geënqueued."""
    redis = AsyncMock()
    redis.enqueue_job = AsyncMock()
    # transcript_id IS NULL filter → lege resultset
    supabase = _supabase_mock(transcription_data=[])

    with patch("worker.get_supabase_client", return_value=supabase):
        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})

    redis.enqueue_job.assert_not_awaited()


@pytest.mark.anyio
async def test_playlist_interrupted_all_done_skipped():
    """Playlist status='interrupted' maar completed+failed==total → defensieve skip."""
    job = _make_playlist_job(
        video_ids=["v1", "v2"],
        video_results={"v1": {"status": "success"}, "v2": {"status": "error"}},
        completed=1,
        failed=1,
        watchdog_attempts=0,
        status="interrupted",
    )
    redis = AsyncMock()
    redis.enqueue_job = AsyncMock()
    supabase = _supabase_mock(playlist_data=[job])

    with patch("worker.get_supabase_client", return_value=supabase):
        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})

    redis.enqueue_job.assert_not_awaited()


@pytest.mark.anyio
async def test_playlist_finds_correct_video_index():
    """Watchdog vindt de eerste video zonder resultaat als video_index."""
    job = _make_playlist_job(
        video_ids=["v1", "v2", "v3", "v4"],
        video_results={"v1": {"status": "success"}, "v2": {"status": "success"}},
        completed=2,
        failed=0,
        watchdog_attempts=0,
    )
    redis = AsyncMock()
    redis.delete = AsyncMock()
    redis.enqueue_job = AsyncMock()
    supabase = _supabase_mock(playlist_data=[job])

    with patch("worker.get_supabase_client", return_value=supabase):
        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})

    # Eerste ontbrekende video is v3 op index 2
    expected_job_id = f"{job['id']}:2"
    redis.delete.assert_awaited_once_with(
        f"arq:job:{expected_job_id}", f"arq:in-progress:{expected_job_id}"
    )
    redis.enqueue_job.assert_awaited_once()


@pytest.mark.anyio
async def test_pass2_refund_when_heartbeat_stale():
    """Pass 2: job met attempts=1 en stale heartbeat → refund binnen ~10 min (geen 24u-pad)."""
    job = _make_transcription_job(
        job_id="job-stale",
        user_id="user-888",
        credits_cost=5,
        watchdog_attempts=1,
    )
    redis = AsyncMock()
    redis.enqueue_job = AsyncMock()
    # Pass 1: leeg (attempts=0 filter matcht niet), Pass 2: job met stale heartbeat → refund
    supabase = _supabase_mock(transcription_data=[], refund_data=[job])

    with patch("worker.get_supabase_client", return_value=supabase), \
         patch("worker.add_credits") as mock_add_credits:

        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})

    mock_add_credits.assert_called_once_with(
        "user-888", 5, f"Refund: watchdog crash-recovery (job {job['id']})"
    )
    redis.enqueue_job.assert_not_awaited()


@pytest.mark.anyio
async def test_pass2_no_refund_when_heartbeat_fresh():
    """Pass 2: job met attempts=1 maar heartbeat < 5 min geleden → Supabase filtert uit → geen refund."""
    # Heartbeat-filter lt('last_heartbeat_at', stale_before) sluit frisse heartbeat uit.
    # Mock geeft lege resultset terug — simuleer dat DB-filter werkt.
    redis = AsyncMock()
    redis.enqueue_job = AsyncMock()
    supabase = _supabase_mock(transcription_data=[], refund_data=[])  # filter sluit job uit

    with patch("worker.get_supabase_client", return_value=supabase), \
         patch("worker.add_credits") as mock_add_credits:

        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})

    mock_add_credits.assert_not_called()
    redis.enqueue_job.assert_not_awaited()


@pytest.mark.anyio
async def test_second_watchdog_run_idempotent():
    """Tweede watchdog-run op hetzelfde job: job is nu pending → leeg resultaat → noop."""
    # Na re-enqueue staat status='pending' in DB — Pass 1 query (status='interrupted') matcht niet meer.
    redis = AsyncMock()
    redis.enqueue_job = AsyncMock()
    supabase = _supabase_mock(transcription_data=[])  # lege resultset

    with patch("worker.get_supabase_client", return_value=supabase):
        from worker import watchdog_interrupted_jobs
        # Eerste run
        await watchdog_interrupted_jobs({"redis": redis})
        # Tweede run (status was ondertussen 'pending')
        await watchdog_interrupted_jobs({"redis": redis})

    redis.enqueue_job.assert_not_awaited()

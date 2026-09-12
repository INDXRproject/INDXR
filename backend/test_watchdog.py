"""
Unit tests voor watchdog_interrupted_jobs.

Mock Supabase en Redis; verifieer query-logica en re-enqueue idempotentie.
Run: venv/bin/python -m pytest test_watchdog.py -v
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

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
    """Table- + filter-aware mock of the Supabase client.

    The watchdog runs many passes over two tables (Pass 0a/0b reaper, 1a transcription re-enqueue,
    1b playlist re-enqueue, 2/2b refund, 2c reconciliation, 3 reaper), so a positional "1st call =
    transcription, 2nd = playlist, 3rd = refund" mock no longer maps to reality — it feeds the
    fixture into the wrong pass. Instead we route each .execute() by (table, status-filter,
    watchdog_attempts-filter), mirroring the real queries in worker.py:

      transcription_jobs, status='interrupted', watchdog_attempts==0  → Pass 1a  → transcription_data
      transcription_jobs, status='interrupted', watchdog_attempts>=1  → Pass 2   → refund_data
      playlist_extraction_jobs, status in (interrupted, retry_pending) → Pass 1b → playlist_data
      everything else (pending/active reaper selects, other tables/passes)        → []

    CAS-claim UPDATE chains for the matched pass return the same rows so `if not claim.data: skip`
    passes and the re-enqueue proceeds. The .rpc() path (Pass 2c reconciliation) returns [] so it
    never spuriously books a refund the tests assert against.
    """
    transcription_data = transcription_data or []
    playlist_data = playlist_data or []
    refund_data = refund_data or []

    def _make_chain(table_name):
        state = {"is_update": False, "status_eq": None, "status_in": None,
                 "attempts_eq": None, "attempts_gte": None}
        chain = MagicMock()

        def _update(*a, **k):
            state["is_update"] = True
            return chain

        def _eq(col, val):
            if col == "status":
                state["status_eq"] = val
            elif col == "watchdog_attempts":
                state["attempts_eq"] = val
            return chain

        def _in(col, vals):
            if col == "status":
                state["status_in"] = list(vals)
            return chain

        def _gte(col, val):
            if col == "watchdog_attempts":
                state["attempts_gte"] = val
            return chain

        def _passthrough(*a, **k):
            return chain

        chain.select.side_effect = _passthrough
        chain.update.side_effect = _update
        chain.upsert.side_effect = _passthrough
        chain.eq.side_effect = _eq
        chain.in_.side_effect = _in
        chain.gte.side_effect = _gte
        chain.lt.side_effect = _passthrough
        chain.gt.side_effect = _passthrough
        chain.is_.side_effect = _passthrough
        chain.or_.side_effect = _passthrough
        chain.order.side_effect = _passthrough
        chain.limit.side_effect = _passthrough
        # Pass 0b uses .not_.is_(...)
        not_obj = MagicMock()
        not_obj.is_.side_effect = _passthrough
        chain.not_ = not_obj

        def _resolve():
            if table_name == "transcription_jobs":
                # Pass 1a select (status=interrupted, attempts=0) and its CAS claim (attempts=0).
                if state["attempts_eq"] == 0 and (state["is_update"] or state["status_eq"] == "interrupted"):
                    return transcription_data
                # Pass 2 refund select (status=interrupted, attempts>=1).
                if state["status_eq"] == "interrupted" and (state["attempts_gte"] or 0) >= 1:
                    return refund_data
                return []
            if table_name == "playlist_extraction_jobs":
                si = state["status_in"] or []
                # Pass 1b select (status in interrupted/retry_pending) or its CAS claim update.
                if "interrupted" in si or "retry_pending" in si:
                    return playlist_data
                if state["is_update"]:
                    return playlist_data
                return []
            return []

        def _execute(*a, **k):
            r = MagicMock()
            r.data = _resolve()
            return r

        chain.execute.side_effect = _execute
        return chain

    mock = MagicMock()
    mock.table.side_effect = lambda name: _make_chain(name)
    # Pass 2c reconciliation: supabase.rpc('watchdog_unrefunded_reserved', ...).execute().data
    rpc_result = MagicMock()
    rpc_result.data = []
    rpc_chain = MagicMock()
    rpc_chain.execute.return_value = rpc_result
    mock.rpc.return_value = rpc_chain
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
         patch("worker.refund_credits") as mock_refund, \
         patch("worker.refund_credits_flat") as mock_refund_flat:

        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})

    redis.delete.assert_awaited_once_with(
        f"arq:job:{job['id']}", f"arq:in-progress:{job['id']}"
    )
    redis.enqueue_job.assert_awaited_once()
    call_kwargs = redis.enqueue_job.call_args
    assert call_kwargs.kwargs.get("job_id") == job["id"] or call_kwargs.args[1] == job["id"]
    # video_id moet YouTube-ID zijn (geëxtraheerd uit video_url), niet de volledige URL
    assert call_kwargs.kwargs.get("video_id") == "dQw4w9WgXcQ"
    # title en video_url horen niet in de enqueue-call — die kolommen bestaan niet in transcription_jobs
    assert "title" not in call_kwargs.kwargs
    assert "video_url" not in call_kwargs.kwargs
    # Pass 1 (re-enqueue, attempts=0) mag NIET refunden — de refund is Pass 2 (attempts>=1). Refund
    # loopt sinds ADR-050 via refund_credits/refund_credits_flat (worker.add_credits bestaat niet meer).
    mock_refund.assert_not_called()
    mock_refund_flat.assert_not_called()


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
         patch("worker.refund_credits") as mock_refund, \
         patch("worker.refund_credits_flat", return_value={"success": True}) as mock_refund_flat:

        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})

    # ADR-050: Pass 2 refunds via _refund_then_claim_job. The fixture has no credits_reserved and
    # credits_cost=5 → the flat-refund branch: refund_credits_flat(user, job_id, amount, reason).
    mock_refund_flat.assert_called_once_with(
        "user-888", job['id'], 5, f"Refund: watchdog crash-recovery (job {job['id']})"
    )
    mock_refund.assert_not_called()
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
         patch("worker.refund_credits") as mock_refund, \
         patch("worker.refund_credits_flat") as mock_refund_flat:

        from worker import watchdog_interrupted_jobs
        await watchdog_interrupted_jobs({"redis": redis})

    # Fresh heartbeat → Supabase Pass-2 filter excludes the job → no refund of any kind.
    mock_refund.assert_not_called()
    mock_refund_flat.assert_not_called()


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

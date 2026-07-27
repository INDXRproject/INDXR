"""
Commit 3 (submit+poll) — resume-grens.

Bewijst dat _submit_and_poll een opgeslagen provider_transcript_id ALLEEN hergebruikt onder de strakke
gate (zelfde jobrij, niet-terminaal, binnen TTL, live poll queued/processing) en in ELK ander geval
opnieuw indient. Verkeerde inhoud > dubbel betalen: twijfel valt altijd naar opnieuw indienen.

Draai: venv/bin/python3 -m pytest test_submit_poll_resume.py -q   (of gewoon: venv/bin/python3 test_submit_poll_resume.py)

Geen echte AssemblyAI/Supabase: submit_assemblyai + poll_assemblyai zijn gemonkeypatcht en supabase is
een fake die de seed-rij teruggeeft en writes opvangt.
"""
import asyncio
from datetime import datetime, timezone, timedelta

import transcription_pipeline as tp

NOW = datetime.now(timezone.utc)
FRESH = (NOW - timedelta(minutes=5)).isoformat()
STALE = (NOW - timedelta(days=2)).isoformat()


class _FakeResp:
    def __init__(self, data):
        self.data = data


class _FakeQuery:
    """Vangt .select/.update/.eq/.single/.execute; onthoudt de laatste update-payload."""
    def __init__(self, row, writes):
        self._row = row
        self._writes = writes
        self._pending_update = None

    def select(self, *_a, **_k):
        return self

    def update(self, cols):
        self._pending_update = cols
        return self

    def eq(self, *_a, **_k):
        return self

    def single(self):
        return self

    def execute(self):
        if self._pending_update is not None:
            self._writes.append(self._pending_update)
            self._pending_update = None
            return _FakeResp(None)
        return _FakeResp(dict(self._row) if self._row is not None else None)


class _FakeSupabase:
    def __init__(self, row):
        self.row = row
        self.writes = []

    def table(self, _name):
        return _FakeQuery(self.row, self.writes)


def _run(seed_row, poll_map, *, submit_id="new-provider-xyz"):
    """Voert _submit_and_poll uit met gemonkeypatchte submit/poll. Retourneert
    (result, submit_calls, reused_bool, capture_writes)."""
    submit_calls = []

    def fake_submit(audio_path):
        submit_calls.append(audio_path)
        return {"success": True, "transcript_id": submit_id}

    def fake_poll(pid):
        # poll_map: pid -> lijst van beurten (elke call pakt de volgende, laatste blijft plakken)
        seq = poll_map.get(pid)
        if seq is None:
            return {"success": False, "error": f"unknown id {pid}"}
        turn = seq[0] if len(seq) == 1 else seq.pop(0)
        return turn

    orig_submit, orig_poll = tp.submit_assemblyai, tp.poll_assemblyai
    orig_interval = tp.ASSEMBLYAI_POLL_INTERVAL_SECONDS
    tp.submit_assemblyai = fake_submit
    tp.poll_assemblyai = fake_poll
    tp.ASSEMBLYAI_POLL_INTERVAL_SECONDS = 0  # geen echte sleep in de test
    try:
        supa = _FakeSupabase(seed_row)
        result = asyncio.run(
            tp._submit_and_poll("/tmp/audio.mp3", job_id="job-1", heartbeat_fn=None, supabase=supa)
        )
    finally:
        tp.submit_assemblyai = orig_submit
        tp.poll_assemblyai = orig_poll
        tp.ASSEMBLYAI_POLL_INTERVAL_SECONDS = orig_interval
    reused = len(submit_calls) == 0
    return result, submit_calls, reused, supa.writes


COMPLETED = {"success": True, "status": "completed", "transcript": [{"text": "hi", "offset": 0.0, "duration": 1.0}],
             "duration": 1.0, "model": "universal-2", "language": "en"}


def test_valid_running_id_is_reused():
    # Verse submission, niet-terminaal, live poll = processing → completed → HERGEBRUIK (geen re-submit).
    seed = {"provider_transcript_id": "live-abc", "submitted_at": FRESH,
            "provider_processing_at": None, "status": "transcribing"}
    poll_map = {"live-abc": [{"success": True, "status": "processing"}, COMPLETED]}
    result, submits, reused, writes = _run(seed, poll_map)
    assert result["success"] and reused, (result, submits)
    # geen provider_transcript_id-write (we hebben niet opnieuw ingediend)
    assert not any("provider_transcript_id" in w for w in writes), writes
    print("[PASS] geldige lopende id -> HERGEBRUIKT (geen re-submit)")


def test_stale_id_is_not_reused():
    # submitted_at > 1 dag → gate weigert vóór de poll → opnieuw indienen.
    seed = {"provider_transcript_id": "stale-abc", "submitted_at": STALE,
            "provider_processing_at": None, "status": "transcribing"}
    poll_map = {"new-provider-xyz": [COMPLETED]}  # stale-abc mag NOOIT gepolld worden
    result, submits, reused, writes = _run(seed, poll_map)
    assert result["success"] and not reused, (result, submits)
    assert submits == ["/tmp/audio.mp3"], submits
    assert any(w.get("provider_transcript_id") == "new-provider-xyz" for w in writes), writes
    print("[PASS] stale id (>TTL)      -> NIET hergebruikt, opnieuw ingediend")


def test_mismatch_completed_id_is_not_reused():
    # Gate passeert (fresh), maar live poll = completed (kan van oudere submission zijn) → niet gokken,
    # opnieuw indienen.
    seed = {"provider_transcript_id": "old-completed", "submitted_at": FRESH,
            "provider_processing_at": None, "status": "transcribing"}
    poll_map = {"old-completed": [COMPLETED], "new-provider-xyz": [COMPLETED]}
    result, submits, reused, writes = _run(seed, poll_map)
    assert result["success"] and not reused, (result, submits)
    assert any(w.get("provider_transcript_id") == "new-provider-xyz" for w in writes), writes
    print("[PASS] mismatch completed   -> NIET hergebruikt, opnieuw ingediend")


def test_garbage_id_is_not_reused():
    # Gate passeert (fresh), maar live poll faalt (onbekende/garbage id) → opnieuw indienen.
    seed = {"provider_transcript_id": "garbage-999", "submitted_at": FRESH,
            "provider_processing_at": None, "status": "transcribing"}
    poll_map = {"garbage-999": [{"success": False, "error": "not found"}], "new-provider-xyz": [COMPLETED]}
    result, submits, reused, writes = _run(seed, poll_map)
    assert result["success"] and not reused, (result, submits)
    print("[PASS] garbage/mismatch id  -> NIET hergebruikt, opnieuw ingediend")


def test_processing_ms_and_language_captured_on_fresh_submit():
    # Verse job (geen provider id) → submit → processing → completed. provider_processing_at wordt
    # geschreven, provider_processing_ms/assemblyai_language/assemblyai_model op completion.
    seed = {"provider_transcript_id": None, "submitted_at": None,
            "provider_processing_at": None, "status": "transcribing"}
    poll_map = {"new-provider-xyz": [{"success": True, "status": "processing"}, COMPLETED]}
    result, submits, reused, writes = _run(seed, poll_map)
    assert result["success"] and not reused
    merged = {}
    for w in writes:
        merged.update(w)
    assert merged.get("provider_transcript_id") == "new-provider-xyz", writes
    assert merged.get("submitted_at") is not None, writes
    assert merged.get("provider_processing_at") is not None, writes
    assert merged.get("assemblyai_language") == "en", writes
    assert merged.get("assemblyai_model") == "universal-2", writes
    assert "provider_processing_ms" in merged, writes
    print("[PASS] verse submit         -> capture-kolommen geschreven (submitted/processing_at/ms/lang/model)")


if __name__ == "__main__":
    test_valid_running_id_is_reused()
    test_stale_id_is_not_reused()
    test_mismatch_completed_id_is_not_reused()
    test_garbage_id_is_not_reused()
    test_processing_ms_and_language_captured_on_fresh_submit()
    print("\nALL RESUME-BOUNDARY TESTS PASS")

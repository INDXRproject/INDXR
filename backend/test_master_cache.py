"""
Unit tests voor master_transcripts_read.

Mock Supabase en R2; verifieer hit/miss/expired/deprecated paden.
Run: venv/bin/python -m pytest test_master_cache.py -v
"""
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta, timezone

import pytest

pytestmark = pytest.mark.anyio

# ── helpers ──────────────────────────────────────────────────────────────────

_FRESH_TIMESTAMP = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
_STALE_TIMESTAMP = (datetime.now(timezone.utc) - timedelta(days=100)).isoformat()

_SAMPLE_ROW = {
    "r2_key": "transcripts/dQw4w9WgXcQ__en__youtube_transcript_api.json",
    "duration_seconds": 213,
    "language": "en",
    "transcription_model": "youtube_transcript_api",
}

_SAMPLE_TRANSCRIPT = [{"text": "Hello", "offset": 0.0, "duration": 1.5}]


def _supabase_with_row(row=None):
    sb = MagicMock()
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.is_.return_value = chain
    chain.gt.return_value = chain
    chain.gte.return_value = chain
    chain.order.return_value = chain
    chain.limit.return_value = chain
    result = MagicMock()
    result.data = [row] if row else []
    chain.execute.return_value = result
    sb.table.return_value = chain
    return sb


# ── tests ─────────────────────────────────────────────────────────────────────

async def test_caption_hit_returns_dict():
    """Caption cache hit: Supabase + R2 beide beschikbaar → retourneert dict."""
    sb = _supabase_with_row(_SAMPLE_ROW)
    with patch("credit_manager.get_supabase_client", return_value=sb), \
         patch("master_cache.r2_read_json", return_value=_SAMPLE_TRANSCRIPT):
        from master_cache import master_transcripts_read
        result = await master_transcripts_read("dQw4w9WgXcQ", "caption_extraction", language="en")

    assert result is not None
    assert result["transcript"] == _SAMPLE_TRANSCRIPT
    assert result["duration_seconds"] == 213
    assert result["language"] == "en"
    assert result["transcription_model"] == "youtube_transcript_api"


async def test_caption_miss_returns_none():
    """Caption cache miss: Supabase geeft leeg resultaat → None."""
    sb = _supabase_with_row(None)
    with patch("credit_manager.get_supabase_client", return_value=sb), \
         patch("master_cache.r2_read_json", return_value=_SAMPLE_TRANSCRIPT):
        from master_cache import master_transcripts_read
        result = await master_transcripts_read("unknown-video", "caption_extraction", language="en")

    assert result is None


async def test_r2_miss_returns_none():
    """Supabase-rij bestaat maar R2 geeft None (verwijderd object) → None."""
    sb = _supabase_with_row(_SAMPLE_ROW)
    with patch("credit_manager.get_supabase_client", return_value=sb), \
         patch("master_cache.r2_read_json", return_value=None):
        from master_cache import master_transcripts_read
        result = await master_transcripts_read("dQw4w9WgXcQ", "caption_extraction", language="en")

    assert result is None


async def test_ai_hit_no_language_filter():
    """AI cache hit zonder language-filter → retourneert dict."""
    ai_row = {**_SAMPLE_ROW, "transcription_model": "assemblyai_universal_3",
              "r2_key": "transcripts/dQw4w9WgXcQ__en__assemblyai_universal_3.json"}
    sb = _supabase_with_row(ai_row)
    with patch("credit_manager.get_supabase_client", return_value=sb), \
         patch("master_cache.r2_read_json", return_value=_SAMPLE_TRANSCRIPT):
        from master_cache import master_transcripts_read
        # language=None (default) — geen language-filter voor AI
        result = await master_transcripts_read("dQw4w9WgXcQ", "audio_transcription")

    assert result is not None
    assert result["transcription_model"] == "assemblyai_universal_3"


async def test_ai_low_quality_rank_returns_none():
    """AI-entry met lagere quality_rank dan huidig model → Supabase filtert uit → None."""
    # Supabase geeft leeg terug omdat model_quality_rank < minimum (gefilerd in DB-query).
    sb = _supabase_with_row(None)
    with patch("credit_manager.get_supabase_client", return_value=sb), \
         patch("master_cache.r2_read_json", return_value=_SAMPLE_TRANSCRIPT):
        from master_cache import master_transcripts_read
        result = await master_transcripts_read("dQw4w9WgXcQ", "audio_transcription")

    assert result is None


async def test_supabase_exception_returns_none():
    """Supabase-fout → catch-all → None (nooit raises)."""
    sb = MagicMock()
    sb.table.side_effect = Exception("connection error")
    with patch("credit_manager.get_supabase_client", return_value=sb):
        from master_cache import master_transcripts_read
        result = await master_transcripts_read("dQw4w9WgXcQ", "caption_extraction", language="en")

    assert result is None


async def test_r2_exception_returns_none():
    """R2-fetch faalt met exception → catch-all → None (nooit raises)."""
    sb = _supabase_with_row(_SAMPLE_ROW)
    with patch("credit_manager.get_supabase_client", return_value=sb), \
         patch("master_cache.r2_read_json", side_effect=Exception("S3 error")):
        from master_cache import master_transcripts_read
        result = await master_transcripts_read("dQw4w9WgXcQ", "caption_extraction", language="en")

    assert result is None

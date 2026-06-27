"""
master_transcripts cache read/write helpers.
Reads and writes transcript metadata to Supabase and JSON content to Cloudflare R2.
All operations are best-effort: failures are logged but never propagate to callers.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from storage import r2_read_json, r2_write_json

logger = logging.getLogger("indxr-master-cache")

CAPTION_REFRESH_DAYS = 90
# Caption-extracties verlopen na 90 dagen vanaf fetched_from_provider_at.
# YouTube's auto-caption ASR wordt periodiek geüpdatet — een caption uit
# april 2026 kan in 2027 verouderd zijn. Bij cache-lookup (taak 1.11) wordt
# deze constante gebruikt om te beslissen of een caption-entry vers is.
# AI-transcripts verlopen niet via tijd maar via model_quality_rank.

MODEL_QUALITY_RANK = {
    "youtube_transcript_api": 30,
    "youtube_captions": 20,
    "youtube_captions_rotated": 15,
    "assemblyai_universal_2": 50,
    "assemblyai_universal_3": 70,
}
# Handmatig beheerde ranking. Niet afhankelijk van leverancier-naamgeving.
# Bij upgrade van productie-model: voeg nieuw entry toe met hogere rank.
# Cache-lookup (taak 1.11) vergelijkt rank van cached entry met rank van
# huidig productie-model — als cached lager is, behandel als miss en re-extract.

CURRENT_PRODUCTION_AI_MODEL = "assemblyai_universal_3"
# Wat backend op dit moment gebruikt voor audio_transcription requests.
# Hier wijzigen bij elke productie-upgrade (één plek).


async def master_transcripts_write(
    video_id: str,
    language: str,
    model: str,
    transcript_data: list,
    duration_seconds: int,
    source_method: str = "caption_extraction",
    quality_score: Optional[float] = None,
    force_refresh: bool = False,
    title: Optional[str] = None,
    channel: Optional[str] = None,
) -> None:
    """
    Write a transcript to the master cache (R2 + Supabase master_transcripts).
    Best-effort: any failure is logged and swallowed — never raises.
    """
    try:
        character_count = sum(len(s["text"]) for s in transcript_data)
        word_count = sum(len(s["text"].split()) for s in transcript_data)
        r2_key = f"transcripts/{video_id}__{language}__{model}.json"
        rank = MODEL_QUALITY_RANK.get(model, 0)

        # Step 1: upload JSON to R2 (sync boto3 wrapped in thread)
        try:
            await asyncio.to_thread(
                r2_write_json, "indxr-transcripts", r2_key, transcript_data
            )
        except Exception as r2_err:
            logger.warning(f"master_cache R2 write failed ({video_id}): {r2_err}")
            return  # No point writing Supabase row without a valid R2 key

        # Step 2: upsert metadata row in Supabase
        from credit_manager import get_supabase_client
        supabase = get_supabase_client()

        row = {
            "video_id": video_id,
            "language": language,
            "transcription_model": model,
            "r2_key": r2_key,
            "source_method": source_method,
            "model_quality_rank": rank,
            "quality_score": quality_score,
            "duration_seconds": duration_seconds,
            "character_count": character_count,
            "word_count": word_count,
        }
        if title:
            row["title"] = title
        if channel:
            row["channel"] = channel

        if not force_refresh:
            await asyncio.to_thread(
                lambda: supabase.table("master_transcripts")
                .insert(row, returning="minimal")
                .execute()
            )
        else:
            await asyncio.to_thread(
                lambda: supabase.table("master_transcripts")
                .upsert(
                    {**row, "fetched_from_provider_at": "now()"},
                    on_conflict="video_id,language,transcription_model",
                    returning="minimal",
                )
                .execute()
            )

        logger.info(
            f"master_cache write OK: {video_id} lang={language} model={model} "
            f"chars={character_count} words={word_count}"
        )

    except Exception as e:
        logger.warning(f"master_cache write failed ({video_id}): {type(e).__name__}: {e}")


async def master_transcripts_read(
    video_id: str,
    source_method: str,
    language: Optional[str] = None,
) -> Optional[dict]:
    """
    Check the master_transcripts cache. Returns a dict on hit, None on miss or error.
    Never raises — all failures are treated as a cache miss.

    source_method='caption_extraction':
      Entries expire after CAPTION_REFRESH_DAYS (YouTube ASR improves over time).
      language='en' by default at call sites — non-English videos will miss and fall
      through to the yt-dlp cascade. Language-aware lookup is tracked in backlog:
      docs/wiki/roadmap/backlog.md → "Language-aware caption extraction".

    source_method='audio_transcription':
      No time-based expiry — AI transcripts are deterministic given the same model.
      Only hits if cached model_quality_rank >= current production model rank.
      language=None (default) — AssemblyAI detects the language; we don't know it
      upfront, so we skip the language filter and deliver the first matching entry.

    Return dict keys: transcript (list), duration_seconds (int|None),
                      language (str|None), transcription_model (str).
    """
    try:
        from credit_manager import get_supabase_client
        supabase = get_supabase_client()

        query = (
            supabase.table("master_transcripts")
            .select("r2_key,duration_seconds,language,transcription_model,title,channel")
            .eq("video_id", video_id)
            .eq("source_method", source_method)
            .is_("deprecated_at", "null")
            .order("model_quality_rank", desc=True)
            .limit(1)
        )

        if language is not None:
            query = query.eq("language", language)

        if source_method == "caption_extraction":
            cutoff = (
                datetime.now(timezone.utc) - timedelta(days=CAPTION_REFRESH_DAYS)
            ).isoformat()
            query = query.gt("fetched_from_provider_at", cutoff)
        else:
            min_rank = MODEL_QUALITY_RANK.get(CURRENT_PRODUCTION_AI_MODEL, 0)
            query = query.gte("model_quality_rank", min_rank)

        result = await asyncio.to_thread(query.execute)
        if not result.data:
            return None

        row = result.data[0]
        r2_data = await asyncio.to_thread(
            r2_read_json, "indxr-transcripts", row["r2_key"]
        )
        if r2_data is None:
            logger.warning(
                f"master_cache: R2 key exists in DB but missing in R2 "
                f"({row['r2_key']}) — treating as miss"
            )
            return None

        logger.info(
            f"master_cache read OK: {video_id} source={source_method} "
            f"lang={row.get('language')} model={row.get('transcription_model')}"
        )
        return {
            "transcript": r2_data,
            "duration_seconds": row.get("duration_seconds"),
            "language": row.get("language"),
            "transcription_model": row.get("transcription_model"),
            "title": row.get("title"),
            "channel": row.get("channel"),
        }

    except Exception as e:
        logger.warning(
            f"master_transcripts_read error ({video_id}): {type(e).__name__}: {e}"
        )
        return None

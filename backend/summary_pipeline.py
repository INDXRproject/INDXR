"""
AI-samenvatting — twee modelstappen + assemblage (ADR-090).

Vervangt de oude synchrone één-call-samenvatting (die om één alinea vroeg, geen max_tokens zette
en niets met de duur deed → 4u leverde evenveel op als 15min). Nieuw:

  Stap 1 (structuur)  — één call naar claude-sonnet-4-6 (EU-gateway) over het VOLLEDIGE, getimestampte
                        transcript → overkoepelende samenvatting + secties (kop + begin/eind-tijdstempel).
                        Sonnet bepaalt zelf de grenzen op onderwerpwisseling; onder-/bovengrens op het
                        aantal secties, geclampt in code.
  Stap 2 (uitwerking) — per sectie een aparte gemini-2.5-flash-call met ALLEEN het fragment tussen de
                        tijdstempels + kop + overkoepelende samenvatting als context. Opdracht = volledige
                        dekking van het fragment (elk argument/voorbeeld/cijfer/naam/tussenstap), lengte
                        ~1/3 van het fragment als RICHTING (niet als eis), korter bij dun materiaal.
                        Parallel maar begrensd (gateway rate-limit is per model per 60s).
  Stap 3 (assemblage) — in code, geen modelcall.

Draait als ARQ-achtergrondtaak (worker.run_summary_job). Fallback per call via de gateway
(`fallbacks` + `fallback_config`), zodat een mislukte sectiecall niet de hele run laat mislukken.
"""

import os
import re
import json
import math
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

import httpx

from credit_manager import (
    get_supabase_client,
    calculate_summary_cost,
    settle_credits,
    refund_credits,
)

logger = logging.getLogger("indxr-backend")

# EU-endpoint van de AssemblyAI LLM Gateway (OpenAI-compatibel, EU data-residency) — ADR-068.
LLM_GATEWAY_URL = "https://llm-gateway.eu.assemblyai.com/v1/chat/completions"
SUMMARY_REGION = "eu"

# Stap 1: structuur = redeneertaak over het volledige transcript → sterkste model.
STRUCTURE_MODEL = "claude-sonnet-4-6"
STRUCTURE_FALLBACK = "gemini-2.5-flash"
# Stap 2: uitwerking = veel goedkope, parallelle calls.
SECTION_MODEL = "gemini-2.5-flash"
SECTION_FALLBACK = "claude-haiku-4-5"

# Max gelijktijdige stap-2-calls (gateway rate-limit is per model per 60s).
SECTION_CONCURRENCY = int(os.getenv("SUMMARY_SECTION_CONCURRENCY", "4"))
GATEWAY_TIMEOUT_S = float(os.getenv("SUMMARY_GATEWAY_TIMEOUT_S", "120"))


# ── kleine helpers ────────────────────────────────────────────────────────────

def _word_count(text: str) -> int:
    return len((text or "").split())


def _clamp(v: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, v))


def section_bounds(duration_seconds: float) -> tuple:
    """Onder-/bovengrens op het aantal secties, afgeleid van de duur — zodat een korte video er
    geen twintig krijgt en een lange video niet ontspoort. Bovengrens schaalt met de duur maar is
    hard gecapt op 20."""
    duration_min = (duration_seconds or 0) / 60.0
    max_sections = _clamp(math.ceil(duration_min / 10.0), 3, 20)
    min_sections = min(2, max_sections)
    return min_sections, max_sections


def build_timestamped_transcript(transcript_data: List[Dict]) -> str:
    """Transcript voor STAP 1: elk segment geprefixt met zijn offset in seconden, zodat het model
    echte begin/eind-tijdstempels op onderwerpwisselingen kan kiezen."""
    lines = []
    for item in (transcript_data or []):
        text = (item.get("text") or "").strip()
        if not text:
            continue
        off = int(item.get("offset") or 0)
        lines.append(f"[{off}] {text}")
    return "\n".join(lines)


def extract_fragment(transcript_data: List[Dict], start_time: float, end_time: float) -> str:
    """Fragment voor STAP 2: ruwe tekst van de segmenten waarvan de offset in [start, end) valt.
    Laatste sectie (end_time == None/0) pakt alles vanaf start."""
    parts = []
    for item in (transcript_data or []):
        off = float(item.get("offset") or 0)
        if off < start_time:
            continue
        if end_time and off >= end_time:
            continue
        t = (item.get("text") or "").strip()
        if t:
            parts.append(t)
    return " ".join(parts)


def total_transcript_seconds(transcript_data: List[Dict]) -> int:
    if not transcript_data:
        return 0
    last = transcript_data[-1]
    return int(float(last.get("offset") or 0) + float(last.get("duration") or 0))


# ── prompts ───────────────────────────────────────────────────────────────────

def structure_system_prompt(min_sections: int, max_sections: int, total_seconds: int) -> str:
    return (
        "You are an expert at structuring long transcripts into a study outline. "
        "The transcript below is a spoken video; each line is prefixed with its start time in whole "
        f"seconds like [123]. The video runs from 0 to about {total_seconds} seconds.\n\n"
        "Produce:\n"
        "1. `overview`: a few short paragraphs summarising the whole video.\n"
        "2. `sections`: an ordered list that splits the video where the topic changes. For each "
        "section give a `heading`, a `start_time` and an `end_time` in whole seconds (taken from the "
        "[..] timestamps), covering the whole video with no gaps and no overlaps. The first section "
        "starts at 0 and the last ends at the final timestamp.\n\n"
        f"Use between {min_sections} and {max_sections} sections. Cut on genuine topic shifts — do not "
        "pad to reach the maximum, and do not force tiny sections. Return only the required JSON."
    )


SECTION_SYSTEM_PROMPT = (
    "You write thorough, worked-out study notes from a transcript fragment — like a diligent student "
    "who writes down everything, not a summariser who compresses.\n\n"
    "Your task is FULL COVERAGE of the fragment: every argument, example, number, name, definition and "
    "intermediate step that appears in the fragment must appear in your notes. Do not compress anything "
    "that is stated as a distinct point into a passing mention. Keep the concrete detail; drop only pure "
    "filler and verbal tics.\n\n"
    "As a rough guide, aim for roughly one third of the number of words in the fragment — but this is a "
    "direction, not a requirement: write SHORTER when the fragment carries little actual content (small "
    "talk, silence, repetition), and let the length follow the information density of the fragment rather "
    "than its duration. Do not invent, extrapolate, or pad to hit a length.\n\n"
    "Write clear prose and lists. Output only the notes for this section — no heading, no preamble."
)


# ── gateway ───────────────────────────────────────────────────────────────────

async def _gateway_call(client: httpx.AsyncClient, api_key: str, payload: Dict) -> Dict[str, Any]:
    """Eén OpenAI-compatibele call naar de EU-gateway. Retourneert content + genormaliseerde usage
    + request_id + het model dat de respons leverde. Raise op non-200 (na gateway-fallbacks)."""
    headers = {"authorization": api_key, "Content-Type": "application/json"}
    resp = await client.post(LLM_GATEWAY_URL, headers=headers, json=payload)
    if resp.status_code != 200:
        raise RuntimeError(f"LLM Gateway {payload.get('model')} -> {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    usage = data.get("usage") or {}
    return {
        "content": content,
        # De gateway-usage gebruikt input_tokens/output_tokens; oudere OpenAI-compat gaf
        # prompt_tokens/completion_tokens. Beide defensief lezen.
        "prompt_tokens": int(usage.get("input_tokens") or usage.get("prompt_tokens") or 0),
        "completion_tokens": int(usage.get("output_tokens") or usage.get("completion_tokens") or 0),
        "request_id": data.get("request_id") or data.get("id"),
        "model": data.get("model") or payload.get("model"),
    }


def _strip_json_fences(content: str) -> str:
    s = (content or "").strip()
    if s.startswith("```"):
        s = s[3:]
        if s[:4].lower() == "json":
            s = s[4:]
        if s.rstrip().endswith("```"):
            s = s.rstrip()[:-3]
    return s.strip()


def _log_usage(supabase, transcript_id: str, user_id: str, generated_at: str, call: Dict) -> None:
    """Per-call kostenlog (ai_summary_usage_log) — de gezaghebbende AI-summary COR-bron. Eén rij
    per gateway-call, met request_id/model/region/tijdstempel. Non-fataal: nooit de summary laten
    falen op een kostenboeking."""
    try:
        supabase.table("ai_summary_usage_log").insert({
            "transcript_id": transcript_id,
            "user_id": user_id,
            "generated_at": generated_at,
            "model": call.get("model"),
            "prompt_tokens": call.get("prompt_tokens") or 0,
            "completion_tokens": call.get("completion_tokens") or 0,
            "cache_hit_tokens": 0,  # gateway Gemini/Claude-modellen hebben geen prompt-cache-tier
            "request_id": call.get("request_id"),
            "region": SUMMARY_REGION,
        }).execute()
    except Exception as e:
        logger.warning(f"ai_summary_usage_log insert failed for {transcript_id}: {e}")


# ── de pipeline ──────────────────────────────────────────────────────────────

async def _run_structure(client, api_key, transcript_data, min_sections, max_sections) -> Dict:
    total_seconds = total_transcript_seconds(transcript_data)
    ts_transcript = build_timestamped_transcript(transcript_data)
    schema = {
        "type": "object",
        "properties": {
            "overview": {"type": "string"},
            "sections": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "heading": {"type": "string"},
                        "start_time": {"type": "integer"},
                        "end_time": {"type": "integer"},
                    },
                    "required": ["heading", "start_time", "end_time"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["overview", "sections"],
        "additionalProperties": False,
    }
    payload = {
        "model": STRUCTURE_MODEL,
        "messages": [
            {"role": "system", "content": structure_system_prompt(min_sections, max_sections, total_seconds)},
            {"role": "user", "content": f"Transcript:\n{ts_transcript}"},
        ],
        "max_tokens": min(8000, 800 + max_sections * 300),
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "summary_structure", "schema": schema, "strict": True},
        },
        "fallbacks": [{"model": STRUCTURE_FALLBACK}],
        "fallback_config": {"retry": True, "depth": 1},
    }
    call = await _gateway_call(client, api_key, payload)
    structured = json.loads(_strip_json_fences(call["content"]))
    return {"structured": structured, "call": call, "total_seconds": total_seconds}


def _normalize_sections(sections: List[Dict], min_sections: int, max_sections: int, total_seconds: int) -> List[Dict]:
    """Clamp + opschonen: sorteer op start_time, cap op max_sections (merge de staart), zorg dat
    end_time > start_time en dat de secties het transcript dekken. Ondergrens wordt niet geforceerd
    door op te splitsen (dat zou verzinnen zijn) — alleen gelogd."""
    clean = []
    for s in (sections or []):
        try:
            st = int(s.get("start_time") or 0)
            en = int(s.get("end_time") or 0)
        except (TypeError, ValueError):
            continue
        head = (s.get("heading") or "").strip() or "Section"
        clean.append({"heading": head, "start_time": max(0, st), "end_time": en})
    clean.sort(key=lambda x: x["start_time"])

    if not clean:
        # Geen bruikbare structuur → één sectie over het geheel (stap 2 dekt alsnog alles).
        return [{"heading": "Full video", "start_time": 0, "end_time": total_seconds or 0}]

    # Cap op max_sections: merge de overtollige staart in de laatste behouden sectie.
    if len(clean) > max_sections:
        logger.info(f"[summary] {len(clean)} secties -> clamp naar {max_sections}")
        kept = clean[:max_sections]
        kept[-1]["end_time"] = clean[-1]["end_time"]
        clean = kept
    if len(clean) < min_sections:
        logger.info(f"[summary] {len(clean)} secties (< ondergrens {min_sections}); niet opgesplitst (geen opvulling)")

    # Dekking sluitend maken: eerste start 0, opeenvolgende end==volgende start, laatste end==totaal.
    clean[0]["start_time"] = 0
    for i in range(len(clean) - 1):
        nxt = clean[i + 1]["start_time"]
        if clean[i]["end_time"] <= clean[i]["start_time"] or clean[i]["end_time"] > nxt:
            clean[i]["end_time"] = nxt
    last_end = total_seconds or clean[-1]["end_time"]
    clean[-1]["end_time"] = max(last_end, clean[-1]["start_time"] + 1)
    return clean


async def _run_section(client, api_key, sem, section, overview, transcript_data) -> Dict:
    """Eén stap-2-call. Faalt de call (ook ná gateway-fallback), dan krijgt de sectie een nette
    fallback-inhoud i.p.v. de hele run te laten mislukken."""
    fragment = extract_fragment(transcript_data, section["start_time"], section["end_time"])
    frag_words = _word_count(fragment)
    result = {"heading": section["heading"], "start_time": section["start_time"],
              "end_time": section["end_time"], "content": "", "call": None}
    if not fragment.strip():
        result["content"] = ""
        return result
    payload = {
        "model": SECTION_MODEL,
        "messages": [
            {"role": "system", "content": SECTION_SYSTEM_PROMPT},
            {"role": "user", "content": (
                f"Overall video summary (context):\n{overview}\n\n"
                f"Section heading: {section['heading']}\n\n"
                f"Transcript fragment for this section:\n{fragment}"
            )},
        ],
        # max_tokens is ALLEEN een ruim vangnet (stuurt niets); hoog genoeg om nooit af te kappen.
        "max_tokens": _clamp(round(frag_words * 2), 1024, 8000),
        "fallbacks": [{"model": SECTION_FALLBACK}],
        "fallback_config": {"retry": True, "depth": 1},
    }
    async with sem:
        try:
            call = await _gateway_call(client, api_key, payload)
            result["content"] = (call["content"] or "").strip()
            result["call"] = call
        except Exception as e:
            logger.warning(f"[summary] sectie '{section['heading']}' faalde (run gaat door): {e}")
            result["content"] = ""
    return result


async def run_summary(transcript_id: str, user_id: str, supabase=None) -> Dict:
    """Kern: bouwt de nieuwe ai_summary (schema_version 2). Raise bij een harde fout (fetch leeg,
    structuur-call faalt, geen API-key) zodat de caller kan refunden. Schrijft per gateway-call een
    rij in ai_summary_usage_log. Retourneert het ai_summary-dict (nog NIET weggeschreven)."""
    supabase = supabase or get_supabase_client()

    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        raise RuntimeError("LLM Gateway API key not configured")

    row = supabase.table("transcripts").select("transcript,duration").eq("id", transcript_id).single().execute()
    if not row.data or "transcript" not in row.data:
        raise RuntimeError("Transcript not found or empty")
    transcript_data = row.data["transcript"] or []
    duration = row.data.get("duration") or total_transcript_seconds(transcript_data)
    if not any((item.get("text") or "").strip() for item in transcript_data):
        raise RuntimeError("Transcript is empty")

    min_sections, max_sections = section_bounds(duration)
    generated_at = datetime.now(timezone.utc).isoformat()

    async with httpx.AsyncClient(timeout=GATEWAY_TIMEOUT_S) as client:
        # Stap 1 — structuur.
        struct = await _run_structure(client, api_key, transcript_data, min_sections, max_sections)
        _log_usage(supabase, transcript_id, user_id, generated_at, struct["call"])
        overview = (struct["structured"].get("overview") or "").strip()
        sections = _normalize_sections(
            struct["structured"].get("sections") or [], min_sections, max_sections, struct["total_seconds"]
        )

        # Stap 2 — uitwerking, parallel maar begrensd.
        sem = asyncio.Semaphore(SECTION_CONCURRENCY)
        section_results = await asyncio.gather(*[
            _run_section(client, api_key, sem, s, overview, transcript_data) for s in sections
        ])

    # Log stap-2-usage.
    for r in section_results:
        if r.get("call"):
            _log_usage(supabase, transcript_id, user_id, generated_at, r["call"])

    # Stap 3 — assemblage (geen modelcall).
    ai_summary = {
        "schema_version": 2,
        "overview": overview,
        "sections": [
            {"heading": r["heading"], "start_time": r["start_time"],
             "end_time": r["end_time"], "content": r["content"]}
            for r in section_results
        ],
        "generated_at": generated_at,
        "edited": False,
    }
    return ai_summary


def _update_summary_job(supabase, job_id: str, **cols) -> None:
    try:
        supabase.table("transcription_jobs").update(cols).eq("id", job_id).execute()
    except Exception as e:
        logger.warning(f"[summary] transcription_jobs update failed for {job_id}: {e}")


async def run_summary_reservation_aware(
    job_id: str,
    user_id: str,
    transcript_id: str,
    heartbeat_fn=None,
    supabase=None,
) -> None:
    """Worker-entry: draait de summary-pipeline op een gereserveerde transcription_jobs-rij
    (source_kind='ai_summary'). Bij succes: schrijf ai_summary + settle (product_type='ai_summary')
    + status 'complete'. Bij ELK faalpad: volledige teruggave via refund_credits(job_id) + status
    'error'. Idempotent: al-terminale job overslaan."""
    supabase = supabase or get_supabase_client()

    # Idempotency + reservering ophalen.
    try:
        jr = supabase.table("transcription_jobs").select(
            "status,credits_reserved"
        ).eq("id", job_id).single().execute()
    except Exception as e:
        logger.error(f"[summary] kon jobrij {job_id} niet lezen: {e}")
        return
    if not jr.data:
        logger.warning(f"[summary] jobrij {job_id} bestaat niet — skip")
        return
    if jr.data.get("status") in ("complete", "error"):
        logger.info(f"[summary] job {job_id} al terminaal ({jr.data.get('status')}) — skip")
        return
    reserved = int(jr.data.get("credits_reserved") or 0)

    _update_summary_job(supabase, job_id, status="summarizing",
                        started_at=datetime.now(timezone.utc).isoformat(),
                        last_heartbeat_at=datetime.now(timezone.utc).isoformat())

    # Heartbeat-loop tijdens de (mogelijk trage) gateway-calls, zodat stale-detectie een legitiem
    # lange summary-job niet als 'interrupted' markeert. heartbeat_fn is async.
    hb_task = None
    if heartbeat_fn:
        async def _beat():
            while True:
                await asyncio.sleep(60)
                try:
                    await heartbeat_fn()
                except Exception:
                    pass
        hb_task = asyncio.create_task(_beat())

    try:
        ai_summary = await run_summary(transcript_id, user_id, supabase=supabase)
    except Exception as e:
        logger.error(f"[summary] job {job_id} faalde: {type(e).__name__}: {e}")
        refund_credits(job_id=job_id)  # volledige teruggave (consumed==0)
        _update_summary_job(
            supabase, job_id, status="error", error_type=type(e).__name__,
            error_message=str(e)[:500], credits_refunded=True,
            completed_at=datetime.now(timezone.utc).isoformat(),
        )
        return
    finally:
        if hb_task:
            hb_task.cancel()

    # Succes: schrijf de samenvatting.
    try:
        upd = supabase.table("transcripts").update({"ai_summary": ai_summary}).eq("id", transcript_id).execute()
        if not upd.data:
            logger.warning(f"[summary] transcript-update niet bevestigd voor {transcript_id}")
    except Exception as e:
        logger.error(f"[summary] wegschrijven ai_summary faalde voor {transcript_id}: {e}")
        refund_credits(job_id=job_id)
        _update_summary_job(
            supabase, job_id, status="error", error_type="SummaryWriteFailed",
            error_message=str(e)[:500], credits_refunded=True,
            completed_at=datetime.now(timezone.utc).isoformat(),
        )
        return

    # Afrekening: settle het gereserveerde bedrag, gestempeld als ai_summary (balans-neutraal;
    # markeert consumed==reserved). Dan refund_credits(job_id): reserved−consumed = 0 → geen
    # saldo-mutatie maar schrijft de (job_id,'refund')-marker, zodat de watchdog-reconciliatie
    # (Pass 2c, anti-join op ontbrekende refund-rij) de voltooide job uitsluit. Exact het
    # whisper-patroon (settle + refund-remainder, refund op succes én falen).
    if reserved > 0:
        settle_credits(user_id=user_id, amount=reserved, job_id=job_id,
                       reason="AI Summarization", product_type="ai_summary")
    refund_credits(job_id=job_id)

    _update_summary_job(
        supabase, job_id, status="complete", credits_deducted=True,
        completed_at=datetime.now(timezone.utc).isoformat(),
    )
    logger.info(f"[summary] job {job_id} voltooid ({reserved} credits) voor transcript {transcript_id}")

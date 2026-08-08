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
import statistics
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

# Stap 1: structuur. Gemmeten (ADR-090-addendum): gemini-2.5-flash haalt dezelfde volledige dekking met
# vergelijkbare hoofdstukgrenzen als sonnet-4-6 tegen ~1/5 van de kost → gemini primair, sonnet fallback.
STRUCTURE_MODEL = "gemini-2.5-flash"
STRUCTURE_FALLBACK = "claude-sonnet-4-6"
# Stap 2: uitwerking = veel goedkope, parallelle calls. NB: de gateway weigert de kale alias
# "claude-haiku-4-5" (400 "model not found"); alleen de gedateerde id werkt.
SECTION_MODEL = "gemini-2.5-flash"
SECTION_FALLBACK = "claude-haiku-4-5-20251001"

# Max gelijktijdige stap-2-calls (gateway rate-limit is per model per 60s).
SECTION_CONCURRENCY = int(os.getenv("SUMMARY_SECTION_CONCURRENCY", "4"))
GATEWAY_TIMEOUT_S = float(os.getenv("SUMMARY_GATEWAY_TIMEOUT_S", "120"))


# ── kleine helpers ────────────────────────────────────────────────────────────

def _word_count(text: str) -> int:
    return len((text or "").split())


def _clamp(v: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, v))


# Bovengrens op het aantal hoofdstukken. Boven ~SECTION_CAP*SECTION_MINUTES minuten (40*8 = 320min ≈
# 5u20m) verschuift het plateau: de hoofdstukken worden dan langer i.p.v. talrijker (de per-hoofdstuk-
# uitwerking blijft meeschalen met de gesproken inhoud). Bovengrens bestaat bewust om kosten en de
# per-model-per-60s gateway-rate-limit te begrenzen (ADR-090-addendum).
SECTION_CAP = int(os.getenv("SUMMARY_SECTION_CAP", "40"))
SECTION_MINUTES = 8.0  # ~1 hoofdstuk per 8 minuten gesproken inhoud


def section_bounds(duration_seconds: float) -> tuple:
    """Onder-/bovengrens op het aantal hoofdstukken, afgeleid van de duur — zodat een korte video er
    geen twintig krijgt en een lange video MEEGROEIT (i.p.v. hard cappen op 20). Boven de cap worden
    fragmenten langer i.p.v. talrijker; het plateau ligt dan bij ~SECTION_CAP*SECTION_MINUTES min."""
    duration_min = (duration_seconds or 0) / 60.0
    max_sections = _clamp(math.ceil(duration_min / SECTION_MINUTES), 3, SECTION_CAP)
    min_sections = min(2, max_sections)
    return min_sections, max_sections


def _token_overlap(a: str, b: str) -> float:
    """Jaccard-overlap van woord-sets — voor de 'eerste regel ≈ kop'-detectie."""
    sa, sb = set(a.split()), set(b.split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _norm_heading(s: str) -> str:
    """Normaliseer voor vergelijking: strip markdown-tekens + leestekens, lowercase."""
    s = re.sub(r"[#*_`>~]", "", s or "")
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip().lower()


# Meta-openingszin die naar de opdracht/het fragment verwijst i.p.v. naar de inhoud.
_META_OPENING = re.compile(
    r"^\s*(here (are|is)|the following|below (are|is)|these are|in this (section|part|fragment)"
    r"|detailed notes|notes (from|on)|this (fragment|section) (covers|contains)|the (fragment|transcript))\b",
    re.IGNORECASE,
)


def _clean_section_content(content: str, heading: str):
    """Lichte opschoning (ADR-090-kwaliteitsronde): verwijder (a) een eerste regel die (vrijwel)
    gelijk is aan de kop — die staat al elders — en (b) een openingszin die naar het fragment/de
    opdracht verwijst i.p.v. naar de inhoud. Retourneert (cleaned, fired: list[str]) zodat de E2E
    kan rapporteren of de code-cleanup nog iets moest weghalen (prompt vs code)."""
    fired = []
    lines = (content or "").split("\n")
    norm_head = _norm_heading(heading)

    def first_nonempty(ls):
        for i, ln in enumerate(ls):
            if ln.strip():
                return i
        return -1

    # Maximaal twee leidende regels weghalen (kop-duplicaat + preambule, in willekeurige volgorde).
    for _ in range(2):
        idx = first_nonempty(lines)
        if idx < 0:
            break
        line = lines[idx].strip()
        norm_line = _norm_heading(line)
        reason = None
        if norm_head and (norm_line == norm_head or _token_overlap(norm_line, norm_head) >= 0.8):
            reason = "heading_dup"
        elif _META_OPENING.match(line) and (
            line.rstrip().endswith(":")
            or re.search(r"\b(fragment|transcript|notes|section)\b", line, re.IGNORECASE)
        ):
            reason = "preamble"
        if not reason:
            break
        fired.append(reason)
        del lines[idx]
        while idx < len(lines) and not lines[idx].strip():
            del lines[idx]  # opvolgende lege regels ook weg
    return "\n".join(lines).strip(), fired


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
        "section give a `heading`, a one-sentence `description` of what that section actually covers, "
        "and a `start_time` and `end_time` in whole seconds (taken from the [..] timestamps). The "
        "sections must cover the WHOLE video with no gaps and no overlaps: the first section starts at "
        f"0 and the last section's `end_time` is the final timestamp (~{total_seconds}s). Never stop "
        "early — every part of the video, including the final minutes, must belong to a section.\n\n"
        f"Use between {min_sections} and {max_sections} sections. Cut on genuine topic shifts — do not "
        "pad to reach the maximum, and do not force tiny sections. Return only the required JSON."
    )


SECTION_SYSTEM_PROMPT = (
    "You write thorough, worked-out study notes from a transcript fragment — like a diligent student "
    "who writes down everything, not a summariser who compresses.\n\n"
    "You are given a TOPIC (a heading and a one-sentence description) and a transcript fragment. Cover "
    "ONLY what falls under this topic. If the fragment contains content that clearly belongs to a "
    "different topic — spillover from the previous section, or a lead-in to the next — skip it.\n\n"
    "FULL COVERAGE within the topic: every argument, example, number, name, definition and intermediate "
    "step that appears and belongs to the topic must appear in your notes. Do not compress a distinct "
    "point into a passing mention. Keep the concrete detail; drop only pure filler and verbal tics.\n\n"
    "As a rough guide, aim for roughly one third of the fragment's word count — a direction, not a "
    "requirement: write SHORTER when the fragment carries little real content (small talk, silence, "
    "repetition), and let length follow the information density of the fragment, never the clock. Do "
    "not invent, extrapolate, or pad to hit a length.\n\n"
    "Write the notes in Markdown (paragraphs, **bold**, *italic*, and -/1. lists where useful). Begin "
    "DIRECTLY with the content: do NOT restate the heading (it is shown separately) and do NOT open "
    "with meta sentences like 'Here are the notes…' or references to 'the fragment'/'the transcript'.\n\n"
    "Return JSON with exactly two fields:\n"
    "- `heading`: the given heading, UNLESS the fragment's actual content is clearly about something "
    "different — then give a corrected heading. Otherwise return the given heading unchanged.\n"
    "- `content`: the Markdown notes."
)


_SECTION_SCHEMA = {
    "type": "object",
    "properties": {"heading": {"type": "string"}, "content": {"type": "string"}},
    "required": ["heading", "content"],
    "additionalProperties": False,
}


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
                        "description": {"type": "string"},
                        "start_time": {"type": "integer"},
                        "end_time": {"type": "integer"},
                    },
                    "required": ["heading", "description", "start_time", "end_time"],
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
        # Ruimer: meer secties + een description per sectie moeten in de structuur-JSON passen.
        "max_tokens": min(16000, 1500 + max_sections * 400),
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


def _merged_coverage_seconds(sections: List[Dict]) -> int:
    """Som van de gedekte tijd (samengevoegde, niet-overlappende intervallen) van de RUWE stap-1-secties."""
    ivals = sorted(((s["start_time"], s["end_time"]) for s in sections if s["end_time"] > s["start_time"]))
    covered, cur_s, cur_e = 0, None, None
    for st, en in ivals:
        if cur_e is None:
            cur_s, cur_e = st, en
        elif st <= cur_e:
            cur_e = max(cur_e, en)
        else:
            covered += cur_e - cur_s
            cur_s, cur_e = st, en
    if cur_e is not None:
        covered += cur_e - cur_s
    return covered


def _normalize_sections(sections: List[Dict], min_sections: int, max_sections: int, total_seconds: int):
    """Clamp + opschonen + DEKKINGSVALIDATIE (§3b, ADR-090-kwaliteitsronde). Sorteert op start_time,
    capt op max_sections, en zorgt dat de hoofdstukken de VOLLEDIGE video dekken: geen gat van
    betekenis tussen hoofdstukken, geen overlap, en een laatste `end_time` bij de videoduur. Elke
    correctie wordt gelogd. Retourneert (sections, coverage_stats) — de stats gaan naar de E2E zodat
    het percentage gedekte duur + het aantal correcties controleerbaar is. Een stil weggevallen
    laatste deel is een ernstiger fout dan een preambule."""
    clean = []
    for s in (sections or []):
        try:
            st = int(s.get("start_time") or 0)
            en = int(s.get("end_time") or 0)
        except (TypeError, ValueError):
            continue
        clean.append({
            "heading": (s.get("heading") or "").strip() or "Section",
            "description": (s.get("description") or "").strip(),
            "start_time": max(0, st), "end_time": en,
        })
    clean.sort(key=lambda x: x["start_time"])

    total = total_seconds or (clean[-1]["end_time"] if clean else 0)
    stats = {"raw_covered_pct": 0.0, "gaps_fixed": 0, "overlaps_fixed": 0, "end_stretched_s": 0}

    if not clean:
        return [{"heading": "Full video", "description": "", "start_time": 0, "end_time": total or 0}], stats

    # Cap op max_sections: merge de overtollige staart in de laatste behouden sectie.
    if len(clean) > max_sections:
        logger.info(f"[summary] {len(clean)} secties -> clamp naar {max_sections}")
        kept = clean[:max_sections]
        kept[-1]["end_time"] = clean[-1]["end_time"]
        clean = kept
    if len(clean) < min_sections:
        logger.info(f"[summary] {len(clean)} secties (< ondergrens {min_sections}); niet opgesplitst (geen opvulling)")

    # Ruwe stap-1-dekking (vóór correctie) — hoeveel % van de duur dekte stap 1 echt?
    stats["raw_covered_pct"] = round(100.0 * _merged_coverage_seconds(clean) / total, 1) if total else 0.0

    # Drempel voor een gat/te-vroeg-einde "van betekenis": max(60s, 2% van de duur).
    thresh = max(60, int(0.02 * total))

    # Eerste hoofdstuk begint bij 0.
    if clean[0]["start_time"] > 0:
        clean[0]["start_time"] = 0

    # Gaten + overlap tussen opeenvolgende hoofdstukken sluiten (end[i] == start[i+1]).
    for i in range(len(clean) - 1):
        nxt = clean[i + 1]["start_time"]
        cur_end = clean[i]["end_time"]
        if cur_end < nxt - thresh:
            logger.info(f"[summary] dekking: gat {nxt - cur_end}s na sectie {i} ('{clean[i]['heading']}') — opgerekt")
            stats["gaps_fixed"] += 1
        elif cur_end > nxt:
            stats["overlaps_fixed"] += 1
        if cur_end != nxt:
            clean[i]["end_time"] = nxt
        if clean[i]["end_time"] <= clean[i]["start_time"]:
            clean[i]["end_time"] = clean[i]["start_time"] + 1

    # Laatste hoofdstuk moet tot (ongeveer) de videoduur lopen — nooit stil vroeg stoppen.
    last = clean[-1]
    if total and total - last["end_time"] > thresh:
        logger.info(f"[summary] dekking: laatste sectie eindigt op {last['end_time']}s van {total}s "
                    f"({total - last['end_time']}s ongedekt) — opgerekt naar de volle duur")
        stats["end_stretched_s"] = total - last["end_time"]
    last["end_time"] = max(total or last["end_time"], last["start_time"] + 1)

    return clean, stats


async def _run_section(client, api_key, sem, section, overview, transcript_data) -> Dict:
    """Eén stap-2-call (structured JSON {heading, content}). Robuust: (1) een onparseerbare JSON valt
    terug op de ruwe tekst + de stap-1-kop (één kapotte sectie mag nooit een run van 30 laten falen),
    (2) een gefaalde call (ook ná gateway-fallback) geeft lege inhoud i.p.v. de run te laten mislukken.
    Past daarna de lichte cleanup toe en gebruikt de (eventueel gecorrigeerde) kop."""
    fragment = extract_fragment(transcript_data, section["start_time"], section["end_time"])
    frag_words = _word_count(fragment)
    step1_heading = section["heading"]
    result = {"heading": step1_heading, "start_time": section["start_time"],
              "end_time": section["end_time"], "content": "", "call": None,
              "json_fallback": False, "cleanup": []}
    if not fragment.strip():
        return result

    scope = f"Topic heading: {step1_heading}\nTopic description: {section.get('description', '')}".strip()
    payload = {
        "model": SECTION_MODEL,
        "messages": [
            {"role": "system", "content": SECTION_SYSTEM_PROMPT},
            {"role": "user", "content": (
                f"{scope}\n\n"
                f"Overall video summary (context):\n{overview}\n\n"
                f"Transcript fragment for this topic:\n{fragment}"
            )},
        ],
        # max_tokens is ALLEEN een ruim vangnet (stuurt niets); hoog genoeg om nooit af te kappen.
        "max_tokens": _clamp(round(frag_words * 2), 1024, 8000),
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "section_notes", "schema": _SECTION_SCHEMA, "strict": True},
        },
        "fallbacks": [{"model": SECTION_FALLBACK}],
        "fallback_config": {"retry": True, "depth": 1},
    }
    async with sem:
        try:
            call = await _gateway_call(client, api_key, payload)
            result["call"] = call
            raw = call["content"] or ""
            try:
                parsed = json.loads(_strip_json_fences(raw))
                heading = (parsed.get("heading") or "").strip() or step1_heading
                content = (parsed.get("content") or "").strip()
            except (json.JSONDecodeError, AttributeError):
                # Onparseerbare JSON — val terug op de ruwe tekst + de stap-1-kop (run gaat door).
                logger.warning(f"[summary] sectie '{step1_heading}': JSON onparseerbaar -> ruwe-tekst-terugval")
                result["json_fallback"] = True
                heading = step1_heading
                content = raw.strip()
            content, fired = _clean_section_content(content, heading)
            result["heading"] = heading
            result["content"] = content
            result["cleanup"] = fired
        except Exception as e:
            logger.warning(f"[summary] sectie '{step1_heading}' faalde (run gaat door): {e}")
    return result


def _plan_section_fragments(sections: List[Dict]):
    """Splitsings-plan (ADR-090-addendum 2). Beide modellen produceren af en toe een hoofdstuk dat veel
    langer is dan zijn buren (Gemini via een gevouwen gat, Sonnet via onder-segmentatie); dat hoofdstuk
    zou anders één stap-2-call over soms 17+ minuten krijgen → verdunde uitwerking. Bepaal de MEDIANE
    hoofdstukduur van deze run; een hoofdstuk > 2× die mediaan wordt in gelijke delen < mediaan gehakt.
    De ZICHTBARE hoofdstukindeling verandert niet — alleen de verwerking (elk deel een eigen call, daarna
    samengevoegd onder dezelfde kop). Retourneert (plan, n_splits); plan = [{section, parts:[(a,b),...]}]."""
    durs = [s["end_time"] - s["start_time"] for s in sections if s["end_time"] > s["start_time"]]
    if not durs:
        return [{"section": s, "parts": [(s["start_time"], s["end_time"])]} for s in sections], 0
    med = statistics.median(durs)
    plan, n_splits = [], 0
    for s in sections:
        dur = s["end_time"] - s["start_time"]
        if med > 0 and dur > 2 * med:
            k = max(2, int(dur // med) + 1)  # gelijke delen, elk < mediaan
            step = dur / k
            parts = [
                (int(s["start_time"] + i * step),
                 (int(s["start_time"] + (i + 1) * step) if i < k - 1 else s["end_time"]))
                for i in range(k)
            ]
            plan.append({"section": s, "parts": parts})
            n_splits += 1
            logger.info(f"[summary] hoofdstuk '{s['heading']}' ({dur}s = {round(dur/med, 1)}× mediaan {int(med)}s) "
                        f"gesplitst in {k} delen voor stap 2")
        else:
            plan.append({"section": s, "parts": [(s["start_time"], s["end_time"])]})
    return plan, n_splits


def _merge_parts(section: Dict, part_results: List[Dict]) -> Dict:
    """Voeg de deel-uitkomsten van een gesplitst hoofdstuk samen onder dezelfde (stap-1-)kop. Vermijdt
    dat opeenvolgende delen met dezelfde inleidende zin beginnen."""
    merged, prev_first = [], None
    for r in part_results:
        c = (r.get("content") or "").strip()
        if not c:
            continue
        lines = c.split("\n")
        idx = next((i for i, ln in enumerate(lines) if ln.strip()), -1)
        first = lines[idx].strip() if idx >= 0 else ""
        if merged and first and first == prev_first and idx >= 0:
            del lines[idx]
            c = "\n".join(lines).strip()
        prev_first = first
        if c:
            merged.append(c)
    return {
        "heading": section["heading"], "start_time": section["start_time"], "end_time": section["end_time"],
        "content": "\n\n".join(merged), "call": None,
        "calls": [r["call"] for r in part_results if r.get("call")],
        "json_fallback": any(r.get("json_fallback") for r in part_results),
        "cleanup": [x for r in part_results for x in (r.get("cleanup") or [])],
    }


async def _run_step2(client, api_key, sections: List[Dict], overview: str, transcript_data: List[Dict],
                     debug: dict = None) -> List[Dict]:
    """Stap 2 met splitsing van te grote hoofdstukken (ADR-090-addendum 2). Gedeeld door run_summary
    (productie) én het meetscript zodat er geen divergentie ontstaat. Elk resultaat draagt een `calls`-
    lijst (één call bij een ongesplitst hoofdstuk, meerdere bij een gesplitst) voor de kostenlog."""
    plan, n_splits = _plan_section_fragments(sections)
    if debug is not None:
        debug["splits_fired"] = n_splits
    sem = asyncio.Semaphore(SECTION_CONCURRENCY)

    async def _run_chapter(entry):
        s, parts = entry["section"], entry["parts"]
        if len(parts) == 1:
            r = await _run_section(client, api_key, sem, s, overview, transcript_data)
            r["calls"] = [r["call"]] if r.get("call") else []
            return r
        # Gesplitst: elk deel dezelfde kop+omschrijving als bindende afbakening, eigen [start,end].
        part_sections = [{**s, "start_time": a, "end_time": b} for (a, b) in parts]
        prs = await asyncio.gather(*[
            _run_section(client, api_key, sem, ps, overview, transcript_data) for ps in part_sections
        ])
        return _merge_parts(s, prs)

    return await asyncio.gather(*[_run_chapter(e) for e in plan])


async def run_summary(transcript_id: str, user_id: str, supabase=None, debug: dict = None) -> Dict:
    """Kern: bouwt de nieuwe ai_summary (schema_version 2). Raise bij een harde fout (fetch leeg,
    structuur-call faalt, geen API-key) zodat de caller kan refunden. Schrijft per gateway-call een
    rij in ai_summary_usage_log. Retourneert het ai_summary-dict (nog NIET weggeschreven).

    `debug`: optionele dict — indien meegegeven vult run_summary hem met dekkings-stats + de cleanup-/
    JSON-fallback-tellers (de E2E leest dit; de worker geeft niets mee)."""
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
        sections, coverage = _normalize_sections(
            struct["structured"].get("sections") or [], min_sections, max_sections, struct["total_seconds"]
        )

        # Stap 2 — uitwerking, parallel maar begrensd, mét splitsing van te grote hoofdstukken.
        section_results = await _run_step2(client, api_key, sections, overview, transcript_data, debug=debug)

    # Log stap-2-usage (per gesplitst hoofdstuk kunnen dit meerdere calls zijn).
    for r in section_results:
        for c in r.get("calls", []):
            _log_usage(supabase, transcript_id, user_id, generated_at, c)

    # Debug-stats voor de E2E (dekking + kwaliteits-tellers). Worker geeft geen debug mee.
    if debug is not None:
        debug["coverage"] = coverage
        debug["sections"] = len(sections)
        debug["cleanup_fired"] = sum(1 for r in section_results if r.get("cleanup"))
        debug["json_fallback_fired"] = sum(1 for r in section_results if r.get("json_fallback"))

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

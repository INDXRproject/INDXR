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

# Expliciet denkbudget voor stap 2 (ADR-090-truncatiefix). De sectietaak is BEGRENSDE extractie
# (lees een fragment, schrijf de notities die zijn punten dekken), geen open redeneren — 2048 denk-
# tokens is ruim genoeg om de notitiestructuur te plannen, terwijl het het anders ONBEGRENSDE default-
# denken aftopt dat (Google AI Developers Forum) bijdraagt aan de voortijdige-stop-bug en dat het
# gedeelde output-budget opeet. Geverifieerd tegen de gateway: `extra_body.google.thinking_config
# .thinking_budget` werkt en verlaagt reasoning_tokens (`reasoning_effort`/`thinking_level` geeft 400).
SECTION_THINKING_BUDGET = int(os.getenv("SUMMARY_SECTION_THINKING_BUDGET", "2048"))

# Model-onafhankelijk vangnet (ADR-090): een sectie geldt als AFGEKAPT (dus de call is mislukt, wat het
# model ook teruggaf) als de inhoud niet op een zin-afsluitend teken eindigt, óf onredelijk kort is
# t.o.v. het fragment. Bij afkapping: opnieuw (zelfde model), dan het fallback-model voor die ene sectie.
SECTION_MIN_RATIO = float(os.getenv("SUMMARY_SECTION_MIN_RATIO", "0.04"))  # min inhoud/fragment
SECTION_RATIO_MIN_FRAG = int(os.getenv("SUMMARY_SECTION_RATIO_MIN_FRAG", "150"))  # ratio pas boven dit fragment
_SENTENCE_END_RE = re.compile(r"[.!?)\]\"'’”»]\s*$")

# ── Harde onderbreker per taak (ADR-098) ────────────────────────────────────────
# Stopt een run i.p.v. een afgekapte/pathologisch-dure samenvatting te leveren; volledige teruggave.
# Onderbouwing (over de bestaande taken gemeten, 2026-08-24, EU-tarief 0,33/2,75):
#   - herstel-aandeel is 0% op ál het verkeer → een cap op 50% vangt systematisch modelfalen (elke sectie
#     herstelt) zonder ooit op gezond verkeer te vuren;
#   - kost/minuut ligt tussen €0,0006 en €0,0030; €0,02/min is ~7× de waargenomen piek → zelf-schalend,
#     straft geen lange video's, en tript alleen bij een echte per-eenheid-explosie;
#   - de duurste légale generatie is €0,42 (4,2u-video); de absolute backstop €1,50 (~3,5×) vangt een
#     runaway op willekeurige lengte plus absurd lange input, zonder een geldige lange samenvatting te weigeren.
# Een vaste absolute cap rond €0,50 zou een legitieme 5u+-video onterecht onderbreken — vandaar de
# per-minuut-normalisatie als primaire kostengrens en €1,50 puur als vangnet.
SUMMARY_MAX_RECOVERY_SHARE = float(os.getenv("SUMMARY_MAX_RECOVERY_SHARE", "0.5"))  # >50% secties hersteld → stop
SUMMARY_MAX_EUR_PER_MIN = float(os.getenv("SUMMARY_MAX_EUR_PER_MIN", "0.02"))  # kost/min audio → stop (zelf-schalend)
SUMMARY_MAX_COST_EUR = float(os.getenv("SUMMARY_MAX_COST_EUR", "1.50"))  # absolute vangnet-plafond/taak → stop
# Tarieven voor de kostenschatting van de onderbreker (spiegelen cost_config EU in-region; env-overridebaar).
# Ruw is genoeg voor een veiligheidsgrens — we vangen een 3×-runaway, geen cent-nauwkeurige boekhouding.
_LLM_USD_IN = float(os.getenv("SUMMARY_LLM_USD_PER_1M_IN", "0.33"))
_LLM_USD_OUT = float(os.getenv("SUMMARY_LLM_USD_PER_1M_OUT", "2.75"))
_USD_EUR = float(os.getenv("SUMMARY_USD_EUR_RATE", "0.92"))


class SummaryCostBreaker(Exception):
    """Harde onderbreker: de run overschreed een veiligheids-/kostengrens → de taak stopt met volledige
    teruggave. De message is user-facing; `.detail` draagt de technische reden voor de log."""
    USER_MSG = ("This summary couldn't be completed and you were not charged. Please try again — if it "
                "keeps happening, contact support@indxr.ai.")

    def __init__(self, detail: str):
        super().__init__(self.USER_MSG)
        self.detail = detail


def _estimate_cost_eur(calls: List[Dict]) -> float:
    """Ruwe COR-schatting (euro) van een reeks gateway-calls, voor de onderbreker. Alles tegen het
    gemini/gateway-tarief (secties + haiku-fallback; stap-1-gemini). Sonnet-fallback is zeldzaam en
    zou de kost onderschatten, wat de onderbreker alleen conservatiever maakt — acceptabel."""
    in_tok = sum(int(c.get("prompt_tokens") or 0) for c in calls)
    out_tok = sum(int(c.get("completion_tokens") or 0) for c in calls)
    return (in_tok / 1e6 * _LLM_USD_IN + out_tok / 1e6 * _LLM_USD_OUT) * _USD_EUR


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
    "Write the notes in Markdown (paragraphs, **bold**, *italic*, and -/1. lists where useful).\n\n"
    "OUTPUT FORMAT — reply in PLAIN TEXT, not JSON, not wrapped in a code fence:\n"
    "- The FIRST line must be exactly `HEADING: <heading>` — normally the given heading, but if the "
    "fragment's actual content is clearly about something different, give a corrected heading here.\n"
    "- Then a blank line, then the Markdown notes.\n"
    "Do NOT restate the heading inside the notes, and do NOT open with meta sentences like 'Here are "
    "the notes…' or references to 'the fragment'/'the transcript'. Begin the notes directly with content, "
    "and finish your last sentence — never stop mid-sentence."
)


# HEADING-conventie voor de platte-tekst-sectie-uitvoer (ADR-090-truncatiefix): de eerste niet-lege
# regel `HEADING: <tekst>` draagt de (eventueel gecorrigeerde) kop en wordt uit de notities gehaald;
# ontbreekt hij, dan blijft de stap-1-kop en is de hele respons de inhoud.
_HEADING_LINE_RE = re.compile(r"^\s*HEADING\s*:\s*(.+?)\s*$", re.IGNORECASE)


# ── gateway ───────────────────────────────────────────────────────────────────

async def _gateway_call(client: httpx.AsyncClient, api_key: str, payload: Dict) -> Dict[str, Any]:
    """Eén OpenAI-compatibele call naar de EU-gateway. Retourneert content + genormaliseerde usage
    + request_id + het model dat de respons leverde. Raise op non-200 (na gateway-fallbacks)."""
    headers = {"authorization": api_key, "Content-Type": "application/json"}
    resp = await client.post(LLM_GATEWAY_URL, headers=headers, json=payload)
    if resp.status_code != 200:
        raise RuntimeError(f"LLM Gateway {payload.get('model')} -> {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    choice = (data.get("choices") or [{}])[0]
    content = (choice.get("message") or {}).get("content") or ""
    usage = data.get("usage") or {}
    # Reasoning/denk-tokens zitten IN output_tokens maar worden apart gerapporteerd (geverifieerd tegen
    # de gateway: usage.completion_tokens_details.reasoning_tokens). visible = completion − reasoning.
    ctd = usage.get("completion_tokens_details") or usage.get("output_tokens_details") or {}
    reasoning = ctd.get("reasoning_tokens")
    if reasoning is None:
        reasoning = usage.get("reasoning_tokens")
    return {
        "content": content,
        # De gateway-usage gebruikt input_tokens/output_tokens; oudere OpenAI-compat gaf
        # prompt_tokens/completion_tokens. Beide defensief lezen.
        "prompt_tokens": int(usage.get("input_tokens") or usage.get("prompt_tokens") or 0),
        "completion_tokens": int(usage.get("output_tokens") or usage.get("completion_tokens") or 0),
        "reasoning_tokens": int(reasoning) if reasoning is not None else None,
        # De gateway geeft de reden waarom het model stopte ('stop'/'length'/…). Bij de Gemini-
        # gestructureerde-uitvoer-bug is dit 'stop' met een midden-in-de-zin afgekapt veld (ADR-090).
        "finish_reason": choice.get("finish_reason"),
        "max_tokens_set": payload.get("max_tokens"),
        "request_id": data.get("request_id") or data.get("id"),
        "model": data.get("model") or payload.get("model"),
    }


def _strip_code_fences(content: str) -> str:
    """Strip a wrapping ``` fence — LEADING and TRAILING independently. The old version only removed a
    trailing fence when there was also a leading one, so a model that closed its notes with an orphan
    ``` left it in the stored content (the §7 finding). Handles ```json / ```markdown opening tags."""
    s = (content or "").strip()
    if s.startswith("```"):
        s = s[3:]
        # optionele taal-tag op de openingsregel (json, markdown, md, …)
        nl = s.find("\n")
        first = (s[:nl] if nl >= 0 else s).strip()
        if first and re.fullmatch(r"[A-Za-z0-9_+-]{1,20}", first):
            s = s[nl + 1:] if nl >= 0 else ""
    s = s.strip()
    if s.endswith("```"):
        s = s[:-3]
    return s.strip()


# Backwards-compat alias: step 1 (structured JSON) still calls this name.
_strip_json_fences = _strip_code_fences


def _log_usage(supabase, transcript_id: str, user_id: str, generated_at: str, call: Dict,
               is_test: bool = False) -> None:
    """Per-call kostenlog (ai_summary_usage_log) — de gezaghebbende AI-summary COR-bron. Eén rij
    per gateway-call, met request_id/model/region/tijdstempel. Non-fataal: nooit de summary laten
    falen op een kostenboeking. `is_test=True` markeert meetverkeer (health-script): de kost telt mee
    in de totaal-COR maar wordt uit de per-user-marge en het Operations-paneel gefilterd."""
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
            # ADR-090-diagnostiek: de stopreden + het budget + de denk/zichtbaar-splitsing, zodat de
            # volgende afkap-diagnose geen giswerk is. recovery markeert een vangnet-hercall.
            "finish_reason": call.get("finish_reason"),
            "max_tokens_set": call.get("max_tokens_set"),
            "reasoning_tokens": call.get("reasoning_tokens"),
            "recovery": call.get("recovery"),
            "is_test": is_test,
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


def _parse_section_text(raw: str, step1_heading: str):
    """Platte-tekst sectie-antwoord → (heading, content, cleanup_fired). Strip een omhullende code-fence,
    haal de `HEADING:`-eerste-regel eruit (conventie), en pas de lichte cleanup toe."""
    text = _strip_code_fences(raw).strip()
    heading = step1_heading
    lines = text.split("\n")
    idx = next((k for k, ln in enumerate(lines) if ln.strip()), -1)
    if idx >= 0:
        m = _HEADING_LINE_RE.match(lines[idx])
        if m:
            cand = m.group(1).strip()
            if cand:
                heading = cand
            del lines[idx]
            while idx < len(lines) and not lines[idx].strip():
                del lines[idx]  # opvolgende lege regels ook weg
    content, fired = _clean_section_content("\n".join(lines).strip(), heading)
    return heading, content, fired


def _section_ok(content: str, frag_words: int):
    """Model-onafhankelijke inhoudscheck (ADR-090). (ok, reason|None). AFGEKAPT wanneer de inhoud niet
    op een zin-afsluitend teken eindigt (het bug-symptoom: geldige uitvoer die midden in een zin stopt),
    of onredelijk kort is t.o.v. een substantieel fragment (een schoon-eindigende maar minieme uitwerking)."""
    c = _strip_code_fences(content or "").strip()
    if not c:
        return False, "empty"
    if not _SENTENCE_END_RE.search(c):
        return False, "mid_sentence"
    if frag_words >= SECTION_RATIO_MIN_FRAG and _word_count(c) < SECTION_MIN_RATIO * frag_words:
        return False, "too_short"
    return True, None


async def _run_section(client, api_key, sem, section, overview, transcript_data) -> Dict:
    """Eén hoofdstuk-uitwerking (ADR-090-truncatiefix). Stap 2 vraagt nu PLATTE TEKST (geen gestructureerd
    schema — dat had de sectie nauwelijks nodig en is de bron van de intermitterende Gemini-truncatie:
    geldige/parseerbare JSON waarvan het tekstveld midden in de zin stopt, ver onder de limiet). De kop
    komt via de `HEADING:`-conventie. Denkbudget staat expliciet aan (extra_body). Model-onafhankelijk
    VANGNET: na elke call wordt `_section_ok` gecontroleerd; faalt die, dan is de call mislukt ongeacht
    wat het model teruggaf → nieuwe poging (zelfde model), en bij een tweede mislukking het fallback-model
    voor deze ene sectie. Elke hersteltruc wordt gelogd. Álle calls komen in `calls` (kostenlog)."""
    fragment = extract_fragment(transcript_data, section["start_time"], section["end_time"])
    frag_words = _word_count(fragment)
    step1_heading = section["heading"]
    result = {"heading": step1_heading, "start_time": section["start_time"],
              "end_time": section["end_time"], "content": "", "call": None, "calls": [],
              "json_fallback": False, "cleanup": [], "frag_words": frag_words,
              "recovery": None, "safety_net": None}
    if not fragment.strip():
        result["safety_net"] = "empty_fragment"
        return result

    scope = f"Topic heading: {step1_heading}\nTopic description: {section.get('description', '')}".strip()
    user_msg = (f"{scope}\n\n"
                f"Overall video summary (context):\n{overview}\n\n"
                f"Transcript fragment for this topic:\n{fragment}")
    base_max = _clamp(round(frag_words * 2), 1024, 8000)

    # Pogingen: zelfde model, dan een retry, dan het fallback-model voor deze ene sectie.
    attempts = [(SECTION_MODEL, None), (SECTION_MODEL, "retry"), (SECTION_FALLBACK, "fallback")]
    best = None  # (words, heading, content, cleanup, reason) — langste behouden als geen enkele slaagt
    async with sem:
        for model, recovery in attempts:
            payload = {
                "model": model,
                "messages": [{"role": "system", "content": SECTION_SYSTEM_PROMPT},
                             {"role": "user", "content": user_msg}],
                "max_tokens": base_max,
            }
            # Denkbudget alleen voor Gemini (google.thinking_config); het haiku-fallback-model negeert dit.
            if model.startswith("gemini"):
                payload["extra_body"] = {"google": {"thinking_config": {"thinking_budget": SECTION_THINKING_BUDGET}}}
            try:
                call = await _gateway_call(client, api_key, payload)
            except Exception as e:
                logger.warning(f"[summary] sectie '{step1_heading}' call faalde ({recovery or 'initial'}): {e}")
                continue
            call["recovery"] = recovery
            result["calls"].append(call)
            result["call"] = call
            heading, content, fired = _parse_section_text(call["content"] or "", step1_heading)
            ok, reason = _section_ok(content, frag_words)
            cw = _word_count(content)
            if ok:
                result["heading"], result["content"], result["cleanup"] = heading, content, fired
                result["recovery"] = recovery
                if recovery:
                    logger.info(f"[summary] sectie '{step1_heading}': hersteld via {recovery} "
                                f"(model={call.get('model')}, {cw} woorden)")
                return result
            logger.warning(f"[summary] sectie '{step1_heading}': afgekapt ({reason}, {cw} woorden, "
                           f"finish={call.get('finish_reason')}, model={call.get('model')}) — "
                           f"{'fallback ook mislukt' if recovery == 'fallback' else 'nieuwe poging'}")
            if best is None or cw > best[0]:
                best = (cw, heading, content, fired, reason)

    # Geen enkele poging kwam schoon door — houd de langste, markeer als niet-hersteld (rapportage).
    if best:
        result["heading"], result["content"], result["cleanup"] = best[1], best[2], best[3]
        result["safety_net"] = best[4]
        logger.warning(f"[summary] sectie '{step1_heading}': ALLE pogingen afgekapt "
                       f"(rest={best[4]}, {best[0]} woorden) — beste behouden")
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
        "calls": [c for r in part_results for c in (r.get("calls") or [])],
        "json_fallback": any(r.get("json_fallback") for r in part_results),
        "cleanup": [x for r in part_results for x in (r.get("cleanup") or [])],
        "frag_words": sum(int(r.get("frag_words") or 0) for r in part_results),
        "recovery": next((r["recovery"] for r in part_results if r.get("recovery")), None),
        "safety_net": next((r["safety_net"] for r in part_results
                            if r.get("safety_net") and r.get("safety_net") != "empty_fragment"), None),
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
            # _run_section vult zelf `calls` (alle pogingen: initial/retry/fallback) — niet overschrijven.
            r.setdefault("calls", [r["call"]] if r.get("call") else [])
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

    # ── Harde onderbreker (ADR-098) — vóór de assemblage/retour, ná het loggen (de gateway-kost is al
    # gemaakt en hoort geboekt). Overschrijding → SummaryCostBreaker → de reservation-aware wrapper
    # refundt volledig en zet status=error met de user-message. Drie condities:
    #   (1) een hoofdstuk bleef ná alle pogingen afgekapt (levert nooit een afgekapte betaalde samenvatting);
    #   (2) meer dan SUMMARY_MAX_RECOVERY_SHARE van de secties moest herstellen (systematisch modelfalen);
    #   (3) de geschatte kostprijs > SUMMARY_MAX_COST_EUR (runaway).
    n_sections = max(1, len(section_results))
    recovered = sum(1 for r in section_results if r.get("recovery"))
    unresolved = sum(1 for r in section_results if r.get("safety_net"))
    recovery_share = recovered / n_sections
    all_calls = [struct["call"]] + [c for r in section_results for c in r.get("calls", [])]
    est_cost = _estimate_cost_eur(all_calls)
    minutes = max(1.0, (duration or 0) / 60.0)
    eur_per_min = est_cost / minutes
    breach = None
    if unresolved > 0:
        breach = f"{unresolved}/{n_sections} sectie(s) bleven afgekapt na alle pogingen"
    elif recovery_share > SUMMARY_MAX_RECOVERY_SHARE:
        breach = f"herstel-aandeel {recovery_share:.0%} > cap {SUMMARY_MAX_RECOVERY_SHARE:.0%} ({recovered}/{n_sections})"
    elif eur_per_min > SUMMARY_MAX_EUR_PER_MIN:
        breach = f"kost/min €{eur_per_min:.4f} > cap €{SUMMARY_MAX_EUR_PER_MIN:.4f} (est €{est_cost:.3f} over {minutes:.0f} min)"
    elif est_cost > SUMMARY_MAX_COST_EUR:
        breach = f"geschatte kostprijs €{est_cost:.3f} > absolute cap €{SUMMARY_MAX_COST_EUR:.2f}"
    if breach:
        logger.error(f"[summary] ONDERBREKER {transcript_id}: {breach} "
                     f"(recovery_share={recovery_share:.0%}, est_cost=€{est_cost:.3f}, "
                     f"eur_per_min=€{eur_per_min:.4f}, unresolved={unresolved})")
        if debug is not None:
            debug["breaker"] = breach
        raise SummaryCostBreaker(breach)

    # Debug-stats voor de E2E (dekking + kwaliteits-tellers). Worker geeft geen debug mee.
    if debug is not None:
        debug["coverage"] = coverage
        debug["sections"] = len(sections)
        debug["cleanup_fired"] = sum(1 for r in section_results if r.get("cleanup"))
        debug["json_fallback_fired"] = sum(1 for r in section_results if r.get("json_fallback"))
        # ADR-090-truncatiefix: hoe vaak het vangnet moest herstellen (retry/fallback), en hoeveel
        # hoofdstukken ZELFS na alle pogingen nog afgekapt bleven (dat moet 0 zijn).
        debug["recovered"] = sum(1 for r in section_results if r.get("recovery"))
        debug["safety_net_unresolved"] = sum(1 for r in section_results if r.get("safety_net"))
        debug["section_results"] = section_results

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
            error_message=str(e)[:500], credits_refunded=reserved,  # INTEGER-kolom (aantal), geen bool
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
            error_message=str(e)[:500], credits_refunded=reserved,  # INTEGER-kolom (aantal), geen bool
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

"""
Kosten-tuning meting voor de AI-samenvatting (ADR-098-vervolg). Onderzoekt of de kostprijs van LANGE
samenvattingen omlaag kan vóór een prijsaanpassing, door drie knoppen te variëren en per instelling
kost + kwaliteit te meten op dezelfde twee lange video's:

  1. Stap-2-denkbudget: 2048 (huidig), 512, 256, 0.
  2. Stap-1-denkbudget: geen/unbounded (huidig), 2048, 512, 256, 0 — die call leest het VOLLEDIGE
     transcript en is bij lange video's de duurste enkele call.
  3. Hoofdstuk-ondergrens (SECTION_MINUTES): 8 (huidig), 12, 16 — minder maar langere hoofdstukken.

Draait de ECHTE pipeline-stappen rechtstreeks (sp._run_structure + sp._run_step2), net als summary_health,
maar SCHRIJFT NIETS: geen ai_summary, geen credits, GEEN usage-log-rijen (pure meting). Meet per run:
kost (stap 1 + stap 2, EUR), denk-tokens, output-woorden, verhouding tot het transcript, uitwerking/min,
aantal hoofdstukken, splits, afkapping (onopgelost) en herstel. Rapporteert naar het bestaande
gezondheidsrapport docs/wiki/testing/summary-health-<datum>.md (append) zodat het reproduceerbaar is.

Draaien: cd backend && venv/bin/python3 summary_cost_tuning.py [--video1 <tid>] [--video2 <tid>] [--one]
"""
import os
import sys
import time
import asyncio
import argparse
from pathlib import Path
from datetime import date, datetime, timezone

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))


def _load_env():
    p = Path(__file__).resolve().parent / ".env"
    for line in p.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env()
import summary_pipeline as sp  # noqa: E402
from credit_manager import get_supabase_client  # noqa: E402

REPORT_DIR = Path(__file__).resolve().parent.parent / "docs" / "wiki" / "testing"

# Twee lange video's (~4,5u) — de geadverteerde long-form case, geeft een echte "4-uur"-kostprijs.
VIDEO1 = "538de5ec-46c2-45d6-878f-f0235d8c243f"  # hCepzIrkbDE 4h31m
VIDEO2 = "34092b73-f98d-4a93-9550-9099b8e4fc5b"  # 4J5CdUmBx7A 4h30m

# (label, step1_budget|None, step2_budget, section_minutes). None op stap 1 = huidig (geen budget).
SETTINGS = [
    ("BASELINE s1=unbounded s2=2048 secmin=8", None, 2048, 8.0),
    # Exp A — stap-2-denkbudget
    ("s2=512",  None, 512, 8.0),
    ("s2=256",  None, 256, 8.0),
    ("s2=0",    None, 0,   8.0),
    # Exp B — stap-1-denkbudget (caps t.o.v. het huidige unbounded)
    ("s1=2048", 2048, 2048, 8.0),
    ("s1=512",  512,  2048, 8.0),
    ("s1=256",  256,  2048, 8.0),
    ("s1=0",    0,    2048, 8.0),
    # Exp C — hoofdstuk-ondergrens
    ("secmin=12", None, 2048, 12.0),
    ("secmin=16", None, 2048, 16.0),
]


def _rates(sb):
    r = sb.table("cost_config").select(
        "assemblyai_llm_usd_per_1m_input_tokens,assemblyai_llm_usd_per_1m_output_tokens,"
        "assemblyai_llm_sonnet_usd_per_1m_input_tokens,assemblyai_llm_sonnet_usd_per_1m_output_tokens,usd_eur_rate"
    ).order("effective_from", desc=True).limit(1).execute().data[0]
    return {"in": float(r["assemblyai_llm_usd_per_1m_input_tokens"]),
            "out": float(r["assemblyai_llm_usd_per_1m_output_tokens"]),
            "sin": float(r["assemblyai_llm_sonnet_usd_per_1m_input_tokens"]),
            "sout": float(r["assemblyai_llm_sonnet_usd_per_1m_output_tokens"]),
            "fx": float(r["usd_eur_rate"])}


def _call_cost(c, rates):
    m = (c.get("model") or "")
    rin, rout = (rates["sin"], rates["sout"]) if "sonnet" in m else (rates["in"], rates["out"])
    return (int(c.get("prompt_tokens") or 0) / 1e6 * rin
            + int(c.get("completion_tokens") or 0) / 1e6 * rout) * rates["fx"]


def _fetch(sb, tid):
    row = sb.table("transcripts").select("transcript,duration,video_id").eq("id", tid).single().execute()
    segs = row.data.get("transcript") or []
    dur = row.data.get("duration") or sp.total_transcript_seconds(segs)
    tw = sum(sp._word_count(s.get("text") or "") for s in segs)
    return segs, dur, row.data.get("video_id"), tw


async def _run_once(segs, dur, s1_budget, s2_budget, secmin, rates):
    # Monkeypatch de drie knoppen (module-globals, gelezen bij call-time).
    sp.STRUCTURE_THINKING_BUDGET = s1_budget
    sp.SECTION_THINKING_BUDGET = s2_budget
    sp.SECTION_MINUTES = secmin
    api_key = os.environ["ASSEMBLYAI_API_KEY"]
    min_s, max_s = sp.section_bounds(dur)
    t0 = time.time()
    async with httpx.AsyncClient(timeout=sp.GATEWAY_TIMEOUT_S) as client:
        struct = await sp._run_structure(client, api_key, segs, min_s, max_s)
        overview = (struct["structured"].get("overview") or "").strip()
        sections, coverage = sp._normalize_sections(
            struct["structured"].get("sections") or [], min_s, max_s, struct["total_seconds"])
        debug = {}
        results = await sp._run_step2(client, api_key, sections, overview, segs, debug=debug)
    wall = time.time() - t0

    s1c = struct["call"]
    s1_cost = _call_cost(s1c, rates)
    s1_reason = int(s1c.get("reasoning_tokens") or 0)
    step2_calls = [c for r in results for c in (r.get("calls") or [])]
    s2_cost = sum(_call_cost(c, rates) for c in step2_calls)
    s2_reason = sum(int(c.get("reasoning_tokens") or 0) for c in step2_calls)
    out_words = sum(sp._word_count(r.get("content") or "") for r in results)
    tw = sum(sp._word_count(s.get("text") or "") for s in segs)
    return {
        "max_sections": max_s, "n_chapters": len(results), "splits": debug.get("splits_fired", 0),
        "coverage_pct": coverage.get("raw_covered_pct"),
        "s1_cost": s1_cost, "s1_prompt": int(s1c.get("prompt_tokens") or 0),
        "s1_completion": int(s1c.get("completion_tokens") or 0), "s1_reason": s1_reason,
        "s1_finish": s1c.get("finish_reason"), "s1_model": s1c.get("model"),
        "s2_cost": s2_cost, "s2_calls": len(step2_calls), "s2_reason": s2_reason,
        "out_words": out_words, "overview_words": sp._word_count(overview),
        "ratio": round(out_words / tw, 4) if tw else None,
        "elab_per_min": round(out_words / (dur / 60.0), 1) if dur else None,
        "total_cost": s1_cost + s2_cost,
        "unresolved": sum(1 for r in results if r.get("safety_net")),
        "recovered": sum(1 for r in results if r.get("recovery")),
        "wall_s": round(wall, 1),
    }


def _md_table(video_label, dur, tw, rows):
    out = [f"\n### {video_label} · {dur//60}:{dur%60:02d} · transcript {tw} woorden\n",
           "| instelling | hoofdst. | splits | **totaal €** | stap1 € | stap2 € | s1 denk-tok | s2 denk-tok | "
           "out-woorden | ratio | uitw./min | afgekapt | herstel | dekking | s1 finish | wall |",
           "|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|:--:|--:|--:|---|--:|"]
    base = rows[0][1]["total_cost"] if rows else None
    for label, m in rows:
        delta = ""
        if base and label != rows[0][0]:
            pct = (m["total_cost"] - base) / base * 100
            delta = f" ({pct:+.0f}%)"
        out.append(
            f"| {label} | {m['n_chapters']} | {m['splits']} | **€{m['total_cost']:.4f}**{delta} | "
            f"€{m['s1_cost']:.4f} | €{m['s2_cost']:.4f} | {m['s1_reason']} | {m['s2_reason']} | "
            f"{m['out_words']} | {m['ratio']} | {m['elab_per_min']} | "
            f"{'**' + str(m['unresolved']) + '**' if m['unresolved'] else '0'} | {m['recovered']} | "
            f"{m['coverage_pct']}% | {m['s1_finish']} | {m['wall_s']}s |")
    return "\n".join(out)


async def main_async(v1, v2, one):
    sb = get_supabase_client()
    rates = _rates(sb)
    videos = [v1] if one else [v1, v2]
    all_blocks = []
    for tid in videos:
        segs, dur, vid, tw = _fetch(sb, tid)
        print(f"\n=== video {vid} ({dur//60}:{dur%60:02d}, {tw} woorden) ===")
        rows = []
        for (label, s1b, s2b, secmin) in SETTINGS:
            print(f"  running {label} ...", flush=True)
            try:
                m = await _run_once(segs, dur, s1b, s2b, secmin, rates)
            except Exception as e:
                print(f"    FOUT: {type(e).__name__}: {e}")
                continue
            rows.append((label, m))
            print(f"    €{m['total_cost']:.4f} (s1 €{m['s1_cost']:.4f} + s2 €{m['s2_cost']:.4f}) · "
                  f"{m['n_chapters']} hfdst · {m['out_words']}w · ratio {m['ratio']} · "
                  f"afgekapt {m['unresolved']} · {m['wall_s']}s")
        all_blocks.append(_md_table(f"video `{vid}` (`{tid}`)", dur, tw, rows))
    return all_blocks


def _write(blocks):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORT_DIR / f"summary-health-{date.today().isoformat()}.md"
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    header = (f"\n## KOSTEN-TUNING (ADR-098-vervolg) — {stamp}\n\n"
              "Drie knoppen op dezelfde twee lange video's; per instelling kost + kwaliteit. Pipeline-stappen "
              "rechtstreeks aangeroepen (geen ai_summary/credits/usage-log). Tarief EU in-region 0,33/2,75 "
              "USD/1M ×0,92. 'afgekapt' = secties onopgelost ná alle pogingen (moet 0). 'uitw./min' = "
              "output-woorden / videominuten (uitwerkingsdichtheid). Reproduceren via env "
              "`SUMMARY_STRUCTURE_THINKING_BUDGET` / `SUMMARY_SECTION_THINKING_BUDGET` / `SUMMARY_SECTION_MINUTES`.\n")
    with open(path, "a", encoding="utf-8") as f:
        f.write(header)
        for b in blocks:
            f.write(b + "\n")
        f.write("\n---\n")
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video1", default=VIDEO1)
    ap.add_argument("--video2", default=VIDEO2)
    ap.add_argument("--one", action="store_true", help="alleen video1 (sanity)")
    a = ap.parse_args()
    blocks = asyncio.run(main_async(a.video1, a.video2, a.one))
    path = _write(blocks)
    print(f"\n→ rapport: {path}")


if __name__ == "__main__":
    main()

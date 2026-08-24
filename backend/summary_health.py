"""
Summary-health meetscript (ADR-090-truncatiefix). Vervangt de wegwerp-controle: het SCHRIJFT weg,
zodat opeenvolgende runs naast elkaar te leggen zijn en zichtbaar wordt of gedrag verandert bij een
model-/instellingswijziging (het oude e2e_summary_measure.py printte alleen naar het scherm → de
cijfers van de vorige ronde zijn verloren).

Twee modi:
  --generate <transcript_ids...> [--runs N]
      Draait de ECHTE twee-staps-pipeline N× per transcript, via sp._run_structure + sp._run_step2
      RECHTSTREEKS → GEEN opgeslagen ai_summary, GEEN credits, GEEN rij in ai_summary_usage_log
      (die insert zit alleen in run_summary). Meet per hoofdstuk: woorden, eindigt-op-zin-teken,
      verhouding tot het fragment, gezet tokenbudget, gebruikte tokens (denk/zichtbaar), stopreden,
      model, en of het vangnet vuurde (retry/fallback/onopgelost). Plus per samenvatting: totalen,
      dekking van de videoduur, doorlooptijd, kosten. Rapporteert de SPREIDING over de runs (de bug
      is intermitterend — één schone run bewijst niets).
  --check <transcript_ids...>  |  --check-all
      Leest ALLEEN de opgeslagen ai_summary's (geen generatie, geen credits) en meldt afgekapte
      hoofdstukken. Voor periodieke controle.

Schrijft een leesbaar, gedateerd markdown-rapport naar docs/wiki/testing/summary-health-<YYYY-MM-DD>.md
(append als het al bestaat → meerdere runs op één dag blijven bewaard).

Vereist: backend/.env met SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + ASSEMBLYAI_API_KEY.
Draaien:  cd backend && venv/bin/python3 summary_health.py --generate <id> <id> ... --runs 2
          cd backend && venv/bin/python3 summary_health.py --check-all
"""
import os
import sys
import time
import asyncio
import argparse
import statistics
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
from credit_manager import get_supabase_client, calculate_summary_cost  # noqa: E402

REPORT_DIR = Path(__file__).resolve().parent.parent / "docs" / "wiki" / "testing"


def _cost_rates(sb):
    try:
        r = sb.table("cost_config").select(
            "assemblyai_llm_usd_per_1m_input_tokens,assemblyai_llm_usd_per_1m_output_tokens,usd_eur_rate"
        ).order("effective_from", desc=True).limit(1).execute().data[0]
        return {"in": float(r["assemblyai_llm_usd_per_1m_input_tokens"]),
                "out": float(r["assemblyai_llm_usd_per_1m_output_tokens"]),
                "fx": float(r["usd_eur_rate"])}
    except Exception:
        return {"in": 0.30, "out": 2.50, "fx": 0.92}


def _eur(in_tok, out_tok, rates):
    usd = (in_tok / 1e6) * rates["in"] + (out_tok / 1e6) * rates["out"]
    return usd * rates["fx"]


def _fetch(sb, tid):
    row = sb.table("transcripts").select("transcript,duration,video_id,ai_summary").eq("id", tid).single().execute()
    if not row.data:
        raise RuntimeError(f"transcript {tid} niet gevonden")
    segs = row.data.get("transcript") or []
    dur = row.data.get("duration") or sp.total_transcript_seconds(segs)
    return segs, dur, row.data.get("video_id"), row.data.get("ai_summary")


def _chapter_rows_from_results(section_results, segs):
    """Per-hoofdstuk meetrij uit de LIVE pipeline-resultaten (generate)."""
    rows = []
    for r in section_results:
        content = r.get("content") or ""
        cw = sp._word_count(content)
        frag_words = int(r.get("frag_words") or sp._word_count(
            sp.extract_fragment(segs, r["start_time"], r["end_time"])))
        ok, reason = sp._section_ok(content, frag_words)
        calls = r.get("calls") or []
        comp = sum(int(c.get("completion_tokens") or 0) for c in calls)
        reason_tok = sum(int(c.get("reasoning_tokens") or 0) for c in calls if c.get("reasoning_tokens") is not None)
        visible = comp - reason_tok
        rows.append({
            "heading": r.get("heading"),
            "words": cw, "frag_words": frag_words,
            "ratio": round(cw / frag_words, 3) if frag_words else None,
            "ends_clean": ok or reason != "mid_sentence",   # mid_sentence = echte afkapping
            "truncated": (r.get("safety_net") is not None) or (not ok),
            "max_tokens": calls[0].get("max_tokens_set") if calls else None,
            "completion_tokens": comp, "reasoning_tokens": reason_tok, "visible_tokens": visible,
            "finish": ",".join(sorted(set(str(c.get("finish_reason")) for c in calls))) or None,
            "model": ",".join(sorted(set(str(c.get("model")) for c in calls))) or None,
            "recovery": r.get("recovery"),
            "safety_net": r.get("safety_net"),
            "n_calls": len(calls),
        })
    return rows


async def _generate_once(sb, tid, segs, dur):
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
    rows = _chapter_rows_from_results(results, segs)
    struct_call = struct["call"]
    all_calls = [struct_call] + [c for r in results for c in (r.get("calls") or [])]
    total_in = sum(int(c.get("prompt_tokens") or 0) for c in all_calls)
    total_out = sum(int(c.get("completion_tokens") or 0) for c in all_calls)
    return {
        "rows": rows, "wall_s": round(wall, 1),
        "coverage_pct": coverage.get("raw_covered_pct"),
        "overview_words": sp._word_count(overview),
        "total_in": total_in, "total_out": total_out, "n_calls": len(all_calls),
        "struct_finish": struct_call.get("finish_reason"),
        "splits": debug.get("splits_fired", 0),
        # Uit de sectie-resultaten (we roepen _run_step2 rechtstreeks aan, niet run_summary — die dict
        # zou de tellers zetten; hier berekenen we ze zelf). recovered = hersteld via retry/fallback;
        # unresolved = ná alle pogingen nog afgekapt (moet 0 zijn).
        "recovered": sum(1 for r in results if r.get("recovery")),
        "unresolved": sum(1 for r in results if r.get("safety_net")),
    }


def _md_chapter_table(rows):
    out = ["| # | Hoofdstuk | woorden | frag | ratio | schoon | budget | denk/zicht | finish | model | herstel |",
           "|--:|---|--:|--:|--:|:--:|--:|--:|---|---|---|"]
    for i, r in enumerate(rows, 1):
        flag = "✗" if r["truncated"] else "✓"
        rec = r["recovery"] or ("**ONOPGELOST**" if r["safety_net"] else "")
        head = (r["heading"] or "")[:38]
        out.append(f"| {i} | {head} | {r['words']} | {r['frag_words']} | {r['ratio']} | {flag} | "
                   f"{r['max_tokens']} | {r['reasoning_tokens']}/{r['visible_tokens']} | {r['finish']} | "
                   f"{r['model']} | {rec} |")
    return "\n".join(out)


async def cmd_generate(sb, ids, runs):
    rates = _cost_rates(sb)
    lines = []
    grand_trunc = 0
    for tid in ids:
        segs, dur, vid, _ = _fetch(sb, tid)
        credits = calculate_summary_cost(dur)
        lines.append(f"\n### transcript `{tid}` · video `{vid}` · {dur//60}:{dur%60:02d} · {credits} credits/run\n")
        run_trunc = []
        for run in range(1, runs + 1):
            res = await _generate_once(sb, tid, segs, dur)
            rows = res["rows"]
            trunc = sum(1 for r in rows if r["truncated"])
            run_trunc.append(trunc)
            grand_trunc += trunc
            eur = _eur(res["total_in"], res["total_out"], rates)
            lines.append(f"**Run {run}/{runs}** — {len(rows)} hoofdstukken · **{trunc} afgekapt** · "
                         f"dekking {res['coverage_pct']}% · overview {res['overview_words']}w · "
                         f"splits {res['splits']} · vangnet-herstel {res['recovered']} · "
                         f"onopgelost {res['unresolved']} · {res['n_calls']} calls · "
                         f"{res['total_in']}in/{res['total_out']}out tok · ~€{eur:.4f} · "
                         f"{res['wall_s']}s · struct_finish {res['struct_finish']}\n")
            lines.append(_md_chapter_table(rows) + "\n")
        spread = f"min {min(run_trunc)} / max {max(run_trunc)} / totaal {sum(run_trunc)}" if run_trunc else "—"
        lines.append(f"_Spreiding afgekapte hoofdstukken over {runs} runs: {spread}._\n")
    verdict = ("**GESLAAGD — 0 afgekapte hoofdstukken over alle runs.**"
               if grand_trunc == 0 else
               f"**NIET GEHAALD — {grand_trunc} afgekapte hoofdstukken over alle runs.**")
    return lines, verdict, grand_trunc


def cmd_check(sb, ids):
    lines = []
    total_trunc = 0
    for tid in ids:
        try:
            segs, dur, vid, ai = _fetch(sb, tid)
        except Exception as e:
            lines.append(f"- `{tid}`: {e}\n"); continue
        if not ai:
            lines.append(f"- `{tid}` (video `{vid}`): geen ai_summary.\n"); continue
        secs = ai.get("sections") or []
        rows = []
        for s in secs:
            content = s.get("content") or ""
            fw = sp._word_count(sp.extract_fragment(segs, s.get("start_time", 0), s.get("end_time", 0)))
            ok, reason = sp._section_ok(content, fw)
            trunc = not ok
            rows.append({"heading": s.get("heading"), "words": sp._word_count(content),
                         "frag_words": fw, "ratio": round(sp._word_count(content)/fw, 3) if fw else None,
                         "ends_clean": ok or reason != "mid_sentence",
                         "truncated": trunc, "reason": reason,
                         "max_tokens": None, "reasoning_tokens": None, "visible_tokens": None,
                         "finish": None, "model": ai.get("schema_version"), "recovery": None, "safety_net": None})
        nt = sum(1 for r in rows if r["truncated"])
        total_trunc += nt
        gen = ai.get("generated_at", "?")
        lines.append(f"\n### `{tid}` · video `{vid}` · {dur//60}:{dur%60:02d} · gegenereerd {gen}\n")
        lines.append(f"**{len(secs)} hoofdstukken · {nt} afgekapt.**\n")
        lines.append(_md_chapter_table(rows) + "\n")
    return lines, total_trunc


def _write_report(title, body_lines, verdict):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORT_DIR / f"summary-health-{date.today().isoformat()}.md"
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    header = ""
    if not path.exists():
        header = ("# Summary-health metingen (ADR-090-truncatiefix)\n\n"
                  "Elke run een tijdgestempelde sectie; nieuwste onderaan. Bron: `backend/summary_health.py`. "
                  "Afgekapt = inhoud eindigt niet op een zin-teken of is onredelijk kort t.o.v. het fragment "
                  f"(`_section_ok`). Model/instelling: SECTION_MODEL={sp.SECTION_MODEL}, "
                  f"FALLBACK={sp.SECTION_FALLBACK}, thinking_budget={sp.SECTION_THINKING_BUDGET}, "
                  f"min_ratio={sp.SECTION_MIN_RATIO}.\n\n---\n")
    block = f"\n## {title} — {stamp}\n\n{verdict}\n\n" + "\n".join(body_lines) + "\n\n---\n"
    with open(path, "a", encoding="utf-8") as f:
        if header:
            f.write(header)
        f.write(block)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--generate", nargs="*", metavar="TID")
    ap.add_argument("--check", nargs="*", metavar="TID")
    ap.add_argument("--check-all", action="store_true")
    ap.add_argument("--runs", type=int, default=2)
    a = ap.parse_args()
    sb = get_supabase_client()

    if a.generate:
        lines, verdict, gt = asyncio.run(cmd_generate(sb, a.generate, a.runs))
        title = f"GENERATE — {len(a.generate)} video's × {a.runs} runs"
        path = _write_report(title, lines, verdict)
        print(verdict)
        print(f"→ {path}")
        sys.exit(0 if gt == 0 else 1)

    ids = a.check or []
    if a.check_all:
        rows = sb.table("transcripts").select("id").not_.is_("ai_summary", "null").execute().data or []
        ids = [r["id"] for r in rows]
    if ids:
        lines, tt = cmd_check(sb, ids)
        verdict = ("**Geen afgekapte hoofdstukken in de opgeslagen samenvattingen.**" if tt == 0
                   else f"**{tt} afgekapte hoofdstukken in de opgeslagen samenvattingen.**")
        path = _write_report(f"CHECK — {len(ids)} opgeslagen samenvattingen", lines, verdict)
        print(verdict)
        print(f"→ {path}")
        sys.exit(0)
    ap.print_help()


if __name__ == "__main__":
    main()

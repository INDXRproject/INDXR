"""
E2E-meetscript voor de AI-samenvatting (ADR-090). Draait de ECHTE twee-staps-pipeline op de
opgegeven transcript-id's en rapporteert per video de kern-metrics — met als acceptatiecriterium
de VERHOUDING (uitkomstwoorden / transcriptwoorden), niet een absoluut aantal.

Vereist: backend/.env met SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + ASSEMBLYAI_API_KEY.
Draaien:  cd backend && venv/bin/python3 e2e_summary_measure.py <transcript_id> <transcript_id> <transcript_id>

Kies drie transcripts van ~15min / ~1u / ~4u (maak ze eerst aan via de transcribe-flow als ze nog
niet bestaan — de DB bevat vóór launch alleen korte interne testtranscripts). Het script schrijft
per gateway-call een rij in ai_summary_usage_log (net als de echte flow) en somt die tokens/kosten.
"""
import os
import sys
import time
import random
import asyncio
from pathlib import Path


def _load_env():
    for line in (Path(__file__).resolve().parent / ".env").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _words(s: str) -> int:
    return len((s or "").split())


async def measure(transcript_id: str):
    from credit_manager import get_supabase_client
    import summary_pipeline as sp

    sb = get_supabase_client()
    row = sb.table("transcripts").select("transcript,duration,user_id").eq("id", transcript_id).single().execute()
    if not row.data:
        print(f"  {transcript_id}: transcript niet gevonden"); return None
    segments = row.data["transcript"] or []
    duration = row.data.get("duration") or sp.total_transcript_seconds(segments)
    user_id = row.data["user_id"]
    transcript_words = sum(_words(seg.get("text", "")) for seg in segments)

    from credit_manager import calculate_summary_cost

    debug = {}
    t0 = time.monotonic()
    summary = await sp.run_summary(transcript_id, user_id, supabase=sb, debug=debug)
    elapsed = time.monotonic() - t0

    n_sections = len(summary.get("sections", []))
    out_words = _words(summary.get("overview", "")) + sum(_words(s.get("content", "")) for s in summary.get("sections", []))
    ratio = (out_words / transcript_words) if transcript_words else 0.0
    credits = calculate_summary_cost(duration)

    cov = debug.get("coverage", {})
    corrections = cov.get("gaps_fixed", 0) + cov.get("overlaps_fixed", 0) + (1 if cov.get("end_stretched_s", 0) else 0)

    # Tokens/kosten uit de log-rijen van DEZE run (gekeyd op generated_at).
    gen = summary["generated_at"]
    logs = sb.table("ai_summary_usage_log").select("model,prompt_tokens,completion_tokens") \
        .eq("transcript_id", transcript_id).eq("generated_at", gen).execute().data or []
    tok_in = sum(r["prompt_tokens"] or 0 for r in logs)
    tok_out = sum(r["completion_tokens"] or 0 for r in logs)

    return {
        "id": transcript_id, "duration_min": round(duration / 60, 1), "duration_s": duration,
        "sections": n_sections, "transcript_words": transcript_words, "output_words": out_words,
        "ratio": round(ratio, 3), "elapsed_s": round(elapsed, 1), "gateway_calls": len(logs),
        "tokens_in": tok_in, "tokens_out": tok_out, "credits": credits,
        "coverage_pct": cov.get("raw_covered_pct", 0.0), "coverage_corrections": corrections,
        "cleanup_fired": debug.get("cleanup_fired", 0), "json_fallback_fired": debug.get("json_fallback_fired", 0),
        "summary": summary,
    }


def _first_100_words(text: str) -> str:
    return " ".join((text or "").split()[:100])


async def main(ids):
    rows = []
    for tid in ids:
        print(f"→ meet {tid} …")
        r = await measure(tid)
        if r:
            rows.append(r)
            print(f"  sections={r['sections']} dekking={r['coverage_pct']}% correcties={r['coverage_corrections']} "
                  f"uit/tr={r['output_words']}/{r['transcript_words']} ratio={r['ratio']} tijd={r['elapsed_s']}s "
                  f"credits={r['credits']} cleanup={r['cleanup_fired']} json_fallback={r['json_fallback_fired']}")

    rows.sort(key=lambda r: r["duration_s"])
    print("\n=== MEETTABEL ===")
    hdr = f"{'duur(min)':>9} {'secties':>7} {'dekking%':>8} {'correcties':>10} {'tr_woorden':>10} {'uit_woorden':>11} {'ratio':>6} {'tijd(s)':>7} {'credits':>7} {'tok_in':>8} {'tok_out':>8} {'cleanup':>7} {'jsonfb':>6}"
    print(hdr)
    for r in rows:
        print(f"{r['duration_min']:>9} {r['sections']:>7} {r['coverage_pct']:>8} {r['coverage_corrections']:>10} "
              f"{r['transcript_words']:>10} {r['output_words']:>11} {r['ratio']:>6} {r['elapsed_s']:>7} "
              f"{r['credits']:>7} {r['tokens_in']:>8} {r['tokens_out']:>8} {r['cleanup_fired']:>7} {r['json_fallback_fired']:>6}")

    if len(rows) >= 2:
        longest = rows[-1]
        # IJklijn = de video het dichtst bij 20min (de door de gebruiker gekozen referentie), NIET de
        # allerkortste — een zeer korte, dichte clip krijgt een hogere ratio (volledige uitwerking van
        # weinig woorden) en is geen eerlijke vergelijking voor een lange video.
        baseline = min(rows, key=lambda r: abs(r["duration_s"] - 1200))
        lo, hi = baseline["ratio"], longest["ratio"]
        factor = (max(lo, hi) / min(lo, hi)) if (lo > 0 and hi > 0) else float("inf")
        ok = factor <= 4.0  # ruim binnen één orde van grootte (10×)
        print(f"\nAcceptatie (verhouding langste {longest['duration_min']}min = {hi} vs ~20min-ijklijn "
              f"{baseline['duration_min']}min = {lo}; factor {factor:.1f}× — zelfde orde van grootte): "
              f"{'GESLAAGD' if ok else 'NIET GESLAAGD'}")

    # Eerste 100 woorden van 3 willekeurige hoofdstukken uit de LANGSTE video (preambule/dubbele-kop/
    # doorgelopen-inhoud-controle).
    longest = rows[-1] if rows else None
    if longest and longest["summary"].get("sections"):
        secs = longest["summary"]["sections"]
        k = min(3, len(secs))
        idxs = sorted(random.sample(range(len(secs)), k))
        print(f"\n=== EERSTE 100 WOORDEN — 3 hoofdstukken uit de langste video ({longest['duration_min']}min) ===")
        for i in idxs:
            s = secs[i]
            print(f"\n[hoofdstuk {i+1}/{len(secs)}] {s['heading']}  ({s['start_time']}s–{s['end_time']}s)")
            print(_first_100_words(s.get("content", "")))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("gebruik: venv/bin/python3 e2e_summary_measure.py <transcript_id> [<transcript_id> ...]")
        sys.exit(2)
    _load_env()
    if not os.environ.get("ASSEMBLYAI_API_KEY"):
        print("ASSEMBLYAI_API_KEY ontbreekt in backend/.env — de gateway is niet bereikbaar zonder key.")
        sys.exit(3)
    asyncio.run(main(sys.argv[1:]))

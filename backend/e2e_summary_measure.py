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

    t0 = time.monotonic()
    summary = await sp.run_summary(transcript_id, user_id, supabase=sb)
    elapsed = time.monotonic() - t0

    n_sections = len(summary.get("sections", []))
    out_words = _words(summary.get("overview", "")) + sum(_words(s.get("content", "")) for s in summary.get("sections", []))
    ratio = (out_words / transcript_words) if transcript_words else 0.0

    # Tokens/kosten uit de log-rijen van DEZE run (gekeyd op generated_at).
    gen = summary["generated_at"]
    logs = sb.table("ai_summary_usage_log").select("model,prompt_tokens,completion_tokens") \
        .eq("transcript_id", transcript_id).eq("generated_at", gen).execute().data or []
    tok_in = sum(r["prompt_tokens"] or 0 for r in logs)
    tok_out = sum(r["completion_tokens"] or 0 for r in logs)

    return {
        "id": transcript_id, "duration_min": round(duration / 60, 1), "sections": n_sections,
        "transcript_words": transcript_words, "output_words": out_words, "ratio": round(ratio, 3),
        "elapsed_s": round(elapsed, 1), "gateway_calls": len(logs),
        "tokens_in": tok_in, "tokens_out": tok_out,
    }


async def main(ids):
    rows = []
    for tid in ids:
        print(f"→ meet {tid} …")
        r = await measure(tid)
        if r:
            rows.append(r)
            print(f"  sections={r['sections']} transcript_words={r['transcript_words']} "
                  f"output_words={r['output_words']} ratio={r['ratio']} "
                  f"tijd={r['elapsed_s']}s calls={r['gateway_calls']} tok={r['tokens_in']}+{r['tokens_out']}")
    print("\n=== SAMENVATTING ===")
    print(f"{'duur(min)':>9} {'secties':>7} {'tr_woorden':>10} {'uit_woorden':>11} {'ratio':>6} {'tijd(s)':>7} {'tok_in':>8} {'tok_out':>8}")
    for r in rows:
        print(f"{r['duration_min']:>9} {r['sections']:>7} {r['transcript_words']:>10} {r['output_words']:>11} "
              f"{r['ratio']:>6} {r['elapsed_s']:>7} {r['tokens_in']:>8} {r['tokens_out']:>8}")
    if len(rows) >= 2:
        lo, hi = rows[0]["ratio"], rows[-1]["ratio"]
        same_order = lo > 0 and hi > 0 and (0.34 <= (hi / lo) <= 3.0)
        print(f"\nAcceptatie (verhouding 4u binnen dezelfde orde van grootte als 15min): "
              f"{'GESLAAGD' if same_order else 'NIET GESLAAGD'}  (ratio's {lo} vs {hi})")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("gebruik: venv/bin/python3 e2e_summary_measure.py <transcript_id> [<transcript_id> ...]")
        sys.exit(2)
    _load_env()
    if not os.environ.get("ASSEMBLYAI_API_KEY"):
        print("ASSEMBLYAI_API_KEY ontbreekt in backend/.env — de gateway is niet bereikbaar zonder key.")
        sys.exit(3)
    asyncio.run(main(sys.argv[1:]))

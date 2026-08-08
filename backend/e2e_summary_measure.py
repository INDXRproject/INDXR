"""
E2E-meetscript voor de AI-samenvatting (ADR-090). Draait de ECHTE twee-staps-pipeline op de
opgegeven transcript-id's en rapporteert:

  A. Kern-metrics per video (hoofdstukken, dekking, verhouding uitkomst/transcript, doorlooptijd,
     credits, tokens) — acceptatie op de verhouding.
  B. Kosten per MODELSTAP: invoer/uitvoer-tokens + euro-kost van stap 1 (structuur) vs stap 2
     (uitwerking, samen), tegen de tarieven uit cost_config × wisselkoers. Plus per video de
     werkelijke kostprijs naast de opbrengst van de in rekening gebrachte credits op elk van de vier
     pakketprijzen uit pricing.ts, zodat de marge-omslag zichtbaar is.
  C. Stap-1-modelvergelijking: draait op de LANGSTE video stap 1 (alleen) op gemini-2.5-flash en
     claude-haiku-4-5 (naast de sonnet-4-6-run uit A/B) — aantal hoofdstukken, dekking, de koppen en
     de stap-1-kost, zodat handmatig te beoordelen is of sonnet zijn prijs waard is.
  D. Thinking-tokens: rapporteert of de gateway thinking/reasoning-tokens apart in de usage teruggeeft;
     zo ja het aandeel per video, zo nee expliciet dat token↔woord onze enige indicator is.

MEET-ONLY: geen productiecode/prompt/formule gewijzigd. De pipeline-helpers worden hergebruikt en
`sp._gateway_call` wordt at-runtime gewrapt om de ruwe usage te vangen; de stap-1-modelwissel is een
runtime-override van `sp.STRUCTURE_MODEL` binnen dit script. Er worden GEEN credits aangerekend (dit
omzeilt de reserve/settle-keten) en de transcripten krijgen GEEN opgeslagen ai_summary; wel schrijft
elke gateway-call — net als productie — een rij in ai_summary_usage_log (kostenboeking).

Vereist: backend/.env met SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + ASSEMBLYAI_API_KEY.
Draaien:  cd backend && venv/bin/python3 e2e_summary_measure.py <5min_id> <20min_id> <1u_id> <4u_id>
"""
import os
import sys
import time
import json
import random
import asyncio
from pathlib import Path

import httpx


def _load_env():
    for line in (Path(__file__).resolve().parent / ".env").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _words(s: str) -> int:
    return len((s or "").split())


# Pakket-tiers — gespiegeld uit packages/shared/src/lib/pricing.ts (ADR-058). BRUTO, BTW-inclusieve
# lijstprijs (ADR-087): de werkelijke netto-opbrengst ligt lager (na BTW + Stripe-fee); dit is de
# opbrengst "op de pakketprijs" zoals gevraagd.
TIERS = [("Try", 5.0, 100), ("Starter", 15.0, 400), ("Plus", 25.0, 1000), ("Power", 60.0, 3000)]

# NB: de EU-gateway kent de KALE alias "claude-haiku-4-5" niet (400 "model not found"); de gedateerde
# id "claude-haiku-4-5-20251001" werkt wél. (Bevinding: de productie-SECTION_FALLBACK gebruikt de kale
# alias en zou dus falen als hij ooit vuurt — buiten scope van deze meettaak.)
STRUCTURE_VARIANTS = ["claude-sonnet-4-6", "gemini-2.5-flash", "claude-haiku-4-5-20251001"]


def _load_cost_rates(sb) -> dict:
    r = sb.table("cost_config").select(
        "assemblyai_llm_usd_per_1m_input_tokens,assemblyai_llm_usd_per_1m_output_tokens,"
        "assemblyai_llm_sonnet_usd_per_1m_input_tokens,assemblyai_llm_sonnet_usd_per_1m_output_tokens,"
        "usd_eur_rate"
    ).order("effective_from", desc=True).limit(1).execute().data[0]
    return {k: float(v) for k, v in r.items()}


def _eur(in_tok: int, out_tok: int, model: str, rates: dict) -> float:
    """Euro-kost van één call — per-model tarief (zoals _geld_scope: sonnet-4-6 tegen het sonnet-tarief,
    al het overige — gemini én haiku — tegen het gateway/gemini-tarief; cost_config heeft geen apart
    haiku-tarief)."""
    if (model or "").startswith("claude-sonnet-4-6"):
        ci, co = rates["assemblyai_llm_sonnet_usd_per_1m_input_tokens"], rates["assemblyai_llm_sonnet_usd_per_1m_output_tokens"]
    else:
        ci, co = rates["assemblyai_llm_usd_per_1m_input_tokens"], rates["assemblyai_llm_usd_per_1m_output_tokens"]
    return (in_tok / 1e6 * ci + out_tok / 1e6 * co) * rates["usd_eur_rate"]


# ── Runtime-wrap van de gateway-call om de RUWE usage te vangen (meet-only) ─────
import summary_pipeline as sp  # noqa: E402
from credit_manager import get_supabase_client, calculate_summary_cost  # noqa: E402


async def _gateway_call_measured(client, api_key, payload):
    headers = {"authorization": api_key, "Content-Type": "application/json"}
    resp = await client.post(sp.LLM_GATEWAY_URL, headers=headers, json=payload)
    if resp.status_code != 200:
        raise RuntimeError(f"LLM Gateway {payload.get('model')} -> {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    usage = data.get("usage") or {}
    return {
        "content": data["choices"][0]["message"]["content"],
        "prompt_tokens": int(usage.get("input_tokens") or usage.get("prompt_tokens") or 0),
        "completion_tokens": int(usage.get("output_tokens") or usage.get("completion_tokens") or 0),
        "request_id": data.get("request_id") or data.get("id"),
        "model": data.get("model") or payload.get("model"),
        "raw_usage": usage,                    # volledige usage — voor thinking-detectie
        "raw_top_keys": sorted(data.keys()),
    }


sp._gateway_call = _gateway_call_measured  # globals-lookup at call time → _run_structure/_run_section gebruiken deze


def _thinking_tokens(usage: dict):
    """Zoek een apart-gerapporteerd thinking/reasoning-veld in de gateway-usage. Retourneert
    (aantal, veldnaam) of (None, None)."""
    if not isinstance(usage, dict):
        return None, None
    for parent, child in [("output_tokens_details", "reasoning_tokens"),
                          ("completion_tokens_details", "reasoning_tokens"),
                          ("output_tokens_details", "thinking_tokens")]:
        d = usage.get(parent)
        if isinstance(d, dict) and d.get(child) is not None:
            return int(d[child]), f"{parent}.{child}"
    for k in ("reasoning_tokens", "thoughts_token_count", "thinking_tokens"):
        if usage.get(k) is not None:
            return int(usage[k]), k
    return None, None


async def run_measured(sb, tid: str, structure_model: str = None, run_step2: bool = True) -> dict:
    """Orkestreert de ECHTE pipeline via de interne helpers, zodat per-call/per-stap tokens gevangen
    worden. `structure_model` overschrijft (runtime, meet-only) het stap-1-model. `run_step2=False`
    draait alleen stap 1 (voor de modelvergelijking)."""
    api_key = os.environ["ASSEMBLYAI_API_KEY"]
    row = sb.table("transcripts").select("transcript,duration,user_id").eq("id", tid).single().execute()
    segs = row.data["transcript"] or []
    duration = row.data.get("duration") or sp.total_transcript_seconds(segs)
    user_id = row.data["user_id"]
    min_s, max_s = sp.section_bounds(duration)

    orig_model = sp.STRUCTURE_MODEL
    if structure_model:
        sp.STRUCTURE_MODEL = structure_model
    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=sp.GATEWAY_TIMEOUT_S) as client:
            struct = await sp._run_structure(client, api_key, segs, min_s, max_s)
            overview = (struct["structured"].get("overview") or "").strip()
            sections, coverage = sp._normalize_sections(
                struct["structured"].get("sections") or [], min_s, max_s, struct["total_seconds"]
            )
            results = []
            if run_step2:
                sem = asyncio.Semaphore(sp.SECTION_CONCURRENCY)
                results = await asyncio.gather(*[
                    sp._run_section(client, api_key, sem, s, overview, segs) for s in sections
                ])
    finally:
        sp.STRUCTURE_MODEL = orig_model
    elapsed = time.monotonic() - t0

    return {
        "tid": tid, "duration": duration, "duration_min": round(duration / 60, 1), "user_id": user_id,
        "transcript_words": sum(_words(s.get("text", "")) for s in segs),
        "step1_call": struct["call"], "overview": overview, "sections": sections,
        "coverage": coverage, "results": results, "elapsed": round(elapsed, 1),
    }


def _fmt_eur(x: float) -> str:
    return f"€{x:.4f}"


async def main(ids):
    sb = get_supabase_client()
    rates = _load_cost_rates(sb)
    print(f"cost_config: gemini ${rates['assemblyai_llm_usd_per_1m_input_tokens']}/"
          f"${rates['assemblyai_llm_usd_per_1m_output_tokens']} · sonnet "
          f"${rates['assemblyai_llm_sonnet_usd_per_1m_input_tokens']}/"
          f"${rates['assemblyai_llm_sonnet_usd_per_1m_output_tokens']} per 1M · FX {rates['usd_eur_rate']}\n")

    runs = []
    for tid in ids:
        print(f"→ A/B/D: volledige run {tid} …")
        r = await run_measured(sb, tid, run_step2=True)
        runs.append(r)

    # ── Afgeleide per-run-cijfers ──────────────────────────────────────────────
    for r in runs:
        s1 = r["step1_call"]
        step2_calls = [x["call"] for x in r["results"] if x.get("call")]
        r["s1_in"], r["s1_out"], r["s1_model"] = s1["prompt_tokens"], s1["completion_tokens"], s1["model"]
        r["s2_in"] = sum(c["prompt_tokens"] for c in step2_calls)
        r["s2_out"] = sum(c["completion_tokens"] for c in step2_calls)
        r["s1_eur"] = _eur(r["s1_in"], r["s1_out"], r["s1_model"], rates)
        r["s2_eur"] = sum(_eur(c["prompt_tokens"], c["completion_tokens"], c["model"], rates) for c in step2_calls)
        r["cost_eur"] = r["s1_eur"] + r["s2_eur"]
        r["credits"] = calculate_summary_cost(r["duration"])
        r["sections_n"] = len(r["results"])
        r["out_words"] = _words(r["overview"]) + sum(_words(x.get("content", "")) for x in r["results"])
        r["ratio"] = round(r["out_words"] / r["transcript_words"], 3) if r["transcript_words"] else 0.0
        r["cov_pct"] = r["coverage"].get("raw_covered_pct", 0.0)
        # Thinking-tokens over alle calls van deze run.
        allcalls = [s1] + step2_calls
        think_field = None
        think_total = 0
        for c in allcalls:
            t, f = _thinking_tokens(c.get("raw_usage", {}))
            if t is not None:
                think_total += t
                think_field = f
        r["think_field"] = think_field
        r["think_total"] = think_total if think_field else None
        r["total_out"] = r["s1_out"] + r["s2_out"]

    runs.sort(key=lambda r: r["duration"])

    # ── A. Kern-metrics ────────────────────────────────────────────────────────
    print("\n=== A. KERN-METRICS ===")
    print(f"{'duur(min)':>9} {'secties':>7} {'dekking%':>8} {'tr_woorden':>10} {'uit_woorden':>11} {'ratio':>6} {'tijd(s)':>7} {'credits':>7}")
    for r in runs:
        print(f"{r['duration_min']:>9} {r['sections_n']:>7} {r['cov_pct']:>8} {r['transcript_words']:>10} "
              f"{r['out_words']:>11} {r['ratio']:>6} {r['elapsed']:>7} {r['credits']:>7}")

    # ── B. Kosten per modelstap + marge per pakket ─────────────────────────────
    print("\n=== B1. TOKENS + KOSTEN PER MODELSTAP ===")
    print(f"{'duur(min)':>9} {'s1_in':>7} {'s1_out':>7} {'s1_€':>9} {'s2_in':>8} {'s2_out':>8} {'s2_€':>9} {'totaal_€':>9}")
    for r in runs:
        print(f"{r['duration_min']:>9} {r['s1_in']:>7} {r['s1_out']:>7} {_fmt_eur(r['s1_eur']):>9} "
              f"{r['s2_in']:>8} {r['s2_out']:>8} {_fmt_eur(r['s2_eur']):>9} {_fmt_eur(r['cost_eur']):>9}")

    print("\n=== B2. MARGE: opbrengst (credits × pakketprijs) − werkelijke kostprijs ===")
    print("(opbrengst = bruto/BTW-incl. lijstprijs; netto ligt lager na BTW + Stripe-fee)")
    print(f"{'duur(min)':>9} {'credits':>7} {'kost_€':>8} | tiers: " + "  ".join(f"{n} €{p:.0f}/{c}cr" for n, p, c in TIERS))
    for r in runs:
        cells = []
        for name, price, cred in TIERS:
            revenue = r["credits"] * (price / cred)
            margin = revenue - r["cost_eur"]
            flag = "" if margin >= 0 else "  ← VERLIES"
            cells.append(f"{revenue:.3f}/{margin:+.3f}{flag}")
        print(f"{r['duration_min']:>9} {r['credits']:>7} {_fmt_eur(r['cost_eur']):>8} | " + " | ".join(cells))
    print("Leeswijzer: per tier 'opbrengst€/marge€'. Marge < 0 = de kostprijs overstijgt de opbrengst.")

    # ── D. Thinking-tokens ─────────────────────────────────────────────────────
    print("\n=== D. THINKING-TOKENS ===")
    sample = runs[-1]["step1_call"].get("raw_usage", {})
    print(f"Ruwe usage-velden (stap-1-call langste video): {json.dumps(sample)}")
    print(f"Top-level respons-velden: {runs[-1]['step1_call'].get('raw_top_keys')}")
    any_think = any(r["think_field"] for r in runs)
    if any_think:
        print(f"{'duur(min)':>9} {'veld':>28} {'thinking':>9} {'totaal_out':>10} {'aandeel':>8}")
        for r in runs:
            if r["think_field"]:
                share = f"{100.0*r['think_total']/r['total_out']:.1f}%" if r["total_out"] else "?"
                print(f"{r['duration_min']:>9} {r['think_field']:>28} {r['think_total']:>9} {r['total_out']:>10} {share:>8}")
    else:
        print("De gateway rapporteert GEEN apart thinking/reasoning-tokenveld in de usage. De gerapporteerde")
        print("output_tokens omvatten dus eventueel intern denkwerk onzichtbaar — de verhouding token↔woord")
        print("is onze enige indicator van hoeveel van de uitvoer denkwerk is.")

    # ── C. Stap-1-modelvergelijking op de LANGSTE video ────────────────────────
    longest = runs[-1]
    print(f"\n=== C. STAP-1-MODELVERGELIJKING op de langste video ({longest['duration_min']}min) ===")
    variants = []
    for model in STRUCTURE_VARIANTS:
        try:
            if model == sp.STRUCTURE_MODEL:
                # sonnet: hergebruik de stap-1 van de volledige run (geen extra call).
                vr = {"model": model, "step1_call": longest["step1_call"], "sections": longest["sections"],
                      "coverage": longest["coverage"]}
            else:
                print(f"→ C: stap-1 op {model} …")
                vm = await run_measured(sb, longest["tid"], structure_model=model, run_step2=False)
                vr = {"model": model, "step1_call": vm["step1_call"], "sections": vm["sections"],
                      "coverage": vm["coverage"]}
        except Exception as e:
            print(f"  C-variant {model} FAALDE (overgeslagen): {e}")
            continue
        c = vr["step1_call"]
        vr["s1_eur"] = _eur(c["prompt_tokens"], c["completion_tokens"], c["model"], rates)
        vr["n"] = len(vr["sections"])
        vr["cov"] = vr["coverage"].get("raw_covered_pct", 0.0)
        variants.append(vr)

    print(f"\n{'model':>22} {'hoofdstukken':>12} {'dekking%':>8} {'stap1_€':>9} {'served_model':>26}")
    for vr in variants:
        print(f"{vr['model']:>22} {vr['n']:>12} {vr['cov']:>8} {_fmt_eur(vr['s1_eur']):>9} {vr['step1_call']['model']:>26}")

    for vr in variants:
        print(f"\n--- KOPPEN — stap-1 op {vr['model']} ({vr['n']} hoofdstukken, dekking {vr['cov']}%) ---")
        for i, s in enumerate(vr["sections"]):
            mm = s["start_time"] // 60
            print(f"  {i+1:>2}. [{mm//60}:{mm%60:02d}] {s['heading']}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("gebruik: venv/bin/python3 e2e_summary_measure.py <transcript_id> [<transcript_id> ...]")
        sys.exit(2)
    _load_env()
    if not os.environ.get("ASSEMBLYAI_API_KEY"):
        print("ASSEMBLYAI_API_KEY ontbreekt in backend/.env — de gateway is niet bereikbaar zonder key.")
        sys.exit(3)
    asyncio.run(main(sys.argv[1:]))

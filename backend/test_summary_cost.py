"""
Sync-check: de backend AI-samenvatting-creditformule (credit_manager.calculate_summary_cost) moet exact
de gedeelde fixture test-fixtures/summary_cost.json opleveren — dezelfde fixture die de TS-spiegel
packages/shared/src/lib/pricing.summaryCreditCost checkt via summaryCost.test.ts. De backend is het
financiële pad (reserve/settle/refund lezen deze functie); divergentie met de TS-bron = de app toont een
ander bedrag dan de backend rekent (echt-geld-bug).

Pure formule-test: importeert alleen calculate_summary_cost (lazy Supabase-client, geen DB/netwerk nodig).
Divergentie -> exit 1 met een leesbare melding. Run: venv/bin/python3 test_summary_cost.py
"""
import json
import os
import sys

from credit_manager import calculate_summary_cost

FIXTURE = os.path.join(os.path.dirname(__file__), "..", "test-fixtures", "summary_cost.json")


def main():
    fx = json.load(open(FIXTURE))
    failures = 0
    for case in fx["cases"]:
        dur, want = case["duration_seconds"], case["credits"]
        got = calculate_summary_cost(dur)
        ok = got == want
        failures += not ok
        msg = "" if ok else (
            "  <-- DIVERGENTIE: pas test-fixtures/summary_cost.json + packages/shared/src/lib/pricing.ts "
            "(summaryCreditCost) aan credit_manager.calculate_summary_cost aan (of herstel de backend)"
        )
        print(f"{'OK ' if ok else 'XX '}cost({dur:>6}s) backend={got} fixture={want}{msg}")
    print("ALL_PASS" if not failures else f"{failures}_FAIL")
    return failures


if __name__ == "__main__":
    sys.exit(1 if main() else 0)

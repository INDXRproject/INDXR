"""
Sync-check: parse_keyterms() moet elke case in de gedeelde fixture test-fixtures/spelling_hints_split.json
op het verwachte aantal termen splitsen. Dezelfde fixture wordt gecheckt tegen de TS-spiegel
(packages/shared/src/lib/spellingHints.test.ts). Live gevonden 2026-11-12: Arabische komma's (،) en
newline/puntkomma werden niet gesplitst → 0 resp. 1 term in plaats van 3 resp. 4.

Run: venv/bin/python3 test_spelling_hints_split.py
"""
import json
import os
import sys

from spelling_hints import parse_keyterms

FIXTURE = os.path.join(os.path.dirname(__file__), "..", "test-fixtures", "spelling_hints_split.json")


def main():
    cases = json.load(open(FIXTURE))["cases"]
    failed = False
    for c in cases:
        terms = parse_keyterms(c["input"])
        if len(terms) != c["expected_count"]:
            print(f"XX  {c['input']!r}: got {len(terms)} terms {terms}, expected {c['expected_count']}")
            failed = True
        else:
            print(f"OK  {c['input']!r}: {len(terms)} terms")

    if failed:
        print("1_FAIL")
        return 1
    print("ALL_PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())

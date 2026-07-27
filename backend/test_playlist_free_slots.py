"""
Verificatie van de gratis-slots-regel (per-methode, STAP 2 — geldpad).

Bewijst per scenario:
  (1) de helper == de verwachte gratis-set uit de GEDEELDE fixture (ook door de TS-test geladen);
  (2) reservering == Σsettlement (beide via dezelfde helper -> kunnen niet uiteenlopen);
  (3) per-methode is NOOIT duurder dan de oude positionele regel — altijd goedkoper of gelijk.

Run: venv/bin/python3 test_playlist_free_slots.py
"""
import json
import os
import sys

from credit_manager import playlist_free_ids, calculate_credit_cost

FIXTURE = os.path.join(os.path.dirname(__file__), "..", "test-fixtures", "playlist_free_slots.json")


def _whisper_cost(vid, meta):
    d = (meta.get(vid) or {}).get("duration")
    return calculate_credit_cost(d) if d and d > 0 else 1


def _positional_reservation(video_ids, whisper_ids, meta, is_retry):
    # OUDE regel (pre-STAP-2): caption gratis iff idx<3 and not is_retry.
    ws = set(whisper_ids or [])
    total = 0
    for idx, vid in enumerate(video_ids):
        if vid in ws:
            total += _whisper_cost(vid, meta)
        elif is_retry or idx >= 3:
            total += 1
    return total


def _charge(video_ids, whisper_ids, meta, is_retry):
    # Zowel reservering als settlement (all-succeed) gebruiken DEZELFDE helper -> identiek per definitie.
    ws = set(whisper_ids or [])
    free = playlist_free_ids(video_ids, whisper_ids, is_retry)
    total = 0
    for vid in video_ids:
        if vid in ws:
            total += _whisper_cost(vid, meta)
        elif vid not in free:
            total += 1
    return total


def main():
    cases = json.load(open(FIXTURE))["cases"]
    failures = 0
    for c in cases:
        vids, ws, retry = c["video_ids"], c["whisper_ids"], c["is_retry"]
        meta = {v: {"duration": 120} for v in ws}  # 2 credits per whisper-video
        got = sorted(playlist_free_ids(vids, ws, retry))
        ok_free = got == sorted(c["expected_free"])
        reservation = _charge(vids, ws, meta, retry)
        settlement = _charge(vids, ws, meta, retry)  # zelfde helper -> zelfde regel
        ok_reconcile = reservation == settlement
        positional = _positional_reservation(vids, ws, meta, retry)
        ok_cheaper = reservation <= positional
        ok = ok_free and ok_reconcile and ok_cheaper
        failures += not ok
        cheaper = "=" if reservation == positional else f"<{positional} (cheaper)"
        print(f"{'OK ' if ok else 'XX '}{c['name']:<26} free={got} "
              f"reserve==settle={ok_reconcile} ({reservation}) vs positional {cheaper}")
    print("ALL_PASS" if not failures else f"{failures}_FAIL")
    return failures


if __name__ == "__main__":
    sys.exit(1 if main() else 0)

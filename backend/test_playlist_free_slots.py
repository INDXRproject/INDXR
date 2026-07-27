"""
No-op bewijs voor de gratis-slots-consolidatie (STAP 1). Draait de OUDE inline-regel en de NIEUWE
helper-gebaseerde regel naast elkaar en toont dat ze identiek zijn — voor de gratis-set, de settlement
(is_free per caption) én de reservering. Laadt de GEDEELDE fixture (ook door de TS-test geladen).

Run: venv/bin/python3 test_playlist_free_slots.py
"""
import json
import os
import sys

from credit_manager import playlist_free_ids, calculate_credit_cost

FIXTURE = os.path.join(os.path.dirname(__file__), "..", "test-fixtures", "playlist_free_slots.json")


def _old_is_free(video_index, is_retry):
    # OUDE inline settlement-regel (pre-consolidatie: worker.py:431 en :692).
    return video_index < 3 and not is_retry


def _old_reservation(video_ids, whisper_ids, meta, is_retry):
    # OUDE inline reservering (pre-consolidatie: _compute_playlist_reservation).
    ws = set(whisper_ids or [])
    total = 0
    for idx, vid in enumerate(video_ids):
        if vid in ws:
            d = (meta.get(vid) or {}).get("duration")
            total += calculate_credit_cost(d) if d and d > 0 else 1
        elif is_retry or idx >= 3:
            total += 1
    return total


def _new_reservation(video_ids, whisper_ids, meta, is_retry):
    # NIEUWE helper-gebaseerde reservering (post-consolidatie — spiegelt main.py).
    ws = set(whisper_ids or [])
    free = playlist_free_ids(video_ids, whisper_ids, is_retry)
    total = 0
    for vid in video_ids:
        if vid in ws:
            d = (meta.get(vid) or {}).get("duration")
            total += calculate_credit_cost(d) if d and d > 0 else 1
        elif vid not in free:
            total += 1
    return total


def main():
    cases = json.load(open(FIXTURE))["cases"]
    failures = 0
    for c in cases:
        vids, ws, retry = c["video_ids"], c["whisper_ids"], c["is_retry"]
        wset = set(ws)
        # (1) helper == verwachte gratis-set
        got = sorted(playlist_free_ids(vids, ws, retry))
        ok_free = got == sorted(c["expected_free"])
        # (2) settlement no-op: voor elke CAPTION-video oude is_free == nieuwe (vid in gratis-set)
        new_free = playlist_free_ids(vids, ws, retry)
        ok_settle = all(
            _old_is_free(i, retry) == (vid in new_free)
            for i, vid in enumerate(vids) if vid not in wset
        )
        # (3) reservering no-op: oude totaal == nieuwe totaal (whisper krijgt 120s = 2 credits)
        meta = {v: {"duration": 120} for v in ws}
        old_t, new_t = _old_reservation(vids, ws, meta, retry), _new_reservation(vids, ws, meta, retry)
        ok_res = old_t == new_t
        ok = ok_free and ok_settle and ok_res
        failures += not ok
        print(f"{'OK ' if ok else 'XX '}{c['name']:<26} free={got} settle_noop={ok_settle} "
              f"reserve old={old_t}==new={new_t}:{ok_res}")
    print("ALL_PASS" if not failures else f"{failures}_FAIL")
    return failures


if __name__ == "__main__":
    sys.exit(1 if main() else 0)

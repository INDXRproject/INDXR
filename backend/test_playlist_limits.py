"""
Sync-check: de backend-gehandhaafde playlist/job-limieten moeten gelijk zijn aan de gedeelde fixture
test-fixtures/playlist_limits.json (die ook de TS-spiegel packages/shared/src/lib/limits.ts checkt via
limits.test.ts). De backend is de handhaver; deze test importeert de constanten uit backend/limits.py
(een module met ALLEEN constanten — geen FastAPI-opstart) en vergelijkt.

Divergentie -> exit 1 met een leesbare melding. Run: venv/bin/python3 test_playlist_limits.py
"""
import json
import os
import sys

from limits import MAX_PLAYLIST_VIDEOS, MAX_CONCURRENT_JOBS, MAX_TRANSCRIPTION_SECONDS

FIXTURE = os.path.join(os.path.dirname(__file__), "..", "test-fixtures", "playlist_limits.json")


def main():
    fx = json.load(open(FIXTURE))
    checks = [
        ("videos_per_job",            MAX_PLAYLIST_VIDEOS,       fx["videos_per_job"]),
        ("concurrent_jobs",           MAX_CONCURRENT_JOBS,       fx["concurrent_jobs"]),
        ("transcription_max_seconds", MAX_TRANSCRIPTION_SECONDS, fx["transcription_max_seconds"]),
    ]
    failures = 0
    for name, backend_val, fixture_val in checks:
        ok = backend_val == fixture_val
        failures += not ok
        msg = "" if ok else (
            "  <-- DIVERGENTIE: pas test-fixtures/playlist_limits.json + packages/shared/src/lib/limits.ts "
            "aan backend/limits.py aan (of herstel backend/limits.py)"
        )
        print(f"{'OK ' if ok else 'XX '}{name:<26} backend={backend_val} fixture={fixture_val}{msg}")
    print("(large_job_warn_at is UI-only -> geen backend-tegenhanger; alleen limits.test.ts checkt die)")
    print("ALL_PASS" if not failures else f"{failures}_FAIL")
    return failures


if __name__ == "__main__":
    sys.exit(1 if main() else 0)

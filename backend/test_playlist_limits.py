"""
Sync-check: de backend-gehandhaafde playlist/job-limieten moeten gelijk zijn aan de gedeelde fixture
test-fixtures/playlist_limits.json (die ook de TS-spiegel packages/shared/src/lib/limits.ts checkt via
limits.test.ts). De backend is de handhaver; deze test leest de LITERALS uit de broncode in plaats van
main.py te importeren (dat zou de hele FastAPI-app opstarten, met env/Sentry/Supabase-side-effects).

Divergentie -> exit 1 met een leesbare melding. Run: venv/bin/python3 test_playlist_limits.py
"""
import json
import os
import re
import sys

HERE = os.path.dirname(__file__)
FIXTURE = os.path.join(HERE, "..", "test-fixtures", "playlist_limits.json")


def _int_assign(rel_path, name):
    """Lees `NAME = <rekenkundige-int-expressie>` uit een backend-bronbestand (bv. `500` of `10 * 3600`)."""
    src = open(os.path.join(HERE, rel_path), encoding="utf-8").read()
    m = re.search(rf"^{name}\s*=\s*([0-9][0-9_ ]*(?:\*[0-9_ ]+)*)", src, re.M)
    if not m:
        raise SystemExit(f"XX kon assignment '{name} = ...' niet vinden in backend/{rel_path}")
    return int(eval(m.group(1), {"__builtins__": {}}, {}))  # noqa: S307 - alleen cijfers/*/_/spaties


def main():
    fx = json.load(open(FIXTURE))
    checks = [
        ("videos_per_job",            _int_assign("main.py", "MAX_PLAYLIST_VIDEOS"),                          fx["videos_per_job"]),
        ("concurrent_jobs",           _int_assign("main.py", "MAX_CONCURRENT_JOBS"),                          fx["concurrent_jobs"]),
        ("transcription_max_seconds", _int_assign("transcription_pipeline.py", "MAX_TRANSCRIPTION_SECONDS"),  fx["transcription_max_seconds"]),
    ]
    failures = 0
    for name, backend_val, fixture_val in checks:
        ok = backend_val == fixture_val
        failures += not ok
        msg = "" if ok else (
            "  <-- DIVERGENTIE: pas test-fixtures/playlist_limits.json + packages/shared/src/lib/limits.ts "
            "aan de backend aan (of herstel de backend)"
        )
        print(f"{'OK ' if ok else 'XX '}{name:<26} backend={backend_val} fixture={fixture_val}{msg}")
    print("(large_job_warn_at is UI-only -> geen backend-tegenhanger; alleen limits.test.ts checkt die)")
    print("ALL_PASS" if not failures else f"{failures}_FAIL")
    return failures


if __name__ == "__main__":
    sys.exit(1 if main() else 0)

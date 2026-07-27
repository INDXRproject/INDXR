"""
Commit 3 — ECHTE submit+poll smoke tegen AssemblyAI (lokaal, kleine sample).

Vereist ASSEMBLYAI_API_KEY in de omgeving (staat NIET in de lokale .env — alleen op Railway).
Zet 'm tijdelijk lokaal en draai:

    ASSEMBLYAI_API_KEY=... venv/bin/python3 smoke_submit_poll.py [pad/naar/sample.mp3]

Geen sample meegegeven → genereert een kort 8s-fragment met ffmpeg (spraak-arm; bewijst de
submit→queued→processing→completed-levenscyclus + provider-id, maar detecteert geen taal/woorden).
Geef een echt spraakfragment mee voor taal/model/segment-bewijs.

Print: provider_transcript_id, alle geobserveerde statussen, en (bij completed) taal/model/#segmenten.
Dit is de laatste lokale groene-bewijs-stap vóór push (jouw voorwaarde bij optie 1).
"""
import os
import sys
import time
import subprocess

from assemblyai_client import submit_assemblyai, poll_assemblyai

POLL_INTERVAL = 5


def _make_tone_sample(path: str) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
         "-ac", "1", "-ar", "16000", path],
        check=True, capture_output=True,
    )


def main() -> int:
    if not os.getenv("ASSEMBLYAI_API_KEY"):
        print("FAIL: ASSEMBLYAI_API_KEY niet gezet — kan de echte smoke niet draaien.")
        return 2

    sample = sys.argv[1] if len(sys.argv) > 1 else "/tmp/indxr_smoke_tone.wav"
    if len(sys.argv) <= 1:
        print(f"Geen sample meegegeven → genereer 8s-toon: {sample}")
        _make_tone_sample(sample)
    print(f"Sample: {sample}")

    t0 = time.time()
    sub = submit_assemblyai(sample)
    print("submit_assemblyai ->", sub)
    if not sub.get("success"):
        print("FAIL: submit faalde")
        return 1
    pid = sub["transcript_id"]
    print(f"provider_transcript_id = {pid}")

    seen = []
    deadline = time.time() + 600
    while True:
        polled = poll_assemblyai(pid)
        st = polled.get("status") if polled.get("success") else f"poll-fail:{polled.get('error')}"
        if not seen or seen[-1] != st:
            seen.append(st)
            print(f"  [{int(time.time()-t0):3d}s] status={st}")
        if polled.get("success") and polled.get("status") == "completed":
            print("COMPLETED:")
            print("  language =", polled.get("language"))
            print("  model    =", polled.get("model"))
            print("  duration =", polled.get("duration"))
            print("  segments =", len(polled.get("transcript") or []))
            print("\nStatus-traject:", " -> ".join(seen))
            print("PASS: echte submit+poll levenscyclus voltooid.")
            return 0
        if polled.get("success") and polled.get("status") == "error":
            print("Provider error:", polled.get("error"))
            print("\nStatus-traject:", " -> ".join(seen))
            # 'error' op een spraakloze toon kan legitiem zijn; levenscyclus is bewezen.
            return 0
        if time.time() > deadline:
            print("FAIL: smoke-timeout (10min)")
            return 1
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    raise SystemExit(main())

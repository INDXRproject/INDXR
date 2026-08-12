"""
Ad-hoc end-to-end verification for the MOV/FLV/AVI/MKV upload-format expansion (ADR-097).
NOT a unit test — it hits the REAL AssemblyAI EU API and uses REAL ffmpeg. Run manually:

    ASSEMBLYAI_API_KEY loaded from backend/.env
    venv/bin/python3 verify_video_formats.py <path-to-jfk.flac>

For each of the 4 new formats it builds a small (<25MB) and a large (>25MB) file carrying the same
11s speech clip, runs the EXACT pipeline decision (raw for mov/flv, transcode for avi/mkv; size
branch for the large raw file), submits to AssemblyAI, polls to completion, and checks the returned
text contains the expected words. Then it checks the content gate (has_usable_audio) on a no-audio
file renamed to an accepted extension, and on a valid file whose extension mismatches its container.
"""
import os
import sys
import time
import subprocess
import tempfile

# Load the AssemblyAI key from backend/.env BEFORE importing assemblyai_client (reads it at import).
_env = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env):
    for line in open(_env):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from audio_utils import (
    get_audio_container, needs_provider_transcode, compress_audio_if_needed,
    has_usable_audio, validate_audio_file, get_audio_duration, SUPPORTED_FORMATS,
)
from assemblyai_client import submit_assemblyai, poll_assemblyai

EXPECT = ["country", "fellow", "americans", "ask"]  # JFK clip keywords


def build(fmt: str, big: bool, audio: str, outdir: str) -> str:
    """Mux the speech clip into <fmt>, with a video track. big=True inflates size past 25MB via a
    high-bitrate 720p video while keeping the same 11s audio (cheap transcription)."""
    out = os.path.join(outdir, f"clip_{'big' if big else 'small'}.{fmt}")
    if big:
        vsrc = ["-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=11", "-b:v", "40M"]
    else:
        vsrc = ["-f", "lavfi", "-i", "testsrc=size=320x240:rate=15:duration=11"]
    vcodec = ["-c:v", "flv1"] if fmt == "flv" else ["-c:v", "mpeg4"]
    cmd = ["ffmpeg", "-y", "-i", audio, *vsrc, "-shortest",
           "-map", "1:v", "-map", "0:a", *vcodec, "-c:a", "aac", out]
    subprocess.run(cmd, capture_output=True, check=True)
    return out


def run_provider(path: str) -> dict:
    """Replicate the pipeline's submit path: transcode if the detected container isn't provider-raw,
    else send raw (size branch is a no-op under 500MB). Returns run facts + verdict."""
    size_mb = os.path.getsize(path) / 1024 / 1024
    container = get_audio_container(path, path)
    must_transcode = needs_provider_transcode(container)
    submit_path = path
    transcoded = False
    if must_transcode or size_mb > 25:
        newp = compress_audio_if_needed(path, force=must_transcode)
        if newp != path:
            submit_path, transcoded = newp, True
    sub = submit_assemblyai(submit_path)
    if not sub.get("success"):
        return {"container": container, "size_mb": size_mb, "transcoded": transcoded,
                "accepted": False, "text": "", "error": sub.get("error")}
    tid = sub["transcript_id"]
    text, status = "", ""
    for _ in range(60):  # up to ~5 min
        time.sleep(5)
        pol = poll_assemblyai(tid)
        status = pol.get("status", "")
        if status == "completed":
            text = " ".join(s["text"] for s in pol.get("transcript", []))
            break
        if status == "error":
            return {"container": container, "size_mb": size_mb, "transcoded": transcoded,
                    "accepted": False, "text": "", "error": pol.get("error")}
    low = text.lower()
    hits = [w for w in EXPECT if w in low]
    return {"container": container, "size_mb": size_mb, "transcoded": transcoded,
            "accepted": status == "completed", "text": text, "hits": hits,
            "content_ok": len(hits) >= 2}


def main():
    audio = sys.argv[1] if len(sys.argv) > 1 else "jfk.flac"
    if not os.path.exists(audio):
        print(f"speech sample not found: {audio}"); sys.exit(1)
    outdir = tempfile.mkdtemp(prefix="verify_fmt_")
    print(f"SUPPORTED_FORMATS ({len(SUPPORTED_FORMATS)}): {sorted(SUPPORTED_FORMATS)}\n")

    for fmt in ["mov", "flv", "avi", "mkv"]:
        for big in [False, True]:
            path = build(fmt, big, audio, outdir)
            val = validate_audio_file(path)
            r = run_provider(path)
            tag = "large(>25MB)" if big else "small(<25MB)"
            print(f"[{fmt.upper()} {tag}] size={r['size_mb']:.1f}MB container={r['container']} "
                  f"validate_ok={val['valid']} transcoded={r['transcoded']} "
                  f"provider_accepted={r['accepted']} content_ok={r.get('content_ok')} "
                  f"hits={r.get('hits')}")
            if r.get("error"):
                print(f"    error: {r['error']}")
            if r.get("text"):
                print(f"    text: {r['text'][:90]!r}")

    print("\n--- content gate (has_usable_audio) ---")
    # (a) no audio, renamed to an accepted extension → must be rejected
    noaud = os.path.join(outdir, "video_no_audio.mp4")
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=15:duration=4",
                    "-c:v", "mpeg4", noaud], capture_output=True, check=True)
    txt = os.path.join(outdir, "notaudio.mp3")
    with open(txt, "w") as f:
        f.write("this is a text file pretending to be an mp3 " * 200)
    print(f"video-without-audio (.mp4): has_usable_audio={has_usable_audio(noaud)}  (expect False)")
    print(f"text-renamed-to.mp3:        has_usable_audio={has_usable_audio(txt)}  (expect False)")
    # (b) valid audio whose extension mismatches the container → must be accepted
    mkv_as_mp4 = os.path.join(outdir, "really_mkv.mp4")
    subprocess.run(["ffmpeg", "-y", "-i", audio, "-f", "matroska", "-c:a", "libopus", mkv_as_mp4],
                   capture_output=True, check=True)
    print(f"mkv-content-named.mp4:      has_usable_audio={has_usable_audio(mkv_as_mp4)}  (expect True), "
          f"detected container={get_audio_container(mkv_as_mp4, mkv_as_mp4)}")
    flac_as_mp3 = os.path.join(outdir, "really_flac.mp3")
    import shutil
    shutil.copy(audio, flac_as_mp3)
    print(f"flac-content-named.mp3:     has_usable_audio={has_usable_audio(flac_as_mp3)}  (expect True), "
          f"detected container={get_audio_container(flac_as_mp3, flac_as_mp3)}")


if __name__ == "__main__":
    main()

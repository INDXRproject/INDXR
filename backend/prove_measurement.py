"""Proof that the ADR-096 measurement layer populates on a REAL fresh YouTube transcription through
the actual pipeline (do_assemblyai_transcription). Inserts a job row, runs the pipeline against an
uncached short video, prints the ADR-096 columns, then cleans up all test data (transcript, master
cache, job row). No credits touched (deduct off, reservation off).
"""
import os, sys, uuid, asyncio, json

_env = os.path.join(os.path.dirname(__file__), ".env")
for line in open(_env):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from transcription_pipeline import do_assemblyai_transcription, get_supabase_client

# Pass an existing user id as argv[2] or PROVE_USER_ID; the row's user_id is an FK to auth.users.
USER_ID = (sys.argv[2] if len(sys.argv) > 2 else os.getenv("PROVE_USER_ID", "")).strip()
VIDEO_ID = sys.argv[1] if len(sys.argv) > 1 else "jNQXAC9IVRW"
if not USER_ID:
    sys.exit("usage: prove_measurement.py <video_id> <user_id>  (or set PROVE_USER_ID)")

COLS = ["status", "download_ms", "download_attempts", "compress_ms", "transcribe_ms", "save_ms",
        "provider_processing_ms", "transcript_confidence", "language_confidence",
        "assemblyai_model", "assemblyai_language", "processing_time_seconds", "cost_eur"]


async def main():
    sb = get_supabase_client()
    job_id = str(uuid.uuid4())
    sb.table("transcription_jobs").insert({
        "id": job_id, "user_id": USER_ID, "status": "pending",
        "video_url": f"https://www.youtube.com/watch?v={VIDEO_ID}",
        "source_type": "youtube", "source_kind": "single", "file_format": "youtube",
    }).execute()
    print(f"inserted job {job_id}; running real pipeline against {VIDEO_ID}...", flush=True)

    result = await do_assemblyai_transcription(
        user_id=USER_ID, video_id=VIDEO_ID, job_id=job_id,
        deduct_credits_on_success=False, reservation_mode=False, heartbeat_fn=None,
    )
    print("pipeline result:", json.dumps({k: result.get(k) for k in ("success", "error_type", "credit_cost")}), flush=True)

    row = sb.table("transcription_jobs").select(",".join(COLS)).eq("id", job_id).single().execute().data
    print("\n=== ADR-096 columns on the job row ===")
    for c in COLS:
        print(f"  {c:24} = {row.get(c)}")
    filled = [c for c in ("download_ms", "compress_ms", "transcribe_ms", "save_ms",
                          "transcript_confidence", "language_confidence") if row.get(c) is not None]
    print(f"\n  populated ADR-096 metric columns: {filled}")

    # ── cleanup: remove all test data so prod stays clean ──
    tid = result.get("transcript_id")
    if tid:
        sb.table("transcripts").delete().eq("id", tid).execute()
    sb.table("master_transcripts").delete().eq("video_id", VIDEO_ID).execute()
    sb.table("transcription_jobs").delete().eq("id", job_id).execute()
    print(f"\ncleaned up: transcript={tid}, master_transcripts[{VIDEO_ID}], job {job_id}")


if __name__ == "__main__":
    asyncio.run(main())

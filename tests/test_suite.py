"""
INDXR.AI Automated Test Suite
Run: cd tests && python3 test_suite.py
Results saved to: tests/results/run_{timestamp}.json
"""

import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import requests
from dotenv import dotenv_values

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BACKEND_URL = "http://localhost:8000"
RESULTS_DIR = Path(__file__).parent / "results"
ACCOUNTS_FILE = Path(__file__).parent / "test_accounts.json"
ENV_FILE = Path(__file__).parent.parent / ".env.local"

SHORT_VIDEOS = [
    {"id": "jNQXAC9IVRw", "label": "Me at the zoo (19s)"},
    {"id": "dQw4w9WgXcQ", "label": "Rick Astley (3.5min)"},
]
MEDIUM_VIDEOS = [
    {"id": "UF8uR6Z6KLc", "label": "Steve Jobs Stanford (15min)"},
    {"id": "aircAruvnKk", "label": "3Blue1Brown Neural Networks (27min)"},
]

PLAYLIST_ASSIGNMENTS = {
    0: {"id": "PLaBYW76inbX5egSRNgWbadqMhVH7Z5p6P", "label": "History of the Universe"},
    1: {"id": "PL8dPuuaLjXtNcAJRf3bE1IJU6nMfHj86W", "label": "Crash Course Philosophy"},
    2: {"id": "PL8dPuuaLjXtOeEc9ME62zTfqc0h6Pe8vb", "label": "Crash Course Literacy"},
    3: {"id": "PL8dPuuaLjXtOv-sO3lOpVm54jhwWAf_jR", "label": "Crash Course Literature 2"},
}

REQUEST_DELAY = 1  # seconds between requests


# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------

def load_config():
    env = dotenv_values(str(ENV_FILE))
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    anon_key = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not supabase_url or not anon_key:
        sys.exit(f"[ERROR] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in {ENV_FILE}")
    return supabase_url, anon_key


def load_accounts():
    if not ACCOUNTS_FILE.exists():
        sys.exit(f"[ERROR] {ACCOUNTS_FILE} not found. Run account creation script first.")
    data = json.loads(ACCOUNTS_FILE.read_text())
    return data["accounts"], data["password"]


def get_jwt(supabase_url: str, anon_key: str, email: str, password: str) -> str:
    url = f"{supabase_url}/auth/v1/token?grant_type=password"
    resp = requests.post(
        url,
        headers={"apikey": anon_key, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=15,
    )
    resp.raise_for_status()
    token = resp.json().get("access_token")
    if not token:
        raise RuntimeError(f"No access_token in auth response: {resp.text[:200]}")
    return token


def get_balance(supabase_url: str, anon_key: str, token: str, user_id: str) -> int:
    """Query user_credits table directly via Supabase REST."""
    url = f"{supabase_url}/rest/v1/rpc/get_user_credits"
    resp = requests.post(
        url,
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={"p_user_id": user_id},
        timeout=10,
    )
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list) and data:
            return data[0].get("credits", 0)
    return -1  # unknown


# ---------------------------------------------------------------------------
# Result helpers
# ---------------------------------------------------------------------------

def make_result(
    test_name: str,
    account: str,
    *,
    success: bool,
    processing_time_ms: int = 0,
    video_id: Optional[str] = None,
    playlist_id: Optional[str] = None,
    error_type: Optional[str] = None,
    error_message: Optional[str] = None,
    credits_before: int = 0,
    credits_after: int = 0,
    credits_expected_deduction: int = 0,
    transcript_length_chars: int = 0,
    notes: str = "",
) -> Dict:
    credits_actual = credits_before - credits_after
    return {
        "test_name": test_name,
        "account": account,
        "video_id": video_id,
        "playlist_id": playlist_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "success": success,
        "processing_time_ms": processing_time_ms,
        "error_type": error_type,
        "error_message": error_message,
        "credits_before": credits_before,
        "credits_after": credits_after,
        "credits_expected_deduction": credits_expected_deduction,
        "credits_actual_deduction": credits_actual,
        "credit_mismatch": credits_expected_deduction > 0 and credits_actual != credits_expected_deduction,
        "transcript_length_chars": transcript_length_chars,
        "notes": notes,
    }


def print_result(r: Dict):
    ms = r["processing_time_ms"]
    if r["success"]:
        print(f"  [PASS] {r['test_name']} ({ms}ms)")
    else:
        print(f"  [FAIL] {r['test_name']} - {r['error_type'] or 'error'}: {r['error_message'] or ''}")
    if r["credits_expected_deduction"] > 0:
        before = r["credits_before"]
        after = r["credits_after"]
        actual = r["credits_actual_deduction"]
        expected = r["credits_expected_deduction"]
        mark = "✓" if not r["credit_mismatch"] else "MISMATCH ✗"
        print(f"  [CREDIT] {r['account']}: {before} -> {after} (expected -{expected} {mark})")


def classify_error(msg: str) -> str:
    m = msg.lower()
    if "timeout" in m or "timed out" in m:
        return "timeout"
    if "restricted" in m or "152" in m or "unavailable" in m:
        return "restricted"
    if "invalid" in m or "not found" in m or "no caption" in m:
        return "invalid_url"
    if "credit" in m:
        return "insufficient_credits"
    if "500" in m or "internal" in m:
        return "server_error"
    return "unknown"


# ---------------------------------------------------------------------------
# API wrappers
# ---------------------------------------------------------------------------

def api_extract(video_id: str, token: str) -> Dict:
    resp = requests.post(
        f"{BACKEND_URL}/api/extract/youtube",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"videoIdOrUrl": video_id},
        timeout=60,
    )
    return resp.json() if resp.status_code < 500 else {"success": False, "error": f"HTTP {resp.status_code}"}


def api_whisper(video_id: str, user_id: str, token: str) -> Dict:
    resp = requests.post(
        f"{BACKEND_URL}/api/transcribe/whisper",
        headers={"Authorization": f"Bearer {token}"},
        data={"user_id": user_id, "source_type": "youtube", "video_id": video_id},
        timeout=300,
    )
    return resp.json() if resp.status_code < 500 else {"success": False, "error": f"HTTP {resp.status_code}"}


def api_playlist_info(playlist_id: str, token: str) -> Dict:
    resp = requests.post(
        f"{BACKEND_URL}/api/playlist/info",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"videoIdOrUrl": f"https://www.youtube.com/playlist?list={playlist_id}"},
        timeout=60,
    )
    return resp.json() if resp.status_code < 500 else {"success": False, "error": f"HTTP {resp.status_code}"}


def api_extract_raw(url: str, token: str) -> requests.Response:
    """Returns raw response for error case testing."""
    return requests.post(
        f"{BACKEND_URL}/api/extract/youtube",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"videoIdOrUrl": url},
        timeout=30,
    )


# ---------------------------------------------------------------------------
# Test groups
# ---------------------------------------------------------------------------

def test_single_video_captions(accounts, tokens, supabase_url, anon_key) -> List[Dict]:
    """Test 1 & 3: Auto-captions for short + medium videos using Account 1."""
    results = []
    acct = accounts[0]
    token = tokens[0]
    videos = SHORT_VIDEOS + MEDIUM_VIDEOS

    print(f"\n[TEST GROUP 1+3] Single video auto-captions — {acct['email']}")
    for v in videos:
        time.sleep(REQUEST_DELAY)
        t0 = time.time()
        try:
            data = api_extract(v["id"], token)
        except requests.RequestException as e:
            data = {"success": False, "error": str(e)}
        ms = int((time.time() - t0) * 1000)

        transcript_len = 0
        if data.get("success") and data.get("transcript"):
            transcript_len = sum(len(seg.get("text", "")) for seg in data["transcript"])

        err_msg = data.get("error") if not data.get("success") else None
        r = make_result(
            f"auto_captions_{v['id']}",
            acct["email"],
            success=data.get("success", False),
            processing_time_ms=ms,
            video_id=v["id"],
            error_type=classify_error(err_msg) if err_msg else None,
            error_message=err_msg,
            transcript_length_chars=transcript_len,
            notes=v["label"],
        )
        print_result(r)
        results.append(r)
    return results


def test_whisper(accounts, tokens, supabase_url, anon_key) -> List[Dict]:
    """Test 2: Whisper transcription using Account 2, short video only."""
    results = []
    acct = accounts[1]
    token = tokens[1]
    video = SHORT_VIDEOS[0]  # Me at the zoo, 19s → 1 credit

    print(f"\n[TEST GROUP 2] Whisper transcription — {acct['email']}")
    time.sleep(REQUEST_DELAY)

    bal_before = get_balance(supabase_url, anon_key, token, acct["user_id"])
    expected_cost = math.ceil(19 / 600)  # 1 credit

    t0 = time.time()
    try:
        data = api_whisper(video["id"], acct["user_id"], token)
    except requests.RequestException as e:
        data = {"success": False, "error": str(e)}
    ms = int((time.time() - t0) * 1000)

    bal_after = get_balance(supabase_url, anon_key, token, acct["user_id"])

    transcript_len = 0
    if data.get("success") and data.get("transcript"):
        transcript_len = sum(len(seg.get("text", "")) for seg in data["transcript"])

    err_msg = data.get("error") if not data.get("success") else None
    r = make_result(
        f"whisper_{video['id']}",
        acct["email"],
        success=data.get("success", False),
        processing_time_ms=ms,
        video_id=video["id"],
        error_type=classify_error(err_msg) if err_msg else None,
        error_message=err_msg,
        credits_before=bal_before,
        credits_after=bal_after,
        credits_expected_deduction=expected_cost,
        transcript_length_chars=transcript_len,
        notes=f"{video['label']} | credits_used_reported={data.get('credits_used')}",
    )
    print_result(r)
    results.append(r)
    return results


def test_playlist_extraction(accounts, tokens, supabase_url, anon_key) -> List[Dict]:
    """Test 4: Playlist extraction, first 4 videos per account."""
    results = []
    print(f"\n[TEST GROUP 4] Playlist extraction (first 4 videos per account)")

    for idx, acct in enumerate(accounts):
        token = tokens[idx]
        pl = PLAYLIST_ASSIGNMENTS[idx]
        print(f"  Account {idx+1}: {acct['email']} — {pl['label']}")

        time.sleep(REQUEST_DELAY)
        t0 = time.time()
        info = api_playlist_info(pl["id"], token)
        pl_fetch_ms = int((time.time() - t0) * 1000)

        if not info.get("success"):
            r = make_result(
                f"playlist_info_{pl['id']}",
                acct["email"],
                success=False,
                processing_time_ms=pl_fetch_ms,
                playlist_id=pl["id"],
                error_type="playlist_fetch_failed",
                error_message=info.get("error"),
                notes=pl["label"],
            )
            print_result(r)
            results.append(r)
            continue

        entries = info.get("entries", [])[:4]
        playlist_start = time.time()
        success_count = 0
        fail_count = 0

        for entry in entries:
            vid_id = entry.get("id") or entry.get("videoId")
            if not vid_id:
                continue
            time.sleep(REQUEST_DELAY)
            t0 = time.time()
            try:
                data = api_extract(vid_id, token)
            except requests.RequestException as e:
                data = {"success": False, "error": str(e)}
            ms = int((time.time() - t0) * 1000)

            transcript_len = 0
            if data.get("success") and data.get("transcript"):
                transcript_len = sum(len(seg.get("text", "")) for seg in data["transcript"])
                success_count += 1
            else:
                fail_count += 1

            err_msg = data.get("error") if not data.get("success") else None
            r = make_result(
                f"playlist_{pl['id']}_video_{vid_id}",
                acct["email"],
                success=data.get("success", False),
                processing_time_ms=ms,
                video_id=vid_id,
                playlist_id=pl["id"],
                error_type=classify_error(err_msg) if err_msg else None,
                error_message=err_msg,
                transcript_length_chars=transcript_len,
                notes=f"{pl['label']} | title={entry.get('title', '')[:50]}",
            )
            print_result(r)
            results.append(r)

        total_ms = int((time.time() - playlist_start) * 1000)
        print(f"    Playlist total: {success_count} passed, {fail_count} failed, {total_ms}ms")

    return results


def test_playlist_whisper_mix(accounts, tokens, supabase_url, anon_key) -> List[Dict]:
    """Test 5: Playlist mix — Account 3, 3 videos, 1 via Whisper."""
    results = []
    acct = accounts[2]
    token = tokens[2]
    pl = PLAYLIST_ASSIGNMENTS[2]

    print(f"\n[TEST GROUP 5] Playlist+Whisper mix — {acct['email']}")
    time.sleep(REQUEST_DELAY)
    info = api_playlist_info(pl["id"], token)

    if not info.get("success"):
        r = make_result(
            "playlist_whisper_mix_info",
            acct["email"],
            success=False,
            playlist_id=pl["id"],
            error_type="playlist_fetch_failed",
            error_message=info.get("error"),
        )
        print_result(r)
        return [r]

    entries = info.get("entries", [])[:3]
    bal_before = get_balance(supabase_url, anon_key, token, acct["user_id"])

    for i, entry in enumerate(entries):
        vid_id = entry.get("id") or entry.get("videoId")
        if not vid_id:
            continue
        use_whisper = (i == 1)  # Second video uses Whisper
        time.sleep(REQUEST_DELAY)
        t0 = time.time()
        try:
            data = api_whisper(vid_id, acct["user_id"], token) if use_whisper else api_extract(vid_id, token)
        except requests.RequestException as e:
            data = {"success": False, "error": str(e)}
        ms = int((time.time() - t0) * 1000)

        bal_after = get_balance(supabase_url, anon_key, token, acct["user_id"])
        transcript_len = 0
        if data.get("success") and data.get("transcript"):
            transcript_len = sum(len(seg.get("text", "")) for seg in data["transcript"])

        err_msg = data.get("error") if not data.get("success") else None
        method = "whisper" if use_whisper else "auto_captions"
        r = make_result(
            f"playlist_whisper_mix_{vid_id}",
            acct["email"],
            success=data.get("success", False),
            processing_time_ms=ms,
            video_id=vid_id,
            playlist_id=pl["id"],
            error_type=classify_error(err_msg) if err_msg else None,
            error_message=err_msg,
            credits_before=bal_before,
            credits_after=bal_after,
            credits_expected_deduction=data.get("credits_used", 0) if use_whisper else 0,
            transcript_length_chars=transcript_len,
            notes=f"method={method} | {entry.get('title', '')[:50]}",
        )
        print_result(r)
        results.append(r)
        bal_before = bal_after

    return results


def test_error_cases(accounts, tokens, supabase_url, anon_key) -> List[Dict]:
    """Test 6: Error case validation using Account 4."""
    results = []
    acct = accounts[3]
    token = tokens[3]

    cases = [
        {"url": "https://youtube.com/watch?v=INVALID123", "label": "invalid_video_id", "expected_status": 200},
        {"url": "https://google.com", "label": "non_youtube_url", "expected_status": 200},
        {"url": "https://www.youtube.com/playlist?list=PLaBYW76inbX5egSRNgWbadqMhVH7Z5p6P", "label": "playlist_to_single_endpoint", "expected_status": 200},
        {"url": "", "label": "empty_url", "expected_status": 422},
    ]

    print(f"\n[TEST GROUP 6] Error cases — {acct['email']}")
    for case in cases:
        time.sleep(REQUEST_DELAY)
        t0 = time.time()
        try:
            resp = api_extract_raw(case["url"], token)
            status = resp.status_code
            try:
                body = resp.json()
            except Exception:
                body = {"raw": resp.text[:200]}
        except requests.RequestException as e:
            status = 0
            body = {"error": str(e)}
        ms = int((time.time() - t0) * 1000)

        # Pass = server did NOT return 500, and returned an error (not success)
        never_500 = status != 500
        returned_error = not body.get("success", True) or status >= 400
        passed = never_500 and returned_error

        err_msg = body.get("error") or body.get("detail") or str(body)[:120]
        r = make_result(
            f"error_case_{case['label']}",
            acct["email"],
            success=passed,
            processing_time_ms=ms,
            video_id=case["url"] or "(empty)",
            error_type=None if passed else "unexpected_500",
            error_message=None if passed else err_msg,
            notes=f"url={case['url'][:60]} | http_status={status} | server_msg={err_msg[:80]}",
        )
        print_result(r)
        results.append(r)

    return results


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------

def main():
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = RESULTS_DIR / f"run_{run_id}.json"

    print("=" * 60)
    print("  INDXR.AI Automated Test Suite")
    print(f"  Run ID: {run_id}")
    print("=" * 60)

    # Estimated time
    n_videos = len(SHORT_VIDEOS) + len(MEDIUM_VIDEOS)
    n_playlist = 4 * 4  # 4 accounts × 4 videos
    n_whisper = 1
    n_mix = 3
    n_error = 4
    total_requests = n_videos + n_playlist + n_whisper + n_mix + n_error + 8  # +8 for playlist info calls
    estimated_s = total_requests * (REQUEST_DELAY + 5)  # rough 5s avg per request
    print(f"  Estimated requests: ~{total_requests} | Estimated time: ~{estimated_s//60}min")
    print()

    supabase_url, anon_key = load_config()
    accounts, password = load_accounts()

    # Authenticate all accounts
    print("[AUTH] Logging in test accounts...")
    tokens = []
    for acct in accounts:
        try:
            token = get_jwt(supabase_url, anon_key, acct["email"], password)
            tokens.append(token)
            print(f"  ✓ {acct['email']}")
        except Exception as e:
            print(f"  ✗ {acct['email']}: {e}")
            sys.exit(1)

    # Verify backend is up
    try:
        health = requests.get(f"{BACKEND_URL}/health", timeout=5).json()
        print(f"\n[BACKEND] {health.get('status', 'unknown')} — {BACKEND_URL}")
    except Exception as e:
        sys.exit(f"[ERROR] Backend not reachable at {BACKEND_URL}: {e}")

    suite_start = time.time()
    all_results = []

    all_results += test_single_video_captions(accounts, tokens, supabase_url, anon_key)
    all_results += test_whisper(accounts, tokens, supabase_url, anon_key)
    all_results += test_playlist_extraction(accounts, tokens, supabase_url, anon_key)
    all_results += test_playlist_whisper_mix(accounts, tokens, supabase_url, anon_key)
    all_results += test_error_cases(accounts, tokens, supabase_url, anon_key)

    total_duration = time.time() - suite_start

    # Summary
    passed = [r for r in all_results if r["success"]]
    failed = [r for r in all_results if not r["success"]]
    credits_consumed = sum(r["credits_actual_deduction"] for r in all_results if r["credits_actual_deduction"] > 0)

    errors_by_type: Dict[str, int] = {}
    for r in failed:
        key = r["error_type"] or "unknown"
        errors_by_type[key] = errors_by_type.get(key, 0) + 1

    timed = [r for r in all_results if r["processing_time_ms"] > 0]
    slowest = max(timed, key=lambda r: r["processing_time_ms"]) if timed else {}
    fastest = min(timed, key=lambda r: r["processing_time_ms"]) if timed else {}

    summary = {
        "run_id": run_id,
        "total_tests": len(all_results),
        "passed": len(passed),
        "failed": len(failed),
        "pass_rate": f"{100*len(passed)//max(len(all_results),1)}%",
        "total_duration_seconds": round(total_duration, 1),
        "credits_consumed_total": credits_consumed,
        "errors_by_type": errors_by_type,
        "slowest_test": {"name": slowest.get("test_name"), "ms": slowest.get("processing_time_ms")} if slowest else {},
        "fastest_test": {"name": fastest.get("test_name"), "ms": fastest.get("processing_time_ms")} if fastest else {},
    }

    output = {"summary": summary, "results": all_results}
    output_file.write_text(json.dumps(output, indent=2))

    print("\n" + "=" * 60)
    print(f"  RESULTS: {summary['passed']}/{summary['total_tests']} passed ({summary['pass_rate']})")
    print(f"  Duration: {summary['total_duration_seconds']}s")
    print(f"  Credits consumed: {credits_consumed}")
    if errors_by_type:
        print(f"  Errors by type: {errors_by_type}")
    print(f"  Saved: {output_file}")
    print("=" * 60)


if __name__ == "__main__":
    main()

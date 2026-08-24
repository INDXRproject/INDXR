"""
LIVE integratie-test voor de harde kosten-onderbreker (ADR-098, SummaryCostBreaker in summary_pipeline).
Verlaagt de kost/min-grens kunstmatig zodat een échte (korte) samenvatting hem overschrijdt, en bewijst:
  - de onderbreker VUURT (job -> status=error, error_type='SummaryCostBreaker', de user-message);
  - de credits komen VOLLEDIG terug (balans terug op het startsaldo, credits_refunded=True).

Draait de echte twee-staps-pipeline via run_summary_reservation_aware op een gereserveerde
transcription_jobs-rij — exact het productiepad. Zelfde self-cleaning opzet als test_summary_credits.py:
wegwerp-user, en de usage-log-rijen van deze run worden ná afloop verwijderd (geen data-vervuiling).
Draaien: cd backend && venv/bin/python test_summary_breaker.py   (exit 0 = groen)
"""
import os
import sys
import uuid
import asyncio
from pathlib import Path
from supabase import create_client

TRANSCRIPT_ID = "867dc236-dbdb-4224-a4b8-8b2091b2179c"  # 68s, 24 segs — goedkoopst om te draaien


def _load_env():
    env = {}
    for line in (Path(__file__).resolve().parent / ".env").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    for k, v in env.items():
        os.environ.setdefault(k, v)
    url = env.get("SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise SystemExit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ontbreken in backend/.env")
    return url, key


def main() -> int:
    URL, KEY = _load_env()
    # KUNSTMATIG verlaagde grens — MOET vóór de import van summary_pipeline (constanten lezen bij import).
    os.environ["SUMMARY_MAX_EUR_PER_MIN"] = "0.00001"
    from credit_manager import calculate_summary_cost, reserve_credits
    import summary_pipeline as sp
    assert sp.SUMMARY_MAX_EUR_PER_MIN == 0.00001, "grens niet verlaagd — import-volgorde?"

    sb = create_client(URL, KEY)
    email = f"test-breaker-{uuid.uuid4().hex[:12]}@example.invalid"
    USER = sb.auth.admin.create_user(
        {"email": email, "password": uuid.uuid4().hex, "email_confirm": True}
    ).user.id
    print(f"(wegwerp test-user {USER})")

    results = []

    def check(name, ok, detail=""):
        results.append(ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}{(' — ' + detail) if detail else ''}")

    def balance():
        r = sb.rpc("get_user_credits", {"p_user_id": USER}).execute()
        return r.data[0]["credits"] if r.data else 0

    jid = str(uuid.uuid4())
    try:
        sb.table("user_credits").upsert({"user_id": USER, "credits": 100}).execute()
        b0 = balance()
        cost = calculate_summary_cost(68)  # 3 credits (min)
        sb.table("transcription_jobs").insert({
            "id": jid, "user_id": USER, "status": "pending",
            "source_type": "summary", "source_kind": "ai_summary", "transcript_id": TRANSCRIPT_ID,
        }).execute()
        r = reserve_credits(user_id=USER, amount=cost, job_id=jid)
        check("reservering geslaagd", bool(r.get("success")), str(r))
        check("balans -= cost na reserve", balance() == b0 - cost, f"{b0}->{balance()} (cost {cost})")

        # Draai het productiepad met de verlaagde grens → moet onderbreken.
        asyncio.run(sp.run_summary_reservation_aware(
            job_id=jid, user_id=USER, transcript_id=TRANSCRIPT_ID, heartbeat_fn=None, supabase=sb))

        job = sb.table("transcription_jobs").select(
            "status,error_type,error_message,credits_refunded").eq("id", jid).single().execute().data
        check("job status=error", job.get("status") == "error", str(job.get("status")))
        check("error_type=SummaryCostBreaker", job.get("error_type") == "SummaryCostBreaker", str(job.get("error_type")))
        check("user-message gezet", job.get("error_message") == sp.SummaryCostBreaker.USER_MSG,
              (job.get("error_message") or "")[:60])
        check(f"credits_refunded=={cost} (aantal teruggegeven)", job.get("credits_refunded") == cost,
              str(job.get("credits_refunded")))
        check("VOLLEDIGE teruggave (balans terug op b0)", balance() == b0, f"{b0}->{balance()}")

    finally:
        # Cleanup: usage-log-rijen van deze run (op wegwerp-user), credit-rijen, job, saldo, user.
        sb.table("ai_summary_usage_log").delete().eq("user_id", USER).execute()
        sb.table("credit_transactions").delete().eq("user_id", USER).execute()
        sb.table("transcription_jobs").delete().eq("id", jid).execute()
        sb.table("user_credits").delete().eq("user_id", USER).execute()
        sb.auth.admin.delete_user(USER)
        print("(cleanup: wegwerp-user + usage-log + alle rijen verwijderd)")

    total, passed = len(results), sum(1 for x in results if x)
    print(f"\nVERDICT: {'ALLE ASSERTS GROEN' if passed == total else 'FALEN'} ({passed}/{total})")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())

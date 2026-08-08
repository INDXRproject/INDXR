"""
LIVE integratie-test voor de AI-summary creditketen (ADR-090). Verifieert dat de summary-flow
dezelfde reserve→settle→refund-primitieven correct gebruikt, met:
  - de duur-afhankelijke kost (calculate_summary_cost): 3 t/m 30min, daarna +1 per begonnen 20min
  - settlement gestempeld als product_type='ai_summary' (niet 'ai_transcription')
  - succes: reserve == settle → refund = 0 (marker geschreven, balans één keer bewogen)
  - mislukking: reserve zonder settle → VOLLEDIGE teruggave (refund = reserved)

Zelfde geïsoleerde, self-cleaning opzet als test_settle_refund.py (wegwerp auth-user).
Draaien: cd backend && venv/bin/python test_summary_credits.py   (exit 0 = groen)
Gewrapt achter __main__ zodat pytest-collectie de live-mutaties niet triggert.
"""
import os
import sys
import uuid
from pathlib import Path
from supabase import create_client


def _load_env():
    env = {}
    for line in (Path(__file__).resolve().parent / ".env").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    url = env.get("SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise SystemExit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ontbreken in backend/.env")
    return url, key


def main() -> int:
    URL, KEY = _load_env()
    os.environ.setdefault("SUPABASE_URL", URL)
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", KEY)
    from credit_manager import (
        calculate_summary_cost, reserve_credits, settle_credits, refund_credits,
    )

    sb = create_client(URL, KEY)
    email = f"test-summary-{uuid.uuid4().hex[:12]}@example.invalid"
    USER = sb.auth.admin.create_user(
        {"email": email, "password": uuid.uuid4().hex, "email_confirm": True}
    ).user.id
    print(f"(wegwerp test-user {USER})")

    results = []
    _jobs = []

    def check(name, ok, detail=""):
        results.append(ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}{(' — ' + detail) if detail else ''}")

    def set_balance(bal):
        sb.table("user_credits").upsert({"user_id": USER, "credits": bal}).execute()

    def balance():
        r = sb.rpc("get_user_credits", {"p_user_id": USER}).execute()
        return r.data[0]["credits"] if r.data else 0

    def new_summary_job():
        jid = str(uuid.uuid4())
        sb.table("transcription_jobs").insert({
            "id": jid, "user_id": USER, "status": "pending",
            "source_type": "summary", "source_kind": "ai_summary",
        }).execute()
        _jobs.append(jid)
        return jid

    def settlement_rows(jid):
        return sb.table("credit_transactions").select("product_type").eq("job_id", jid).eq("kind", "settlement").execute().data or []

    def refund_rows(jid):
        return sb.table("credit_transactions").select("id").eq("job_id", jid).eq("kind", "refund").execute().data or []

    try:
        # ── Formule (pure) — 3 t/m 30min, daarna +1 per begonnen 20min (ADR-090-addendum) ─────
        print("Formule calculate_summary_cost:")
        for d, exp in {0: 3, 900: 3, 1800: 3, 1801: 4, 3000: 4, 3001: 5, 3600: 5, 7200: 8, 14400: 14, 15228: 15}.items():
            check(f"cost({d}s)={exp}", calculate_summary_cost(d) == exp, str(calculate_summary_cost(d)))

        # ── A: succes — reserve == settle → refund 0, balans één keer bewogen ─
        print("A — succes: reserve->settle(ai_summary)->refund 0:")
        set_balance(100)
        b0 = balance()
        cost = calculate_summary_cost(3601)  # 5 credits
        jid = new_summary_job()
        r = reserve_credits(user_id=USER, amount=cost, job_id=jid)
        check("A: reservering geslaagd", bool(r.get("success")), str(r))
        check("A: balans -= cost na reserve", balance() == b0 - cost, f"{b0}->{balance()} (cost {cost})")
        s = settle_credits(user_id=USER, amount=cost, job_id=jid, reason="AI Summarization", product_type="ai_summary")
        check("A: settle geslaagd", bool(s.get("success")), str(s))
        srows = settlement_rows(jid)
        check("A: precies één settlement-rij", len(srows) == 1, str(len(srows)))
        check("A: settlement gestempeld 'ai_summary'", srows and srows[0]["product_type"] == "ai_summary",
              srows[0]["product_type"] if srows else "geen rij")
        ref = refund_credits(job_id=jid)
        check("A: refund geslaagd (0)", bool(ref.get("success")), str(ref))
        check("A: balans ongewijzigd na settle+refund (netto -cost)", balance() == b0 - cost, f"{b0}->{balance()}")
        check("A: precies één refund-marker-rij", len(refund_rows(jid)) == 1, str(len(refund_rows(jid))))

        # ── B: mislukking — reserve zonder settle → VOLLEDIGE teruggave ──────
        print("B — mislukking: reserve zonder settle -> volledige refund:")
        set_balance(100)
        b0 = balance()
        cost = calculate_summary_cost(900)  # 3 credits (min)
        jid = new_summary_job()
        reserve_credits(user_id=USER, amount=cost, job_id=jid)
        check("B: balans -= cost na reserve", balance() == b0 - cost, f"{b0}->{balance()}")
        ref = refund_credits(job_id=jid)
        check("B: refund geslaagd", bool(ref.get("success")), str(ref))
        check("B: VOLLEDIGE teruggave (balans terug op b0)", balance() == b0, f"{b0}->{balance()}")

        # ── C: idempotentie — refund 2x geen dubbele mutatie ────────────────
        print("C — idempotentie refund:")
        b_before = balance()
        refund_credits(job_id=jid)
        check("C: tweede refund muteert niets", balance() == b_before, f"{b_before}->{balance()}")
        check("C: nog steeds één refund-rij", len(refund_rows(jid)) == 1, str(len(refund_rows(jid))))

    finally:
        if _jobs:
            sb.table("credit_transactions").delete().eq("user_id", USER).execute()
            sb.table("transcription_jobs").delete().in_("id", _jobs).execute()
        sb.table("user_credits").delete().eq("user_id", USER).execute()
        sb.auth.admin.delete_user(USER)
        print("(cleanup: wegwerp test-user + alle rijen verwijderd)")

    total, passed = len(results), sum(1 for x in results if x)
    print(f"\nVERDICT: {'ALLE ASSERTS GROEN' if passed == total else 'FALEN'} ({passed}/{total})")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())

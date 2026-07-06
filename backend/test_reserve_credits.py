"""
LIVE integratie-test voor de reserve_credits-RPC (ADR-050 gedrags-fase 1/3) — de enige
geautomatiseerde dekking op de meest financieel-kritieke route. Wordt in fase 2/3
(settle/refund) uitgebreid.

Dit is GEEN mock-unittest zoals test_watchdog.py: de kern (FOR UPDATE row-locking dat de
concurrent-overspend-race sluit) is alleen tegen een echte Postgres zinvol te bewijzen. De
test is volledig geïsoleerd en self-cleaning: hij maakt een WEGWERP auth-user aan, draait
alles daaronder, en verwijdert user + alle rijen weer. Geen residu in productie.

Draaien (vereist backend/.env met SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
    cd backend && venv/bin/python test_reserve_credits.py
Exit 0 = alle asserts groen, exit 1 = minstens één rood.

Bewust achter `if __name__ == '__main__'` gewrapt zodat een `pytest`-collectie (die dit
bestand importeert) de live-mutaties NIET triggert — pytest draait alleen mock-tests.

Bewijst:
  RED   — de HUIDIGE non-atomaire start-gate laat concurrent overspend toe.
  GREEN — reserve_credits: van twee concurrent jobs die samen het saldo overschrijden
          slaagt er exact één, faalt de ander hard, balans wordt nooit negatief.
  exact-bedrag — verlaagt balans met precies N, 1 reservation-rij, credits_reserved=N.
  idempotent — tweede reserve voor dezelfde job_id/playlist_id trekt niet dubbel af.
"""
import sys
import threading
import uuid
from pathlib import Path

from supabase import create_client


def _load_env():
    env = {}
    env_path = Path(__file__).resolve().parent / ".env"
    for line in env_path.read_text().splitlines():
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
    sb = create_client(URL, KEY)

    # ── Wegwerp auth-user (user_id FKt naar auth.users) ───────────────────────
    email = f"test-reserve-{uuid.uuid4().hex[:12]}@example.invalid"
    created = sb.auth.admin.create_user({"email": email, "password": uuid.uuid4().hex, "email_confirm": True})
    USER = created.user.id
    JOB_A, JOB_B, PL = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
    print(f"(wegwerp test-user {USER})")

    results = []

    def check(name, ok, detail=""):
        results.append(ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}{(' — ' + detail) if detail else ''}")

    def reset(bal):
        sb.table("credit_transactions").delete().eq("user_id", USER).execute()
        sb.table("user_credits").upsert({"user_id": USER, "credits": bal}).execute()
        for j in (JOB_A, JOB_B):
            sb.table("transcription_jobs").update({"credits_reserved": 0}).eq("id", j).execute()
        sb.table("playlist_extraction_jobs").update({"credits_reserved": 0}).eq("id", PL).execute()

    def balance():
        return sb.table("user_credits").select("credits").eq("user_id", USER).single().execute().data["credits"]

    def resv_rows(col, val):
        return sb.table("credit_transactions").select("id,amount").eq("user_id", USER)\
            .eq("kind", "reservation").eq(col, val).execute().data

    def reserve(amount, job_id=None, playlist_id=None):
        return sb.rpc("reserve_credits", {
            "p_user_id": USER, "p_amount": amount,
            "p_job_id": job_id, "p_playlist_id": playlist_id, "p_reason": "TEST reservation",
        }).execute().data

    try:
        sb.table("transcription_jobs").upsert({"id": JOB_A, "user_id": USER, "status": "pending"}).execute()
        sb.table("transcription_jobs").upsert({"id": JOB_B, "user_id": USER, "status": "pending"}).execute()
        sb.table("playlist_extraction_jobs").upsert({"id": PL, "user_id": USER, "status": "running", "total_videos": 5}).execute()

        # ── RED ───────────────────────────────────────────────────────────────
        print("RED — huidige non-atomaire start-gate (SELECT balans, check >= cost):")
        reset(10)
        passed = []
        barrier = threading.Barrier(2)

        def red_gate(cost):
            c = create_client(URL, KEY)
            bal = c.table("user_credits").select("credits").eq("user_id", USER).single().execute().data["credits"]
            barrier.wait()
            passed.append(bal >= cost)

        ts = [threading.Thread(target=red_gate, args=(8,)) for _ in range(2)]
        [t.start() for t in ts]; [t.join() for t in ts]
        check("RED: beide concurrent starts passeren de gate (overspend mogelijk)",
              passed == [True, True], f"gate-uitkomsten={passed}")

        # ── GREEN ─────────────────────────────────────────────────────────────
        print("GREEN — twee concurrent reserve_credits(8) op balans 10:")
        reset(10)
        outcomes = {}
        barrier = threading.Barrier(2)

        def green_reserve(job_id, tag):
            c = create_client(URL, KEY)
            barrier.wait()
            outcomes[tag] = c.rpc("reserve_credits", {"p_user_id": USER, "p_amount": 8, "p_job_id": job_id,
                                  "p_playlist_id": None, "p_reason": "TEST green"}).execute().data

        ts = [threading.Thread(target=green_reserve, args=(JOB_A, "A")),
              threading.Thread(target=green_reserve, args=(JOB_B, "B"))]
        [t.start() for t in ts]; [t.join() for t in ts]
        succ = [t for t, r in outcomes.items() if r.get("success")]
        fail = [t for t, r in outcomes.items() if not r.get("success")]
        bal = balance()
        n_resv = len(resv_rows("job_id", JOB_A)) + len(resv_rows("job_id", JOB_B))
        check("GREEN: exact 1 succes + 1 mislukking", len(succ) == 1 and len(fail) == 1, f"succes={succ} fail={fail}")
        check("GREEN: verliezer faalt met insufficient_credits",
              all(outcomes[t].get("error") == "insufficient_credits" for t in fail))
        check("GREEN: eindbalans = 2 (nooit negatief)", bal == 2, f"balans={bal}")
        check("GREEN: precies 1 reservation-rij (verliezer teruggerold)", n_resv == 1, f"rijen={n_resv}")

        # ── exact-bedrag ──────────────────────────────────────────────────────
        print("exact-bedrag — reserve_credits(3, job_a) op balans 10:")
        reset(10)
        reserve(3, job_id=JOB_A)
        bal = balance(); rows = resv_rows("job_id", JOB_A)
        cr = sb.table("transcription_jobs").select("credits_reserved").eq("id", JOB_A).single().execute().data["credits_reserved"]
        check("exact: balans 10 -> 7", bal == 7, f"balans={bal}")
        check("exact: precies 1 reservation-rij, amount=3", len(rows) == 1 and rows[0]["amount"] == 3, f"rows={rows}")
        check("exact: transcription_jobs.credits_reserved = 3", cr == 3, f"credits_reserved={cr}")

        # ── idempotent (job_id) ───────────────────────────────────────────────
        print("idempotent (job_id) — tweede reserve_credits(3, job_a):")
        r2 = reserve(3, job_id=JOB_A)
        bal2 = balance(); rows2 = resv_rows("job_id", JOB_A)
        check("idempotent job_id: balans blijft 7 (geen dubbele aftrek)", bal2 == 7, f"balans={bal2}")
        check("idempotent job_id: nog steeds 1 reservation-rij", len(rows2) == 1, f"rijen={len(rows2)}")
        check("idempotent job_id: result markeert idempotent", r2.get("idempotent") is True, f"result={r2}")

        # ── idempotent (playlist_id) ──────────────────────────────────────────
        print("idempotent (playlist_id) — reserve_credits(5, playlist) x2:")
        reset(10)
        reserve(5, playlist_id=PL); bal3 = balance()
        reserve(5, playlist_id=PL); bal4 = balance()
        rows3 = resv_rows("playlist_id", PL)
        cr_pl = sb.table("playlist_extraction_jobs").select("credits_reserved").eq("id", PL).single().execute().data["credits_reserved"]
        check("playlist: eerste reserve balans 10 -> 5", bal3 == 5, f"balans={bal3}")
        check("idempotent playlist_id: tweede reserve balans blijft 5", bal4 == 5, f"balans={bal4}")
        check("idempotent playlist_id: precies 1 reservation-rij, credits_reserved=5",
              len(rows3) == 1 and cr_pl == 5, f"rows={len(rows3)} cr={cr_pl}")

    finally:
        sb.table("credit_transactions").delete().eq("user_id", USER).execute()
        sb.table("transcription_jobs").delete().in_("id", [JOB_A, JOB_B]).execute()
        sb.table("playlist_extraction_jobs").delete().eq("id", PL).execute()
        sb.table("user_credits").delete().eq("user_id", USER).execute()
        try:
            sb.auth.admin.delete_user(USER)
        except Exception as e:
            print(f"(cleanup: auth-user delete waarschuwing: {e})")
        print("(cleanup: wegwerp test-user + alle rijen verwijderd)")

    ok = all(results)
    print(f"\nVERDICT: {'ALLE ASSERTS GROEN' if ok else 'FAIL — ' + str(results.count(False)) + ' rood'} ({sum(results)}/{len(results)})")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

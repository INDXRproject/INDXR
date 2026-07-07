"""
LIVE integratie-test voor settle + refund (ADR-050 gedrags-fase 2/3). Verifieert de
draw-down-uit-de-reservering: reserve -> settle (balans-neutraal) -> refund (netto-post).
Zelfde geïsoleerde, self-cleaning opzet als test_reserve_credits.py (wegwerp auth-user).

Draaien: cd backend && venv/bin/python test_settle_refund.py   (exit 0 = groen)
Gewrapt achter __main__ zodat pytest-collectie de live-mutaties niet triggert.

Dekt de fase-2-succescriteria:
  A  whisper standalone: reserve->settle->refund, met werkelijk < schatting én ~= schatting
  B  playlist deels-gefaald (1-2 fails én 10+ fails): refund = ongebruikt + gefaald, reason klopt
  C  playlist volledig gefaald: volledige refund
  D  gemengde caption+whisper: whisper-settlement draagt playlist_id, mee-gesomd in de refund
  E  idempotentie: settle 2x + refund 2x => geen dubbele mutatie
  F  geen dubbele aftrek: balans beweegt exact één keer per credit (reserve - refund == verbruik)
  G  reconciliatie-invariant: balans == Σ(credit) - Σ(debit) EXCL. nieuwe settlements, diff=0
     (happy path G, partial-fail playlist G2, full-fail playlist G3 — elk geïsoleerd)
  H  watchdog terminal-only: Pass 2b selecteert attempts>=1 (permanent), NIET attempts=0 (transient)
  I  in-flight over flag-flip: niet-gereserveerd (oude aftrek) naast gereserveerd (settlement)
  J  upload-dispatch e2e: reserve->settle->refund door de gedeelde wrapper
     (run_whisper_reservation_aware) — bewijst dat main.py:829/817 geen dubbele aftrek doen
  J2 flag-OFF-regressie: wrapper zonder reservering doet oude aftrek, geen refund
  K  watchdog Pass 2 (gereserveerd): refund-vóór-claim — gefaalde refund blijft niet-terminaal, geslaagde idempotent
  K2 watchdog Pass 2 (oude modus, refund_credits_flat): idem
  L  wrapper whisper-success refund-failure -> error-Sentry (geen stille slik)
  M/M2/M3 refund_with_retry (job/playlist): bounded idempotente retry; blijvend falen -> alarm zonder mutatie
  N/N2 Pass 2c reconciliatie (job/playlist): anti-join vindt gemiste terminale refund -> boekt één rij,
       status ONgemuteerd, tweede cyclus idempotent
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
    # De gedeelde wrapper (scenario J) gebruikt credit_manager.get_supabase_client(), die uit
    # os.environ leest — vul die zodat dezelfde DB als `sb` wordt geraakt.
    os.environ.setdefault("SUPABASE_URL", URL)
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", KEY)
    sb = create_client(URL, KEY)
    email = f"test-settle-{uuid.uuid4().hex[:12]}@example.invalid"
    USER = sb.auth.admin.create_user({"email": email, "password": uuid.uuid4().hex, "email_confirm": True}).user.id
    print(f"(wegwerp test-user {USER})")

    results = []
    _jobs, _plists = [], []

    def check(name, ok, detail=""):
        results.append(ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}{(' — ' + detail) if detail else ''}")

    def set_balance(bal):
        sb.table("user_credits").upsert({"user_id": USER, "credits": bal}).execute()

    def balance():
        return sb.table("user_credits").select("credits").eq("user_id", USER).single().execute().data["credits"]

    def mk_job():
        jid = str(uuid.uuid4())
        sb.table("transcription_jobs").upsert({"id": jid, "user_id": USER, "status": "pending"}).execute()
        _jobs.append(jid)
        return jid

    def mk_playlist(total):
        pid = str(uuid.uuid4())
        sb.table("playlist_extraction_jobs").upsert({
            "id": pid, "user_id": USER, "status": "running", "total_videos": total,
            "video_ids": [f"vid{i}" for i in range(total)], "video_results": {},
        }).execute()
        _plists.append(pid)
        return pid

    def reserve(amt, job_id=None, playlist_id=None):
        return sb.rpc("reserve_credits", {"p_user_id": USER, "p_amount": amt,
                      "p_job_id": job_id, "p_playlist_id": playlist_id}).execute().data

    def settle(amt, job_id, playlist_id=None, video_id=None):
        return sb.rpc("settle_credits", {"p_user_id": USER, "p_amount": amt, "p_job_id": job_id,
                      "p_playlist_id": playlist_id, "p_video_id": video_id, "p_reason": "TEST settle"}).execute().data

    def refund(job_id=None, playlist_id=None):
        return sb.rpc("refund_credits", {"p_job_id": job_id, "p_playlist_id": playlist_id}).execute().data

    def progress(pid, vid, success, amount, error_type=None):
        return sb.rpc("update_playlist_video_progress", {
            "p_playlist_id": pid, "p_video_id": vid, "p_status": "success" if success else "error",
            "p_transcript_id": None, "p_error_type": error_type, "p_amount": amount,
        }).execute().data

    def settlements_sum(col, val):
        rows = sb.table("credit_transactions").select("amount").eq("user_id", USER)\
            .eq("kind", "settlement").eq(col, val).execute().data
        return sum(r["amount"] for r in rows)

    def ledger_excl_new_settlements():
        # Σ(credit) − Σ(debit), nieuwe settlements (balans-neutraal, job/playlist-ref) uitgesloten.
        rows = sb.table("credit_transactions").select("amount,type,kind,job_id,playlist_id")\
            .eq("user_id", USER).execute().data
        total = 0
        for r in rows:
            if r["kind"] == "settlement" and (r["job_id"] or r["playlist_id"]):
                continue
            total += r["amount"] if r["type"] == "credit" else -r["amount"]
        return total

    try:
        # ── A: whisper standalone reserve->settle->refund ─────────────────────
        print("A — whisper standalone (werkelijk < schatting):")
        set_balance(100)
        ja = mk_job()
        reserve(10, job_id=ja)                       # schatting 10
        b_after_reserve = balance()
        settle(7, job_id=ja)                         # werkelijk 7 (balans-neutraal)
        b_after_settle = balance()
        ra = refund(job_id=ja)                        # refund = 10 - 7 = 3
        check("A: reserve verlaagt balans 100->90", b_after_reserve == 90, f"={b_after_reserve}")
        check("A: settle is balans-neutraal (blijft 90)", b_after_settle == 90, f"={b_after_settle}")
        check("A: refund 3, balans -> 93 (= 100 - 7 werkelijk)", balance() == 93 and ra.get("refund") == 3, f"bal={balance()} r={ra}")
        check("A: netto beweging == werkelijk verbruik (reserve-refund=7)", (100 - balance()) == 7)

        print("A2 — whisper standalone (werkelijk ~= schatting -> refund 0):")
        set_balance(100)
        jb = mk_job()
        reserve(10, job_id=jb); settle(10, job_id=jb); rb = refund(job_id=jb)
        check("A2: refund 0, balans 90 (= 100 - 10)", balance() == 90 and rb.get("refund") == 0, f"bal={balance()} r={rb}")

        # ── B: playlist deels-gefaald (caption) ───────────────────────────────
        def run_caption_playlist(total, n_fail, start_bal=1000):
            set_balance(start_bal)
            pid = mk_playlist(total)
            paid = max(0, total - 3)
            reserve(paid, playlist_id=pid)           # eerste 3 gratis
            # video 0..total-1: idx<3 gratis (amount 0), rest betaald; laatste n_fail falen.
            fail_idxs = set(range(total - n_fail, total))
            for i in range(total):
                vid = f"vid{i}"
                if i in fail_idxs:
                    progress(pid, vid, False, 0, error_type="no_captions")
                else:
                    amount = 0 if i < 3 else 1
                    progress(pid, vid, True, amount)
            r = refund(playlist_id=pid)
            return pid, paid, r

        print("B — playlist 15 video's, 2 fails:")
        pid, paid, r = run_caption_playlist(15, 2)   # paid=12, 2 fails onder de betaalde -> consumed 10
        check("B: consumed == 10 (12 betaald - 2 mislukt)", r.get("consumed") == 10, f"r={r}")
        check("B: refund == 2 (reserved 12 - consumed 10)", r.get("refund") == 2, f"r={r}")
        check("B: failed_count == 2 in reason/metadata", r.get("failed") == 2, f"r={r}")
        check("B: balans == 1000 - 10 verbruik", balance() == 990, f"={balance()}")

        print("B2 — playlist 15 video's, 12 fails (10+):")
        pid2, paid2, r2 = run_caption_playlist(15, 12)  # paid=12, alle 12 betaalde falen -> consumed 0
        check("B2: consumed == 0", r2.get("consumed") == 0, f"r={r2}")
        check("B2: refund == 12 (alles terug)", r2.get("refund") == 12, f"r={r2}")
        check("B2: failed_count == 12", r2.get("failed") == 12, f"r={r2}")
        check("B2: balans terug op 1000 (niets verbruikt)", balance() == 1000, f"={balance()}")

        # ── C: playlist volledig gefaald ──────────────────────────────────────
        print("C — playlist 5 video's, allemaal mislukt:")
        set_balance(100)
        pc = mk_playlist(5)
        reserve(2, playlist_id=pc)                   # 5-3=2 betaald gereserveerd
        for i in range(5):
            progress(pc, f"vid{i}", False, 0, error_type="no_captions")
        rc = refund(playlist_id=pc)
        rows_c = sb.table("credit_transactions").select("id").eq("user_id", USER)\
            .eq("kind", "refund").eq("playlist_id", pc).execute().data
        check("C: volledige refund 2, balans 100", rc.get("refund") == 2 and balance() == 100, f"bal={balance()} r={rc}")
        check("C: precies één refund-rij", len(rows_c) == 1, f"={len(rows_c)}")

        # ── D: gemengde caption + whisper playlist (whisper-settlement -> playlist-refund) ──
        print("D — gemengd: 2 caption (1 betaald) + 1 whisper, whisper-settlement draagt playlist_id:")
        set_balance(100)
        pd = mk_playlist(4)   # idx0,1,2 caption (0,1 vrij? idx<3 vrij) + idx3 whisper
        # reserve: caption betaald op idx>=3 = 0 caption betaald (idx0-2 vrij); whisper idx3 = 5
        reserve(5, playlist_id=pd)
        # caption idx0,1,2 vrij (amount 0)
        for i in range(3):
            progress(pd, f"vid{i}", True, 0)
        # whisper idx3: settle 5 met playlist_id (via settle_credits)
        wjob = str(uuid.uuid4())
        settle(5, job_id=wjob, playlist_id=pd, video_id="vid3")
        progress(pd, "vid3", True, 0)  # whisper: rpc_credit_amount=0, alleen progress
        rd = refund(playlist_id=pd)
        check("D: whisper-settlement mee-gesomd (consumed 5)", settlements_sum("playlist_id", pd) == 5 and rd.get("consumed") == 5, f"r={rd}")
        check("D: refund 0 (reserved 5 - consumed 5), balans 95", rd.get("refund") == 0 and balance() == 95, f"bal={balance()} r={rd}")

        # ── E: idempotentie settle 2x + refund 2x ─────────────────────────────
        print("E — idempotentie (settle 2x, refund 2x):")
        set_balance(100)
        je = mk_job()
        reserve(10, job_id=je)
        settle(4, job_id=je); settle(4, job_id=je)   # tweede is no-op (job_id,'settlement')
        s_sum = settlements_sum("job_id", je)
        refund(job_id=je); b1 = balance()
        refund(job_id=je); b2 = balance()             # tweede refund = idempotent
        check("E: settle 2x => één settlement (4)", s_sum == 4, f"={s_sum}")
        # balans = 100 - 4 verbruik = 96 (reserve 10 -> 90, refund 6 -> 96); tweede refund idempotent.
        check("E: refund 2x => balans onveranderd op 96 (geen dubbele mutatie)", b1 == b2 == 96, f"b1={b1} b2={b2}")

        # ── F/G: geen dubbele aftrek + reconciliatie-invariant (GEÏSOLEERD) ───
        # Reconciliatie is alleen zinvol op een schone ledger zonder handmatige balans-sprongen.
        print("F/G — reconciliatie-invariant (geïsoleerde flow, ledger vanaf 0):")
        sb.table("credit_transactions").delete().eq("user_id", USER).execute()
        init_g = 100
        set_balance(init_g)
        jg = mk_job()
        reserve(10, job_id=jg); settle(6, job_id=jg); refund(job_id=jg)  # verbruik 6 -> balans 94
        # Invariant: balans == init + Σ(credit) - Σ(debit) EXCL. nieuwe settlements.
        check("F: balans beweegt exact één keer per credit (94 = 100 - 6 verbruik)", balance() == 94, f"={balance()}")
        check("G: balans == init + Σ(credit) - Σ(debit) excl. nieuwe settlements (happy path)",
              balance() == init_g + ledger_excl_new_settlements(),
              f"balans={balance()} init+ledger={init_g + ledger_excl_new_settlements()}")

        # G2: reconciliatie op een DEELS-gefaalde playlist-flow (niet alleen happy path).
        print("G2 — reconciliatie-invariant op partial-fail playlist (geïsoleerd):")
        sb.table("credit_transactions").delete().eq("user_id", USER).execute()
        init_g2 = 1000
        set_balance(init_g2)
        pg2 = mk_playlist(15)
        reserve(12, playlist_id=pg2)                 # eerste 3 gratis -> 12 betaald gereserveerd
        for i in range(15):
            vid = f"vid{i}"
            if i >= 13:                              # laatste 2 falen
                progress(pg2, vid, False, 0, error_type="no_captions")
            else:
                progress(pg2, vid, True, 0 if i < 3 else 1)
        refund(playlist_id=pg2)                       # consumed 10, refund 2
        check("G2: balans == 1000 - 10 verbruik (990)", balance() == 990, f"={balance()}")
        check("G2: reconciliatie diff=0 (partial-fail)",
              balance() == init_g2 + ledger_excl_new_settlements(),
              f"balans={balance()} init+ledger={init_g2 + ledger_excl_new_settlements()}")

        # G3: reconciliatie op een VOLLEDIG-gefaalde playlist-flow (volledige refund).
        print("G3 — reconciliatie-invariant op full-fail playlist (geïsoleerd):")
        sb.table("credit_transactions").delete().eq("user_id", USER).execute()
        init_g3 = 100
        set_balance(init_g3)
        pg3 = mk_playlist(5)
        reserve(2, playlist_id=pg3)                  # 5-3=2 betaald gereserveerd
        for i in range(5):
            progress(pg3, f"vid{i}", False, 0, error_type="no_captions")
        refund(playlist_id=pg3)                       # consumed 0, refund 2
        check("G3: balans terug op 100 (niets verbruikt)", balance() == 100, f"={balance()}")
        check("G3: reconciliatie diff=0 (full-fail)",
              balance() == init_g3 + ledger_excl_new_settlements(),
              f"balans={balance()} init+ledger={init_g3 + ledger_excl_new_settlements()}")

        # ── H: watchdog Pass 2b terminal-only (attempts>=1, niet 0) ───────────
        print("H — watchdog Pass 2b: terminal-only (attempts>=1), transient (0) NIET:")
        ph = mk_playlist(3)
        set_balance(100); reserve(0, playlist_id=ph)  # 3 vrij -> reserve 0; forceer credits_reserved>0 apart:
        sb.table("playlist_extraction_jobs").update({"status": "interrupted", "credits_reserved": 5,
                  "last_heartbeat_at": "2000-01-01T00:00:00+00:00", "watchdog_attempts": 0}).eq("id", ph).execute()
        # Repliceer de Pass 2b-query voor attempts=0 (mag NIET selecteren):
        q0 = sb.table("playlist_extraction_jobs").select("id").eq("status", "interrupted")\
            .gte("watchdog_attempts", 1).gt("credits_reserved", 0).eq("id", ph).execute().data
        check("H: transient (attempts=0) wordt NIET geselecteerd door Pass 2b", len(q0) == 0)
        sb.table("playlist_extraction_jobs").update({"watchdog_attempts": 1}).eq("id", ph).execute()
        q1 = sb.table("playlist_extraction_jobs").select("id").eq("status", "interrupted")\
            .gte("watchdog_attempts", 1).gt("credits_reserved", 0).eq("id", ph).execute().data
        check("H: terminal (attempts>=1) WORDT geselecteerd", len(q1) == 1)

        # ── I: in-flight over flag-flip (oude aftrek naast settlement) ────────
        print("I — in-flight: niet-gereserveerd (oude aftrek) naast gereserveerd (settlement):")
        set_balance(100)
        p_old = mk_playlist(4)   # NIET reserveren -> credits_reserved=0 -> oude aftrek
        progress(p_old, "vid3", True, 1)   # betaalde caption -> DIRECTE aftrek (oude modus)
        b_old = balance()
        p_new = mk_playlist(4)
        reserve(1, playlist_id=p_new)      # gereserveerd -> settlement-modus
        b_new_reserve = balance()
        progress(p_new, "vid3", True, 1)   # settlement (balans-neutraal)
        b_new_settle = balance()
        check("I: oude modus trekt direct af (100->99)", b_old == 99, f"={b_old}")
        check("I: nieuwe modus reserveert (99->98) dan settle balans-neutraal (98)",
              b_new_reserve == 98 and b_new_settle == 98, f"reserve={b_new_reserve} settle={b_new_settle}")

        # ── J: UPLOAD-DISPATCH e2e — reserve->settle->refund door de gedeelde wrapper ────────
        # Dekt het gat dat de RPC-tests (A-I) misten: main.py:829 (upload) + :817 (fallback)
        # roepen nu run_whisper_reservation_aware aan i.p.v. de pipeline direct. Zonder die
        # bedrading vuurden reserve + de oude aftrek samen = dubbele afrekening bij flag ON.
        # We stubben de pipeline (settle in reservation_mode = wat de echte pipeline op success
        # doet) en bewijzen dat de dispatch reserve->settle->refund sluit: balans exact één keer.
        print("J — upload-dispatch e2e (gedeelde wrapper, gestubde pipeline):")
        import asyncio as _aio
        import transcription_pipeline as _tp
        _orig_pipeline = _tp.do_assemblyai_transcription
        _seen = {}

        async def _fake_success(user_id, video_id, **kw):
            _seen["success_res_mode"] = kw.get("reservation_mode")
            settle(7, job_id=kw["job_id"])   # simuleer werkelijk verbruik 7 (schatting was 10)
            return {"success": True, "transcript_id": None, "credit_cost": 7}

        async def _fake_failure(user_id, video_id, **kw):
            return {"success": False, "error_type": "test", "credit_cost": 0}

        # Success: reserve 10 -> pipeline settelt 7 -> refund 3 -> balans 100-7=93 (één keer).
        set_balance(100); jj = mk_job()
        sb.table("transcription_jobs").update({"source_type": "upload"}).eq("id", jj).execute()
        reserve(10, job_id=jj)   # zet credits_reserved=10 (zoals main.py:790 bij flag ON)
        _tp.do_assemblyai_transcription = _fake_success
        try:
            _aio.run(_tp.run_whisper_reservation_aware(USER, None, job_id=jj, audio_path="/dev/null", audio_title="t"))
        finally:
            _tp.do_assemblyai_transcription = _orig_pipeline
        check("J: upload-dispatch geeft reservation_mode=True door (oude aftrek onderdrukt)", _seen.get("success_res_mode") is True)
        check("J: upload-success -> settle 7 geregistreerd", settlements_sum("job_id", jj) == 7, f"={settlements_sum('job_id', jj)}")
        check("J: upload-success -> balans exact 93 (=100-7, geen dubbele aftrek)", balance() == 93, f"={balance()}")

        # Failure: reserve 10 -> geen settle -> refund 10 -> balans terug op 100.
        set_balance(100); jk = mk_job()
        sb.table("transcription_jobs").update({"source_type": "upload"}).eq("id", jk).execute()
        reserve(10, job_id=jk)
        _tp.do_assemblyai_transcription = _fake_failure
        try:
            _aio.run(_tp.run_whisper_reservation_aware(USER, None, job_id=jk, audio_path="/dev/null", audio_title="t"))
        finally:
            _tp.do_assemblyai_transcription = _orig_pipeline
        check("J: upload-failure -> geen settle", settlements_sum("job_id", jk) == 0, f"={settlements_sum('job_id', jk)}")
        check("J: upload-failure -> volledige refund, balans terug op 100", balance() == 100, f"={balance()}")

        # J2: flag-OFF-regressie — ongereserveerde job (credits_reserved=0) mag NIET refunden en
        # de pipeline krijgt de oude-aftrek-modus. Bewijst rollback-veiligheid van de wrapper.
        print("J2 — wrapper zonder reservering: oude aftrek-modus, geen refund (flag-OFF-regressie):")
        set_balance(100); jl = mk_job()   # GEEN reserve -> credits_reserved=0
        async def _fake_old(user_id, video_id, **kw):
            _seen["old_res_mode"] = kw.get("reservation_mode")
            _seen["old_deduct"] = kw.get("deduct_credits_on_success")
            return {"success": True, "transcript_id": None, "credit_cost": 5}
        _tp.do_assemblyai_transcription = _fake_old
        try:
            _aio.run(_tp.run_whisper_reservation_aware(USER, None, job_id=jl, audio_title="t"))
        finally:
            _tp.do_assemblyai_transcription = _orig_pipeline
        _refunds_jl = sb.table("credit_transactions").select("id").eq("user_id", USER).eq("kind", "refund").eq("job_id", jl).execute().data
        check("J2: ongereserveerd -> reservation_mode=False + oude aftrek toegestaan",
              _seen.get("old_res_mode") is False and _seen.get("old_deduct") is True, f"seen={_seen}")
        check("J2: ongereserveerd -> GEEN refund-post", len(_refunds_jl) == 0, f"={len(_refunds_jl)}")

        # ── K: watchdog Pass 2 refund-vóór-claim — gefaalde refund NIET terminal, retry-veilig ──
        print("K — watchdog Pass 2 (gereserveerd): gefaalde refund blijft 'interrupted', geslaagde is idempotent:")
        import worker as _wk
        _orig_wk_refund = _wk.refund_credits

        def _tj_status(jid):
            return sb.table("transcription_jobs").select("status").eq("id", jid).single().execute().data["status"]
        def _refund_rows(jid):
            return len(sb.table("credit_transactions").select("id").eq("user_id", USER)
                       .eq("kind", "refund").eq("job_id", jid).execute().data)

        sb.table("credit_transactions").delete().eq("user_id", USER).execute()  # hermetisch
        set_balance(100); jK = mk_job()
        reserve(10, job_id=jK); settle(4, job_id=jK)   # reserved 10, verbruikt 4 -> refund 6
        sb.table("transcription_jobs").update({
            "status": "interrupted", "watchdog_attempts": 1,
            "last_heartbeat_at": "2000-01-01T00:00:00+00:00",
        }).eq("id", jK).execute()
        jobK = {"id": jK, "user_id": USER, "credits_reserved": 10, "credits_cost": 0}
        b0K = balance()  # baseline na reserve+settle — assert op DELTA (immuun voor transient balans-drift)

        # (1) Refund faalt (gesimuleerde 522): status mag NIET terminal worden.
        _wk.refund_credits = lambda job_id=None, playlist_id=None: {"success": False, "error": "sim 522"}
        _aio.run(_wk._refund_then_claim_job(sb, jobK))
        _wk.refund_credits = _orig_wk_refund
        check("K: gefaalde refund -> status blijft 'interrupted'", _tj_status(jK) == "interrupted", f"={_tj_status(jK)}")
        check("K: gefaalde refund -> geen refund-rij", _refund_rows(jK) == 0, f"={_refund_rows(jK)}")
        check("K: gefaalde refund -> balans ongewijzigd (== baseline)", balance() == b0K, f"b0={b0K} nu={balance()}")

        # (2) Volgende cyclus: refund lukt -> terminal + één rij (6) + balans += 6 (reserved 10 - settled 4).
        _aio.run(_wk._refund_then_claim_job(sb, jobK))
        check("K: geslaagde refund -> status 'error'", _tj_status(jK) == "error", f"={_tj_status(jK)}")
        check("K: geslaagde refund -> precies één refund-rij", _refund_rows(jK) == 1, f"={_refund_rows(jK)}")
        check("K: geslaagde refund -> balans = baseline + 6", balance() == b0K + 6, f"b0={b0K} nu={balance()}")

        # (3) Retry ná succes: idempotent, geen dubbele rij/mutatie.
        _aio.run(_wk._refund_then_claim_job(sb, jobK))
        check("K: retry ná succes -> nog steeds één refund-rij (idempotent)", _refund_rows(jK) == 1, f"={_refund_rows(jK)}")
        check("K: retry ná succes -> balans onveranderd (baseline + 6)", balance() == b0K + 6, f"b0={b0K} nu={balance()}")

        # ── K2: oude-modus pad (refund_credits_flat) — zelfde retry-veiligheid ────────────────
        print("K2 — watchdog Pass 2 (oude modus, refund_credits_flat):")
        _orig_wk_flat = _wk.refund_credits_flat
        sb.table("credit_transactions").delete().eq("user_id", USER).execute()  # hermetisch
        set_balance(100); jK2 = mk_job()
        sb.table("transcription_jobs").update({
            "status": "interrupted", "watchdog_attempts": 1, "credits_deducted": True,
            "last_heartbeat_at": "2000-01-01T00:00:00+00:00",
        }).eq("id", jK2).execute()
        jobK2 = {"id": jK2, "user_id": USER, "credits_reserved": 0, "credits_cost": 5}
        b0K2 = balance()  # baseline (== 100 na set_balance) — assert op DELTA

        _wk.refund_credits_flat = lambda *a, **k: {"success": False, "error": "sim 522"}
        _aio.run(_wk._refund_then_claim_job(sb, jobK2))
        _wk.refund_credits_flat = _orig_wk_flat
        check("K2: gefaalde flat-refund -> status blijft 'interrupted'", _tj_status(jK2) == "interrupted", f"={_tj_status(jK2)}")
        check("K2: gefaalde flat-refund -> geen refund-rij + balans ongewijzigd", _refund_rows(jK2) == 0 and balance() == b0K2, f"rows={_refund_rows(jK2)} b0={b0K2} nu={balance()}")

        _aio.run(_wk._refund_then_claim_job(sb, jobK2))
        check("K2: geslaagde flat-refund -> status 'error', één rij (5), balans = baseline + 5",
              _tj_status(jK2) == "error" and _refund_rows(jK2) == 1 and balance() == b0K2 + 5,
              f"status={_tj_status(jK2)} rows={_refund_rows(jK2)} b0={b0K2} nu={balance()}")
        _aio.run(_wk._refund_then_claim_job(sb, jobK2))
        check("K2: retry ná succes -> idempotent (één rij, balans baseline + 5)",
              _refund_rows(jK2) == 1 and balance() == b0K2 + 5, f"rows={_refund_rows(jK2)} b0={b0K2} nu={balance()}")

        # ── L: wrapper whisper-success refund-failure ALARMEERT (geen stille slik) ────────────
        print("L — wrapper whisper-success refund-failure alarmeert (geen stille slik):")
        _alerts = []
        _orig_cap = _tp.sentry_sdk.capture_message
        _orig_tp_refund = _tp.refund_credits

        async def _succ_settle(user_id, video_id, **kw):
            settle(7, job_id=kw["job_id"])
            return {"success": True, "transcript_id": None, "credit_cost": 7}

        set_balance(100); jL = mk_job()
        sb.table("transcription_jobs").update({"source_type": "upload"}).eq("id", jL).execute()
        reserve(10, job_id=jL)
        _tp.do_assemblyai_transcription = _succ_settle
        _tp.refund_credits = lambda job_id=None, playlist_id=None: {"success": False, "error": "sim 522"}
        _tp.sentry_sdk.capture_message = lambda msg, **kw: _alerts.append((msg, kw.get("level")))
        try:
            _aio.run(_tp.run_whisper_reservation_aware(USER, None, job_id=jL, audio_path="/dev/null", audio_title="t"))
        finally:
            _tp.do_assemblyai_transcription = _orig_pipeline
            _tp.refund_credits = _orig_tp_refund
            _tp.sentry_sdk.capture_message = _orig_cap
        check("L: gefaalde wrapper-refund triggert error-Sentry (geen stille slik)",
              any(lvl == "error" for _, lvl in _alerts), f"alerts={_alerts}")

        # ── M/M2/M3: refund_with_retry — bounded idempotente retry op de terminale refund-paden ──
        _orig_tp_refund2 = _tp.refund_credits
        _calls = {"n": 0}
        def _fail_once(job_id=None, playlist_id=None):
            _calls["n"] += 1
            if _calls["n"] == 1:
                return {"success": False, "error": "sim 522"}
            return _orig_tp_refund2(job_id, playlist_id)

        print("M — refund_with_retry (job/whisper-pad): fail-1x-dan-succes -> één rij, retry idempotent:")
        set_balance(100); jM = mk_job()
        reserve(10, job_id=jM); settle(3, job_id=jM)   # refund = 10 - 3 = 7
        b0M = balance()
        _calls["n"] = 0
        _tp.refund_credits = _fail_once
        try:
            _aio.run(_tp.refund_with_retry(jM, None, base_delay=0, context="test"))
        finally:
            _tp.refund_credits = _orig_tp_refund2
        check("M: retry gebeurde (stub 2x aangeroepen)", _calls["n"] == 2, f"={_calls['n']}")
        check("M: precies één refund-rij", _refund_rows(jM) == 1, f"={_refund_rows(jM)}")
        check("M: balans = baseline + 7", balance() == b0M + 7, f"b0={b0M} nu={balance()}")

        print("M2 — refund_with_retry (playlist-pad): fail-1x-dan-succes -> één rij:")
        set_balance(100); pM = mk_playlist(4)
        reserve(3, playlist_id=pM)   # geen settlements -> refund 3
        b0M2 = balance()
        def _plrows(pid):
            return len(sb.table("credit_transactions").select("id").eq("user_id", USER)
                       .eq("kind", "refund").eq("playlist_id", pid).execute().data)
        _calls["n"] = 0
        _tp.refund_credits = _fail_once
        try:
            _aio.run(_tp.refund_with_retry(None, pM, base_delay=0, context="test"))
        finally:
            _tp.refund_credits = _orig_tp_refund2
        check("M2: retry gebeurde (stub 2x)", _calls["n"] == 2, f"={_calls['n']}")
        check("M2: precies één refund-rij (playlist)", _plrows(pM) == 1, f"={_plrows(pM)}")
        check("M2: balans = baseline + 3", balance() == b0M2 + 3, f"b0={b0M2} nu={balance()}")

        print("M3 — refund_with_retry blijvend falen -> error-Sentry, geen mutatie, geen rij:")
        _alerts2 = []
        _orig_cap2 = _tp.sentry_sdk.capture_message
        set_balance(100); jM3 = mk_job()
        reserve(5, job_id=jM3)
        b0M3 = balance()
        _tp.refund_credits = lambda job_id=None, playlist_id=None: {"success": False, "error": "sim 522"}
        _tp.sentry_sdk.capture_message = lambda msg, **kw: _alerts2.append((msg, kw.get("level")))
        try:
            _aio.run(_tp.refund_with_retry(jM3, None, attempts=3, base_delay=0, context="test"))
        finally:
            _tp.refund_credits = _orig_tp_refund2
            _tp.sentry_sdk.capture_message = _orig_cap2
        check("M3: blijvend falen -> error-Sentry getriggerd", any(lvl == "error" for _, lvl in _alerts2), f"={_alerts2}")
        check("M3: blijvend falen -> geen refund-rij + balans ongewijzigd",
              _refund_rows(jM3) == 0 and balance() == b0M3, f"rows={_refund_rows(jM3)} b0={b0M3} nu={balance()}")

        # ── N/N2: Pass 2c reconciliatie — anti-join + idempotente refund, status ONgemuteerd ─────
        # Test de exacte Pass 2c-operaties (anti-join RPC + per-rij refund_credits) scoped op een
        # wegwerp-job, deterministisch. _reconcile_unrefunded_reserved is precies deze loop.
        def _antijoin_has(ref_id):
            data = sb.rpc("watchdog_unrefunded_reserved", {"p_limit": 200}).execute().data
            return any(r["ref_id"] == ref_id for r in (data or []))

        print("N — Pass 2c (job): anti-join vindt terminale reserved-zonder-refund -> boekt één rij, status ongemuteerd:")
        set_balance(100); jN = mk_job()
        reserve(10, job_id=jN); settle(4, job_id=jN)   # refund = 6
        sb.table("transcription_jobs").update({"status": "complete"}).eq("id", jN).execute()
        b0N = balance()
        check("N: anti-join vindt de gemiste refund", _antijoin_has(jN))
        refund(job_id=jN)   # = wat Pass 2c per anti-join-hit doet
        check("N: precies één refund-rij", _refund_rows(jN) == 1, f"={_refund_rows(jN)}")
        check("N: balans = baseline + 6", balance() == b0N + 6, f"b0={b0N} nu={balance()}")
        check("N: status NIET gemuteerd (blijft 'complete')", _tj_status(jN) == "complete", f"={_tj_status(jN)}")
        check("N: tweede cyclus -> anti-join matcht niets meer (idempotent)", not _antijoin_has(jN))
        refund(job_id=jN)
        check("N: tweede cyclus -> nog steeds één rij (geen dubbel)", _refund_rows(jN) == 1, f"={_refund_rows(jN)}")

        print("N2 — Pass 2c (playlist): idem voor het playlist-pad:")
        set_balance(100); pN = mk_playlist(5)
        reserve(2, playlist_id=pN)   # refund = 2
        sb.table("playlist_extraction_jobs").update({"status": "complete"}).eq("id", pN).execute()
        b0N2 = balance()
        check("N2: anti-join vindt de playlist", _antijoin_has(pN))
        refund(playlist_id=pN)
        check("N2: precies één refund-rij (playlist)", _plrows(pN) == 1, f"={_plrows(pN)}")
        check("N2: balans = baseline + 2", balance() == b0N2 + 2, f"b0={b0N2} nu={balance()}")
        check("N2: status NIET gemuteerd (blijft 'complete')",
              sb.table("playlist_extraction_jobs").select("status").eq("id", pN).single().execute().data["status"] == "complete")
        check("N2: tweede cyclus -> anti-join matcht niets meer", not _antijoin_has(pN))
        refund(playlist_id=pN)
        check("N2: tweede cyclus -> nog steeds één rij", _plrows(pN) == 1, f"={_plrows(pN)}")

    finally:
        sb.table("credit_transactions").delete().eq("user_id", USER).execute()
        if _jobs:
            sb.table("transcription_jobs").delete().in_("id", _jobs).execute()
        if _plists:
            sb.table("playlist_extraction_jobs").delete().in_("id", _plists).execute()
        sb.table("user_credits").delete().eq("user_id", USER).execute()
        try:
            sb.auth.admin.delete_user(USER)
        except Exception as e:
            print(f"(cleanup waarschuwing: {e})")
        print("(cleanup: wegwerp test-user + alle rijen verwijderd)")

    ok = all(results)
    print(f"\nVERDICT: {'ALLE ASSERTS GROEN' if ok else 'FAIL — ' + str(results.count(False)) + ' rood'} ({sum(results)}/{len(results)})")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

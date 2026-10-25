"""
Unit tests voor de snelle-balie-dispatch-idempotentie (growth-plan.md §6.3 H2).

Bewijst de kernclaim: een herhaalde aanroep van /api/quote/{id}/dispatch — of dat een Stripe-
webhook-retry is na een mislukte eerste dispatch, of de nieuwe watchdog-pass — dispatcht nooit
een bestand dat al een job_id heeft, en dispatcht WEL de bestanden die dat nog niet hebben. Dit is
precies de fix voor het gat waarbij een gecrashte dispatch-aanroep sommige bestanden permanent
zonder transcriptie liet (betaald, nooit geleverd).

Run: venv/bin/python -m pytest test_quick_quote_dispatch.py -v
"""
from main import _pending_quick_quote_file_indices


def _file(job_id=None, **extra):
    f = {"filename": "clip.mp3", "credits": 5, "price_cents": 200, "r2_key": "quick-quotes/x/0-clip.mp3"}
    if job_id is not None:
        f["job_id"] = job_id
    f.update(extra)
    return f


def test_fresh_quote_all_files_pending():
    """Eerste dispatch-aanroep: geen bestand heeft nog een job_id -> alles pending."""
    files = [_file(), _file(), _file()]
    assert _pending_quick_quote_file_indices(files) == [0, 1, 2]


def test_partially_dispatched_quote_only_missing_files_pending():
    """Bewijst de kern van H2: een crash halverwege de eerste dispatch liet bestand 1 zonder
    job_id (bv. R2-leesfout of een reserve-credits-fout) terwijl 0 en 2 al gedispatcht zijn. Een
    herhaalde aanroep moet ALLEEN bestand 1 opnieuw proberen — 0 en 2 mogen nooit een tweede job
    krijgen (dat zou dubbel credits reserveren voor hetzelfde bestand)."""
    files = [_file(job_id="job-0"), _file(), _file(job_id="job-2")]
    assert _pending_quick_quote_file_indices(files) == [1]


def test_fully_dispatched_quote_nothing_pending():
    """Een Stripe-webhook-retry (of de watchdog) die een AL VOLLEDIG gedispatchte offerte opnieuw
    aanroept mag niets meer doen — het dispatch-endpoint retourneert dan een no-op
    (already_dispatched) zonder de per-bestand-loop ooit te starten."""
    files = [_file(job_id="job-0"), _file(job_id="job-1")]
    assert _pending_quick_quote_file_indices(files) == []


def test_file_with_a_failed_attempt_but_no_job_id_is_retried():
    """Een bestand dat eerder faalde VOORDAT het een job_id kreeg (bv. job_status='reserve_failed'
    of 'missing_file' — zie dispatch_quick_quote) heeft GEEN job_id gekregen, en moet dus bij een
    volgende aanroep opnieuw geprobeerd worden (zelfheling), niet permanent overgeslagen."""
    files = [_file(job_id="job-0"), _file(job_status="reserve_failed")]
    assert _pending_quick_quote_file_indices(files) == [1]

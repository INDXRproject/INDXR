"""
Policy-K fix (ADR-051): een retry-/retry-all-job mag de gratis-3 NIET opnieuw toepassen.
Bewijst de mirror-invariant reserve==settle voor zowel originele als retry-jobs.

De settle-kant leeft inline in worker.py (process_playlist_video: is_free = idx<3 and not is_retry;
credit_amount = 0 if is_free else 1). We repliceren die EXACTE regel hier als _settle_total en
asserten dat hij per video overeenkomt met de reserve-kant (_compute_playlist_reservation).

Run: venv/bin/python -m pytest test_retry_free_tier.py -v
"""
import math

from main import _compute_playlist_reservation, calculate_credit_cost


def _settle_total(video_ids, whisper_ids, meta, is_retry):
    """Mirror van de per-video settle-regel in worker.py (process_playlist_video/_retries)."""
    whisper = set(whisper_ids or [])
    meta = meta or {}
    total = 0
    for idx, vid in enumerate(video_ids):
        if vid in whisper:
            d = (meta.get(vid) or {}).get('duration')
            total += calculate_credit_cost(d) if d and d > 0 else 1
        else:
            is_free = (idx < 3) and not is_retry
            total += 0 if is_free else 1
    return total


def _assert_reserve_equals_settle(video_ids, whisper_ids, meta, is_retry):
    reserve = _compute_playlist_reservation(video_ids, whisper_ids, meta, is_retry)
    settle = _settle_total(video_ids, whisper_ids, meta, is_retry)
    assert reserve == settle, f"reserve({reserve}) != settle({settle}) is_retry={is_retry}"
    return reserve


# ── De kernbewering: een retry-subset van caption-video's wordt belast ────────

def test_original_run_first_three_captions_free():
    """Originele run: de eerste 3 caption-video's zijn gratis, de rest 1 credit."""
    vids = ["a", "b", "c", "d", "e"]  # 5 captions
    total = _assert_reserve_equals_settle(vids, [], {}, is_retry=False)
    assert total == 2  # d + e; a/b/c gratis


def test_retry_subset_previously_paid_stays_paid():
    """
    Retry van video's die in de originele playlist al buiten de gratis-3 vielen:
    bij retry óók belast (geen gratis-3-reset). Dit is de kern van Policy-K.
    """
    # Retry-subset (2 caption-video's die origineel 'd' en 'e' waren, nu idx 0 en 1).
    vids = ["d", "e"]
    total = _assert_reserve_equals_settle(vids, [], {}, is_retry=True)
    assert total == 2  # BEIDE belast — zonder de fix zou dit 0 zijn (gratis-3-reset)


def test_retry_does_not_regrant_free_tier_for_first_three():
    """Retry-subset waarvan idx 0-2 origineel gratis WAS: bij retry nu belast."""
    vids = ["a", "b", "c"]  # zouden idx<3 zijn → zonder fix gratis
    original = _assert_reserve_equals_settle(vids, [], {}, is_retry=False)
    retried = _assert_reserve_equals_settle(vids, [], {}, is_retry=True)
    assert original == 0   # als eerste run: 3 gratis
    assert retried == 3    # als retry: alle 3 belast


def test_retry_mixed_whisper_and_caption_reserve_equals_settle():
    """Gemengde retry (whisper + caption): reserve==settle, whisper altijd belast, captions belast."""
    vids = ["w1", "c1", "c2"]
    whisper = ["w1"]
    meta = {"w1": {"duration": 125}}  # ceil(125/60)=3 credits
    total = _assert_reserve_equals_settle(vids, whisper, meta, is_retry=True)
    assert total == 3 + 1 + 1  # w1=3, c1=1, c2=1 (geen gratis)


def test_original_whisper_in_first_three_consumes_free_slot_no_discount():
    """Regressie: originele run — whisper op idx<3 krijgt GEEN korting (bestaand gedrag intact)."""
    vids = ["w1", "c1", "c2", "c3"]
    whisper = ["w1"]
    meta = {"w1": {"duration": 60}}  # 1 credit
    total = _assert_reserve_equals_settle(vids, whisper, meta, is_retry=False)
    # w1=1 (whisper, geen gratis), c1/c2 idx1/2 gratis, c3 idx3 belast
    assert total == 1 + 0 + 0 + 1


def test_reserve_equals_settle_property_across_shapes():
    """Property: voor elke vorm (retry True/False, whisper-mix) geldt reserve==settle."""
    shapes = [
        (["a", "b", "c", "d"], [], {}),
        (["a", "b", "c", "d"], ["a"], {"a": {"duration": 200}}),
        (["a", "b"], ["b"], {"b": {"duration": 30}}),
        (["a", "b", "c", "d", "e", "f"], ["c", "e"], {"c": {"duration": 610}, "e": {"duration": 61}}),
    ]
    for vids, whisper, meta in shapes:
        for is_retry in (False, True):
            _assert_reserve_equals_settle(vids, whisper, meta, is_retry)

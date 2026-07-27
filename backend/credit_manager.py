"""
Credit management for INDXR.AI
Handles credit balance checks, cost calculation, and atomic deduction via Supabase
"""

import os
import math
import logging
from typing import Dict, Optional
from supabase import create_client, Client

logger = logging.getLogger("indxr-backend")

# ADR-050 — credit-reservering, DEFAULT AAN sinds 2026-07-07 (fase 2/3 geactiveerd). Nieuwe
# jobs reserveren bij start (reserve → settle → refund is het levende credit-model); de
# overspend-race is live gesloten. Alle standalone-dispatch loopt via de reservation-aware
# wrapper (run_whisper_reservation_aware), dus geen dubbele aftrek. De oude directe aftrek
# blijft als else-tak voor niet-gereserveerde in-flight jobs. Rollback: zet de env-var
# CREDIT_RESERVATION_ENABLED expliciet op "false" (geen deploy nodig).
RESERVATION_ENABLED = os.environ.get("CREDIT_RESERVATION_ENABLED", "true").lower() == "true"

# Supabase client (singleton)
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create Supabase client."""
    global _supabase_client
    
    if _supabase_client is None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_key:
            raise Exception("Supabase credentials not configured in .env")
        
        _supabase_client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized")
    
    return _supabase_client


def record_proxy_bytes(category: str, byte_count: int, is_internal: bool = False) -> None:
    """F18: log Decodo proxy egress that is NOT tied to a delivered job/caption — the traffic that
    otherwise counts nothing: playlist-info scrapes, video-metadata scrapes, and the extract_info
    egress of caption attempts that find nothing/get blocked. Lands as the 'Proxy overhead' OPEX line
    (bytes × decodo_eur_per_gb). Disjoint from transcription_jobs.proxy_bytes (complete jobs → COR)
    and usage_logs.proxy_bytes (successful captions), so no double count.

    is_internal=True marks test/non-customer egress (e.g. a delay measurement) so it stays out of the
    EXTERNAL proxy-overhead OPEX (booked in internal instead); the account-level reconciliation still
    counts it since Decodo billed it. Real extraction paths leave it False.

    Best-effort and synchronous: never raises (a failed log must never break extraction), skips 0.
    category: 'playlist_info' | 'metadata' | 'caption_failed'."""
    try:
        n = int(byte_count or 0)
        if n <= 0:
            return
        get_supabase_client().table("proxy_usage_log").insert(
            {"category": category, "bytes": n, "is_internal": is_internal}
        ).execute()
    except Exception as e:
        logger.warning(f"[proxy-overhead] record failed ({category}): {e}")


def calculate_credit_cost(duration_seconds: float) -> int:
    """
    Calculate credit cost for audio transcription.

    Formula: 1 credit = 1 minute (60 seconds)
    Minimum: 1 credit for any audio

    Args:
        duration_seconds: Audio duration in seconds

    Returns:
        Number of credits required
    """
    if duration_seconds <= 0:
        return 1

    # Round up to nearest credit
    credits = math.ceil(duration_seconds / 60.0)
    
    logger.info(f"Credit cost for {duration_seconds:.2f}s: {credits} credits")
    return max(credits, 1)


def playlist_free_ids(video_ids, whisper_ids, is_retry: bool = False) -> set:
    """
    ENIGE bron van waarheid voor de playlist "eerste 3 gratis"-tier (backend-kant).

    Geeft de set video_ids terug die GRATIS zijn (0 credits). Aangeroepen door de reservering
    (_compute_playlist_reservation) én beide settlement-passes (worker.process_playlist_video hoofd-
    pass + process_playlist_retries), zodat reservering en afrekening EXACT dezelfde regel gebruiken —
    divergentie daar is een echt-geld-bug (reserved != Σsettlements). Zie ADR (gratis-slots).

    REGEL (per-methode, ADR gratis-slots): de eerste 3 CAPTION-video's op playlist-positie zijn gratis;
    AI/whisper-video's kosten NOOIT een slot, dus het bedrag is volgorde-onafhankelijk. De gratis-set
    wordt VOORAF bepaald uit (video_ids, whisper_ids) -> reservering == settlement, en er is GEEN
    doorschuif bij een gefaalde gratis video (het slot vervalt; zie ADR). Een retry pakt nooit een vers
    slot (`not is_retry`). Whisper wordt altijd per-minuut belast — die logica zit bij de caller.
    (Was t/m commit 14a4173 POSITIONEEL = eerste 3 POSITIES; per-methode gemaakt in Step 2.)
    """
    if is_retry:
        return set()
    ws = set(whisper_ids or [])
    free, seen_captions = set(), 0
    for vid in (video_ids or []):
        if vid not in ws:            # caption-video
            if seen_captions < 3:    # PLAYLIST_FREE_VIDEOS (mirror pricing.ts FREE_TIER, geborgd via fixture)
                free.add(vid)
            seen_captions += 1
    return free


def check_user_balance(user_id: str) -> int:
    """
    Get user's current credit balance.
    
    Args:
        user_id: User UUID
        
    Returns:
        Current credit balance
        
    Raises:
        Exception: If balance check fails
    """
    try:
        supabase = get_supabase_client()
        
        # Call get_user_credits RPC function
        response = supabase.rpc('get_user_credits', {'p_user_id': user_id}).execute()
        
        if response.data and len(response.data) > 0:
            balance = response.data[0].get('credits', 0)
            logger.info(f"User {user_id} balance: {balance} credits")
            return balance
        
        # User not found or no credits record
        logger.warning(f"No credit record for user {user_id}, returning 0")
        return 0
        
    except Exception as e:
        logger.error(f"Failed to check user balance: {e}")
        raise Exception(f"Could not check credit balance: {str(e)}")


def is_library_full(user_id: str) -> bool:
    """True if the user's library footprint is at/over their effective storage cap
    (library_bytes_cap + library_bytes_bonus). Call this BEFORE reserving credits so a full
    library never costs a user credits on a job that will be rejected (LESSONS 2026-07-22).
    Fails OPEN (returns False) on any error — a check failure must never block a paying job."""
    try:
        supabase = get_supabase_client()
        response = supabase.rpc('library_storage_is_full', {'p_user_id': user_id}).execute()
        return bool(response.data)
    except Exception as e:
        logger.warning(f"[storage] is_library_full check failed for {user_id}, allowing job: {e}")
        return False


def deduct_credits(
    user_id: str,
    amount: int,
    reason: str,
    metadata: Optional[Dict] = None,
    product_type: Optional[str] = None
) -> Dict:
    """
    Atomically deduct credits from user account.

    Uses PostgreSQL function with row-level locking to prevent race conditions.

    Args:
        user_id: User UUID
        amount: Number of credits to deduct
        reason: Reason for deduction (e.g., "Whisper transcription")
        metadata: Optional metadata dict (e.g., video_id, duration)
        product_type: COR-stempel voor het GELD-dashboard (ai_transcription/ai_summary/rag/caption).
                      deduct_credits_atomic leest dit uit p_metadata->>'product_type'.

    Returns:
        Dict with keys:
            - success (bool): Whether deduction succeeded
            - error (str): Error message if failed
            - previous_balance (int): Balance before deduction
            - new_balance (int): Balance after deduction
    """
    try:
        supabase = get_supabase_client()

        rpc_metadata = dict(metadata or {})
        if product_type is not None:
            rpc_metadata['product_type'] = product_type

        # Call atomic deduction function
        response = supabase.rpc('deduct_credits_atomic', {
            'p_user_id': user_id,
            'p_amount': amount,
            'p_reason': reason,
            'p_metadata': rpc_metadata
        }).execute()
        
        if response.data:
            result = response.data
            
            if result.get('success'):
                logger.info(
                    f"Credits deducted: {amount} from user {user_id} "
                    f"({result.get('previous_balance')} → {result.get('new_balance')})"
                )
            else:
                logger.warning(f"Credit deduction failed: {result.get('error')}")
            
            return result
        
        # Unexpected response
        return {
            'success': False,
            'error': 'Unexpected response from credit deduction'
        }
        
    except Exception as e:
        logger.error(f"Credit deduction error: {e}")
        return {
            'success': False,
            'error': f"Failed to deduct credits: {str(e)}"
        }


def add_credits(
    user_id: str,
    amount: int,
    reason: str = "Manual credit addition",
    kind: Optional[str] = None,
    metadata: Optional[Dict] = None,
) -> Dict:
    """
    Add credits to user account (for testing/admin/refunds).

    Args:
        user_id: User UUID
        amount: Number of credits to add
        reason: Reason for addition
        kind: Optional classification stamped on the ledger row. Credit side = exactly three:
              'purchase' | 'grant' | 'refund' (welcome/bonus rewards are grants). Backend refunds
              pass 'refund' so refund credits are separable from purchases/grants in metrics.
        metadata: Optional metadata dict merged into the ledger row.

    Returns:
        Dict with success status and balances
    """
    try:
        supabase = get_supabase_client()

        response = supabase.rpc('add_credits', {
            'p_user_id': user_id,
            'p_amount': amount,
            'p_reason': reason,
            'p_metadata': metadata or {},
            'p_kind': kind,
        }).execute()
        
        if response.data:
            logger.info(f"Credits added: {amount} to user {user_id}")
            return response.data
        
        return {
            'success': False,
            'error': 'Unexpected response from add_credits'
        }
        
    except Exception as e:
        logger.error(f"Add credits error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def reserve_credits(
    user_id: str,
    amount: int,
    job_id: Optional[str] = None,
    playlist_id: Optional[str] = None,
) -> Dict:
    """
    Reserveer credits bij job-start (ADR-050 fase 1). Trekt `amount` atomair af van
    user_credits.credits en legt een kind='reservation'-rij vast, zodat gereserveerde
    credits onbeschikbaar zijn voor concurrent jobs (sluit de overspend-race).

    Idempotent: dezelfde job twee keer reserveren trekt niet dubbel af (partiële UNIQUE
    (job_id,kind)/(playlist_id,kind)). Exact één van job_id/playlist_id opgeven.

    Returns:
        Dict met `success`; bij mislukking `error` (o.a. 'insufficient_credits') +
        `required`/`available`. `noop`/`idempotent` markeren de no-op/retry-gevallen.
    """
    try:
        supabase = get_supabase_client()
        response = supabase.rpc('reserve_credits', {
            'p_user_id': user_id,
            'p_amount': amount,
            'p_job_id': job_id,
            'p_playlist_id': playlist_id,
        }).execute()
        if response.data:
            result = response.data
            if not result.get('success'):
                logger.warning(f"Credit reservation failed: {result.get('error')} (user {user_id})")
            return result
        return {'success': False, 'error': 'Unexpected response from reserve_credits'}
    except Exception as e:
        logger.error(f"Credit reservation error: {e}")
        return {'success': False, 'error': f"Failed to reserve credits: {str(e)}"}


def settle_credits(
    user_id: str,
    amount: int,
    job_id: str,
    playlist_id: Optional[str] = None,
    video_id: Optional[str] = None,
    reason: str = "AI transcription",
) -> Dict:
    """
    Registreer het WERKELIJKE verbruik van één succesvolle whisper-video (ADR-050 fase 2).
    BALANS-NEUTRAAL: de balans is al bij reserve bewogen; dit is een consumptie-registratie
    (kind='settlement'), idempotent via (job_id,'settlement'). playlist_id meesturen bij
    whisper-in-playlist zodat de playlist-refund het meesomt.
    """
    try:
        supabase = get_supabase_client()
        response = supabase.rpc('settle_credits', {
            'p_user_id': user_id,
            'p_amount': amount,
            'p_job_id': job_id,
            'p_playlist_id': playlist_id,
            'p_video_id': video_id,
            'p_reason': reason,
        }).execute()
        if response.data:
            return response.data
        return {'success': False, 'error': 'Unexpected response from settle_credits'}
    except Exception as e:
        logger.error(f"Credit settlement error: {e}")
        return {'success': False, 'error': f"Failed to settle credits: {str(e)}"}


def refund_credits(job_id: Optional[str] = None, playlist_id: Optional[str] = None) -> Dict:
    """
    Verreken aan het eind van een job/playlist de reservering tegen het werkelijke verbruik
    (ADR-050 fase 2): refund = credits_reserved − Σ(settlements). Idempotent via (.,'refund').
    Exact één van job_id/playlist_id opgeven. Geen-reservering => no-op.
    """
    try:
        supabase = get_supabase_client()
        response = supabase.rpc('refund_credits', {
            'p_job_id': job_id,
            'p_playlist_id': playlist_id,
        }).execute()
        if response.data:
            result = response.data
            if not result.get('success'):
                logger.warning(f"Credit refund failed: {result.get('error')} (job={job_id}, playlist={playlist_id})")
            return result
        return {'success': False, 'error': 'Unexpected response from refund_credits'}
    except Exception as e:
        logger.error(f"Credit refund error: {e}")
        return {'success': False, 'error': f"Failed to refund credits: {str(e)}"}


def refund_credits_flat(user_id: str, job_id: str, amount: int, reason: str) -> Dict:
    """
    Idempotente vlakke refund voor het OUDE-modus-watchdog-pad (niet-gereserveerde job): boekt
    `amount` terug op user_credits.credits, idempotent via de partiële UNIQUE (job_id,'refund').
    Nodig omdat de watchdog-fix refund-vóór-terminal-claim doet — een retry ná een 522 mag niet
    dubbel terugboeken. Gebruik `refund_credits` voor gereserveerde jobs.
    """
    try:
        supabase = get_supabase_client()
        response = supabase.rpc('refund_credits_flat', {
            'p_user_id': user_id,
            'p_job_id': job_id,
            'p_amount': amount,
            'p_reason': reason,
        }).execute()
        if response.data:
            return response.data
        return {'success': False, 'error': 'Unexpected response from refund_credits_flat'}
    except Exception as e:
        logger.error(f"Credit flat-refund error: {e}")
        return {'success': False, 'error': f"Failed to flat-refund credits: {str(e)}"}

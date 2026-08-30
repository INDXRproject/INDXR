"""
Activation event for the Google Ads campaign — premium_action_completed.

Fires when an account COMPLETES an action that only makes sense if it needs the paid product:
AI transcription finished, AI summary generated, or a playlist video past the free three. It does
NOT fire on signup, caption extraction, or a job that failed — optimising Google on those would
teach it to send the wrong visitor.

The one property that matters for CAC is is_first_premium_action: whether this is the account's very
first premium action. It is decided ATOMICALLY server-side by mark_first_premium_action — a conditional
UPDATE (profiles.first_premium_action_at IS NULL -> now()) so exactly one concurrent call per account
wins the transition — never derived from a client-side assumption. The DB column is also the source of
truth for the admin "cost per activation" and activation-to-purchase cohort; the PostHog event mirrors it.

Best-effort: analytics must never break the credit/settle flow, so every failure here is swallowed + logged.
"""
import logging
import math
from typing import Optional

import posthog  # module-level singleton; api_key/host are configured by the importing process

logger = logging.getLogger("indxr-backend")

# The only three premium actions (keep in sync with the ADR + monitoring.md).
ACTION_AI_TRANSCRIPTION = "ai_transcription"
ACTION_AI_SUMMARY = "ai_summary"
ACTION_PLAYLIST_VIDEO = "playlist_video"


def record_premium_action(
    supabase,
    user_id: str,
    action_type: str,
    source_seconds: Optional[float] = None,
    credits_used: Optional[int] = None,
) -> bool:
    """Stamp the account's first-premium-action marker (atomic, once) and fire the PostHog event.

    Returns is_first_premium_action so callers can log it. Call this ONCE per completed premium action,
    from the success/settle path (never a start or a failure) — see the three call sites in
    transcription_pipeline.py, summary_pipeline.py and worker.py.
    """
    is_first = False
    try:
        res = supabase.rpc("mark_first_premium_action", {"p_user_id": user_id}).execute()
        is_first = bool(res.data)  # RPC RETURNS boolean
    except Exception as e:
        logger.warning(f"[premium-action] mark_first_premium_action failed ({action_type}, {user_id}): {e}")

    source_minutes: Optional[int] = None
    if source_seconds is not None:
        try:
            source_minutes = max(1, math.ceil(float(source_seconds) / 60.0))
        except (TypeError, ValueError):
            source_minutes = None

    try:
        if posthog.api_key:
            posthog.capture(
                distinct_id=user_id,
                event="premium_action_completed",
                properties={
                    "action_type": action_type,
                    "source_minutes": source_minutes,
                    "credits_used": credits_used,
                    "is_first_premium_action": is_first,
                },
            )
    except Exception as e:
        logger.warning(f"[premium-action] posthog capture failed ({action_type}, {user_id}): {e}")

    logger.info(
        f"[premium-action] {action_type} user={user_id} minutes={source_minutes} "
        f"credits={credits_used} first={is_first}"
    )
    return is_first

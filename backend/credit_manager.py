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


def deduct_credits(
    user_id: str,
    amount: int,
    reason: str,
    metadata: Optional[Dict] = None
) -> Dict:
    """
    Atomically deduct credits from user account.
    
    Uses PostgreSQL function with row-level locking to prevent race conditions.
    
    Args:
        user_id: User UUID
        amount: Number of credits to deduct
        reason: Reason for deduction (e.g., "Whisper transcription")
        metadata: Optional metadata dict (e.g., video_id, duration)
        
    Returns:
        Dict with keys:
            - success (bool): Whether deduction succeeded
            - error (str): Error message if failed
            - previous_balance (int): Balance before deduction
            - new_balance (int): Balance after deduction
    """
    try:
        supabase = get_supabase_client()
        
        # Call atomic deduction function
        response = supabase.rpc('deduct_credits_atomic', {
            'p_user_id': user_id,
            'p_amount': amount,
            'p_reason': reason,
            'p_metadata': metadata or {}
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


def add_credits(user_id: str, amount: int, reason: str = "Manual credit addition") -> Dict:
    """
    Add credits to user account (for testing/admin).
    
    Args:
        user_id: User UUID
        amount: Number of credits to add
        reason: Reason for addition
        
    Returns:
        Dict with success status and balances
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.rpc('add_credits', {
            'p_user_id': user_id,
            'p_amount': amount,
            'p_reason': reason
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

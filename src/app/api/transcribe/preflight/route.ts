import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';

export const maxDuration = 10;

/**
 * Preflight endpoint for direct audio uploads.
 * Handles auth, suspended check, and rate limiting before the browser
 * POSTs the file directly to Railway (bypassing the Vercel 4.5MB body limit).
 * No file data is involved here.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Suspended check
    const { data: profile } = await supabase
      .from('profiles')
      .select('suspended')
      .eq('id', user.id)
      .single();

    if (profile?.suspended) {
      return NextResponse.json(
        { success: false, error: 'Account suspended. Contact support@indxr.ai' },
        { status: 403 }
      );
    }

    // Rate limiting
    let isPremium = false;
    const { data: creditsData } = await supabase.rpc('get_user_credits', { p_user_id: user.id }).single();
    const typedCredits = creditsData as { total_credits_purchased: number } | null;
    if (typedCredits && typedCredits.total_credits_purchased > 0) {
      isPremium = true;
    }

    const rateLimit = await checkRateLimit(request, user.id, isPremium);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        { status: 429, headers: { 'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString() } }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Preflight error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@indxr/shared/utils/supabase/server';
import { checkRateLimit } from '@indxr/shared/lib/ratelimit';
import { MAX_PLAYLIST_VIDEOS_PER_JOB } from '@indxr/shared/lib/limits';

export const maxDuration = 60;

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

// ADR-071 — hard cap on videos per job (mirrors backend MAX_PLAYLIST_VIDEOS via the shared limits
// source). The backend re-enforces this before any credit reservation; this is the fast client-facing guard.
const requestSchema = z.object({
  video_ids: z.array(z.string())
    .min(1, 'At least one video ID is required')
    .max(MAX_PLAYLIST_VIDEOS_PER_JOB, `A playlist job can process at most ${MAX_PLAYLIST_VIDEOS_PER_JOB} videos. Split into smaller batches.`),
  collection_id: z.string().nullable().optional(),
  use_whisper_ids: z.array(z.string()).optional(),
  playlist_title: z.string().nullable().optional(),
  playlist_url: z.string().nullable().optional(),
  // Per-video display metadata ({video_id: {title, duration}}), persisted on the
  // job row so the per-video list can be rebuilt from the DB on resume.
  video_metadata: z.record(z.string(), z.object({
    title: z.string().optional(),
    duration: z.number().optional(),
  })).optional(),
  // Retry-/retry-all-job: suppresses the first-3-free tier server-side (the free-3 was
  // already consumed by the original run). Fixed allow-list — must be declared here or
  // safeParse strips it before it reaches the backend.
  is_retry: z.boolean().optional(),
});

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

    let isPremium = false;
    const { data: creditsData } = await supabase.rpc('get_user_credits', { p_user_id: user.id }).single();
    const typedCredits = creditsData as { total_credits_purchased: number } | null;
    if (typedCredits && typedCredits.total_credits_purchased > 0) {
      isPremium = true;
    }

    const rateLimit = await checkRateLimit(request, user.id, isPremium);
    if (!rateLimit.success) {
      const message = isPremium
        ? 'Free tier: 50 requests/hour. Upgrade to premium for unlimited extractions.'
        : 'Anonymous users: 10 requests/day. Sign up free for 50 requests/hour.';
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message,
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        { status: 429, headers: { 'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString() } }
      );
    }

    const body = await request.json();
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/playlist/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Backend-Secret': process.env.BACKEND_API_SECRET || '' },
        body: JSON.stringify({ ...result.data, user_id: user.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: data.error || 'Failed to start playlist extraction', code: data.code },
          { status: response.status }
        );
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error('Python Backend Error:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to connect to extraction service. Please try again later.' },
        { status: 503 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/ratelimit';
import { createClient } from '@/utils/supabase/server';

const requestSchema = z.object({
  videoIdOrUrl: z.string().min(1, 'URL or Video ID is required'),
});

// Python backend URL (update this for production deployment)
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    // 0. Get User (if logged in)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isPremium = false;
    if (user) {
      // Block suspended users
      const { data: profile } = await supabase
        .from('profiles')
        .select('suspended')
        .eq('id', user.id)
        .single();

      if (profile?.suspended) {
        return NextResponse.json(
          { error: 'Account suspended. Contact support@indxr.ai' },
          { status: 403 }
        );
      }

      const { data } = await supabase.rpc('get_user_credits', { p_user_id: user.id }).single();
      const typedData = data as { total_credits_purchased: number } | null;
      if (typedData && typedData.total_credits_purchased > 0) {
        isPremium = true;
      }
    }

    // 1. Rate Limiting Check
    const rateLimit = await checkRateLimit(request, user?.id, isPremium);
    
    if (!rateLimit.success) {
      const isFreeTier = rateLimit.mode === 'free';
      const message = isFreeTier
        ? 'Free tier: 50 requests/hour. Upgrade to premium for unlimited extractions.'
        : 'Anonymous users: 10 requests/day. Sign up free for 50 requests/hour.';

      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message,
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset
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

    const { videoIdOrUrl } = result.data;

    // Call Python backend for extraction
    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/extract/youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoIdOrUrl }),
      });

      const data = await response.json();

      // Forward the response from Python backend
      if (!response.ok || data.success === false) {
        return NextResponse.json(
          { 
            success: false,
            error: data.error || 'Failed to extract transcript' 
          },
          { status: 400 } // Use 400 for bad request logic from backend
        );
      }

      return NextResponse.json({ 
        success: true,
        transcript: data.transcript,
        title: data.title,
        video_url: data.video_url,
        duration: data.duration
      });
    } catch (error) {
      console.error('Python Backend Error:', error);
      
      // Backend connection error
      return NextResponse.json(
        { 
          success: false,
          error: 'Unable to connect to extraction service. Please try again later.' 
        },
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

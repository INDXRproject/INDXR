import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';

export const maxDuration = 60;

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Block suspended users
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

    // Rate limiting — same tier logic as /api/extract
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

    // Parse form data
    const formData = await request.formData();
    const sourceType = formData.get('source_type') as string;
    const videoId = formData.get('video_id') as string | null;
    const audioFile = formData.get('audio_file') as File | null;

    // Validate request
    if (!sourceType || !['youtube', 'upload'].includes(sourceType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid source type' },
        { status: 400 }
      );
    }

    if (sourceType === 'youtube' && !videoId) {
      return NextResponse.json(
        { success: false, error: 'Video ID required for YouTube transcription' },
        { status: 400 }
      );
    }

    if (sourceType === 'upload' && !audioFile) {
      return NextResponse.json(
        { success: false, error: 'Audio file required for upload transcription' },
        { status: 400 }
      );
    }

    // Forward to Python backend
    const backendFormData = new FormData();
    backendFormData.append('user_id', user.id);
    backendFormData.append('source_type', sourceType);
    
    if (videoId) {
      backendFormData.append('video_id', videoId);
    }
    
    if (audioFile) {
      backendFormData.append('audio_file', audioFile);
    }

    const response = await fetch(`${PYTHON_BACKEND_URL}/api/transcribe/whisper`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        return NextResponse.json(
          { success: false, error: errorData.detail || errorData.error || 'Backend error' },
          { status: response.status }
        );
      } catch {
        return NextResponse.json(
          { success: false, error: 'Backend error' },
          { status: response.status }
        );
      }
    }

    // Backend returns { job_id, status: "pending" } — forward directly.
    const data = await response.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Whisper API route error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        user_friendly_message: 'Something went wrong. Please try again later.'
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@indxr/shared/utils/supabase/server';

export const maxDuration = 60;
export const runtime = 'nodejs';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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

    const body = await request.json();

    // The frontend sends { transcript_id, user_id }. We forward it to the Python backend, which
    // now STARTS a background summary job (ADR-090) and returns { job_id, status } — no longer a
    // synchronous summary. Pass the backend response and status through as-is (like the whisper
    // start route); the frontend polls /api/summary/jobs/{job_id}.
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Backend-Secret': process.env.BACKEND_API_SECRET || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'api/ai/summarize' } });
    await Sentry.flush(2000);
    console.error('Summarize API Route Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while connecting to summarization service.' },
      { status: 500 }
    );
  }
}

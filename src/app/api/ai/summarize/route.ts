import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    // The frontend sends { transcript_id, user_id }
    // We forward this to the Python backend exactly as is.
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || 'Failed to generate summary'
        },
        { status: response.status === 200 ? 500 : response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Summarize API Route Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while connecting to summarization service.' },
      { status: 500 }
    );
  }
}

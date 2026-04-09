import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 60;

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ job_id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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

    const { job_id } = await params;

    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/jobs/${job_id}?user_id=${user.id}`
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Job status API route error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

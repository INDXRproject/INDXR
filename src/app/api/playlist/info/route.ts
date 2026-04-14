import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 60;

const requestSchema = z.object({
  url: z.string().optional(),
  videoIdOrUrl: z.string().optional(),
}).refine(data => data.url || data.videoIdOrUrl, {
  message: "Either 'url' or 'videoIdOrUrl' is required"
});

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    // Block suspended users
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
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
    }

    const body = await request.json();
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const url = result.data.url || result.data.videoIdOrUrl;

    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/playlist/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Backend-Secret': process.env.BACKEND_API_SECRET || '',
        },
        body: JSON.stringify({ videoIdOrUrl: url }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        return NextResponse.json(
          { 
            success: false,
            error: data.error || 'Failed to fetch playlist info' 
          },
          { status: response.status }
        );
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error('Python Backend Error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Unable to connect to extraction service.' 
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

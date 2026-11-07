import { NextResponse } from 'next/server';
import { createClient } from '@indxr/shared/utils/supabase/server';

// Fills transcripts.published_at (the YouTube upload date) on first view, so the source card can
// give a dated citation ("(2005, April 23)" instead of "(n.d.)"). One path for old and new
// transcripts alike: no change to the extraction/insert flows. Idempotent — returns the stored date
// when it is already set. Reads/writes through the user's own session (RLS: own rows only).
// Costs at most one YouTube Data API call per transcript, ever.

export const runtime = 'nodejs';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: row } = await supabase
    .from('transcripts')
    .select('id, video_id, published_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.published_at) return NextResponse.json({ published_at: row.published_at });
  if (!row.video_id) return NextResponse.json({ published_at: null });

  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/video/metadata/${encodeURIComponent(row.video_id)}?api_only=true`, {
      signal: AbortSignal.timeout(15000),
      headers: { 'X-Backend-Secret': process.env.BACKEND_API_SECRET || '' },
    });
    if (!res.ok) return NextResponse.json({ published_at: null });
    const meta = await res.json();
    // YouTube Data API path gives "YYYY-MM-DD"; the yt-dlp fallback gives "YYYYMMDD".
    const raw: string = String(meta?.upload_date ?? '');
    const iso = /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return NextResponse.json({ published_at: null });
    await supabase.from('transcripts').update({ published_at: iso }).eq('id', id).eq('user_id', user.id);
    return NextResponse.json({ published_at: iso });
  } catch {
    return NextResponse.json({ published_at: null });
  }
}

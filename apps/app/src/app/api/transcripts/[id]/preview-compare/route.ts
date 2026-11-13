import { NextResponse } from 'next/server';
import { createClient } from '@indxr/shared/utils/supabase/server';
import { previewCompareRemaining, previewCompareConsumeSlot } from '@indxr/shared/lib/ratelimit';

// Free "compare the first minute" preview (product-gaps gat 2 stap 4, akkoord Khidr 12-11) — no
// credits, no reservation. Captions-only (that's the whole point — showing the AI difference on a
// captions transcript), video >= 2 min (otherwise the preview is nearly the whole thing), max
// 5/user/day. Re-fetching an already-compared transcript is a free cache hit (no rate-limit
// consumption, no backend call) — "a comparison already made for THIS transcript stays openable."
// A FAILED attempt (e.g. YouTube bot-detection, live found 2026-11-14) does NOT consume a daily
// slot — the quota check and the quota consumption are deliberately two separate steps.

export const runtime = 'nodejs';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
const MIN_DURATION_SECONDS = 120;
const PREVIEW_SECONDS = 60;

interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  speaker?: string;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: row } = await supabase
    .from('transcripts')
    .select('video_id, duration, processing_method, transcript, preview_ai_segments')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const captions = ((row.transcript as TranscriptSegment[] | null) ?? []).filter((s) => s.offset < PREVIEW_SECONDS);

  // Already compared for this exact transcript — free re-open, no rate limit, no backend call.
  if (row.preview_ai_segments) {
    return NextResponse.json({ captions_segments: captions, ai_segments: row.preview_ai_segments });
  }

  if (row.processing_method !== 'youtube_captions' || !row.video_id) {
    return NextResponse.json({ error: 'Preview is only available on a YouTube captions transcript.' }, { status: 400 });
  }
  if (!row.duration || row.duration < MIN_DURATION_SECONDS) {
    return NextResponse.json({ error: 'This video is too short for a first-minute preview.' }, { status: 400 });
  }

  const remaining = await previewCompareRemaining(user.id);
  if (remaining <= 0) {
    return NextResponse.json({ error: "You've reached today's preview limit. Try again tomorrow.", code: 'rate_limited' }, { status: 429 });
  }

  let aiSegments: TranscriptSegment[];
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/preview/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Backend-Secret': process.env.BACKEND_API_SECRET || '' },
      body: JSON.stringify({ video_id: row.video_id }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = body?.detail;
      const message = (typeof detail === 'object' ? detail?.message : detail) || 'Could not generate the preview.';
      const code = typeof detail === 'object' ? detail?.code : undefined;
      // A failed attempt (bot-detection or any other download/transcribe failure) never consumes
      // a daily slot — only a successful comparison does (see previewCompareConsumeSlot below).
      return NextResponse.json({ error: message, code }, { status: res.status });
    }
    const body = await res.json();
    aiSegments = body.ai_segments;
  } catch {
    return NextResponse.json({ error: 'Could not generate the preview.' }, { status: 502 });
  }

  await previewCompareConsumeSlot(user.id);
  await supabase.from('transcripts').update({ preview_ai_segments: aiSegments }).eq('id', id).eq('user_id', user.id);
  await supabase.from('profiles').update({ preview_compare_seen: true }).eq('id', user.id);

  return NextResponse.json({ captions_segments: captions, ai_segments: aiSegments });
}

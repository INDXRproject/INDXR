import { NextResponse } from 'next/server';
import { createClient } from '@indxr/shared/utils/supabase/server';
import {
  buildCslJson,
  buildRis,
  buildBibLatex,
  buildCitekey,
  renderCitation,
  CITATION_STYLES,
  type CitationStyle,
} from '@indxr/shared/lib/citation';

// ADR-111 (Zotero fase 1). GET renders/exports a citation for one transcript; PATCH remembers the
// caller's preferred style on profiles.citation_style (SourceCard's style dropdown). citeproc-js +
// the official CSL style files do the actual rendering (citation.ts) — this route only does
// auth/ownership + picks the output format.

export const runtime = 'nodejs';

async function loadTranscript(id: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('transcripts')
    .select('title, channel, video_id, published_at, language')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  return data;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const row = await loadTranscript(id, user.id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(req.url);
  const style = (url.searchParams.get('style') || 'apa') as CitationStyle;
  const format = url.searchParams.get('format') || 'text';
  if (!CITATION_STYLES.includes(style)) {
    return NextResponse.json({ error: `Unknown style. Use one of: ${CITATION_STYLES.join(', ')}` }, { status: 400 });
  }

  const item = buildCslJson(id, {
    title: row.title || 'Untitled Transcript',
    channel: row.channel,
    videoId: row.video_id,
    publishedAt: row.published_at,
    language: row.language,
  });

  if (format === 'csl-json') {
    return NextResponse.json(item);
  }
  if (format === 'ris') {
    return new NextResponse(buildRis(item), { headers: { 'Content-Type': 'application/x-research-info-systems; charset=utf-8', 'Content-Disposition': `attachment; filename="${id}.ris"` } });
  }
  if (format === 'bib') {
    const citekey = buildCitekey({ channel: row.channel, title: item.title as string, publishedAt: row.published_at });
    return new NextResponse(buildBibLatex(item, citekey), { headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8', 'Content-Disposition': `attachment; filename="${id}.bib"` } });
  }

  const { plain, html } = renderCitation(item, style);
  return NextResponse.json({ style, plain, html });
}

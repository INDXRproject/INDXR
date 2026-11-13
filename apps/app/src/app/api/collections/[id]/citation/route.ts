import { NextResponse } from 'next/server';
import { createClient } from '@indxr/shared/utils/supabase/server';
import { buildCslJson, buildRis, buildBibLatex, buildCitekey } from '@indxr/shared/lib/citation';

// ADR-111 (Zotero fase 1). Collection-wide export — same CSL-JSON/RIS/BibLaTeX builders as the
// per-transcript route, applied to every transcript in the collection in one file.

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: collection } = await supabase.from('collections').select('id, name').eq('id', id).eq('user_id', user.id).single();
  if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: transcripts } = await supabase
    .from('transcripts')
    .select('id, title, channel, video_id, published_at, language')
    .eq('collection_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const items = (transcripts || []).map((t) =>
    buildCslJson(t.id, {
      title: t.title || 'Untitled Transcript',
      channel: t.channel,
      videoId: t.video_id,
      publishedAt: t.published_at,
      language: t.language,
    })
  );

  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'csl-json';
  const safeName = (collection.name || 'collection').replace(/[^a-z0-9-_]+/gi, '_');

  if (format === 'csl-json') {
    return NextResponse.json(items);
  }
  if (format === 'ris') {
    return new NextResponse(items.map(buildRis).join('\n'), {
      headers: { 'Content-Type': 'application/x-research-info-systems; charset=utf-8', 'Content-Disposition': `attachment; filename="${safeName}.ris"` },
    });
  }
  if (format === 'bib') {
    const usedKeys = new Set<string>();
    const body = items
      .map((item) => {
        const authors = item.author as Array<{ literal?: string }> | undefined;
        const issuedParts = (item.issued as { 'date-parts'?: number[][] } | undefined)?.['date-parts']?.[0];
        let key = buildCitekey({
          channel: authors?.[0]?.literal,
          title: item.title as string,
          publishedAt: issuedParts ? `${issuedParts[0]}` : undefined,
        });
        let n = 2;
        while (usedKeys.has(key)) { key = `${key}-${n}`; n += 1; }
        usedKeys.add(key);
        return buildBibLatex(item, key);
      })
      .join('\n');
    return new NextResponse(body, {
      headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8', 'Content-Disposition': `attachment; filename="${safeName}.bib"` },
    });
  }
  return NextResponse.json({ error: 'Unknown format. Use one of: csl-json, ris, bib' }, { status: 400 });
}

import { NextResponse } from 'next/server';
import { createClient } from '@indxr/shared/utils/supabase/server';
import { CITATION_STYLES } from '@indxr/shared/lib/citationStyles';

// ADR-111 (Zotero fase 1). Remembers the caller's preferred citation style (SourceCard's style
// dropdown) on profiles.citation_style, across devices/sessions.

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const style = body?.style;
  if (!CITATION_STYLES.includes(style)) {
    return NextResponse.json({ error: `Unknown style. Use one of: ${CITATION_STYLES.join(', ')}` }, { status: 400 });
  }
  await supabase.from('profiles').update({ citation_style: style }).eq('id', user.id);
  return NextResponse.json({ citation_style: style });
}

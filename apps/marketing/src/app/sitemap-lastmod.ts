// Sitemap <lastmod> — één ISO-datum (YYYY-MM-DD) per route, met de hand onderhouden.
//
// ONDERHOUDSREGEL: pas de datum van een route ALLEEN aan wanneer de INHOUD van
// die pagina inhoudelijk wijzigt — zichtbare tekst, feiten, of paginastructuur.
// NIET aanpassen bij styling, refactors, dependency-bumps, of het toevoegen van
// metadata (zoals een canonical). Reden: Google gebruikt <lastmod> alleen als die
// verifieerbaar overeenkomt met de échte laatste contentwijziging. Eén uniforme
// buildstempel op álle URL's is daarom geen neutrale default — het traint crawlers
// om het veld te negeren (zie docs/LESSONS.md).
//
// SEEDING (eenmalig, uit de lokale git-historie): per route de laatste commit die
// de content van het bronbestand van die pagina wijzigde. Mapping route → bron:
//   - marketing/docs/article-pagina: het eigen page.tsx (bij docs/articles telt het
//     content-page.tsx, NIET de gedeelde DocsShell/ArticleLayout-template);
//   - homepage ("/"): page.tsx + de marketing-componenten die de copy dragen
//     (de laatste zichtbare-copy-wijziging zat in DifferentiatorStrip/ClosingCTASection).
// Pure metadata-only commits (bv. het toevoegen van een self-canonical) zijn
// overgeslagen: /about en /docs/guides/summaries zijn teruggelopen naar de laatste
// echte content-commit.
//
// Een route die HIER NIET staat krijgt bewust GEEN <lastmod> in de sitemap.
// Nooit terugvallen op de build-datum of Date.now() (Vercel cloont ondiep — git is
// daar niet betrouwbaar; de datums horen daarom hier in de repo te staan).

export const SITEMAP_LASTMOD: Record<string, string> = {
  // Marketing
  "": "2026-08-01",
  "/pricing": "2026-08-01",
  "/transcribe": "2026-08-01",
  "/about": "2026-05-03",
  "/contact": "2026-07-24",
  // Legal-pagina's tracken de legal-versie, niet cosmetische wording. /terms:
  // de 08-01-commit was PUUR de 'auto-captions'→'YouTube captions'-hernoeming (geen
  // wijziging aan rechten/plichten) → 2026-07-20 (= zichtbare "Last updated" op /terms).
  // /privacy: laatst inhoudelijk gewijzigd op 2026-08-02 (Google-Ads-cookie-disclosure +
  // cookietabel + Google-Ireland-subverwerker), consistent met de zichtbare "Last updated"
  // op /privacy én met LEGAL_VERSION=2026-08-02 (bundelversie, ADR-069/ADR-087). Wijzig
  // deze data alleen samen met LEGAL_VERSION + de zichtbare datum.
  "/privacy": "2026-08-02",
  "/terms": "2026-07-20",

  // Docs — Getting started
  "/docs": "2026-07-23",
  "/docs/quickstart": "2026-07-23",
  "/docs/how-indxr-works": "2026-07-23",
  "/docs/faq": "2026-07-23",

  // Docs — Guides
  "/docs/guides/single-video": "2026-08-01",
  "/docs/guides/playlists": "2026-08-01",
  "/docs/guides/uploads": "2026-07-23",
  "/docs/guides/library": "2026-07-23",
  "/docs/guides/summaries": "2026-07-22",

  // Docs — Reference
  "/docs/reference/export-formats": "2026-07-23",
  "/docs/reference/export-formats/txt": "2026-07-23",
  "/docs/reference/export-formats/markdown": "2026-08-01",
  "/docs/reference/export-formats/csv": "2026-07-23",
  "/docs/reference/export-formats/srt": "2026-07-23",
  "/docs/reference/export-formats/vtt": "2026-07-23",
  "/docs/reference/export-formats/json": "2026-07-23",
  "/docs/reference/accuracy": "2026-08-01",
  "/docs/reference/limits": "2026-07-23",

  // Docs — Account
  "/docs/account/credits": "2026-07-23",
  "/docs/account/billing": "2026-07-23",
  "/docs/account/settings": "2026-07-23",

  // Articles
  "/articles": "2026-08-01",
  "/articles/youtube-transcript-not-available": "2026-08-01",
  "/articles/youtube-age-restricted-transcript": "2026-07-23",
  "/articles/youtube-members-only-transcript": "2026-07-23",
  "/articles/youtube-transcript-non-english": "2026-07-23",
  "/articles/youtube-transcript-without-extension": "2026-07-23",
  "/articles/bulk-youtube-transcript": "2026-08-01",
  "/articles/youtube-playlist-transcript": "2026-08-01",
  "/articles/audio-to-text": "2026-08-01",
  "/articles/youtube-transcript-obsidian": "2026-08-01",
  "/articles/youtube-to-text": "2026-08-01",
  "/articles/youtube-transcript-markdown": "2026-08-01",
  "/articles/youtube-transcript-csv": "2026-08-01",
  "/articles/youtube-srt-download": "2026-08-01",
  "/articles/youtube-transcript-json": "2026-07-23",
  "/articles/youtube-transcript-for-rag": "2026-08-01",
  "/articles/chunk-youtube-transcripts-for-rag": "2026-07-23",
  "/articles/youtube-channel-knowledge-base": "2026-07-23",
  "/articles/youtube-transcripts-vector-database": "2026-07-23",
}

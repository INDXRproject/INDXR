# Beslissing 086: "Auto-captions" → "YouTube captions" (label-only hernoeming)

**Status:** Geaccepteerd
**Datum:** 2026-08-01
**Gerelateerde code:** `packages/shared/src/components/transcribe/method.ts`,
`.../transcribe/MethodRadioCards.tsx`, `packages/shared/src/utils/formatTranscript.ts`
(export-metadata), `.../free-tool/VideoTab.tsx`, `.../PlaylistManager.tsx`,
`.../PlaylistAvailabilitySummary.tsx`, `apps/app/src/app/admin/{adminTypes.ts,operations,transcripts}`,
`apps/marketing/src/**` (UI + articles + /docs), `docs/content/**` (artikelbron)

## Context
De vrije extractiemethode heette overal in de UI en de content "Auto-captions", maar de Library-badge
zei al `CC` en `pricing.ts` zei al "YouTube captions" — het product sprak zichzelf tegen. Zichtbaar
werd het toen het gedownloade bestand `transcript_source: "Auto-captions (YouTube)"` naast een `CC`-badge
stond. Bovendien is "auto" niet altijd waar: `yt-dlp` haalt op wat YouTube heeft — dat kan een door de
maker **geüploade** ondertiteling zijn, niet per se een automatisch gegenereerde. "YouTube captions" is
waar in beide gevallen.

## Beslissing
Hernoem **alleen de zichtbare tekst** "Auto-captions"/"auto-captions" → **"YouTube captions"** waar het
INDXR's methode/optie/kostenregel/badge betreft. De **DB-enum blijft ongemoeid**:
`processing_method = 'youtube_captions'` (en de `captions`/`ai` method-keys) veranderen niet. Prose die
uitlegt wát automatische ondertiteling ís (YouTube's mechanisme, nauwkeurigheid, beschikbaarheid) houdt
"automatic captions"/"auto-generated captions" — dat is correct Engels over YouTube's feature, geen
INDXR-label.

## Rationale
- **Label ≠ enum.** De string `youtube_captions` zit in bestaande rijen, de caption/AI-branch in de
  backend, de dedup-sleutels en de Playwright role-keys. De DB-waarde hernoemen zou die allemaal breken;
  de zichtbare tekst hernoemen raakt niets functioneels.
- **Waarheidsgetrouw.** "YouTube captions" dekt zowel auto-gegenereerde als creator-geüploade
  ondertiteling; "auto" overclaimde.
- **Consistentie.** De badge (`CC`), `pricing.ts` en de export-metadata vertellen nu hetzelfde verhaal.

## Consequenties
- Export-metadata (`transcript_source`) van gedownloade bestanden draagt nu "YouTube captions".
- Geen docs-route hernoemd: er is **geen** `/docs/.../auto-captions`-route (alleen `/docs/reference/accuracy`),
  dus geen redirect nodig. Het in-page anker op die pagina wijzigt `#auto-captions` → `#youtube-captions`
  (AnchorHeading leidt de id uit de tekst af); repo-brede grep vond **nul** verwijzingen naar dat anker.
- `docs/wiki/**` (interne documentatie) is bewust **niet** meegenomen — niet gebruikersgericht; deze ADR
  legt de terminologie vast, oudere wiki-pagina's mogen "auto-captions" nog noemen.
- ~35 code-comments + tientallen concept-uitleg-zinnen behouden "automatic captions" bewust (gerapporteerd).

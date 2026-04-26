# Beslissing 018: Export-logica consolidatie

**Status:** Geïmplementeerd  
**Datum:** 2026-04-26  
**Gerelateerde code:** `src/utils/formatTranscript.ts`, `src/components/TranscriptCard.tsx`, `src/components/library/TranscriptViewer.tsx`

## Context

De audit van 2026-04-26 legt een structureel patroon bloot: export-logica voor meerdere formaten bestaat op twee plaatsen tegelijkertijd.

**Gecentraliseerd in `formatTranscript.ts` (gebruikt door TC):**
- SRT → `generateSrt()` ✓
- VTT → `generateVtt()` ✓
- RAG JSON → `buildRagJson()` ✓

**Inline in `TranscriptCard.tsx` (formatTranscript-versie ongebruikt):**
- CSV → `downloadCsv()` (TC) vs `generateCsv()` (formatTranscript, nooit geïmporteerd)
- Markdown → `downloadMarkdown()` / `downloadMarkdownWithTimestamps()` (TC) vs `generateMarkdown()` (formatTranscript, nooit geïmporteerd)
- TXT → TC gebruikt `createParagraphMode` direct; `generateTxt()` in formatTranscript bestaat maar wordt nooit aangeroepen

**Bijkomend symptoom:**
`formatSrtTimestamp` en `formatVttTimestamp` zijn gekopieerd als dode lokale functies in `TranscriptCard.tsx` (regels 101–116). Ze worden niet aangeroepen; TC delegeert al aan `generateSrt`/`generateVtt`.

**Oorzaak:** De CSV- en Markdown-exports zijn toegevoegd nadat SRT/VTT al gecentraliseerd waren. Bij elke toevoeging is inline gekozen vanwege context-specifieke vereisten (YAML frontmatter, extra metadata), zonder de formatTranscript-versie te updaten of te verwijderen.

## Beslissing

Te nemen keuze uit twee opties:

**Optie A — Volledig centraliseren in formatTranscript.ts**  
`generateCsv`, `generateMarkdown`, `generateTxt` uitbreiden met de extra velden die TC nu inline heeft (YAML frontmatter, `published`, `duration_seconds`, `language`). Inline logica in TC vervangen door imports.  
*Pro:* Eén bron van waarheid; `TranscriptViewer.tsx` en toekomstige export-consumenten profiteren automatisch.  
*Con:* `formatTranscript.ts` wordt groter; YAML frontmatter is UI-specifiek en hoort misschien niet in een pure util.

**Optie B — Inline houden, formatTranscript opruimen**  
`generateCsv`, `generateMarkdown`, `generateTxt` uit `formatTranscript.ts` verwijderen. TC behoudt eigen inline logica. `buildRagChunks`, `resegmentTranscript`, `wrapSubtitleText` als module-private maken (export verwijderen).  
*Pro:* Simpeler; geen abstractie-overhead.  
*Con:* Als `TranscriptViewer.tsx` ooit dezelfde exports nodig heeft, moet logica opnieuw gedupliceerd worden.

## Rationale

Optie A gekozen: pure transformatielogica behoort in utils, niet in UI-componenten. `formatTranscript.ts` is de single source of truth voor alle export-formats. `TranscriptCard.tsx` delegeert volledig. `TranscriptViewer.tsx` en `TranscriptList.tsx` importeerden al correct — door TC ook te laten delegeren is de codebase nu consistent.

## Consequenties

- `src/components/TranscriptCard.tsx`: ~100 regels inline logica verwijderd (downloadCsv, downloadMarkdown, downloadMarkdownWithTimestamps, buildYamlFrontmatter, formatSrtTimestamp, formatVttTimestamp, fullTextWithTimestamps).
- `src/utils/formatTranscript.ts`: `generateCsv` uitgebreid met `publishedAt`, `durationSeconds`, `language`, `extractionMethod`. `generateMarkdown` uitgebreid met optioneel `context`-object inclusief YAML frontmatter en timestamp-links. `buildYamlFrontmatter` helper toegevoegd. `resegmentTranscript`, `wrapSubtitleText`, `buildRagChunks` zijn nu module-private (export verwijderd).
- Backwards compatibel: alle bestaande callers in `TranscriptViewer.tsx` en `TranscriptList.tsx` werken ongewijzigd (context-param is optioneel).

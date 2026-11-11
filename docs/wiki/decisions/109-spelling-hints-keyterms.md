# Beslissing 109: Spelling hints (AssemblyAI keyterms_prompt)

**Status:** Geaccepteerd
**Datum:** 2026-11-11
**Gerelateerde code:** `backend/{spelling_hints,assemblyai_client,transcription_pipeline,worker,main}.py`, `packages/shared/src/lib/spellingHints.ts`, `packages/shared/src/components/transcribe/SpellingHintsField.tsx`, `packages/shared/src/hooks/useRecentSpellingHints.ts`, `supabase/migrations/20261111193952_keyterms_spelling_hints.sql`

## Context

AI-transcripten spellen namen en vaktermen regelmatig fout — eigennamen, vakjargon, en voor ons
publiek specifiek filosofie-/geschiedenisnamen en Latijn/Grieks/Duits/Arabisch. AssemblyAI biedt
`keyterms_prompt` op async STT: tot 1000 termen op Universal-3.5 Pro / 200 op Universal-2, max 6
woorden per term, +$0,05/uur. AssemblyAI's eigen documentatie waarschuwt dat lange lijsten
averechts werken (een term kan een correct herkend woord overschrijven; bijna-homofonen botsen) —
klein en specifiek per opname is het ontwerp, niet alleen UI-voorkeur.

## Beslissing

- **Eén optioneel veld, alleen bij AI-transcriptie** ("+ Spelling hints", ingeklapt), max 50 termen
  × 6 woorden, in alle vier AI-transcriptie-paden (single video, upload, playlist — één lijst voor
  de hele job, en de anonieme snelle balie).
- **Master-cache wordt overgeslagen (lezen EN schrijven) zodra er hints zijn.** Geen cache-key-
  schema-wijziging nodig; een gehinte run is sowieso request-specifiek, dus hergebruik is zeldzaam.
  Een gehinte en een ongehinte run van dezelfde video delen dus nooit een cache-entry.
- **Kosten-add-on volgt exact het diarisatie-patroon (ADR-091):** `cost_config` rate-kolom → EUR/min
  helper-functie (SECURITY DEFINER, REVOKE anon/authenticated, GRANT service_role) →
  `transcription_jobs`-kolom → gevouwen in `job_cor_eur()` en `_geld_scope()` op dezelfde twee
  plekken als de diarisatie-add-on, additief (beide add-ons kunnen samen aanstaan).
- **Gebruikte termen = de vlag**, geen apart boolean. `transcription_jobs.keyterms text[]` /
  `transcripts.keyterms text[]` / `quick_quotes.keyterms text[]` zijn NULL/leeg = geen add-on, niet-
  leeg = add-on + het daadwerkelijke record voor UI/export.
- **Geen nieuwe tabel voor "recent gebruikte lijsten."** De laatste 3 distincte lijsten worden
  rechtstreeks uit de eigen `transcription_jobs`-rijen van de gebruiker gelezen (RLS staat dit al toe,
  ADR-104) — klein en intuïtief houden, geen beheerscherm.

## Rationale

Het diarisatie-patroon (cost_config-kolom + EUR/min-helper + job_cor_eur-param + twee
`_geld_scope`-plekken) is inmiddels de bewezen vorm voor een AssemblyAI-add-on-kost — een tweede
toepassing bevestigt dat het generaliseert zonder wijziging. Cache-overslaan in plaats van een
genormaliseerde cache-key (sorteren/lowercase/hash) is de eenvoudigste optie die het probleem
daadwerkelijk oplost: hints zijn per-request-specifiek, dus de cache-hit-kans was al laag.

## Consequenties

- `job_cor_eur()`'s signatuur is uitgebreid met een 5e parameter (`p_keyterms boolean`) — het oude
  4-argument-overload is gedropt; `compute_and_store_job_cost` is de enige caller en is in dezelfde
  migratie meegenomen.
- Playlist-retries delen de spelling-hints-lijst van de oorspronkelijke run (lifted state in
  `PlaylistTab`), omdat een retry een NIEUWE `playlist_extraction_jobs`-rij aanmaakt.
- `/api/playlist/extract` se Zod-schema moest `spelling_hints` expliciet declareren (safeParse strip
  anders onbekende velden vóór ze de backend bereiken) — zelfde patroon als `is_retry`.

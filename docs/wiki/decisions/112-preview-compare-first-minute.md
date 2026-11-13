# Beslissing 112: Gratis "vergelijk de eerste minuut" (captions vs AI)

**Status:** Geaccepteerd
**Datum:** 2026-11-13
**Gerelateerde code:** `backend/{audio_utils,main}.py`, `packages/shared/src/lib/ratelimit.ts`, `apps/app/src/app/api/transcripts/[id]/preview-compare/route.ts`, `apps/app/src/components/library/AiUpgradeCard.tsx`, `apps/app/src/app/dashboard/library/[id]/page.tsx`, `supabase/migrations/20261113225642_preview_compare_first_minute.sql`

## Context

Wie alleen gratis YouTube-captions gebruikt ziet nooit hoe goed een AI-transcript is. Product-gaps
gat 2, stap 1–3 (akkoord Khidr 12-11): een tekstlink "Compare the first minute free" naast de
bestaande "Transcribe with AI"-knop op een captions-transcript, die gratis de eerste 60 seconden
als AI-transcript laat zien naast de bestaande captions.

## Beslissing

- **`yt-dlp --download-sections "*0-60"` (het oorspronkelijke plan) is NIET gebruikt** — live
  getest op 2026-11-13 en gebroken door de Decodo-proxy: yt-dlp delegeert een `download_ranges`-
  download aan ffmpeg als externe downloader; ffmpeg's TCP-verbinding naar de proxy slaagt
  (`Successfully connected to 144.76.232.33 port 10001`), maar de daaropvolgende range-fetch faalt
  meteen met `Error opening input: End of file` — op een video die via het normale, volledige-
  download-pad (`extract_youtube_audio`, ADR-110) gewoon werkt. In plaats daarvan:
  **`extract_youtube_preview_clip()`** (nieuw, `audio_utils.py`) downloadt het VOLLEDIGE audiospoor
  via de al bewezen `extract_youtube_audio()` (zelfde audio-only-formaatselector, zelfde
  retry/foutclassificatie als elke andere job) en trimt daarna lokaal met `extract_preview_clip()`
  (ffmpeg op een lokaal bestand, geen netwerk — kan dus niet op dezelfde manier falen).
- **Consequentie: een voorproefje kost dezelfde proxy-egress als een volledige download** van die
  video — niet de kleinere "alleen 60 seconden"-kost die het oorspronkelijke plan voorzag. Dit is
  bewust geaccepteerd (geen alternatief dat live werkt, binnen de tijd van deze sessie), en begrensd
  door twee onafhankelijke maatregelen: een 5-per-gebruiker-per-dag-limiet (Upstash
  `previewCompare`-limiter) en een cache per `video_id` (`preview_comparisons`-tabel) — een tweede
  gebruiker die dezelfde video vergelijkt triggert geen nieuwe download of AssemblyAI-call.
- **Geen job-/poll-patroon voor de gebruiker.** 60 seconden audio transcribeert typisch binnen een
  paar seconden (live gemeten: eerste AssemblyAI-poll al `completed`) — de Next.js-route doet één
  synchrone call naar een nieuw backend-endpoint (`POST /api/preview/compare`) dat zelf tot 60s
  polt en het resultaat teruggeeft, in plaats van een apart job_id+pollroute op te zetten zoals de
  betaalde AI-transcriptiepaden.
- **Twee opslagplekken, bewust gescheiden naar scope:**
  - `preview_comparisons(video_id, ai_segments)` — backend-only cache (RLS aan, geen policies),
    cross-user: voorkomt een herhaalde download/AssemblyAI-call voor dezelfde video.
  - `transcripts.preview_ai_segments` — per-transcript resultaat, zodat "een al gemaakte
    vergelijking voor DIT transcript blijft openklapbaar" werkt zonder een aparte fetch, ook als de
    globale "al een keer gezien"-vlag (`profiles.preview_compare_seen`) de link elders al verborgen
    heeft.
- **Geen credits, geen reservering, geen `credit_transactions`-rij** in dit pad — net als de
  bestaande balie-preview (`extract_preview_clip`/`submit_assemblyai`, hier hergebruikt).

## Rationale

Een live-test vóór het bouwen (deze sessie's werkwijze: eerst meten, dan coderen)
voorkwam dat een subtiel-gebroken `download_ranges`-pad in productie terecht zou komen — de fout
("End of file" na een geslaagde proxy-tunnel) is precies het soort falen dat in een losse
unit-test niet opvalt (geen proxy, geen echte CDN-URL) maar bij elke echte aanroep zou raken. De
volledige-download-fallback hergebruikt uitsluitend al bewezen functies (geen nieuwe
retry/foutclassificatie-logica voor dit pad) — het enige nieuwe stuk is de lokale ffmpeg-trim, die
niet over het netwerk gaat en dus niet op dezelfde manier kan falen.

## Consequenties

- Een lang video (bv. 60 min) dat nog nooit vergeleken is, kost bij de EERSTE vergelijking de volle
  download-egress van die lengte — niet slechts 60 seconden. De 5/dag-limiet + de cache begrenzen
  de totale blootstelling, maar vervangen niet de kleinere kost die het plan voorzag. Als dit in de
  praktijk een probleem wordt (lange video's, veel unieke video's), is de volgende stap een eigen
  HTTP-Range-GET op de directe CDN-URL (buiten ffmpeg) in plaats van yt-dlp's `download_ranges` —
  niet in deze ronde gebouwd (buiten scope, geen tijd voor een tweede live-test-ronde).
- **Niet onafhankelijk verifieerbaar vanuit deze sessie:** het volledige klikpad in een browser
  (geen browser-tool beschikbaar hier), een echte 429 na een 6e voorproefje op één dag, en "de link
  verdwijnt bij een ANDER captions-transcript van hetzelfde account" (vereist twee+ echte accounts
  en een UI-klik-sessie). Wel geverifieerd: de backend-functie zelf end-to-end 2× live aangeroepen
  (1e `cached: false` incl. echte download+AssemblyAI-call, 2e `cached: true`, 0 nieuwe
  download-/AssemblyAI-logregels), `pnpm build` groen, `check-playlist-invariants.sh` groen.

## Vervolg — hoofdchat-review 14-11 (NU.md item 5+6)

**Item 5 (testsporen):** het settle-/refund-testscript van 13-11 23:44–00:16 draaide tegen
productie met een los nieuw account (`test-settle-*@example.invalid`) en een nep-playlist
(`vid0`/`vid1`/`vid2`) — 13 Sentry-meldingen en een "externe" signup die de groeicijfers vervuilde.
Financieel geen bug: elke reservering in `credit_transactions` heeft een kloppende
settlement/refund (`reserved = consumed + refunded` klopt op elke rij), en geen ANDER account had
activiteit in hetzelfde tijdvenster (22:40–00:20, query bevestigd) — dus de ruis is geïsoleerd tot
dit ene testaccount. Fix: account op `is_internal=true` gezet; LESSONS-regel toegevoegd
(productietests altijd tegen de vaste e2e-pool, nooit een los nieuw account of verzonnen
video-id's). Sentry-meldingen zelf op resolved zetten is bij de hoofdchat (Sentry-dashboard-toegang
hier niet beschikbaar).

**Item 6 (YouTube-botcheck op het voorproefje-pad):**
- **Meting:** in de laatste 7 dagen (excl. het testaccount) had 0 van de 64 echte AI-transcriptiejobs
  (51 compleet, 13 fout — 9× `ytdlp_parse`, 4× `proxy_error`) `bot_detection` als foutreden. De
  botcheck die hoofdchat op het voorproefje-pad zag (Sentry BA/B9, video `0agjc6at75o`, 0 B egress,
  3 pogingen) is dus geen structureel probleem van het betaalde AI-pad — vermoedelijk opgewekt door
  de burst aan losse proxy-sessies tijdens het testen zelf (zie ook de bestaande LESSONS-regel over
  lokale testruns die als bot-gedrag overkomen).
- **Mislukt voorproefje telt niet meer mee voor de 5/dag.** De oude implementatie consumeerde de
  Upstash-sliding-window-teller VÓÓR de download-poging (elke poging, geslaagd of niet, kostte een
  slot). Vervangen door een expliciete peek/consume-splitsing
  (`previewCompareRemaining`/`previewCompareConsumeSlot`, handmatige INCR+EXPIRE-nx-teller — dezelfde
  vorm als `backend/ratelimit.py` — want `@upstash/ratelimit`'s sliding-window-limiter heeft geen
  "peek zonder consumeren"): de route checkt de resterende slots vóór de backend-aanroep, maar
  verhoogt de teller alleen bij een GESLAAGDE respons. Geverifieerd tegen de echte Upstash-instance:
  6× INCR+EXPIRE+GET gedraaid, teller 1→6, `remaining` correct 4→0→0 (nooit negatief).
- **Specifieke foutmelding voor bot-detectie.** `backend/main.py`'s `preview_compare` classificeert
  de download-fout nu tegen `audio_utils.BOT_BLOCK_KEYWORDS` (dezelfde lijst als het betaalde
  AI-pad) — een match geeft `503 {code: "bot_detection", message: "YouTube blocked the download
  this time. Try again in a minute."}`, anders de generieke `502 download_failed`. Geverifieerd: de
  exacte Sentry-foutregel ("Sign in to confirm you're not a bot…") matcht de classificatie-logica.
- **Bewijs in de log:** één verse geslaagde aanroep (`yqc9zX04DXs`, `cached: false`, 7 segmenten,
  7.484.977 bytes download) + de classificatie-test tegen de echte Sentry-tekst (match op "sign in
  to confirm you're not a bot" → `bot_detection`). Een echte live-reproductie van een MISLUKT
  voorproefje kon niet op afroep geforceerd worden (YouTube's botcheck is niet deterministisch
  oproepbaar) — de classificatielogica is dus bewezen tegen de exacte eerder geobserveerde
  foutregel, niet tegen een nieuwe live-herhaling.

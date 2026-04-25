[2026-04-25] feat: RAG JSON export vanuit library dropdown — "RAG JSON ✦" opent altijd Dialog; State A (eerste export) met chunk selector, kredietkosten, "don't show again" + server action; State B (herexport) gratis clientside download; profiles.rag_chunk_size als default via parallel Supabase query in page.tsx | gewijzigd: src/components/library/TranscriptViewer.tsx, src/app/dashboard/library/[id]/page.tsx
---
[2026-04-25] fix: download bestandsnamen — alle exports gebruiken gesaniteerde video titel (max 30 chars) i.p.v. generiek "transcript"; RAG JSON bevat ook chunk preset (bijv. karpathy_rag_60s.json) | gewijzigd: src/components/TranscriptCard.tsx, src/components/library/TranscriptViewer.tsx, src/components/library/RagExportView.tsx
---
[2026-04-25] fix: Whisper polling — fetch exceptions niet langer directe fout; ≤3 opeenvolgende network errors → hervatten na 5s, >3 → neutrale "still processing" banner met Library link (geen rode error state) | gewijzigd: src/components/free-tool/VideoTab.tsx
---
[2026-04-25] feat: "RAG JSON ✦" in library export dropdown — gratis herexport met laatste chunk_size als rag_exports aanwezig; grayed-out met Radix tooltip als nog niet geëxporteerd | gewijzigd: src/components/library/TranscriptViewer.tsx, src/app/dashboard/library/[id]/page.tsx
---
[2026-04-25] feat: RAG export history + Developer tab in library — rag_exports schrijven bij credit deductie, buildRagJson() utility, "Developer ✦" tabblad met history tabel + gratis herexport, "RAG ✦" badge in transcript-lijst, transcriptId doorgegeven via VideoTab | gewijzigd: src/utils/formatTranscript.ts, src/app/actions/rag-export.ts, src/components/TranscriptCard.tsx, src/components/free-tool/VideoTab.tsx, src/components/library/TranscriptList.tsx, src/app/dashboard/library/[id]/page.tsx, src/components/library/RagExportView.tsx, docs/wiki/decisions/015-rag-json-export.md
---
[2026-04-25] content: /youtube-srt-download — resegmentatiestrategie alinea toegevoegd (AI vs auto-captions verschil uitgelegd) | gewijzigd: src/app/youtube-srt-download/page.tsx
---
[2026-04-25] feat: SRT/VTT professionele subtitle upgrade — resegmentatie (AI: 3-7s op zinsgrenzen, auto-captions: 3s tijdsgebaseerd), 42-char line wrap, VTT NOTE header; processing_method doorgegeven via TranscriptViewer → library krijgt sentence-aware blokken voor AssemblyAI transcripts | gewijzigd: src/utils/formatTranscript.ts, src/components/TranscriptCard.tsx, src/components/library/TranscriptViewer.tsx, src/app/dashboard/library/[id]/page.tsx, docs/wiki/architecture/database-schema.md
---
[2026-04-25] content: /youtube-transcript-csv — playlist CSV secties verwijderd (merged CSV bestaat niet); playlist sectie vervangen door één zin over ZIP download | gewijzigd: src/app/youtube-transcript-csv/page.tsx
---
[2026-04-24] feat: CSV export upgrade — BOM + metadata comment-rijen + 6 kolommen (segment_index, start_time, end_time, duration, word_count, text) in beide exportpaden; generateCsv() accepteert optionele meta voor library exports | gewijzigd: src/components/TranscriptCard.tsx, src/utils/formatTranscript.ts, src/components/library/TranscriptViewer.tsx
---
[2026-04-24] refactor: fictieve auteurs verwijderd — alex-mercer en sarah-lindqvist uit authors.ts verwijderd, alle 8 content-pagina's bijgewerkt naar indxr-editorial, marketing.md gesynchroniseerd | gewijzigd: src/lib/authors.ts, 8× src/app/**/page.tsx, docs/wiki/business/marketing.md
---
[2026-04-24] content: /youtube-transcript-markdown + /youtube-transcript-obsidian herschreven — real Huberman output, correct YAML schema (url/published/transcript_source/created als datum), klikbare deep link timestamps, Dataview queries bijgewerkt | gewijzigd: src/app/youtube-transcript-markdown/page.tsx, src/app/youtube-transcript-obsidian/page.tsx
---
[2026-04-24] docs: Markdown export sessie 4 testrapport — Huberman 137min PASS, YAML frontmatter + deep links + paragraafgroepering gevalideerd, 3 bugs gedocumenteerd | gewijzigd: docs/wiki/operations/test-reports.md
---
[2026-04-24] fix: MD-timestamps export — paragraafgroepering (gap>5s) ipv per-segment headers, deep link per paragraaf op timestamp eerste segment | gewijzigd: src/components/TranscriptCard.tsx
---
[2026-04-24] feat: Markdown export upgrades — YAML frontmatter (title, url, channel, published, duration, language, transcript_source, created, type, tags) + klikbare timestamp deep links (youtu.be/?t=N) in MD-timestamps variant | gewijzigd: src/components/TranscriptCard.tsx
---
[2026-04-24] content: /youtube-transcript-non-english — AssemblyAI Universal-2 supported languages bronlink + inline links toegevoegd | gewijzigd: src/app/youtube-transcript-non-english/page.tsx
---
[2026-04-24] content: /blog/chunk-youtube-transcripts-for-rag herschreven + /youtube-transcript-non-english aangemaakt — research tabel, echte Arabic output, tlang=en uitleg, 8 externe bronlinks | gewijzigd: src/app/blog/chunk-youtube-transcripts-for-rag/page.tsx, src/app/youtube-transcript-non-english/page.tsx
---
[2026-04-24] content: /youtube-transcript-for-rag herschreven — real 3Blue1Brown output, chunk presets tabel, LangChain + Pinecone code, overlap_strategy uitgelegd, 8 externe bronlinks, updatedAt 2026-04-24 | gewijzigd: src/app/youtube-transcript-for-rag/page.tsx
---
[2026-04-24] content: /youtube-transcript-json herschreven — real schema (Fireship + Karpathy output), overlap_strategy uitgelegd, pricing tabellen, externe bronlinks (Vectara/NVIDIA/AssemblyAI/Pinecone/ChromaDB), updatedAt 2026-04-24 | gewijzigd: src/app/youtube-transcript-json/page.tsx
---
[2026-04-23] docs: RAG JSON sessie 3 testrapport — v2 upgrade volledig gevalideerd (PASS), overlap aantoonbaar correct voor beide strategieën, 90s preset bevestigd, 2 bugs gedocumenteerd en gefixed | gewijzigd: docs/wiki/operations/test-reports.md
---
[2026-04-23] fix: RAG overlap strategie + extraction_method label — whisper_ai triggert nu sentence_boundary overlap (conditie uitgebreid); AudioTab + VideoTab geven 'assemblyai' door als extractionMethod prop (interne DB state 'whisper_ai' intact) | gewijzigd: src/utils/formatTranscript.ts, src/components/TranscriptCard.tsx, src/components/free-tool/AudioTab.tsx, src/components/free-tool/VideoTab.tsx
---
[2026-04-23] docs: ADR-015 implementatiedetails uitgebreid — extraction-method-aware overlap strategie (assemblyai vs youtube_captions), start_time backwards-zoek logica, overlap_strategy toegevoegd aan output schema | gewijzigd: docs/wiki/decisions/015-rag-json-export.md
---
[2026-04-23] feat: RAG JSON upgrade — chunk_id, deep_link, token_count_estimate, flat metadata per chunk, sentence-boundary overlap (AssemblyAI) + segment-boundary overlap (YouTube captions), 90s chunk preset, overlap_strategy in chunking_config | gewijzigd: src/utils/formatTranscript.ts, src/components/TranscriptCard.tsx, src/components/dashboard/settings/DeveloperExportsCard.tsx, src/app/actions/rag-export.ts, src/types/sbd.d.ts, supabase/migrations/20260423_rag_chunk_size_90.sql
---
[2026-04-23] docs: ADR-015 herschreven — research-backed rationale (Vectara NAACL 2025, NVIDIA benchmark), definitief schema met chunk_id/deep_link/token_count/flat metadata, competitive gap tabel, upgrade checklist bijgewerkt | gewijzigd: docs/wiki/decisions/015-rag-json-export.md
---
[2026-04-23] docs: language-aware caption extraction toegevoegd aan backlog — diagnostisch bevestigd dat ar-orig track beschikbaar is, fix is medium-complexiteit, AssemblyAI aanbevolen in de tussentijd | gewijzigd: docs/wiki/roadmap/backlog.md
---
[2026-04-23] revert: subtitleslangs terug naar ['en'] — niet-Engelse captions structureel onbetrouwbaar (YouTube 429 + tlang=en forced); gedocumenteerd als known limitation | gewijzigd: backend/main.py, docs/wiki/operations/known-issues.md, docs/wiki/architecture/ai-pipeline.md
---
[2026-04-23] feat: reset export confirmation — resetRagExportConfirmationAction server action + "Reset" knop in DeveloperExportsCard met inline bevestiging (verdwijnt na 2s) | gewijzigd: src/app/actions/rag-export.ts, src/components/dashboard/settings/DeveloperExportsCard.tsx
---
[2026-04-23] fix: subtitleslangs ['en'] → ['.*orig'] — yt-dlp pakt nu altijd de originele videotaal i.p.v. de automatische Engelse vertaling | gewijzigd: backend/main.py
---
[2026-04-23] docs: sessie 2 testrapport uitgebreid — AssemblyAI→RAG export gevalideerd (PASS, correct Arabisch, extraction_method correct), stresstest 2u49min PASS (84 chunks, geen timeouts) | gewijzigd: docs/wiki/operations/test-reports.md
---
[2026-04-23] fix: language locale-code genormaliseerd — raw_language[:2].lower() zodat "en-US" → "en"; docs: RAG JSON sessie 2 testrapport gedocumenteerd (3/4 PASS, 2 bugs), known-issues bijgewerkt | gewijzigd: backend/main.py, docs/wiki/operations/test-reports.md, docs/wiki/operations/known-issues.md
---
[2026-04-22] fix: session_id gepind voor single-video proxy calls — video_id[-8:] als deterministische session_id meegegeven aan extract_with_ytdlp zodat yt-dlp metadata fetch en httpx VTT download hetzelfde exit-IP gebruiken | gewijzigd: backend/main.py
---
[2026-04-22] docs: ADR-015 bijgewerkt — language detection fallback sectie toegevoegd, published_at + lingua consequenties afgevinkt | gewijzigd: docs/wiki/decisions/015-rag-json-export.md
---
[2026-04-22] docs: testrapport RAG JSON sessie 1 gedocumenteerd — 3 videos getest (PASS), metadata-gaps vastgelegd + gefixed, sessie 2 edge cases gedefinieerd | gewijzigd: docs/wiki/operations/test-reports.md (nieuw), docs/wiki/INDEX.md
---
[2026-04-22] feat: lingua language detection + published_at — lingua-language-detector 2.2.0 toegevoegd, module-level detector (13 talen) gebouwd bij startup, fallback als yt-dlp language=None, language_detected boolean doorgestuurd tot aan TranscriptCard/PostHog; upload_date geconverteerd naar ISO YYYY-MM-DD en hernoemd naar published_at in frontend-keten; publishedAt prop in Clean JSON + RAG JSON metadata | gewijzigd: backend/requirements.txt, backend/main.py, src/app/api/extract/route.ts, src/components/free-tool/VideoTab.tsx, src/components/TranscriptCard.tsx
---
[2026-04-22] feat: channel/language/upload_date doorgegeven via volledige stack — yt-dlp info.uploader/language/upload_date toegevoegd aan extract_with_ytdlp return, ExtractResponse model uitgebreid, Next.js route forwardde nieuwe velden, VideoTab leest en reset ze, TranscriptCard ontvangt channel+language voor JSON/RAG metadata | gewijzigd: backend/main.py, src/app/api/extract/route.ts, src/components/free-tool/VideoTab.tsx
---
[2026-04-22] feat: RAG JSON export + Clean JSON + Developer Settings — buildRagChunks utility, TranscriptCard uitgebreid (nieuwe props, Clean JSON metadata, RAG dropdown, bevestigingsmodal, insufficient-credits banner), DeveloperExportsCard (chunk size 30/60/120s), Server Actions voor credit-aftrek en chunk-size opslaan, AuthContext UserProfile uitgebreid, Supabase migratie | gewijzigd: src/components/TranscriptCard.tsx, src/utils/formatTranscript.ts, src/contexts/AuthContext.tsx, src/app/dashboard/settings/page.tsx, src/components/dashboard/settings/DeveloperExportsCard.tsx, src/app/actions/rag-export.ts, src/components/free-tool/VideoTab.tsx, src/components/free-tool/AudioTab.tsx, supabase/migrations/20260422_add_rag_settings_to_profiles.sql
---
[2026-04-22] docs: ADR-017 bijgewerkt van planningsdocument naar geïmplementeerde werkelijkheid — provider Decodo, username format user-{USERNAME}-session-{sid}, implementation notes toegevoegd, toekomstige acties herschreven naar verleden tijd | gewijzigd: docs/wiki/decisions/017-proxy-provider-decodo.md
---
[2026-04-21] fix: Decodo username format — sticky_user nu f"user-{PROXY_USERNAME}-session-{sid}" | gewijzigd: backend/main.py
---
[2026-04-20] feat: proxy overstap IPRoyal → Decodo — get_proxy_url() session ID verplaatst van wachtwoord naar username suffix | gewijzigd: backend/main.py, docs/wiki/decisions/017-proxy-provider-decodo.md
---
[2026-04-20] refactor: remove WhisperFallbackModal (Flow B) — Flow A (inline toggle) is now canonical; caption failure now shows inline error + keeps toggle visible; handleWhisperError inlined; "1 credit per minute" copy fixed | gewijzigd: src/components/free-tool/VideoTab.tsx, src/components/free-tool/WhisperFallbackModal.tsx (deleted)
---
[2026-04-20] fix: no_speech_detected via WhisperFallbackModal path — modal passes raw string to onError; handleWhisperError intercepts it and shows inline card (no toast) | gewijzigd: src/components/free-tool/WhisperFallbackModal.tsx, src/components/free-tool/VideoTab.tsx
---
[2026-04-20] fix: WhisperFallbackModal self-fetches duration — modal now fetches /api/video/metadata when estimatedDuration not passed, shows "Calculating..." while loading, forwards duration to endpoint pre-check; copy updated to AssemblyAI | gewijzigd: src/components/free-tool/WhisperFallbackModal.tsx
---
[2026-04-20] fix: whisper credit pre-check + no-speech UX + modal copy — endpoint now checks actual cost (ceil(duration/60)) before job starts; no_speech_detected shows inline card with refund confirmation; modal copy corrected to "1 credit per minute" | gewijzigd: backend/main.py, src/app/api/transcribe/whisper/route.ts, src/components/free-tool/VideoTab.tsx
---
[2026-04-20] fix: youtube-transcript-not-available — realistic AI transcription claims, members-only limitation, Content ID nuance, 3rd source added | gewijzigd: src/app/youtube-transcript-not-available/page.tsx
---
[2026-04-20] fix: youtube-transcript-not-available — Reason 2 "What to do" rewritten, 2 FAQ entries removed, auto-captions timing FAQ updated to JSX, extensions list item added, FAQ "every video" last sentence updated; ArticleTemplate widened to ReactNode FAQs | gewijzigd: src/app/youtube-transcript-not-available/page.tsx, src/components/content/templates/ArticleTemplate.tsx
---
[2026-04-19] feat: youtube-transcript-not-available — reason 8 added (silent intro), Content ID added to reason 7, benchmark data in reason 3, processing time honest, all headings sentence case | gewijzigd: src/app/youtube-transcript-not-available/page.tsx
---
[2026-04-19] fix: youtube-to-text comparison blok — "(other tools)" verwijderd, pre scrollable + text-[10px], meer content in beide panelen; FAQ "free" uitgebreid met library-omschrijving | gewijzigd: src/app/youtube-to-text/page.tsx
---
[2026-04-19] feat: youtube-to-text full rewrite — accessibility section, side-by-side comparison, corrected sources, six formats framing | gewijzigd: src/app/youtube-to-text/page.tsx
---
[2026-04-18 21:00] taak: youtube-to-text/page.tsx herschreven — nieuwe titel/intro, "What You Get" sectie, tabel use-cases bijgewerkt, 7 FAQs vernieuwd (incl. JSX), sources prop toegevoegd; ToolPageTemplate uitgebreid naar ReactNode FAQ-antwoorden | gewijzigd: src/app/youtube-to-text/page.tsx, src/components/content/templates/ToolPageTemplate.tsx
---
[2026-04-18 20:00] taak: TXT plain export herschreven — timing-gebaseerde paragraafopsplitsing (gap >2s, duur >90s, zinseinde) vervangt character-bucket methode | gewijzigd: src/utils/formatTranscript.ts, src/components/TranscriptCard.tsx
---
[2026-04-18 19:00] taak: A3a implementatie voltooid — Cat.1: 3 dode bronlinks vervangen (Rev.com, AssemblyAI, ChromaDB); Cat.2: /how-it-works + /pricing + /youtube-transcript-for-rag pillar-links toegevoegd aan 18 paginas; Cat.3: 7 inline referenties geankerd (BBC, Netflix, Vectara, NVIDIA, Chroma Research, Microsoft Azure) | gewijzigd: src/app/youtube-transcript-without-extension/page.tsx, src/app/alternative/downsub/page.tsx, src/app/alternative/notegpt/page.tsx, src/app/alternative/turboscribe/page.tsx, src/app/alternative/tactiq/page.tsx, src/app/alternative/happyscribe/page.tsx, src/app/blog/chunk-youtube-transcripts-for-rag/page.tsx, src/app/(marketing)/page.tsx, + 10 eerder gewijzigde content-paginas
---
[2026-04-16] fix: HeroImage full-bleed + dark overlay — uit container gehaald (section flex-col), max-w-5xl/mx-auto/rounded-xl verwijderd, bg-black/60 overlay toegevoegd | gewijzigd: src/app/(marketing)/page.tsx, src/components/HeroImage.tsx
---
[2026-04-16] docs: CAP-04b testresultaat verwerkt — VTT proxy fix bevestigd (20/20 videos, 2:21, nul fouten); ai-pipeline.md proxy-sectie bijgewerkt, known-issues.md beide items afgevinkt | gewijzigd: docs/wiki/architecture/ai-pipeline.md, docs/wiki/operations/known-issues.md
---
[2026-04-16] fix: proxy per-video rotatie in playlist jobs — video_session_id = f"{job_id[:4]}{idx:04d}" (first pass + retry pass); VTT httpx call was al proxied | gewijzigd: backend/main.py, docs/wiki/operations/known-issues.md
---
[2026-04-13 23:24] commit: test hook
Changed: README.md
---
[2026-04-13 23:24] commit: Revert "test hook"

This reverts commit 72041ece8395d88a487a9001475d3375685f113a.
Changed: README.md
---
[2026-04-14 00:01] taak: INDEX.md hersteld na externe schrijfactie — alle 31 wiki-bestanden opgenomen (ADRs 001-017, 6 architecture, 3 business, 3 operations, 1 roadmap) | gewijzigd: docs/wiki/INDEX.md
---
[2026-04-14] taak: Pre-launch credit & pricing batch — formule /600→/60, AI summary 1→3 credits, PACKAGES Try/Basic/Plus/Pro/Power nieuwe prijzen+credits, frontend credit-indicaties bijgewerkt, Supabase welcome reward 5→25 (handmatige stap open) | gewijzigd: backend/credit_manager.py, backend/main.py, src/app/api/stripe/checkout/route.ts, src/components/ui/pricing-card.tsx, src/app/pricing/page.tsx, src/components/dashboard/billing/BillingPurchaseGrid.tsx, src/components/dashboard/WelcomeCreditCard.tsx, src/components/free-tool/AudioTab.tsx, src/components/free-tool/WhisperFallbackModal.tsx, src/components/PlaylistAvailabilitySummary.tsx, src/components/library/TranscriptViewer.tsx, src/app/faq/page.tsx, docs/wiki/operations/known-issues.md
---
[2026-04-14 00:00] taak: INBOX verwerkt — nieuwe pricing strategie, AI model info, channel FAQ, bugs en roadmap gedocumenteerd | gewijzigd: docs/wiki/architecture/credit-system.md, docs/wiki/architecture/ai-pipeline.md, docs/wiki/business/pricing.md, docs/wiki/business/marketing.md, docs/wiki/operations/known-issues.md, docs/wiki/roadmap/backlog.md (nieuw), docs/wiki/decisions/009-016 (8 nieuwe ADRs), docs/wiki/INDEX.md, docs/INBOX.md (leeggemaakt)
---
[2026-04-14 15:00] taak: Wiki-fouten gecorrigeerd na codebase audit — credit formule /600→/60 in CLAUDE.md, tiptap_content→edited_content in database-schema, transcription_jobs statuswaarden gecorrigeerd, claim_welcome_reward 5→25 credits, has_ever_purchased/isPaidUser gemarkeerd als niet-geïmplementeerd, AuthContext interface gecorrigeerd, playlist "eerste 3 gratis" als pending gemarkeerd, export-gating als pending gemarkeerd, BACKEND_API_SECRET als niet-geïmplementeerd gemarkeerd, backend endpoint /api/extract→/api/extract/youtube gecorrigeerd, 3 ontbrekende Next.js routes toegevoegd aan CLAUDE.md, ADR-009 status→geïmplementeerd | gewijzigd: CLAUDE.md, docs/wiki/architecture/database-schema.md, docs/wiki/architecture/credit-system.md, docs/wiki/decisions/009-credit-granularity.md, docs/wiki/decisions/010-playlist-pricing.md, docs/wiki/decisions/014-export-format-gating.md
---
[2026-04-14 14:00] taak: Volledige codebase audit — alle backend endpoints, API routes, frontend componenten gelezen; CODEBASE_AUDIT.md en WIKI_GAPS.md aangemaakt | gewijzigd: docs/CODEBASE_AUDIT.md (nieuw), docs/WIKI_GAPS.md (nieuw)
---
[2026-04-14 01:54] commit: Pre-launch: pricing & credit overhaul + volledige wiki opgezet

Credits & pricing (backend + frontend):
- Transcriptie formule: /600 → /60 (1 credit = 1 minuut)
- AI samenvatting: 1 → 3 credits (deductie + alle refund-paden)
- PACKAGES hernoemd en herprijsd: Try €2.49/200cr, Basic €5.99/500cr,
  Plus €11.99/1100cr, Pro €24.99/2600cr, Power €49.99/5500cr
- Frontend credit-indicaties bijgewerkt in pricing, billing, dashboard,
  free-tool, playlist en library components

Documentatie:
- CLAUDE.md toegevoegd (project instructions voor Claude Code)
- Volledige wiki aangemaakt: 6 architecture, 3 business, 17 ADRs,
  3 operations, 1 roadmap — navigeerbaar via docs/wiki/INDEX.md
- docs/LOG.md en docs/INBOX.md ingericht als sessie-logboek
- docs/INTERACTION_MAP.md verwijderd (verouderd, vervangen door wiki)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: CLAUDE.md
backend/credit_manager.py
backend/main.py
docs/INBOX.md
docs/INTERACTION_MAP.md
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/architecture/auth-and-security.md
docs/wiki/architecture/credit-system.md
docs/wiki/architecture/database-schema.md
docs/wiki/architecture/overview.md
docs/wiki/architecture/playlist-engine.md
docs/wiki/business/marketing.md
docs/wiki/business/positioning.md
docs/wiki/business/pricing.md
docs/wiki/decisions/001-python-backend.md
docs/wiki/decisions/002-youtube-captions.md
docs/wiki/decisions/003-assemblyai.md
docs/wiki/decisions/004-deepseek-v3.md
docs/wiki/decisions/005-supabase.md
docs/wiki/decisions/006-credit-model.md
docs/wiki/decisions/007-bgutil-pot.md
docs/wiki/decisions/008-polling-vs-websockets.md
docs/wiki/decisions/009-credit-granularity.md
docs/wiki/decisions/010-playlist-pricing.md
docs/wiki/decisions/011-ai-summary-credits.md
docs/wiki/decisions/012-pricing-tiers.md
docs/wiki/decisions/013-welcome-credits-freemium.md
docs/wiki/decisions/014-export-format-gating.md
docs/wiki/decisions/015-rag-json-export.md
docs/wiki/decisions/016-opus-249-audio-format.md
docs/wiki/decisions/017-proxy-provider-decodo.md
docs/wiki/operations/deployment.md
docs/wiki/operations/known-issues.md
docs/wiki/operations/monitoring.md
docs/wiki/roadmap/backlog.md
src/app/api/stripe/checkout/route.ts
src/app/faq/page.tsx
src/app/pricing/page.tsx
src/components/PlaylistAvailabilitySummary.tsx
src/components/dashboard/WelcomeCreditCard.tsx
src/components/dashboard/billing/BillingPurchaseGrid.tsx
src/components/free-tool/AudioTab.tsx
src/components/free-tool/WhisperFallbackModal.tsx
src/components/library/TranscriptViewer.tsx
src/components/ui/pricing-card.tsx
---
[2026-04-14 02:24] precompact: context compaction triggered
---
[2026-04-14] taak: 5 fixes geïmplementeerd — AudioTab credit card fix, BACKEND_API_SECRET (10 routes + FastAPI), export gating (anoniem TXT-only), playlist eerste 3 gratis (backend deductie + FREE label), WelcomeCreditCard playlist tekst gecorrigeerd | gewijzigd: src/components/free-tool/AudioTab.tsx, backend/main.py, src/app/api/extract/route.ts, src/app/api/ai/summarize/route.ts, src/app/api/playlist/info/route.ts, src/app/api/playlist/extract/route.ts, src/app/api/playlist/jobs/[jobId]/route.ts, src/app/api/jobs/[job_id]/route.ts, src/app/api/transcribe/whisper/route.ts, src/app/api/video/metadata/[videoId]/route.ts, src/app/api/check-playlist-availability/route.ts, src/components/TranscriptCard.tsx, src/components/free-tool/PlaylistTab.tsx, src/components/PlaylistManager.tsx, src/components/dashboard/WelcomeCreditCard.tsx, docs/wiki/operations/known-issues.md
---
[2026-04-14 02:34] commit: Implement 5 pre-launch fixes + codebase audit & wiki corrections

Codebase audit & wiki:
- Added CODEBASE_AUDIT.md and WIKI_GAPS.md (full inventory)
- Fixed critical wiki discrepancies: credit formula /600→/60 in CLAUDE.md,
  tiptap_content→edited_content in database-schema, corrected endpoint names,
  marked has_ever_purchased/isPaidUser as not-yet-implemented, ADR-009 status
  corrected to implemented, ADR-010 and ADR-014 marked as not-yet-implemented

Fix 1 — AudioTab: hide credit cost card and transcribe button after job completes
- Added `&& !transcript` guard to both conditionals (lines 394, 426)

Fix 2 — BACKEND_API_SECRET validation:
- backend/main.py: `verify_backend_secret` FastAPI Depends added to all 8
  endpoints (excluding /health); reads BACKEND_API_SECRET env var
- All 10 Next.js→Python fetch calls now send X-Backend-Secret header

Fix 3 — Export gating (TranscriptCard):
- Anonymous users clicking CSV/SRT/VTT/JSON now see an inline sign-in prompt
  instead of downloading; TXT remains available to everyone

Fix 4 — Playlist first-3-free (ADR-010):
- backend/main.py run_playlist_job: captions path now checks balance and deducts
  1 credit per video for idx>=3; first 3 are free (marked free:true in results)
- PlaylistTab.tsx: tracks freeVideoIds from video_results; passes to PlaylistManager
- PlaylistManager.tsx: shows green FREE badge for free videos

Fix 5 — WelcomeCreditCard playlist section:
- "50 Videos / month Free" → "First 3 videos free per extraction"
- "1 Credit = +10 Videos" → "1 Credit per video" (after first 3)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: CLAUDE.md
backend/main.py
docs/CODEBASE_AUDIT.md
docs/LOG.md
docs/WIKI_GAPS.md
docs/wiki/architecture/credit-system.md
docs/wiki/architecture/database-schema.md
docs/wiki/decisions/009-credit-granularity.md
docs/wiki/decisions/010-playlist-pricing.md
docs/wiki/decisions/014-export-format-gating.md
docs/wiki/operations/known-issues.md
src/app/api/ai/summarize/route.ts
src/app/api/check-playlist-availability/route.ts
src/app/api/extract/route.ts
src/app/api/jobs/[job_id]/route.ts
src/app/api/playlist/extract/route.ts
src/app/api/playlist/info/route.ts
src/app/api/playlist/jobs/[jobId]/route.ts
src/app/api/transcribe/whisper/route.ts
src/app/api/video/metadata/[videoId]/route.ts
src/components/PlaylistManager.tsx
src/components/TranscriptCard.tsx
src/components/dashboard/WelcomeCreditCard.tsx
src/components/free-tool/AudioTab.tsx
src/components/free-tool/PlaylistTab.tsx
---
[2026-04-14 04:54] commit: feat: pre-extraction FREE badges and info line for first 3 playlist videos

PlaylistManager.tsx:
- Videolijst na Fetch Playlist: groen FREE badge op video 1-3 (idx < 3)
  in de title row, alleen zichtbaar vóór extractie (!hasExtracted)
- Infobalk onder de videolijst: "The first 3 videos are always free.
  Credits apply from video 4 onwards." (verborgen na extractie)

PlaylistAvailabilitySummary.tsx:
- FREE badge in zowel de captions- als whisper-videorijen op basis van
  positie in totale extractievolgorde (excl. unavailable, slice(0,3)) —
  matcht de backend idx < 3 logica

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/PlaylistAvailabilitySummary.tsx
src/components/PlaylistManager.tsx
---
[2026-04-14 05:29] precompact: context compaction triggered
---
[2026-04-14] taak: PlaylistAvailabilitySummary credit logica gefixed (Fix 1 frontend) — 4 bugs: freeVideoIds filtert nu op has_captions (whisper op idx 0-2 niet gratis), captionCredits (idx>=3, 1/video) meegeteld, hasEnoughCredits+remainingCredits gebruiken totalExtractionCredits, caption-rijen tonen "1 credit" bij idx>=3, sectie-header toont credits, button-label gebruikt totalExtractionCredits | gewijzigd: src/components/PlaylistAvailabilitySummary.tsx
---
[2026-04-14] taak: Fix 2 retry credit + verificaties — captions retry-pass deducts nu 1 credit voor idx>=3 na succesvolle transcript-opslag; BACKEND_API_SECRET geverifieerd: 401 zonder header (secret IS gezet in Railway); no_warnings was al True; Fix 1 backend was al correct | gewijzigd: backend/main.py, docs/wiki/operations/known-issues.md
[2026-04-14 05:38] commit: fix: playlist credit logic (frontend) + retry credit bug + verification

PlaylistAvailabilitySummary.tsx — Fix 1 (4 bugs):
- freeVideoIds now filters has_captions only (whisper at idx 0-2 is NOT free)
- captionCredits (idx>=3 captions, 1 each) + whisperCredits = totalExtractionCredits
- hasEnoughCredits and remainingCredits use totalExtractionCredits
- Caption video rows show '• 1 credit' at idx>=3; section header shows credit count
- Extract button label uses totalExtractionCredits

backend/main.py — Fix 2 (retry credit bug):
- Captions retry-pass now deducts 1 credit for idx>=3 after successful DB insert
- orig_idx = video_ids.index(vid) to determine correct credit tier
- video_results entry now includes 'free': is_free (consistent with first pass)
- Whisper retry unchanged: run_whisper_job() handles its own credits

Verification results:
- Fix 1 backend: already correct (captions free idx<3, 1cr idx>=3, no double billing)
- Fix 3 (no_warnings): already True in audio_utils.py — no change needed
- BACKEND_API_SECRET: Railway returns 401 without header → secret IS set ✓
  (local dev unaffected: empty env var → validation disabled locally)
- BACKEND_API_SECRET still needs to be added to Vercel env vars

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/LOG.md
docs/wiki/operations/known-issues.md
src/components/PlaylistAvailabilitySummary.tsx
---
[2026-04-14] taak: VideoTab display bugs gefixed — creditsRequired /600→/60 (confirmatie modal + re-extract knop), success banner toont nu creditsUsed ipv Math.round(duration/60) | gewijzigd: src/components/free-tool/VideoTab.tsx
[2026-04-14 16:38] commit: fix: VideoTab credit calculation and success banner minutes

Bug 1 — Re-extract button showed wrong credit count:
- creditsRequired used / 600 (old: 1 credit per 10 min) instead of / 60
- Fixed in two places: Whisper confirmation modal (line 377) and
  the upsell banner requiredCredits calculation (line 1123)

Bug 2 — Success banner showed wrong minutes:
- "Used X credits • Y min" showed Math.round(duration / 60) which is
  the raw video length, not the billing minutes (= credits charged)
- Fixed to show whisperMetadata.creditsUsed instead, which equals
  ceil(duration / 60) — the actual billed amount
- Fixed in both the normal and truncation-warning success banners

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
src/components/free-tool/VideoTab.tsx
---
[2026-04-14] taak: Sticky session ID fix + audio job recovery — extract_with_ytdlp() accepteert nu session_id param (doorgegeven aan beide get_proxy_url() calls), run_playlist_job passes job_id[:8] bij captions-extractie (first pass + retry); AudioTab heeft sessionStorage recovery gekregen: runPollLoop extracted, mount useEffect, resumeData state, resume banner consistent met PlaylistTab | gewijzigd: backend/main.py, src/components/free-tool/AudioTab.tsx
[2026-04-14 16:59] commit: fix: sticky proxy session ID + audio job page-refresh recovery

Fix 1 — sticky proxy session ID (backend/main.py):
- extract_with_ytdlp() now accepts session_id: Optional[str] = None
- Both get_proxy_url() calls inside the function pass session_id through
- run_playlist_job() passes session_id=job_id[:8] at both call sites
  (first pass line ~1354 and retry pass line ~1471)
- Single-video /api/extract/youtube endpoint unchanged (no job_id context,
  random session per call is acceptable for one-off requests)
- Each playlist job now pins caption extraction to a stable exit IP,
  consistent with the existing run_whisper_job() behaviour

Fix 2 — audio upload job recovery after page refresh (AudioTab.tsx):
- AUDIO_JOB_KEY = 'indxr-active-audio-job' saved to sessionStorage on job start
  (stores { jobId, filename } so filename survives the refresh)
- Mount useEffect checks sessionStorage on load: if job is still running,
  sets resumeData to trigger the resume banner
- Polling loop extracted from handleTranscribe() into runPollLoop(jobId, filename)
  shared by both handleTranscribe (new jobs) and handleResume (recovered jobs)
- Resume banner matches PlaylistTab style: spinning loader, filename, Resume + Dismiss
- sessionStorage cleared on complete, error, timeout, or Dismiss

Also: audio success banner now shows creditsUsed as minutes (consistent with
VideoTab fix) instead of Math.round(duration / 60)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/LOG.md
src/components/free-tool/AudioTab.tsx
---
[2026-04-14] taak: Audio upload 401 gefixed + duplicate messaging gecorrigeerd — verify_backend_secret slaat secret-check over als Bearer token aanwezig (JWT wordt al gevalideerd in endpoint body); PlaylistAvailabilitySummary "will be updated" → "will be skipped" (duplicates worden gefilterd uit extractableIds, nooit overschreven) | gewijzigd: backend/main.py, src/components/PlaylistAvailabilitySummary.tsx
[2026-04-14 18:20] commit: fix: audio upload 401 + playlist duplicate messaging

Fix 1 — audio upload 401 (backend/main.py):
- verify_backend_secret now accepts requests with Authorization: Bearer header,
  skipping the X-Backend-Secret check for those requests
- Direct browser uploads (AudioTab) send a Supabase JWT but cannot send the
  server-side BACKEND_API_SECRET — JWT auth is validated inside the endpoint body
- Next.js server-to-server calls (no Bearer header) still require X-Backend-Secret
- Security: upload path remains protected by Supabase JWT validation at lines 981-993

Fix 2 — playlist duplicate messaging (PlaylistAvailabilitySummary.tsx):
- Changed "existing transcripts will be updated" → "existing transcripts will be skipped"
- Actual behavior: duplicates are excluded from extractableIds in PlaylistTab before
  being sent to the backend; backend always INSERTs and never upserts
- Completion message (showing only extracted count) was already correct

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/LOG.md
src/components/PlaylistAvailabilitySummary.tsx
---
[2026-04-14 22:27] commit: fix: clarify extraction_error message in playlist completion screen

Changed 'failed due to an unexpected error' to
'failed due to a temporary connection error — try again later'

extraction_error is typically a transient YouTube network/SSL issue,
not a permanent failure. The new wording communicates this and
gives the user a clear action to take.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/PlaylistManager.tsx
---
[2026-04-14 22:32] precompact: context compaction triggered
---
[2026-04-14] taak: Playlist credit uitleg tekst aangepast + AudioTab Resume-knop fix — PlaylistManager tekst verduidelijkt (captions gratis 1-3, 1cr/video daarna, whisper 1cr/min geen per-video charge); AudioTab Resume button toonde geen voortgang na klik: Transcribe-knop conditioneel was `file && !transcript` → `(file || isTranscribing) && !transcript` zodat de spinner zichtbaar is bij resumed job zonder file in state | gewijzigd: src/components/PlaylistManager.tsx, src/components/free-tool/AudioTab.tsx
---
[2026-04-14] taak: UI tekst fixes — PlaylistManager credit uitleg toegevoegd onder URL-input, AudioTab formaat/grootte tekst gecorrigeerd (25MB→500MB, ontbrekende MP4/MPEG/MPGA/WEBM toegevoegd), credit uitleg toegevoegd onder dropzone | gewijzigd: src/components/PlaylistManager.tsx, src/components/free-tool/AudioTab.tsx
[2026-04-14 22:36] commit: fix: credit explanation text + AudioTab format/size corrections

PlaylistManager.tsx:
- Added credit explanation under playlist URL input:
  "First 3 videos are always free. From video 4: 1 credit per video.
  AI Transcription: 1 credit per minute."

AudioTab.tsx:
- Fixed supported formats: MP3, MP4, WAV, M4A, OGG, FLAC, WEBM (was missing MP4/MPEG/MPGA/WEBM)
- Fixed max size: 25MB → 500MB (matches frontend validation and backend audio_utils.py)
- Added credit explanation under dropzone: "1 credit per minute of audio. Minimum 1 credit."

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
src/components/PlaylistManager.tsx
src/components/free-tool/AudioTab.tsx
---
[2026-04-14 22:46] commit: fix: playlist credit text + audio Resume button visibility

PlaylistManager.tsx:
- Updated credit explanation under URL input to be more precise:
  "Auto-captions are free for the first 3 videos. From video 4:
  1 credit per video (with auto-captions). Videos using AI
  Transcription cost 1 credit per minute instead — no per-video charge."

AudioTab.tsx:
- Fixed Resume button: after clicking Resume, the spinner + progress
  was invisible because the Transcribe button condition was `file && !transcript`,
  but after a page refresh `file` is null (only jobId survives in sessionStorage).
- Changed to `(file || isTranscribing) && !transcript` so the button renders
  and shows the spinner + whisper status + elapsed timer during a resumed job.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
src/components/PlaylistManager.tsx
src/components/free-tool/AudioTab.tsx
---

[2026-04-15] taak: AudioTab upload warning + Resume status fix — isUploadingFile state toegevoegd (true tijdens Railway fetch, finally-cleanup), "Do not close" waarschuwing getoond terwijl bestand geüpload wordt; resumeData bevat nu initialStatus (opgehaald in mount-effect), handleResume gebruikt dit als startwaarde voor whisperStatus zodat "Transcribing with AI..." i.p.v. "Uploading..." verschijnt bij resumed job | gewijzigd: src/components/free-tool/AudioTab.tsx
[2026-04-15 00:35] commit: fix: audio upload "do not close" warning + Resume shows correct status

AudioTab.tsx:

Problem 1 — no warning during file upload:
- Added isUploadingFile state, set true immediately before the Railway
  POST fetch (Step 3 in handleTranscribe), cleared in finally block
- Shows "Do not close this page while uploading." in amber below the
  Transcribe button while the file is in transit
- Automatically disappears once the server responds and the job starts

Problem 2 — Resume showed "Uploading..." for an already-uploaded job:
- Mount-time useEffect now passes job.status into resumeData as initialStatus
- handleResume reads initialStatus and uses it for setWhisperStatus instead
  of always defaulting to 'pending' (which maps to "Uploading...")
- Resumed jobs that are transcribing show "Transcribing with AI..." immediately,
  matching the actual backend state

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
src/components/free-tool/AudioTab.tsx
---
[2026-04-15] taak: AudioTab upload warning fix + Resume timer fix — warning gebruikt nu isTranscribing && whisperStatus==='pending' i.p.v. isUploadingFile (betrouwbaar voor alle bestandsgroottes); backend geeft created_at terug in job response; mount-effect berekent elapsedAtResume, runPollLoop accepteert startElapsed param, handleResume start timer op correcte positie | gewijzigd: backend/main.py, src/components/free-tool/AudioTab.tsx
[2026-04-15 01:00] commit: fix: audio upload warning reliability + Resume elapsed timer

AudioTab.tsx — Problem 1 (warning not visible):
- Removed isUploadingFile state and try/finally fetch wrapper
- Changed warning condition from isUploadingFile to
  isTranscribing && whisperStatus === 'pending'
- isUploadingFile was unreliable: React may not paint between
  setIsUploadingFile(true) and setIsUploadingFile(false) for
  small files on fast connections (e.g. localhost dev server)
- New condition is set at button click and stays true until the
  backend's first poll response (~3s), covering the full upload
  window for all file sizes reliably

AudioTab.tsx + backend/main.py — Problem 2 (timer resets to 0):
- Backend get_job_status now includes created_at in the response
- Mount useEffect calculates elapsedAtResume from created_at
  (seconds since job was created) and stores it in resumeData
- runPollLoop now accepts startElapsed param (default 0)
- handleResume passes resumeData.elapsedAtResume to runPollLoop
- Timer now starts at the actual job age after Resume instead of 0

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/LOG.md
src/components/free-tool/AudioTab.tsx
---
[2026-04-15] taak: Codebase audit + wiki-update — credit-system.md playlist sectie gecorrigeerd (ADR-010 is geïmplementeerd), ai-pipeline.md: AI summary 1→3 credits, Whisper /10→/1 credit/min, audio upload subsectie toegevoegd, proxy sessie-implementatiedetail toegevoegd; known-issues.md: opgeloste bugs gemarkeerd, checklist bijgewerkt; deployment.md: Stripe checklist herschreven met correcte pakketten; nieuw: roadmap/priorities.md (BLOCKERS/PRE-LAUNCH/POST-LAUNCH); backlog.md: BYOK/Sentry/random-session/library-KB verwijderd; INDEX.md bijgewerkt | gewijzigd: docs/wiki/architecture/credit-system.md, docs/wiki/architecture/ai-pipeline.md, docs/wiki/operations/known-issues.md, docs/wiki/operations/deployment.md, docs/wiki/roadmap/priorities.md (nieuw), docs/wiki/roadmap/backlog.md, docs/wiki/INDEX.md
[2026-04-15 01:40] commit: docs: codebase audit + wiki corrections + launch priorities

credit-system.md:
- Removed stale "⚠️ Intentie vs. werkelijkheid" block about ADR-010
- Added correct description of implemented first-3-free system,
  including frontend mirror logic in PlaylistAvailabilitySummary.tsx

ai-pipeline.md:
- Fixed Whisper cost formula: ⌈duur_min / 10⌉ → 1 credit per minute
- Fixed AI summary: 1 → 3 credits in 3 places (check, deduct, refund)
- Added audio upload path subsection (direct browser→Railway upload,
  Bearer token bypass, sessionStorage recovery + elapsed timer)
- Added proxy session_id implementation detail

known-issues.md:
- Marked resolved: sticky session ID, no_warnings, verify_backend_secret
  Bearer bypass, AudioTab job recovery, playlist ADR-010, retry credit
- Clarified BACKEND_API_SECRET: Railway ✓, Vercel still TODO
- Updated pre-launch checklist with all current open items
- Added has_ever_purchased as open code blocker

deployment.md:
- Rewrote Stripe checklist: old packages → correct Try/Basic/Plus/Pro/Power
  with EUR amounts, credits, and deployment instructions

roadmap/priorities.md (new):
- Structured launch priority list: BLOCKERS (manual + code),
  PRE-LAUNCH (features, Google setup, testing, SEO), POST-LAUNCH

roadmap/backlog.md:
- Removed: BYOK (undermines credit model), random session ID (fixed),
  library KB display (fixed), Sentry (PostHog covers this),
  iOS PO token + admin dashboard (moved to priorities.md)

INDEX.md:
- Added priorities.md to roadmap section and quick navigation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/architecture/credit-system.md
docs/wiki/operations/deployment.md
docs/wiki/operations/known-issues.md
docs/wiki/roadmap/backlog.md
docs/wiki/roadmap/priorities.md
---
[2026-04-15 02:22] feat: export overhaul — watermarks verwijderd, TXT gesplitst in 2 opties, Markdown export toegevoegd (plain + timestamps), SRT branding bug gefixed | gewijzigd: src/utils/formatTranscript.ts, src/components/TranscriptCard.tsx, src/components/library/TranscriptViewer.tsx, src/components/library/TranscriptList.tsx
[2026-04-15 02:30] docs: Upstash setup gedocumenteerd (indxr-redis Frankfurt, credentials in Vercel), rate limiting bewust uit tijdens testfase, Supabase email verificatie aan | gewijzigd: docs/wiki/operations/known-issues.md, docs/wiki/operations/deployment.md
[2026-04-15 02:44] commit: feat: export overhaul — markdown, dual TXT, watermark removal, gating fix

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: .cline/skills/indxr-design/SKILL.md
.cline/skills/indxr-design/references/component-patterns.md
.cline/skills/indxr-design/references/copy-guide.md
.cline/skills/indxr-design/references/design-system.md
docs/LOG.md
docs/wiki/operations/deployment.md
docs/wiki/operations/known-issues.md
src/components/TranscriptCard.tsx
src/components/library/TranscriptList.tsx
src/components/library/TranscriptViewer.tsx
src/utils/formatTranscript.ts
---
[2026-04-15 05:03] commit: fix: strip HTML entities from exports + remove JSON watermark

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/TranscriptCard.tsx
src/components/library/TranscriptViewer.tsx
src/utils/formatTranscript.ts
---
[2026-04-15 05:12] commit: feat: replace toast with signup pitch card for anonymous users + update export copy

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/TranscriptCard.tsx
src/components/free-tool/VideoTab.tsx
---
[2026-04-15 05:25] commit: fix: compact signup banner above transcript, updated copy

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/TranscriptCard.tsx
---
[2026-04-15 05:35] feat: compact signup banner boven transcript + copy update | gewijzigd: src/components/TranscriptCard.tsx
[2026-04-15 05:35] docs: wiki known-issues bijgewerkt met export overhaul, HTML entities fix, signup banner
[2026-04-15 05:35] commit: docs: session log + known-issues updated (export overhaul, HTML entities, signup banner)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/known-issues.md
---
[2026-04-15 19:10] commit: docs: BACKEND_API_SECRET afgevinkt als opgelost (geverifieerd 2026-04-15)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/wiki/operations/known-issues.md
docs/wiki/roadmap/priorities.md
---
[2026-04-16] feat: SEO content infrastructure — JsonLd component, authors config, AuthorCard, 3 page templates, hero image slot | gewijzigd: src/components/seo/JsonLd.tsx, src/lib/authors.ts, src/components/content/AuthorCard.tsx, src/components/content/templates/ArticleTemplate.tsx, src/components/content/templates/ToolPageTemplate.tsx, src/components/content/templates/TutorialTemplate.tsx, src/components/HeroImage.tsx, src/app/(marketing)/page.tsx, docs/DEVELOPMENT.md
[2026-04-16] feat: 3 SEO content pages — /youtube-transcript-not-available, /youtube-members-only-transcript, /youtube-age-restricted-transcript | gewijzigd: src/app/youtube-transcript-not-available/page.tsx, src/app/youtube-members-only-transcript/page.tsx, src/app/youtube-age-restricted-transcript/page.tsx, src/app/globals.css (prose-content styles)
[2026-04-16 22:03] precompact: context compaction triggered
[2026-04-16] feat: 6 SEO feature pages — /youtube-transcript-markdown, /youtube-transcript-obsidian, /youtube-transcript-csv, /youtube-srt-download, /youtube-transcript-json, /youtube-transcript-for-rag | gewijzigd: src/app/youtube-transcript-markdown/page.tsx, src/app/youtube-transcript-obsidian/page.tsx, src/app/youtube-transcript-csv/page.tsx, src/app/youtube-srt-download/page.tsx, src/app/youtube-transcript-json/page.tsx, src/app/youtube-transcript-for-rag/page.tsx, src/app/globals.css (prose-content-pre + table styles), src/components/content/templates/ToolPageTemplate.tsx (sources prop)
[2026-04-16 22:22] precompact: context compaction triggered
[2026-04-16] feat: 13 SEO content pages — /alternative/downsub, /alternative/notegpt, /alternative/turboscribe, /alternative/tactiq, /alternative/happyscribe, /youtube-to-text, /youtube-playlist-transcript, /bulk-youtube-transcript, /audio-to-text, /youtube-transcript-without-extension, /how-it-works, /blog/chunk-youtube-transcripts-for-rag + prose-content-table CSS class | gewijzigd: src/app/alternative/downsub/page.tsx, src/app/alternative/notegpt/page.tsx, src/app/alternative/turboscribe/page.tsx, src/app/alternative/tactiq/page.tsx, src/app/alternative/happyscribe/page.tsx, src/app/youtube-to-text/page.tsx, src/app/youtube-playlist-transcript/page.tsx, src/app/bulk-youtube-transcript/page.tsx, src/app/audio-to-text/page.tsx, src/app/youtube-transcript-without-extension/page.tsx, src/app/how-it-works/page.tsx, src/app/blog/chunk-youtube-transcripts-for-rag/page.tsx, src/app/globals.css

[2026-04-16] feat: 2 blog pages (/blog/youtube-channel-knowledge-base, /blog/youtube-transcripts-vector-database), landing page copy update, pricing page redesign (3 primary tiers + 2 quiet links, cost table, competitor table), generator page SEO content section, sitemap expanded to 29 routes, deleted /youtube-transcript-downloader | gewijzigd: src/app/blog/youtube-channel-knowledge-base/page.tsx, src/app/blog/youtube-transcripts-vector-database/page.tsx, src/app/(marketing)/page.tsx, src/app/pricing/page.tsx, src/app/youtube-transcript-generator/page.tsx, src/app/sitemap.ts, src/app/youtube-transcript-downloader/ (deleted)
[2026-04-16 22:42] commit: feat: 26 SEO content pages, templates, authors, hero slot, updated sitemap, pricing copy, landing page copy
Changed: .claude/settings.json
docs/.obsidian/app.json
docs/.obsidian/appearance.json
docs/.obsidian/community-plugins.json
docs/.obsidian/core-plugins.json
docs/.obsidian/graph.json
docs/.obsidian/plugins/dataview/main.js
docs/.obsidian/plugins/dataview/manifest.json
docs/.obsidian/plugins/dataview/styles.css
docs/.obsidian/workspace.json
docs/ARCHITECTURE.md
docs/DEVELOPMENT.md
docs/INBOX.md
docs/LOG.md
docs/content/ARCHITECTURE.md
docs/content/ARTIKEL-alternative-downsub.md
docs/content/ARTIKEL-alternative-happyscribe.md
docs/content/ARTIKEL-alternative-notegpt.md
docs/content/ARTIKEL-alternative-tactiq.md
docs/content/ARTIKEL-alternative-turboscribe.md
docs/content/ARTIKEL-audio-to-text.md
docs/content/ARTIKEL-blog-chunk-youtube-transcripts-for-rag.md
docs/content/ARTIKEL-blog-youtube-channel-knowledge-base.md
docs/content/ARTIKEL-blog-youtube-transcripts-vector-database.md
docs/content/ARTIKEL-bulk-youtube-transcript.md
docs/content/ARTIKEL-how-it-works.md
docs/content/ARTIKEL-youtube-age-restricted-transcript.md
docs/content/ARTIKEL-youtube-members-only-transcript.md
docs/content/ARTIKEL-youtube-playlist-transcript.md
docs/content/ARTIKEL-youtube-srt-download.md
docs/content/ARTIKEL-youtube-to-text.md
docs/content/ARTIKEL-youtube-transcript-csv.md
docs/content/ARTIKEL-youtube-transcript-for-rag.md
docs/content/ARTIKEL-youtube-transcript-generator.md
docs/content/ARTIKEL-youtube-transcript-json.md
docs/content/ARTIKEL-youtube-transcript-markdown.md
docs/content/ARTIKEL-youtube-transcript-not-available.md
docs/content/ARTIKEL-youtube-transcript-obsidian.md
docs/content/ARTIKEL-youtube-transcript-without-extension.md
docs/content/LANDING-PAGE.md
docs/content/PRICING-PAGE.md
docs/wiki/business/INDXR-SITEMAP.md
docs/wiki/business/INDXR-WRITING-FRAMEWORK.md
docs/wiki/business/marketing.md
docs/wiki/business/pricing.md
docs/wiki/operations/known-issues.md
public/hero-dark.jpg
public/hero-light.jpg
src/app/(marketing)/page.tsx
src/app/alternative/downsub/page.tsx
src/app/alternative/happyscribe/page.tsx
src/app/alternative/notegpt/page.tsx
src/app/alternative/tactiq/page.tsx
src/app/alternative/turboscribe/page.tsx
src/app/audio-to-text/page.tsx
src/app/blog/chunk-youtube-transcripts-for-rag/page.tsx
src/app/blog/youtube-channel-knowledge-base/page.tsx
src/app/blog/youtube-transcripts-vector-database/page.tsx
src/app/bulk-youtube-transcript/page.tsx
src/app/globals.css
src/app/how-it-works/page.tsx
src/app/pricing/page.tsx
src/app/sitemap.ts
src/app/youtube-age-restricted-transcript/page.tsx
src/app/youtube-members-only-transcript/page.tsx
src/app/youtube-playlist-transcript/page.tsx
src/app/youtube-srt-download/page.tsx
src/app/youtube-to-text/page.tsx
src/app/youtube-transcript-csv/page.tsx
src/app/youtube-transcript-downloader/page.tsx
src/app/youtube-transcript-for-rag/page.tsx
src/app/youtube-transcript-generator/page.tsx
src/app/youtube-transcript-json/page.tsx
src/app/youtube-transcript-markdown/page.tsx
src/app/youtube-transcript-not-available/page.tsx
src/app/youtube-transcript-obsidian/page.tsx
src/app/youtube-transcript-without-extension/page.tsx
src/components/HeroImage.tsx
src/components/content/AuthorCard.tsx
src/components/content/templates/ArticleTemplate.tsx
src/components/content/templates/ToolPageTemplate.tsx
src/components/content/templates/TutorialTemplate.tsx
src/components/seo/JsonLd.tsx
src/lib/authors.ts
---
[2026-04-16 22:54] commit: fix: per-video proxy session rotation in playlist jobs

- Each video gets its own sticky exit IP: video_session_id = f'{job_id[:4]}{idx:04d}'
- Applied to both first pass and retry pass in run_playlist_job()
- Prevents rate-limited video IDs from blocking other users sharing Railway's IP
- VTT httpx call was already proxied correctly — no change needed there

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/LOG.md
docs/wiki/operations/known-issues.md
---
[2026-04-16 23:02] commit: fix: HeroImage full-bleed + dark overlay

- Moved <HeroImage /> outside container div (was capped by max-w and px-4)
- Section changed to flex-col so image sits below hero content
- Removed max-w-5xl, mx-auto, rounded-xl from image wrapper
- Added bg-black/60 overlay for light-mode readability

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/.obsidian/workspace.json
docs/INBOX.md
docs/LOG.md
src/app/(marketing)/page.tsx
src/components/HeroImage.tsx
---
[2026-04-17 04:24] commit: fix: hero image as blended background behind headline + CTAs

- HeroImage moved to absolute inset-0 behind hero content
- Uses Next.js fill + object-cover to span full section
- Gradient fades: top→transparent→bottom (bg-base), soft side fades
- Text/buttons stay on top via z-10 container

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
src/components/HeroImage.tsx
---
[2026-04-17 04:30] commit: fix: HeroUIPreview moved below hero image with whitespace

- Removed HeroUIPreview from hero section (was blocking background image)
- Placed in own wrapper below hero with py-16/24 breathing room
- Removed mt-16/24 from HeroUIPreview itself (spacing now from wrapper)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
src/components/HeroUIPreview.tsx
---
[2026-04-17 04:46] commit: fix: hero image position, gradient refinement, section height

- object-[center_30%]: shows upper area of image behind text, not laptop
- Split single gradient into two divs: top fade + bottom-half cover
  (removes mid-image glow halo from previous via-30% approach)
- Section padding: py-16/24/32 → py-24/32/40 for more vertical breathing room

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
src/components/HeroImage.tsx
---
[2026-04-17 05:05] commit: fix: hero section full viewport height
Changed: src/app/(marketing)/page.tsx
---
[2026-04-17 06:17] commit: feat: new hero images + raise headline position

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: public/hero-dark.jpg
public/hero-light.jpg
src/app/(marketing)/page.tsx
---
[2026-04-17 06:40] commit: feat: transparent navbar + hero copy update + button fixes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
src/components/Header.tsx
---
[2026-04-17 06:52] commit: fix: button visibility, nav label, subtext nudge

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
src/app/globals.css
src/components/Header.tsx
---
[2026-04-17 09:15] commit: fix: update hero subheading copy

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
---
[2026-04-17 20:29] commit: feat: logo in navbar + favicon setup

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/layout.tsx
src/components/Header.tsx
---
[2026-04-17 20:52] commit: fix: hero subtext bottom + view pricing light mode visibility

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
---
[2026-04-17 20:53] commit: fix: navbar logo + hero subtext + pricing button

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/Header.tsx
---
[2026-04-17 20:58] commit: fix: remove old logo text + debug logo visibility

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/Header.tsx
---
[2026-04-17 21:02] commit: fix: replace INDXR.AI text logo with img on signup page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/signup/page.tsx
---
[2026-04-17 21:33] commit: feat: add logo assets to git

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: public/logo/indxr-horizontal-black-on-white.png
public/logo/indxr-horizontal-black-transparent.png
public/logo/indxr-horizontal-black-transparent.svg
public/logo/indxr-horizontal-white-on-black.png
public/logo/indxr-horizontal-white-transparent.png
public/logo/indxr-horizontal-white-transparent.svg
public/logo/indxr-mark-black-on-white.png
public/logo/indxr-mark-black-transparent.png
public/logo/indxr-mark-black-transparent.svg
public/logo/indxr-mark-white-on-black.png
public/logo/indxr-mark-white-transparent.png
public/logo/indxr-mark-white-transparent.svg
public/logo/indxr-wordmark-black-on-white.png
public/logo/indxr-wordmark-black-transparent.png
public/logo/indxr-wordmark-black-transparent.svg
public/logo/indxr-wordmark-white-on-black.png
public/logo/indxr-wordmark-white-transparent.png
public/logo/indxr-wordmark-white-transparent.svg
---
[2026-04-17 21:43] commit: fix: logo dark mode duplicate + size 40px + subtext light mode

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
src/components/Header.tsx
---
[2026-04-17 21:50] commit: feat: split navbar logo mark + wordmark with custom spacing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/Header.tsx
---
[2026-04-17 21:58] commit: feat: larger logo + Geist font sitewide

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/globals.css
src/components/Header.tsx
---
[2026-04-17 22:14] commit: test: logo mark 44px wordmark 42px

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/Header.tsx
---
[2026-04-17 22:27] commit: test: mark 38px wordmark 44px dominant

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/Header.tsx
---
[2026-04-17 22:31] commit: fix: logo mark 40px wordmark 48px

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/Header.tsx
---
[2026-04-17 22:41] commit: fix: hero text higher on all screen sizes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
---
[2026-04-17 22:49] commit: fix: hero text position correct — text higher in viewport

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
---
[2026-04-17 22:54] commit: fix: hero text position via self-start mt-[15vh]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
---
[2026-04-17 22:58] commit: remove: HeroUIPreview placeholder

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
---
[2026-04-17 23:05] commit: fix: remove self-start, center text horizontally

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
---
[2026-04-17 23:17] commit: fix: hero text 90px from top

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
---
[2026-04-17 23:20] commit: fix: hero text centered + pt-150px

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
---
[2026-04-18 00:33] commit: fix: responsive hero pt per breakpoint

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
---
[2026-04-18 00:37] commit: fix: hero pt breakpoints lg/xl/2xl

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
---
[2026-04-18 00:56] commit: fix: object-position responsive small screens

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/HeroImage.tsx
---
[2026-04-18 01:10] taak: public/llms.txt en robots.txt aangemaakt | gewijzigd: public/llms.txt, public/robots.txt
---
[2026-04-18 01:30] taak: Footer herbouwd (3 kolommen, CSS vars) + "How It Works" nav-link toegevoegd | gewijzigd: src/components/Footer.tsx, src/components/Header.tsx
---
[2026-04-18 01:45] fix: TXT/Timestamps link toegevoegd als eerste item in Footer Export Formats kolom | gewijzigd: src/components/Footer.tsx
---
[2026-04-18 17:33] commit: feat: llms.txt, robots.txt, footer rebuild, how-it-works nav link
Changed: docs/.obsidian/workspace.json
docs/INBOX.md
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/operations/known-issues.md
public/apple-touch-icon.png
public/favicon-96x96.png
public/favicon.ico
public/favicon.svg
public/llms.txt
public/robots.txt
public/site.webmanifest
public/web-app-manifest-192x192.png
public/web-app-manifest-512x512.png
src/components/Footer.tsx
src/components/Header.tsx
---
[2026-04-18 17:42] commit: fix: TXT export in footer
Changed: docs/LOG.md
src/components/Footer.tsx
---
[2026-04-18 17:45] precompact: context compaction triggered
---
[2026-04-18 18:30] audit: A3a SEO/GEO content audit voltooid — 26 paginas geauditeerd | 3 dode links (Rev.com, AssemblyAI blog, ChromaDB docs), 4 bot-blocked (403), /how-it-works pillar-link ontbreekt op 20/24 paginas
[2026-04-18 18:01] precompact: context compaction triggered
[2026-04-18 18:07] commit: fix: A3b SEO/GEO — dead links vervangen, pillar links toegevoegd aan 18 paginas, inline bronnen geanchoreerd
Changed: docs/LOG.md
src/app/(marketing)/page.tsx
src/app/alternative/downsub/page.tsx
src/app/alternative/happyscribe/page.tsx
src/app/alternative/notegpt/page.tsx
src/app/alternative/tactiq/page.tsx
src/app/alternative/turboscribe/page.tsx
src/app/audio-to-text/page.tsx
src/app/blog/chunk-youtube-transcripts-for-rag/page.tsx
src/app/blog/youtube-channel-knowledge-base/page.tsx
src/app/how-it-works/page.tsx
src/app/youtube-age-restricted-transcript/page.tsx
src/app/youtube-members-only-transcript/page.tsx
src/app/youtube-playlist-transcript/page.tsx
src/app/youtube-srt-download/page.tsx
src/app/youtube-to-text/page.tsx
src/app/youtube-transcript-csv/page.tsx
src/app/youtube-transcript-for-rag/page.tsx
src/app/youtube-transcript-json/page.tsx
src/app/youtube-transcript-markdown/page.tsx
src/app/youtube-transcript-not-available/page.tsx
src/app/youtube-transcript-obsidian/page.tsx
src/app/youtube-transcript-without-extension/page.tsx
---
[2026-04-18 21:13] commit: feat: TXT paragraph mode — timing-aware segment merging
Changed: docs/LOG.md
src/components/TranscriptCard.tsx
src/utils/formatTranscript.ts
---
[2026-04-19 04:30] commit: feat: youtube-to-text + audio-to-text full rewrites — accessibility section, benchmark data, competitor comparison, bullet exports, Pro pricing column
Changed: docs/LOG.md
src/app/audio-to-text/page.tsx
src/app/youtube-to-text/page.tsx
src/components/content/templates/ToolPageTemplate.tsx
---
[2026-04-19 23:10] precompact: context compaction triggered
[2026-04-20 00:26] commit: fix: youtube-transcript-not-available — realistic AI transcription claims, members-only limitation, Content ID nuance, source added
Changed: docs/LOG.md
src/app/youtube-transcript-not-available/page.tsx
src/components/content/templates/ArticleTemplate.tsx
---
[2026-04-20 13:30] commit: fix: whisper credit pre-check + no-speech UX + modal copy
Changed: backend/main.py
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
src/app/api/transcribe/whisper/route.ts
src/components/free-tool/VideoTab.tsx
---
[2026-04-20 14:00] commit: fix: WhisperFallbackModal self-fetches duration + AssemblyAI copy
Changed: docs/LOG.md
src/components/free-tool/WhisperFallbackModal.tsx
---
[2026-04-20 20:51] commit: fix: no_speech_detected inline card on WhisperFallbackModal path
Changed: docs/LOG.md
src/components/free-tool/VideoTab.tsx
src/components/free-tool/WhisperFallbackModal.tsx
---
[2026-04-20 21:27] commit: feat: remove WhisperFallbackModal — Flow A (inline toggle) is now canonical
Changed: docs/LOG.md
src/components/free-tool/VideoTab.tsx
src/components/free-tool/WhisperFallbackModal.tsx
---
[2026-04-21 11:50] commit: feat: proxy switch IPRoyal → Decodo — session ID in username suffix
Changed: CLAUDE.md
backend/main.py
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/decisions/017-proxy-provider-decodo.md
src/components/free-tool/VideoTab.tsx
---
[2026-04-21 16:21] commit: fix: Decodo username format — user-{USERNAME}-session-{sid}
Changed: backend/main.py
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
---
[2026-04-21 16:36] commit: fix: Decodo proxy — correct username format user-{USERNAME}-session-{sid}
Changed: docs/LOG.md
---
[2026-04-22 18:04] precompact: context compaction triggered
[2026-04-22 18:06] commit: docs: proxy poort gecorrigeerd naar 10001 — alle wiki-documentatie bijgewerkt

ADR-017 bijgewerkt van planningsdocument naar geïmplementeerde staat (Decodo).
Alle verwijzingen naar IPRoyal/12321/7000 vervangen door Decodo/10001 in
DEVELOPMENT.md, ARCHITECTURE.md, ai-pipeline.md en deployment.md.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/DEVELOPMENT.md
docs/LOG.md
docs/content/ARCHITECTURE.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/decisions/017-proxy-provider-decodo.md
docs/wiki/operations/deployment.md
---
[2026-04-22 18:07] commit: chore: LOG.md hook entry cleanup
Changed: docs/LOG.md
---
[2026-04-22 20:36] commit: feat: Clean JSON + RAG JSON export + Developer Settings
Changed: docs/LOG.md
docs/wiki/architecture/database-schema.md
docs/wiki/decisions/015-rag-json-export.md
src/app/actions/rag-export.ts
src/app/dashboard/settings/page.tsx
src/components/TranscriptCard.tsx
src/components/dashboard/settings/DeveloperExportsCard.tsx
src/components/free-tool/AudioTab.tsx
src/components/free-tool/VideoTab.tsx
src/contexts/AuthContext.tsx
src/utils/formatTranscript.ts
supabase/migrations/20260422_add_rag_settings_to_profiles.sql
---
[2026-04-22 21:44] commit: feat: lingua language detection + published_at in RAG JSON metadata
Changed: backend/main.py
backend/requirements.txt
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
src/app/api/extract/route.ts
src/components/TranscriptCard.tsx
src/components/free-tool/VideoTab.tsx
---
[2026-04-22 22:06] commit: docs: test reports + ADR-015 language detection + published_at
Changed: docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/decisions/015-rag-json-export.md
docs/wiki/operations/test-reports.md
---
[2026-04-22 22:12] precompact: context compaction triggered
[2026-04-22 23:03] commit: fix: pin session_id for single-video proxy calls
Changed: backend/main.py
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
---
[2026-04-23 18:31] commit: fix: yt-dlp orig lang + reset confirmation + locale normalization
Changed: backend/main.py
docs/LOG.md
docs/wiki/operations/known-issues.md
docs/wiki/operations/test-reports.md
---
[2026-04-23 18:48] commit: fix: subtitleslangs orig + reset export confirmation
Changed: backend/main.py
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/operations/known-issues.md
src/app/actions/rag-export.ts
src/components/dashboard/settings/DeveloperExportsCard.tsx
---
[2026-04-23 19:14] commit: revert: subtitleslangs back to en + docs: non-English captions known limitation
Changed: backend/main.py
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/operations/known-issues.md
---
[2026-04-23 20:08] commit: feat: RAG JSON v2 — chunk_id, deep_link, token_count, overlap, 90s preset
Changed: backend/main.py
docs/LOG.md
docs/wiki/decisions/015-rag-json-export.md
docs/wiki/roadmap/backlog.md
package-lock.json
package.json
src/app/actions/rag-export.ts
src/components/TranscriptCard.tsx
src/components/dashboard/settings/DeveloperExportsCard.tsx
src/types/sbd.d.ts
src/utils/formatTranscript.ts
supabase/migrations/20260423_rag_chunk_size_90.sql
---
[2026-04-23 20:09] commit: feat: RAG JSON v2 — chunk_id, deep_link, token_count, overlap, 90s preset
Changed: docs/LOG.md
---
[2026-04-23 21:05] commit: fix: AssemblyAI triggert sentence_boundary overlap + extraction_method label correct
Changed: docs/LOG.md
src/components/TranscriptCard.tsx
src/components/free-tool/AudioTab.tsx
src/components/free-tool/VideoTab.tsx
src/utils/formatTranscript.ts
---
[2026-04-24 01:37] commit: content: 4 JSON/RAG articles with real test outputs and sources
Changed: docs/LOG.md
docs/wiki/operations/test-reports.md
src/app/blog/chunk-youtube-transcripts-for-rag/page.tsx
src/app/youtube-transcript-for-rag/page.tsx
src/app/youtube-transcript-json/page.tsx
src/app/youtube-transcript-non-english/page.tsx
---
[2026-04-24 01:48] commit: feat: Markdown export — YAML frontmatter + klikbare timestamp deep links
Changed: docs/LOG.md
docs/wiki/roadmap/priorities.md
src/components/TranscriptCard.tsx
---
[2026-04-24 07:15] commit: fix: Markdown timestamps paragraafgroepering + deep links
Changed: docs/LOG.md
src/components/TranscriptCard.tsx
---
[2026-04-24 09:57] commit: docs: Markdown export sessie 4 testresultaten gedocumenteerd
Changed: docs/LOG.md
docs/wiki/operations/test-reports.md
---
[2026-04-24 20:24] commit: content: Markdown + Obsidian artikelen herschreven — correct schema, deep links, real output
Changed: docs/LOG.md
src/app/youtube-transcript-markdown/page.tsx
src/app/youtube-transcript-obsidian/page.tsx
---
[2026-04-24 22:11] commit: fix: vervang fictieve auteurs door indxr-editorial op alle contentpagina's
Changed: docs/LOG.md
docs/wiki/business/marketing.md
src/app/blog/chunk-youtube-transcripts-for-rag/page.tsx
src/app/blog/youtube-channel-knowledge-base/page.tsx
src/app/blog/youtube-transcripts-vector-database/page.tsx
src/app/youtube-transcript-csv/page.tsx
src/app/youtube-transcript-for-rag/page.tsx
src/app/youtube-transcript-json/page.tsx
src/app/youtube-transcript-markdown/page.tsx
src/app/youtube-transcript-non-english/page.tsx
src/app/youtube-transcript-obsidian/page.tsx
src/lib/authors.ts
---
[2026-04-25 00:24] commit: feat: CSV export upgrade — 6 kolommen, BOM, metadata headers, beide exportpaden
Changed: docs/LOG.md
src/components/TranscriptCard.tsx
src/components/library/TranscriptViewer.tsx
src/utils/formatTranscript.ts
---
[2026-04-25 00:38] commit: feat: CSV export upgrade — 6 kolommen, BOM, metadata headers, beide exportpaden
Changed: docs/LOG.md
---
[2026-04-25 00:48] commit: fix: CSV artikel — playlist merged CSV claims verwijderd
Changed: docs/LOG.md
src/app/youtube-transcript-csv/page.tsx
---
[2026-04-25 01:10] commit: feat: SRT/VTT resegmentatie + 42 chars wrapping + VTT header + processing_method in library
Changed: docs/LOG.md
docs/wiki/architecture/database-schema.md
src/app/dashboard/library/[id]/page.tsx
src/components/TranscriptCard.tsx
src/components/library/TranscriptViewer.tsx
src/utils/formatTranscript.ts
---
[2026-04-25 01:37] precompact: context compaction triggered
[2026-04-25 01:41] commit: feat: RAG JSON export history + Developer tab in library + buildRagJson utility
Changed: docs/LOG.md
docs/wiki/architecture/database-schema.md
docs/wiki/decisions/015-rag-json-export.md
src/app/actions/rag-export.ts
src/app/dashboard/library/[id]/page.tsx
src/app/youtube-srt-download/page.tsx
src/components/TranscriptCard.tsx
src/components/free-tool/VideoTab.tsx
src/components/library/RagExportView.tsx
src/components/library/TranscriptList.tsx
src/utils/formatTranscript.ts
---
[2026-04-25 05:03] commit: feat: RAG JSON in library export dropdown + Developer tab + polling error fix
Changed: docs/LOG.md
docs/wiki/decisions/015-rag-json-export.md
src/app/dashboard/library/[id]/page.tsx
src/components/library/TranscriptViewer.tsx
---

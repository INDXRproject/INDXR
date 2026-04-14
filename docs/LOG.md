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

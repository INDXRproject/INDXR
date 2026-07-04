[2026-07-04 17:30] fix+verify: playlist 50-cap (paginatie) + Home-credits (orphaned RPC). (1) PLAYLIST — `backend/youtube_client.py:get_playlist_items` haalde stil max 50 video's op omdat de YouTube Data API `playlistItems.list` 50/pagina geeft en er geen `nextPageToken`-lus was; bovendien accepteert `videos.list` (duur/captions) ook max 50 IDs/call. Fix: paginatie-loop met `nextPageToken` tot uitputting of tot `max_results=500` (gelijk aan yt-dlp-fallback `1-500`), en `videos.list` in chunks van 50 gebatcht. De verzonnen "unavailable"-telling (`PlaylistManager.tsx` `total_count − availableCount` + hardcoded copy "private, members-only, or deleted", zonder echte check) is vervangen door een échte backend-`unavailable_count` = opgehaalde playlist-items die niet naar een speelbare video resolven (videos.list gaf geen details óf titel "Private/Deleted video"); frontend leest `playlist.unavailable_count`. `PlaylistInfoResponse` kreeg `unavailable_count`; ook het yt-dlp-fallbackpad zet het (`max(0, total_count − len(entries))`, want ignoreerrors dropt privates). Next-route `api/playlist/info/route.ts` gaf al de volledige response door — geen wijziging nodig. (2) HOME-CREDITS — `apps/app/src/app/dashboard/page.tsx` (server-component) riep RPC `get_credit_balance` aan die NIET in de DB bestaat (geverifieerd via pg_proc: alleen `get_user_credits` bestaat), faalde en viel via `?? 0` terug op 0. Fix: klein client-component `HomeCreditsBalance` (`apps/app/src/components/dashboard/`) dat `useAuth().credits` gebruikt — exact dezelfde live bron als topbar/sidebar (`get_user_credits` → `user_credits.credits`), consistent én ververst binnen sessie. Credit-aftrek/`user_credits`-mutatie onaangeroerd. Scope gerespecteerd: alleen paginatie + unavailable-copy + Home-leesbron. VERIFICATIE: build ✓ beide apps (app 22.0s, marketing 25.1s, "Compiled successfully"); Python syntax + `import youtube_client` ✓. Playlist lokaal tegen echte YouTube Data API: Kurzgesagt-uploads 373 entries (natuurlijke terminatie <500, unavailable_count=0), Veritasium 500 (cap gehandhaafd), Huberman-uploads 500 — allemaal >50 (was 50). PRODUCTIE end-to-end (app.indxr.ai → Railway): `/api/playlist/info` voor Kurzgesagt gaf 373 entries + unavailable_count=0 (oude code gaf 50); Railway health ✓. Home-credits productie (test1, saldo 98 in `user_credits`): Home-kaart toont 98, topbar 98, sidebar 98 — consistent en niet 0 (screenshot). LESSONS.md-regels toegevoegd (youtube-data-api-playlist-paginatie; home-dashboard-credits-bron). Temp-scripts opgeruimd. Gepusht 7f82142. | gewijzigd: backend/youtube_client.py, backend/main.py, packages/shared/src/components/PlaylistManager.tsx, apps/app/src/app/dashboard/page.tsx, apps/app/src/components/dashboard/HomeCreditsBalance.tsx, docs/LESSONS.md
---
[2026-07-04 16:40] fix+verify: mark-as-read optimistic, zonder lijst-reload. Probleem: klikken op de NEW-badge verborg de badge al optimistisch (`locallyReadIds`) maar dispatchte daarna `transcripts-updated`, wat op de Library-pagina `fetchTranscripts()` opnieuw triggerde → `loading=true` + volledige her-query → zichtbare flits/reflow. Fix: `handleMarkAsRead` herschreven naar het React 19 `useOptimistic` + `startTransition`-patroon. Committed state `readIds` (useState), overlay `useOptimistic(readIds, (prev,id)=>new Set(prev).add(id))`; `addOptimisticRead(id)` wordt binnen de `startTransition`-async-callback aangeroepen (verplicht — anders flitst de badge terug), de canonicale mutatie `supabase.update({viewed_at})` bleef ongewijzigd, alleen bij succes `setReadIds` committen (bij fout niets → overlay rolt vanzelf terug). `transcripts-updated`-dispatch verwijderd uit deze handler zodat er géén refetch meer plaatsvindt. `isNew` leest nu de optimistic overlay. Scope gerespecteerd: alleen de mark-as-read-interactie; pagination-query, credit/export/collection-logica, badge-kleuren en checkbox-logica ongemoeid. Build ✓ beide apps (`pnpm build:app` 12.5s, `build:marketing` 10.3s, beide "Compiled successfully"). Productie-verificatie (app.indxr.ai, test1@indxr-test.com, deploy e855b0c Ready): 6 unread transcripts geseed; Playwright met network-tracing bewees (1) klik verbergt de NEW-badge direct — 6→5 badges, overige rijen ongemoeid; (2) GÉÉN lijst-refetch: na de klik alleen een `PATCH /rest/v1/transcripts?id=eq.…` en 0 nieuwe `GET …select=` list-queries (de 2 GET-LISTs vonden uitsluitend bij initial load plaats); (3) geen scroll-reset: bij een naar-onder-gescrolde lijst (`main.overflow-y-auto` op de bodem) bleef de scrollpositie na de klik identiek en verdween alleen de badge van de aangeklikte rij; (4) persistentie: na een echte page-reload bleef de badge weg (6→5 unread). Screenshots vastgelegd (before/after-click desktop + scrolled before/after). LESSONS.md-regel toegevoegd (library-optimistic-mutaties). Seed + temp-scripts opgeruimd — DB terug op 0. Gepusht e855b0c. | gewijzigd: apps/app/src/components/library/TranscriptList.tsx, docs/LESSONS.md
---
[2026-07-04 15:45] fix+verify: vijf Library-presentatiebugs gefixt en op productie (app.indxr.ai, testaccount test1@indxr-test.com) geverifieerd in licht, dark én mobiel. (1) Mobiele titel benut volle breedte — row-actions-div en rename-knop kregen `hidden sm:flex` zodat op mobiel geen horizontale ruimte gereserveerd blijft; titels vullen nu twee volle regels vóór line-clamp-2 (screenshot 04). (2) Checkbox-zichtbaarheid — CHECKBOX_CLS = `data-[state=unchecked]:border-border-strong data-[state=unchecked]:bg-surface-sunken` op header-, per-rij- en grid-checkbox; unchecked toont nu een duidelijk omlijnd gevuld vakje, AA-zichtbaar in beide thema's (screenshots 01/02/04/06); per-rij-checkbox op mobiel `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` zodat geen hover nodig is. (3) Hexagon uit de tabel in dark — lijst-container `bg-surface/60` → `bg-surface` (opaak) zodat de pagina-achtergrond-hexagon niet meer door de tabel bloedt; dark matcht nu licht, hexagon alleen in top-marge (screenshots 02/06). (4) Badge-model origineel+edited náást elkaar — transcriptBadges appendt nu een aparte lichtere same-hue "Edited"-chip i.p.v. het bron-label te vervangen; geldt voor auto-captions (sky+sky-soft), AI-transcription (indigo+indigo-soft) en AI-summary (violet+violet-soft); BADGE_CLASSES/tokens/hues ongewijzigd (kleuren waren goedgekeurd) (screenshots 01/04/06). (5) Mobiele pagination-spacing — pagination-container `mb-3 sm:mb-0` zodat Previous/Next binnen safe-area ruimte houden boven de bottom-tab-bar (screenshot 07). Scope gerespecteerd: geen pagination-query, badge-tokens, credit/export/collection-logica aangeraakt. Selected-state ook bevestigd (screenshot 05: accent-checkmark + selectionbar). Build ✓ (pnpm build:app + build:marketing, 2/2 groen). Gepusht 5f3e016. Verificatie via cookie-injectie (Playwright); seed (55 transcripts + profielrij op test1) en tijdelijke scripts na afloop opgeruimd — DB terug op 0. | gewijzigd: apps/app/src/components/library/TranscriptList.tsx, apps/app/src/app/dashboard/library/page.tsx
---
[2026-07-03 23:10] fix+verify: Library production-verificatie afgerond + delete-confirmatie toegevoegd. Verificatie op app.indxr.ai met testaccount test1@indxr-test.com (email_confirmed_at gezet, wachtwoord gereset naar TestPassword123! — geautoriseerd door Khidr, tests/test_accounts.json UUID bijgewerkt naar f136104d… — oude f8d9dc98… bestond niet meer). Alle checklist-items bevestigd met screenshot-bewijs: multi-select+selectionbar ✓, bulk-download SRT/VTT/RAG — ZIP's uitgepakt, unieke bestandsnamen bevestigd (geen collision) ✓, bulk-RAG-export — dialog rendert zonder overflow, credit-aftrek 100→98 geverifieerd zowel in UI als in credit_transactions (reason "Bulk RAG JSON Export", amount 2) ✓, per-rij open/externe-link/delete/rename ✓, collections — aanmaken + drag-to-collection + filter-context-chip (verschijnt/verdwijnt correct) ✓, search ✓, grid/list-toggle ✓, mark-as-read — NEW-badge verdwijnt na openen, overige rijen ongemoeid ✓, visueel — titel-rijen/haarlijnen/badge-kleuren (info-blauw/violet/neutraal)/hexagon-bg/hexagon-credit-icon topbar+sidebar/empty-state allemaal bevestigd. Bug gevonden tijdens verificatie: per-rij delete had géén bevestiging (direct destructief), bulk-delete gebruikte een ongestylede window.confirm(). Fix: beide vervangen door de gedeelde AlertDialog-primitive (packages/shared/src/components/ui/alert-dialog.tsx) — per-rij toont transcript-titel, bulk toont aantal geselecteerd; delete-logica en credit/collection-effecten ongewijzigd. Op productie geverifieerd: per-rij Cancel behoudt data, per-rij Delete verwijdert (bevestigd via directe DB-query, transcripts-tabel leeg na test), bulk Cancel behoudt, bulk Delete verwijdert. Build ✓ (pnpm build:app). Gepusht 1eb01df (redesign) en b6ed205 (delete-confirmatie). Alle tijdelijke Playwright-testscripts (verify-*.mjs) en scratch auth-state.json verwijderd uit apps/marketing/ — working tree schoon. Minor observatie (niet gefixed, buiten scope): sidebar "X transcripts saved"-teller en per-collectie count blijven soms 1 stap achter na delete tot page-refresh — pre-existing, niet door deze taak veroorzaakt. | gewijzigd: apps/app/src/components/library/TranscriptList.tsx, tests/test_accounts.json, docs/LESSONS.md
---
[2026-07-03 18:20] redesign: Library-pagina (stijl-anker dashboard-shell) — titel-gedreven rijen (line-clamp-2), haarlijn-scheiding i.p.v. per-rij card-border, badge-families (bron=blauw `--info`, AI-outputs=violet `--violet`, collectie=neutraal), display-options-menu (sort date/duration/title + thumbnails-toggle, uit by default), filter-context-chip voor actieve collectie, hero empty-state (HexagonEmptyState + CTA), hexagon-credit-icon in topbar+sidebar (vervangt CircleDollarSign), subtiele hexagon-achtergrond op Library-body (bewuste uitzondering op wiki §5.4 — zie LESSONS.md). Nieuwe tokens `--info`/`--violet` (+subtle/fg, light+dark) toegevoegd aan beide tokens.css. Management-laag (multi-select, bulk-download alle 8 formaten + RAG-dialog, bulk-delete, per-rij open/externe-link/delete/rename, mark-as-read, drag-to-collection, search, sidebar-collecties) volledig behouden — geen functionaliteit verwijderd. Discrepantie t.o.v. brief: "video-toggle" als per-rij-actie bestond niet in de originele component en is niet toegevoegd (niet gevonden in codebase, waarschijnlijk verward met een andere pagina) — gerapporteerd i.p.v. verzonnen. Verificatie: `pnpm build:app` ✓ en `pnpm build:marketing` ✓ (beide groen, alle routes gegenereerd, inclusief gewijzigde tokens.css in marketing). Live browser-verificatie via Playwright NIET voltooid — testaccounts uit tests/test_accounts.json gaven "Invalid login credentials" (wachtwoord vermoedelijk verlopen/gewijzigd) en Supabase-project redirect-allowlist staat alleen indxr.ai toe (geen localhost), dus ook een admin-gegenereerde magic-link kon niet lokaal worden ingewisseld zonder de auth-config aan te passen — dat viel buiten scope van deze taak. Login-pagina zelf (ongewijzigd, zelfde tokens) rendert wel correct in Playwright-screenshot, wat de tokens.css-wijziging indirect bevestigt. Aanbeveling: testaccount-wachtwoord verversen voor toekomstige browser-verificatie. | gewijzigd: apps/app/src/app/dashboard/library/page.tsx, apps/app/src/components/library/TranscriptList.tsx, apps/app/src/components/AppTopbar.tsx, apps/app/src/components/app-sidebar.tsx, apps/app/src/app/styles/tokens.css, apps/marketing/src/app/styles/tokens.css, packages/shared/src/components/icons/HexagonCreditIcon.tsx, packages/shared/src/components/icons/HexagonPattern.tsx, packages/shared/src/components/icons/HexagonEmptyState.tsx, docs/LESSONS.md, docs/wiki/design/system.md, docs/wiki/design/research/batch-3b-ux-aesthetic.md
---
[2026-07-03 16:45] fix: DialogContent-primitive grid-cols-[minmax(0,1fr)] — structurele overflow-fix bij de bron. Verwijderd: redundante min-w-0 op space-y-4-wrapper. Build ✓ (0 cached, full rebuild). Gepusht 40ae5be..9791e34. | gewijzigd: packages/shared/src/components/ui/dialog.tsx, apps/app/src/components/library/TranscriptList.tsx, docs/LESSONS.md
---
[2026-07-03 16:00] fix: RAG-dialog layout — min-w-0 op directe grid-child (space-y-4 wrapper). Root cause: DialogContent=grid, grid-children hebben min-width:auto, samenvatting-blok liep over card-rand. Twee eerdere pogingen (min-w-0 op span + overflow-x-hidden) bewaard als correcte sub-lagen. Build ✓. Gepusht 25c01f5..40ae5be. | gewijzigd: apps/app/src/components/library/TranscriptList.tsx, docs/LESSONS.md
---
[2026-07-03 15:15] fix: RAG-dialog layout — overflow-x-hidden op lijst-container (overflow-y:auto dwong overflow-x:auto, labels niet geclipt); max-w-[min(32rem,calc(100%-2rem))] vervangt max-w-lg (voorkomt tailwind-merge drop van viewport-marge). Vervolg op min-w-0-poging (e3cee0c) die correct element raak maar container-level clip miste. Build ✓. Gepusht e3cee0c..25c01f5. | gewijzigd: apps/app/src/components/library/TranscriptList.tsx, docs/LOG.md
---
[2026-07-03 14:30] fix: RAG-dialog layout-bug (min-w-0 + max-w-lg), success-auto-dismiss verwijderd, ZIP-naam uniek (indxr-N-transcripts-format-datum-HHmm.zip). Build ✓. Gepusht 122e96b..e3cee0c. | gewijzigd: apps/app/src/components/library/TranscriptList.tsx, docs/LESSONS.md
---
[2026-07-03 13:15] fix: bulk-export bestandsnaam-conventie herschreven naar volledige-titel-slug — slugify(title) zonder slice/video_id; schema ${slug}_${type}[_variant].${ext}; teller-fallback behouden; bouw groen. | gewijzigd: apps/app/src/components/library/TranscriptList.tsx, docs/LESSONS.md, docs/wiki/decisions/018-export-consolidation.md
---
[2026-07-03 11:00] fix: bulk-export naamgeving-collision + insufficient-render-artefact + integriteitscheck — (1) handleBatchDownload en handleBulkRagExecute gebruiken nu ${safeTitle}_${videoId}${suffix}.${ext}; teller-fallback bij resterende collision; JSZip overschrijft niet meer. (2) Object.keys(zip.files).length === selectedIds.size check; bij mismatch: warning-FeedbackCard. (3) insufficient-guard: !ragBulkExecuting && !ragBulkSuccess; refreshCredits() awaited. Code-inspectie verificaties alle drie ✓. Build ✓ beide apps. | gewijzigd: apps/app/src/components/library/TranscriptList.tsx, docs/LESSONS.md, docs/wiki/decisions/018-export-consolidation.md
---
[2026-07-02 20:30] feat: volledige toast-eliminatie (A+B+C) — (A) alle sonner/toast-calls verwijderd uit 18 bestanden; FeedbackCard canonical inline feedback-component; Copy-knoppen → button-level bool-state; sidebar → compact banner; financiële callsites persistent tot dismiss; Toaster verwijderd uit beide layouts; sonner.tsx verwijderd; sonner uit alle package.json-dependencies. (B) bulk-download dropdown uitgebreid van 4 naar 8 formats: TXT, TXT+timestamps, MD, MD+timestamps, JSON, CSV, SRT, VTT — elk als ZIP. (C) bulk-RAG chunk size leest nu profiles.rag_chunk_size (ipv hardcoded 60); filename _rag_60s.json → _rag_<N>s.json; dialog copy toont chunk preset. Build ✓ beide apps, grep toast → 0 hits. | gewijzigd: packages/shared/src/components/ui/FeedbackCard.tsx, packages/shared/src/components/ui/sonner.tsx (verwijderd), packages/shared/src/components/free-tool/AudioTab.tsx, packages/shared/src/components/free-tool/VideoTab.tsx, packages/shared/src/components/PlaylistManager.tsx, apps/app/src/app/layout.tsx, apps/marketing/src/app/layout.tsx, apps/app/src/components/library/TranscriptViewer.tsx, apps/app/src/components/library/TranscriptList.tsx, apps/app/src/components/library/AiSummaryView.tsx, apps/app/src/components/app-sidebar.tsx, apps/app/src/components/dashboard/billing/BillingPurchaseGrid.tsx, apps/app/src/components/dashboard/WelcomeCreditCard.tsx, apps/app/src/components/dashboard/settings/ProfileSettingsCard.tsx, apps/app/src/components/dashboard/settings/SecuritySettingsCard.tsx, apps/app/src/app/dashboard/library/page.tsx, apps/marketing/src/components/pricing/BuyButton.tsx, apps/marketing/src/app/forgot-password/page.tsx, apps/marketing/src/app/login/page.tsx, apps/marketing/src/app/signup/page.tsx, apps/marketing/src/app/onboarding/page.tsx, apps/marketing/src/app/transcribe/page.tsx, docs/LESSONS.md
---
[2026-07-02] fix: bulk-RAG toast vervangen door inline persistente feedback — toast.error/success verwijderd uit handleBulkRagPreview en handleBulkRagExecute; ragBulkError/ragBulkSuccess state toegevoegd; fouten persistent in dialog (blijft open), success inline 1.2s dan sluiten, export-knop geblokkeerd bij success-state. Build ✓ | gewijzigd: apps/app/src/components/library/TranscriptList.tsx, docs/LESSONS.md
---
[2026-07-02] fix: RAG-export credit-lek gedicht + bulk-RAG met dubbele-export-bescherming — render-guard in [id]/page.tsx (rag_exports.length > 0 vereist), component-level fallback in RagExportView, bulkDeductRagExportCreditsAction (één atomische RPC voor totaal, geen partial charge), bevestigingsdialoog met per-transcript breakdown + saldo-check. Build ✓ | gewijzigd: apps/app/src/app/dashboard/library/[id]/page.tsx, apps/app/src/components/library/RagExportView.tsx, apps/app/src/components/library/TranscriptList.tsx, packages/shared/src/actions/rag-export.ts, docs/wiki/architecture/credit-system.md, docs/LESSONS.md
---
[2026-07-02] design-sync: synced @indxr/shared (137 componenten, 20 authored previews) naar claude.ai/design project 43b8e30d — config, 20 preview-TSX bestanden, bundle-override, gecompileerde tokens. Alle previews graded "good". | gewijzigd: .design-sync/
---
[2026-07-01] docs: design-token sync + branch hygiene — CLAUDE.md design-sectie herschreven naar OKLCH-werkelijkheid (tokens.css), redesign/visual-overhaul branch verwijderd (alle commits op master), LESSONS.md uitgebreid met docs-vs-code patroon. tsc ✓ (apps/app + apps/marketing) | gewijzigd: CLAUDE.md, docs/LESSONS.md, docs/LOG.md
---
[2026-07-01] docs: sessie-afronding contactcentrum v1 — known-issues.md bijgewerkt (v1-featurelijst compleet, GDPR/PostHog-hardening als launch-blocker, bewuste niet-gedane keuzes gedocumenteerd), database-schema.md migrations-sectie gecorrigeerd (3 → 6 rijen, 3 nieuwe contactcentrum-migraties vermeld). Contactcentrum v1 volledig live + end-to-end getest door Khidr op 2026-07-01. | gewijzigd: docs/wiki/operations/known-issues.md, docs/wiki/architecture/database-schema.md
---
[2026-07-01] feat: globale unread-indicator op Messages-sidebar + topbar — useUnreadMessages hook (HEAD COUNT query, pathname-refresh, "indxr-messages-read" event), dot op sidebar Messages-icoon, dot op topbar Mail-icoon, MessagesClient dispatcht event na markRead/markTicketRepliesRead/markAllRead. tsc ✓ | build ✓ | gewijzigd: apps/app/src/hooks/useUnreadMessages.ts (nieuw), apps/app/src/components/app-sidebar.tsx, apps/app/src/components/AppTopbar.tsx, apps/app/src/app/dashboard/messages/MessagesClient.tsx
---
[2026-07-01] fix: unread dot-indicator + dashboard archived-filter — MessagesClient: inbox bold-toggle → constante font-medium + bestaande dot; Support-tab: bold-toggle → standalone accent-dot (open én closed tickets), reply-count altijd text-fg-muted, hasUnread scope terug naar alle tickets. dashboard/page.tsx: .eq("archived", false) zodat gearchiveerde berichten niet in Home-preview lekken. tsc ✓ | build ✓ | gewijzigd: apps/app/src/app/dashboard/messages/MessagesClient.tsx, apps/app/src/app/dashboard/page.tsx
---
[2026-07-01] fix: contactcentrum v1 live-bugs (3 stuks) — admin thread-view: page.tsx haalt nu messages op per ticket (admin client, ASC), TicketsTable herschreven: klik-op-rij opent thread (origineel + replies chronologisch, sender-onderscheid), actions (Close/Reply/Credits) ná thread, Open-filter oudste-eerst (wachtrij), 3-state filter Open/Closed/All, optimistic reply-update. MessagesClient: replies lokaal gesorteerd ASC (bug2 fix), hasUnread alleen op open tickets (closed = niet vetgedrukt). tsc ✓ | build ✓ | gewijzigd: apps/app/src/app/admin/tickets/page.tsx, apps/app/src/app/admin/tickets/TicketsTable.tsx, apps/app/src/app/dashboard/messages/MessagesClient.tsx
---
[2026-07-01 17:00] push: contactcentrum v1 afwerking (commit ba795f6) → master — Vercel indxr-app ✅ success, indxr-marketing ✅ success, Railway ✅ healthy | live op https://app.indxr.ai
---
[2026-07-01] feat: contactcentrum v1 afwerking (A-F) — migratie messages.sender_role (schema_migrations=6), user-reply route /api/support/tickets/[id]/reply (ownership+open-check, notifyAdmin), MessagesClient: thread sender-onderscheid (You/INDXR Support), reply-form open ticket, closed-notice, read/unread vetgedrukt, badge-kleuren (feedback=groen/success, billing=oranje/warning, bug=rood/error), formatDate fix (Today/Yesterday/Jul 1), word-break op bodies. dashboard/page.tsx mock→echte inbox-data. TicketsTable: open/all filter, toast-bevestiging, fmtDate fix, badge-kleuren, word-break. tsc ✓ | build ✓ 40 routes | gewijzigd: supabase/migrations/20260701200000_messages_sender_role.sql (nieuw), apps/app/src/app/api/support/tickets/[id]/reply/route.ts (nieuw), apps/app/src/app/dashboard/messages/MessagesClient.tsx, apps/app/src/app/dashboard/messages/page.tsx, apps/app/src/app/dashboard/page.tsx, apps/app/src/app/admin/tickets/TicketsTable.tsx, apps/app/src/app/api/admin/tickets/[id]/message/route.ts, docs/wiki/architecture/database-schema.md, docs/wiki/operations/known-issues.md
---
[2026-07-01 15:53] push: contactcentrum v1 (commit f924bf6) → master — Vercel indxr-app ✅ success, indxr-marketing ✅ success, Railway ✅ healthy | live op https://app.indxr.ai
---
[2026-07-01] feat: contactcentrum v1 stap 4 — admin/tickets pagina (TicketsTable: inline close/reply/credits), Tickets nav-link in admin-layout, NL→EN taalfix (MessagesClient, SupportClient, settings, EmailNotificationsToggle, mail.ts), build ✓ 35 routes | gewijzigd: apps/app/src/app/admin/tickets/page.tsx (nieuw), apps/app/src/app/admin/tickets/TicketsTable.tsx (nieuw), apps/app/src/app/admin/layout.tsx, apps/app/src/app/dashboard/messages/MessagesClient.tsx, apps/app/src/app/dashboard/support/SupportClient.tsx, apps/app/src/app/dashboard/settings/page.tsx, apps/app/src/components/dashboard/settings/EmailNotificationsToggle.tsx, apps/app/src/lib/mail.ts
---
[2026-07-01] feat: contactcentrum v1 stap 3.5 — support als tab in messages-pagina: migratie messages.ticket_id + profiles.email_notifications (schema_migrations=5), mail-helper (notifyAdmin/notifyUser fail-safe), EmailNotificationsToggle in settings, messagesClient met Inbox+Support toptabs + archive als sub-filter, SupportClient hergebruikt in Support-tab, ticket-lijst met replies, /dashboard/support → redirect, LifeBuoy uit sidebar, build ✓, inbox_count=1 reply_count=0 (welkomstbericht ongewijzigd) | gewijzigd: supabase/migrations/20260701120000_messages_ticket_id_email_pref.sql, apps/app/src/lib/mail.ts, apps/app/src/app/actions/profile.ts, apps/app/src/components/dashboard/settings/EmailNotificationsToggle.tsx, apps/app/src/app/dashboard/settings/page.tsx, apps/app/src/app/dashboard/messages/page.tsx, apps/app/src/app/dashboard/messages/MessagesClient.tsx, apps/app/src/app/dashboard/support/page.tsx, apps/app/src/components/app-sidebar.tsx, apps/app/src/app/api/support/submit/route.ts, apps/app/src/app/api/admin/tickets/[id]/message/route.ts, docs/wiki/architecture/database-schema.md, docs/wiki/operations/known-issues.md
---
[2026-07-01] feat: contactcentrum v1 stap 3 — /dashboard/support pagina: Server Component (transcripts ophalen) + SupportClient (category radio's, subject/body/transcript-selector, inline success/rate-limit/error banners, submit disabled bij request), Support-link in app-sidebar (LifeBuoy icon, zelfde patroon als Messages), build ✓ | gewijzigd: apps/app/src/app/dashboard/support/page.tsx, apps/app/src/app/dashboard/support/SupportClient.tsx, apps/app/src/components/app-sidebar.tsx
---
[2026-07-01] docs: CLAUDE.md + LESSONS.md migratie-workflow 14-cijferige timestamp gedocumenteerd | gewijzigd: CLAUDE.md, docs/LESSONS.md
---
[2026-07-01] feat: contactcentrum v1 stap 1+2 — support_tickets migratie applied (schema_migrations=4), submit_support_ticket RPC (SECURITY DEFINER, rate-limit 5/uur, transcript-ownership, GRANT authenticated), 4 API-routes (/api/support/submit, /api/admin/tickets GET, /[id]/close, /[id]/message), build ✓, DB-runs geverifieerd via MCP, wiki bijgewerkt (database-schema.md, known-issues.md) | gewijzigd: supabase/migrations/20260701000000_support_tickets.sql, apps/app/src/app/api/support/submit/route.ts, apps/app/src/app/api/admin/tickets/route.ts, apps/app/src/app/api/admin/tickets/[id]/close/route.ts, apps/app/src/app/api/admin/tickets/[id]/message/route.ts, docs/wiki/architecture/database-schema.md, docs/wiki/operations/known-issues.md
---
[2026-06-30 17:45] sessie-afrond 2026-06-30: migration-sync baseline-squash ✅ · messages DB-backed + welkomstbericht-trigger ✅ · archive DB-backed ✅ · analytics/SEO audit (read-only) · worker/Redis realiteit bevestigd (wiki stale → gecorrigeerd) — alle features geverifieerd door Khidr | gewijzigd: docs/wiki/operations/known-issues.md, docs/LOG.md
---
[2026-06-30 17:30] feature: archief-actie messages-pagina echt gemaakt ✅ geverifieerd door Khidr; archived kolom in DB (migratie 20260630170359); archive/unarchive schrijft naar DB via UPDATE; Inbox/Archived tab-toggle persistent na refresh | gewijzigd: apps/app/src/app/dashboard/messages/MessagesClient.tsx, apps/app/src/app/dashboard/messages/page.tsx, supabase/migrations/20260630170359_messages_archived.sql, docs/wiki/architecture/database-schema.md, docs/LOG.md
---
[2026-06-27 23:30] fix: title+channel meegeven aan caption master-cache-write ✅ write-kant end-to-end bewezen (Sandler-playlist herrun, alle titels correct in library); cache-hit-kant steunt op bewezen read-logica (mc.get("title") or video_title) + pre-launch master-cache-flush die resterende title=null-rijen verwijdert | gewijzigd: backend/main.py, backend/worker.py, docs/wiki/decisions/021-master-transcripts-cache.md, docs/wiki/architecture/database-schema.md, docs/LOG.md
---
[2026-06-27 23:00] fix: native caption track selectie — altijd -orig, nooit tlang= ✅ productieverificatie: iKtPI8IMuOM native ASR lang='ja-orig', geen tlang=, success — single-video én playlist-pad bevestigd | gewijzigd: backend/youtube_utils.py, docs/wiki/architecture/ai-pipeline.md, docs/LESSONS.md, docs/LOG.md
---
[2026-06-27 22:00] docs: AI-cache productieverificatie + Railway CLI leerpunten gedocumenteerd — ADR-021 uitgebreid met logbewijs (playlist 75a84011, kBdfcR-8hEY, CACHE HIT 3.17s, 55cr exact); test-reports.md nieuw rapport (19/19, 0:54, 1 AI-hit + 17 caption-hits); railway-cli.md twee valkuil-noten (token/PATH inline-export, ~500-regels log-cap); LESSONS.md playlist-shared-helper patroon toegevoegd | gewijzigd: docs/wiki/decisions/021-master-transcripts-cache.md, docs/wiki/operations/test-reports.md, docs/wiki/operations/railway-cli.md, docs/LESSONS.md, docs/LOG.md
---
[2026-06-27 20:45] ops: Railway CLI volledig geconfigureerd ✅ — account-scoped token (no-workspace) werkt; `railway whoami` → contact@indxr.ai; project-ID 4126c5e1 opgehaald; worker-logs + process_playlist_video filter bewezen; token persistent in ~/.bashrc als RAILWAY_API_TOKEN; railway-cli.md bijgewerkt met echte IDs
---
[2026-06-27 20:30] ops: Railway token verificatie geblokkeerd — token c96d6…1118c9 geeft 401 op beide auth-headers (Bearer + Project-Access-Token); ongeldig token verwijderd uit ~/.bashrc. Wacht op nieuw token van Khidr via railway.com/account/tokens. CLI zelf werkt (v5.23.1 geïnstalleerd)
---
[2026-06-27 20:00] ops: Railway CLI geïnstalleerd + non-interactieve authenticatie gedocumenteerd — railway v5.23.1 in ~/.railway/bin; RAILWAY_API_TOKEN-flow beschreven (account token, persistent via ~/.bashrc); commando-recept voor worker/api logs + filter op video-ID, ARQ-task, level, CACHE HIT; wiki railway-cli.md aangemaakt; INDEX.md bijgewerkt. Verificatie wacht op token van Khidr (zie "Wat Khidr moet doen" hieronder) | gewijzigd: docs/wiki/operations/railway-cli.md, docs/wiki/INDEX.md, docs/LOG.md
---
[2026-06-27 19:00] refactor: AI-cache read centralisatie — master_transcripts_read verplaatst uit run_whisper_job naar Step 0 van do_assemblyai_transcription. Playlist-Whisper-pad had de cache volledig gemist (riep helper direct aan); nu gedeeld. Cache-hit-handling in de helper: credit-aftrek (respecteert deduct_credits_on_success), transcript-INSERT, _update_job(complete), return {success:True, transcript_id, credit_cost}. Verwijderd uit worker.py: import math, deduct_credits import, inline 47-regel cache-hit blok. Import-check ✅, AST-check Step 0 op r.170 ✅, vier scenario's code-traced ✅ | gewijzigd: backend/transcription_pipeline.py, backend/worker.py, docs/wiki/architecture/playlist-engine.md, docs/wiki/decisions/021-master-transcripts-cache.md, docs/LOG.md
---
[2026-06-27 18:00] fix: title+channel in master-cache + grammatica playlist + retry backlog — (1) master_transcripts_write krijgt title/channel parameters; master_transcripts_read retourneert ze; pipeline.py geeft video_title+channel mee; worker.py cache-hit gebruikt mc.get("title") or title or video_id + conditioneel channel. Vereist SQL-migratie (title/channel kolommen, kale SQL geleverd — supabase/config.toml ontbreekt, CLI sync niet mogelijk). (2) PlaylistManager.tsx grammatica: singular/plural gecorrigeerd voor botOrTimeout, membersOnly, youtubeRestricted. (3) User-facing playlist retry toegevoegd aan backlog.md. Import-check ✅, build 2/2 ✅ | gewijzigd: backend/master_cache.py, backend/transcription_pipeline.py, backend/worker.py, packages/shared/src/components/PlaylistManager.tsx, docs/wiki/architecture/database-schema.md, docs/wiki/operations/test-reports.md, docs/wiki/roadmap/backlog.md, docs/LOG.md
---
[2026-06-27 16:00] feat: dead-job reaper (ADR-049) + dedup stale-filter — watchdog Pass 0a: stuck pending (NULL heartbeat + created_at > 30min) → error/interrupted. Pass 0b: stuck active met stale heartbeat > 10min (IS NOT NULL guard) → error/interrupted. Playlist-veiligheid: Pass 0b sluit playlist-video-jobs uit via last_heartbeat_at IS NOT NULL (hun heartbeat schrijft naar playlist_extraction_jobs, nooit transcription_jobs). Dedup OR-filter: 30min created_at / 10min heartbeat drempel. timedelta import toegevoegd main.py. Import-check ✅ | gewijzigd: backend/worker.py, backend/main.py, docs/wiki/decisions/049-dead-job-reaper.md, docs/wiki/INDEX.md, docs/wiki/operations/test-reports.md, docs/LOG.md
---
[2026-06-27 14:00] feat: deduplicatie single-video AI-transcriptie — backend (main.py): dedup-check vóór job-aanmaak (SELECT op user_id + video_url + actieve statussen; geeft bestaande job_id + deduplicated:true terug zonder nieuwe ARQ-job). Frontend (VideoTab.tsx): isAlreadyProcessing state, informatie-card bij dedup-hit (zelfde card-patroon als error-cards), status doorgegeven als initialStatus aan TranscriptionProgress. Redis-lock post-launch hardening gedocumenteerd in known-issues.md. Build: 2/2 ✅, import-check ✅, 4/4 dedup-scenario's ✅ | gewijzigd: backend/main.py, packages/shared/src/components/free-tool/VideoTab.tsx, docs/wiki/operations/known-issues.md, docs/LOG.md
---
[2026-06-27 11:00] fix: cache-hit AI-insert crash — video_url verwijderd uit run_whisper_job cache-hit branch (worker.py). video_url bestaat niet in productie transcripts-tabel (alle andere inserts laten het weg). Bijkomend: character_count toegevoegd (ontbrak vs. werkende AI-insert), language-fallback "en" vervangen door conditionele opname. Credit-veiligheid: insert crashte vóór credit-aftrek — geen financieel verlies. Import-check ✅, insert-dict verificatie ✅ | gewijzigd: backend/worker.py, docs/LOG.md
---
[2026-06-26 14:00] fix: AI-transcriptie master-cache write — master_transcripts_write toegevoegd als fire-and-forget asyncio.create_task aan einde van do_assemblyai_transcription (ná succesvolle Supabase INSERT). Guards: video_id is not None (YouTube-pad, nooit uploads) én language truthy (geen 'unknown' forceren bij lingua-miss). Import CURRENT_PRODUCTION_AI_MODEL + master_transcripts_write toegevoegd. known-issues.md en ADR-021 bijgewerkt. Import-check ✅, guard-condities 4/4 ✅ | gewijzigd: backend/transcription_pipeline.py, docs/wiki/operations/known-issues.md, docs/wiki/decisions/021-master-transcripts-cache.md
---
[2026-06-25 21:00] fix: AI-transcriptie success-card + bot-detection copy — (1) useJobStatus: Realtime-pad deed extra poll naar API-endpoint zodat transcript-data beschikbaar is voor onComplete (raw Realtime-payload mist transcript-kolom → success-card verscheen nooit); (2) VideoTab: bot_detection en no_captions error-copy nu auth-context-aware (anoniem: verwijst naar signup, ingelogd: verwijst naar "Generate with AI" toggle). Build: 2/2 ✅ | gewijzigd: packages/shared/src/hooks/useJobStatus.ts, packages/shared/src/components/free-tool/VideoTab.tsx
---
[2026-06-25 19:00] fix: brontaal-eerst caption cascade — lang_pref parameter toegevoegd aan extract_via_youtube_transcript_api + extract_with_ytdlp; normalised_lang doorgegeven vanuit main.py en worker.py. Vermijdt tlang=-vertaalcalls (root cause van 429 én Engelse machinevertalingen). Lokaal geverifieerd: ar auto-only 776 segmenten in Arabisch ✅, en control ongewijzigd ✅. ADR-002 brontaal-eerst nu werkelijk geïmplementeerd. Wiki gecorrigeerd (known-issues, ai-pipeline, ADR-002). | gewijzigd: backend/youtube_utils.py, backend/main.py, backend/worker.py, docs/wiki/decisions/002-youtube-captions.md, docs/wiki/architecture/ai-pipeline.md, docs/wiki/operations/known-issues.md
---
[2026-06-25 17:00] docs: wiki dependency-onderhoud gedocumenteerd — B1 optie 2 (interne JS-runtime) als roadmap taak 2.8; B2 dependency-update-discipline als taak 2.9 + monitoring.md sectie "Dependency-onderhoud" (per-dependency risicotabel, verificatietest-recept, latente js_runtimes inconsistentie); deployment.md Node.js versie-koppeling bijgewerkt | gewijzigd: docs/wiki/roadmap/priorities.md, docs/wiki/operations/monitoring.md, docs/wiki/operations/deployment.md
---
[2026-06-25 16:00] fix: yt-dlp 2026.3.17 → 2026.06.09 + Node.js v18 → v22 in Dockerfile — lost YouTube bot-detection op (web_embedded client was kapot in 2026.3.17, gefixt in 2026.03.13; verouderde signatures). Lokaal getest: qG4k4vJUhaI en FMX-6LiLaB8 metadata-fetch ✅ (geen bot-detection meer). Let op: de eerder gerapporteerde "FMX-6LiLaB8 ✅ success" was alleen metadata-success; de 429 op de VTT-download (tlang=en) werd pas opgelost door de brontaal-fix. yt-dlp-ejs==0.8.0 gepind | gewijzigd: backend/requirements.txt, backend/Dockerfile
---
[2026-06-25 14:00] fix: styling-herstel afronding — (Bev.3) --warning-hover + --warning-border tokens in beide apps; (Bev.4) text-accent-foreground → text-fg-on-accent; (cleanup) 20 bestanden: bg-/text-/border-[var(--...)] → semantische classes. Bewust gelaten: border-[var(--color-success-border)] 2× (undefined token, buiten scope). Build: 2/2 ✅ | gewijzigd: apps/{app,marketing}/tokens.css, TranscriptViewer.tsx, Header.tsx, Footer.tsx, AppTopbar.tsx, app-sidebar.tsx, 14 dashboard/component bestanden
---
[2026-06-25 12:00] fix: 2 styling-bugs na monorepo-migratie — (1) @source directive toegevoegd aan apps/app/tokens.css zodat Tailwind packages/shared scant (zelfde fix als marketing 2026-06-04); (2) TranscriptViewer scroll-bug: h-[calc(100vh-4rem)] overflow-hidden verwijderd, sticky action bar, video sidebar lg:sticky. Build: 2/2 ✅ | gewijzigd: apps/app/src/app/styles/tokens.css, apps/app/src/components/library/TranscriptViewer.tsx
---
[2026-06-06 11:00] docs: Railway service-namen bijgewerkt (agile-creation → api, fortunate-mindfulness → worker, project → indxr-backend) in deployment.md + ADR-048 | gewijzigd: docs/wiki/operations/deployment.md, docs/wiki/decisions/048-redis-split-upstash-railway.md
---
[2026-06-06 10:00] fix: ADR-048 volledig afgerond — monkey-patch (family=AF_UNSPEC) + debug-logging verwijderd; ADR-048 status geïmplementeerd+geverifieerd (root cause: 3 aparte Railway-projecten); deployment.md: 3-services-in-1-project structuur + YOUTUBE_API_KEY gecorrigeerd naar beide services | gewijzigd: backend/worker.py, backend/main.py, docs/wiki/decisions/048-redis-split-upstash-railway.md, docs/wiki/operations/deployment.md
---
[2026-06-05 12:00] fix: ADR-048 fase 3 — dual-stack monkey-patch voor Railway IPv6-only private DNS; debug-logging verwijderd; deployment.md + ADR-048 bijgewerkt met Railway Redis-sectie en IPv6-resolutie-uitleg | gewijzigd: backend/worker.py, backend/main.py, docs/wiki/decisions/048-redis-split-upstash-railway.md, docs/wiki/operations/deployment.md
---
[2026-06-05 10:00] fix: ADR-048 fase 2 — UPSTASH_REDIS_URL → ARQ_REDIS_URL in main.py + worker.py; ADR gecorrigeerd (caption-cache.ts bestond niet, API-service ontbrak in fase-2-checklist, worker-als-producent toegevoegd); .env.example gedocumenteerd. Build: 2/2 ✅ (cached). Khidr-acties staan open (Railway Redis aanmaken + env vars instellen). | gewijzigd: backend/main.py, backend/worker.py, backend/.env.example, docs/wiki/decisions/048-redis-split-upstash-railway.md
---
[2026-06-04 11:00] docs: ADR-048 Redis-splitsing Upstash/Railway — diagnose geverifieerd (10.860 commands/uur idle = 7,84M/maand, structureel onmogelijk op Free Tier), beslissing gedocumenteerd, implementatie fase 2 volgt | gewijzigd: docs/wiki/decisions/048-redis-split-upstash-railway.md, docs/wiki/INDEX.md, docs/wiki/operations/known-issues.md, docs/LESSONS.md
---
[2026-06-04 10:00] fix: 2 visuele bugs marketing site — header nav leeg + button kleuren ontbreken | Oorzaak: Tailwind v4 scande packages/shared/src/ niet → md:flex/md:hidden + bg-accent/text-fg-on-accent ontbraken in CSS. Fix: @source directive toegevoegd aan tokens.css. Build: 2/2 ✅ | gewijzigd: apps/marketing/src/app/styles/tokens.css
---
[2026-05-18 14:00] audit: Redis/Upstash usage audit — alle aanroeplocaties geïnventariseerd (ratelimit, caption cache, ARQ enqueue, watchdog) | gewijzigd: docs/wiki/operations/redis-usage-audit-2026-05.md
---
[2026-05-18 12:00] fix: 4 cross-host link bugs uit post-migratie audit | BUG-1/2a/2b: VideoTab window.location + Link → appHref(); BUG-3: next.config.ts /account/credits → absolute APP_URL. Build: 2/2 ✅ | gewijzigd: packages/shared/src/components/free-tool/VideoTab.tsx, apps/marketing/next.config.ts, docs/wiki/operations/post-migration-audit-2026-05.md
---
[2026-05-18 11:00] audit: post-migratie cross-host link audit | gewijzigd: docs/wiki/operations/post-migration-audit-2026-05.md
---
[2026-05-17 17:15] docs: worker-crash root cause gediagnosticeerd + gedocumenteerd | gewijzigd: docs/wiki/operations/known-issues.md, docs/wiki/roadmap/priorities.md, docs/LESSONS.md
---
[2026-05-17 16:00] taak: sessie wrap-up | B6 auth complete (TEST 8/9/10 PASS in productie). Caption extractie hersteld via BACKEND_API_SECRET correctie op Vercel indxr-app + indxr-marketing (var niet goed gemigreerd na monorepo split). CLAUDE.md BACKEND_API_SECRET sectie gecorrigeerd. Volgende sessie: priorities.md 1.12–1.20 oppakken, met design-context (Claude Design sprint, blauwe knoppen/hexagons) als input voor 1.20 polish + voorbereiding Fase 3 redesign. | gewijzigd: docs/LOG.md
---
[2026-05-17 15:00] taak: fix /api/extract/youtube 401 — BACKEND_API_SECRET env var op Vercel | Mismatch tussen Vercel indxr-app en Railway agile-creation: var niet correct gemigreerd naar nieuwe Vercel projecten tijdens monorepo split (of ingesteld met quotes). Var correct ingesteld op Vercel indxr-app zonder quotes, scope Production, redeploy zonder cache. Caption extractie werkt. CLAUDE.md gecorrigeerd (stond incorrect "nog niet geïmplementeerd" — implementatie bestond al). | gewijzigd: CLAUDE.md, docs/LESSONS.md, docs/wiki/operations/known-issues.md
---
[2026-05-17 14:00] taak: docs checkpoint na B6 PASS | cross-host-smoke-tests TEST 8/9/10 afgevinkt [x] 2026-05-17; TEST 10 stap bijgewerkt (reset-link gaat nu via /auth/callback, niet direct naar settings). Twee nieuwe pre-launch items: messages placeholder content (MOCK_MESSAGES) + welcome message gap. migration-summary geüpdatet: B6 fixes sectie toegevoegd, blokkeerders bijgewerkt (Playwright smoke done, SMTP + Stripe resterend). | gewijzigd: docs/wiki/operations/cross-host-smoke-tests.md, docs/wiki/operations/known-issues.md, docs/wiki/operations/migration-summary.md
---
[2026-05-17 13:30] taak: corrigeer SMTP-bullet known-issues.md | AWS SES claim was incorrect (geen AWS in stack, DNS via registrar). Resend gekozen als provider. | gewijzigd: docs/wiki/operations/known-issues.md
---
[2026-05-17 13:00] taak: pre-launch item — custom SMTP provider | Supabase email rate limit (2/h hardcoded) geblokkeerd tijdens TEST 9 retry. Custom SMTP nodig voor productie. Item toegevoegd aan known-issues.md. | gewijzigd: docs/wiki/operations/known-issues.md
---
[2026-05-17 12:00] taak: fix TEST 9 + 10 — onboarding cross-host redirect + password reset callback flow | TEST 9: router.push('/dashboard/transcribe') in onboarding/page.tsx (marketing host) navigeerde naar indxr.ai/dashboard/transcribe → 404. Fix: window.location.href = appHref('/dashboard'). TEST 10: resetPasswordForEmail redirectTo wees direct naar app.indxr.ai/dashboard/settings?reset=true — PKCE code nooit ingewisseld via exchangeCodeForSession → otp_expired. Fix: redirectTo via marketing /auth/callback?next=<encoded-final-target>, callback leest next param, valideert hostname (alleen app.indxr.ai/localhost), redirect daarheen na succesvolle exchange. Build ✓ (2/2, 0 TS errors). | gewijzigd: apps/marketing/src/app/onboarding/page.tsx, packages/shared/src/actions/auth-actions.ts, apps/marketing/src/app/auth/callback/route.ts
---
[2026-05-17 00:00] taak: fix OAuth callback PKCE bug — getClaims() pattern + matcher exclude | Root cause was clearAuthCookies() (commit 22a0059, 2026-05-05) die alle sb-* cookies wiste op getUser() error, inclusief de PKCE code-verifier die exchangeCodeForSession() nodig heeft. exchangeCodeForSession faalde silently, callback viel door naar fallback-redirect naar app.indxr.ai/dashboard zonder sessie → app-middleware stuurde naar login. Fix C: middleware.ts gebruikt nu getClaims() ipv getUser() per officieel Supabase 2025 template — geen error-recovery, geen cookie-clearing, geen retry-loop. Fix A: /auth/callback uitgesloten van marketing middleware matcher als defense-in-depth. Build ✓ (2/2, 0 TS errors). Aandachtspunt: stale-cookie refresh-loop die clearAuthCookies adresseerde kan niet terugkomen via getClaims() (geen per-request retry); Upstash veilig her-in te schakelen mits 60s ping bron eerst gediagnosticeerd. | gewijzigd: packages/shared/src/utils/supabase/middleware.ts, apps/marketing/src/middleware.ts
---
[2026-05-08 22:00] taak: Playwright smoke tests groen — alle 8 geautomatiseerde tests geslaagd | Fixes: (1) loginFresh in logout.spec.ts: waitForURL(/dashboard|onboarding/) + onboarding bypass voor account2. (2) TEST 7 gebruikt mobiele viewport (390px) — marketing Header toont Sign Out alleen in mobile Sheet, niet in desktop nav. (3) Resultaten: 15 passed, 1 skip (admin-can-access), 1 transient network blip hertest ✓. Docs bijgewerkt: cross-host-smoke-tests.md statussen [x] 2026-05-08, known-issues.md B6 → [x]. | gewijzigd: tests/playwright/specs/cross-host/logout.spec.ts, docs/wiki/operations/cross-host-smoke-tests.md, docs/wiki/operations/known-issues.md
---
[2026-05-08 12:00] taak: Playwright cross-host smoke tests | 5 spec files in tests/playwright/specs/cross-host/ (redirects, auth-flow, nav, logout, admin). Auth setup via auth.setup.ts (storageState). 8 van 13 tests geautomatiseerd; TEST 8 (OAuth), 9 (signup email), 10 (reset email), 11 (Stripe), 13 (Vercel logs) manueel. Smoke config: playwright.smoke.config.ts. Scripts: pnpm test:smoke + test:smoke:headed. .auth.json toegevoegd aan .gitignore. | gewijzigd: playwright.smoke.config.ts, tests/playwright/specs/cross-host/*.ts, package.json, .gitignore
---
[2026-05-08 11:00] taak: docs consolidatie | known-issues.md B6 herschreven (redirect [x], Playwright item toegevoegd, Stripe uitgesteld). app-host-skeleton.md geüpdatet: ThemeToggle beschrijving JS-driven, opgeloste baseline-punt verwijderd, nieuwe sectie "Gepland voor redesign". cross-host-auth.md: alle /dashboard/transcribe → /dashboard (post-login routing fix). cross-host-smoke-tests.md: verwachte URLs gecorrigeerd, automatisering-kolom + "Hoe testen" sectie toegevoegd. Nieuw: docs/wiki/operations/migration-summary.md. | gewijzigd: docs/wiki/operations/known-issues.md, docs/wiki/architecture/app-host-skeleton.md, docs/wiki/architecture/cross-host-auth.md, docs/wiki/operations/cross-host-smoke-tests.md, docs/wiki/operations/migration-summary.md (nieuw)
---
[2026-05-07 18:00] taak: 3 finale visuele fixes — icons + topbar baseline | VideoTab: Search icon + pl-10 verwijderd uit URL input, unused import opgeruimd. PlaylistManager: ListOrdered icon + pl-10 verwijderd uit playlist URL input, unused import opgeruimd. AppTopbar: `flex items-center` toegevoegd aan `<div relative>` wrapper rond Messages button — block div in flex row had geen expliciete alignment, waardoor Mail button visueel hoger zat dan h-9 siblings. Build ✓ (2/2, 85s). | gewijzigd: packages/shared/src/components/free-tool/VideoTab.tsx, packages/shared/src/components/PlaylistManager.tsx, apps/app/src/components/AppTopbar.tsx
---
[2026-05-07 17:00] taak: 3 visuele fixes VideoTab + ThemeToggle | VideoTab input: flex-col sm:flex-row → flex altijd row, min-w-0 op input-wrapper, w-full sm:w-auto → shrink-0 op Extract button. Hint-tekst boven input geplaatst (verwijderd als fallback onderaan). ThemeToggle: CSS dark: classes vervangen door JS-driven conditional rendering (useState mounted + useEffect) — één icon tegelijk getoond. Build ✓ (2/2, 43s). | gewijzigd: packages/shared/src/components/free-tool/VideoTab.tsx, packages/shared/src/components/ui/theme-toggle.tsx
---
[2026-05-07 16:00] taak: 9 layout + visuele fixes app-host | Page layouts: home mx-auto centering, library/[id] dubbele padding + min-h-screen verwijderd, billing max-w-4xl + single-column grid. Shared VideoTab: max-w-xl→2xl input-sectie, placeholder min-h-200px. Sidebar storage Progress: CSS-variable-cycle verwijderd (--accent self-ref), track-kleur naar --border voor contrast. ThemeToggle Moon: inset-0 m-auto voor correcte centering in button. AppTopbar credits link: py-1.5→h-9 gelijke hoogte als buttons. Build ✓ (2/2, 47s). | gewijzigd: apps/app/src/app/dashboard/page.tsx, apps/app/src/app/dashboard/library/[id]/page.tsx, apps/app/src/app/dashboard/billing/page.tsx, packages/shared/src/components/free-tool/VideoTab.tsx, apps/app/src/components/app-sidebar.tsx, packages/shared/src/components/ui/theme-toggle.tsx, apps/app/src/components/AppTopbar.tsx
---
[2026-05-07 10:30] taak: hotfix runtime crash dashboard | useSidebar context error: AppTopbar (met SidebarTrigger) stond buiten SidebarProvider na vorige refactor. Fix: SidebarProvider als outer wrapper, layout-flex in nested div (flex flex-col h-svh w-full + flex flex-1 overflow-hidden). Build ✓ | gewijzigd: apps/app/src/app/dashboard/layout.tsx
---
[2026-05-07 10:00] taak: app-host skelet visuele fix + post-login routing | ThemeToggle: `relative overflow-hidden` containment (Moon absolute positioning bug). AppTopbar: CircleDollarSign h-4→size-5, credits in pill (bg-surface-elevated, tabular-nums), UserAvatar h-9→h-7. Dashboard layout: AppTopbar verplaatst BUITEN SidebarProvider, outer div `flex flex-col h-svh`, SidebarProvider `flex-1 overflow-hidden`, main `overflow-y-auto`. Sidebar: variant=inset → collapsible="none" + h-full border-r (verwijdert fixed top-16 assumptie). Post-login redirect /dashboard/transcribe → /dashboard. Documentatie: app-host-skeleton.md. Build ✓ (31 routes, geen TS errors). | gewijzigd: packages/shared/src/components/ui/theme-toggle.tsx, packages/shared/src/actions/auth-actions.ts, apps/app/src/components/AppTopbar.tsx, apps/app/src/components/AvatarDropdown.tsx, apps/app/src/app/dashboard/layout.tsx, apps/app/src/components/app-sidebar.tsx, docs/wiki/architecture/app-host-skeleton.md (nieuw)
---
[2026-05-06 18:30] taak: app-host skelet-fix — marketing Header verwijderd, AppTopbar, sidebar herwerkt | Marketing Header verwijderd uit apps/app root layout (provider-shell only). Nieuw: AppTopbar.tsx (logo → SidebarTrigger md:hidden → ThemeToggle → Messages dot → Credits → AvatarDropdown). Nieuw: AvatarDropdown.tsx (app-host variant, relatieve links). Dashboard layout: topbar vervangen door AppTopbar, min-h 65→56px, main#main-content. Sidebar: collapse-toggle hidden op mobile (hidden md:block), libraryOpen init op basis van pathname. Admin layout: ThemeToggle + AvatarDropdown toegevoegd rechts in nav. ThemeToggle: resolvedTheme fix (was raw theme, niet resolved). MOCK_MESSAGES geëxporteerd voor unread indicator. Build ✓ (31 routes, geen TS errors). | gewijzigd: apps/app/src/app/layout.tsx, apps/app/src/app/dashboard/layout.tsx, apps/app/src/app/admin/layout.tsx, apps/app/src/components/app-sidebar.tsx, apps/app/src/components/AppTopbar.tsx (nieuw), apps/app/src/components/AvatarDropdown.tsx (nieuw), apps/app/src/app/dashboard/messages/MessagesClient.tsx, packages/shared/src/components/ui/theme-toggle.tsx
---
[2026-05-06 16:00] taak: cross-host redirects + smoke test scaffold | apps/app/next.config.ts: 308 redirects voor /login, /signup, /forgot-password naar marketing host. cross-host-smoke-tests.md aangemaakt (13 tests, pre-test checklist). known-issues.md B6 bijgewerkt. Build ✓ | gewijzigd: apps/app/next.config.ts, docs/wiki/operations/cross-host-smoke-tests.md, docs/wiki/operations/known-issues.md
---
[2026-05-06 15:00] taak: cross-host architectuur baseline gedocumenteerd | wiki/architecture/cross-host-auth.md aangemaakt: user journeys, cookie strategie (.indxr.ai domain), login/OAuth flows, middleware per host, cross-host link contract, env var contract, Supabase URL config, edge cases. | gewijzigd: docs/wiki/architecture/cross-host-auth.md
---
[2026-05-06 14:30] taak: Upstash quota recurrence | UPSTASH_REDIS_REST_URL + _TOKEN verwijderd uit indxr-marketing + indxr-app (quota 500k/500k blow-out, zelfde patroon C.3.1). noopLimiter actief in productie. Login werkt weer. Bron 60s auth-recovery ping nog niet gediagnosticeerd. | gewijzigd: docs/wiki/operations/known-issues.md
---
[2026-05-06 13:00] taak: B5 Stripe webhook live mode | webhook aangemaakt op app.indxr.ai/api/stripe/webhook, 3 checkout events, STRIPE_WEBHOOK_SECRET in Vercel indxr-app sensitive. Verificatie naar B6 (eerste echte betaling). | gewijzigd: docs/wiki/operations/deployment.md, docs/wiki/operations/known-issues.md
---
[2026-05-06 12:30] taak: B4 DNS A-record update | indxr.ai apex A-record gewijzigd van 216.198.79.1 naar 216.150.1.1 (Vercel IP range expansion, plan-specifieke aanbeveling). Badge weg in 30s. | gewijzigd: docs/wiki/operations/deployment.md, docs/wiki/operations/known-issues.md
---
[2026-05-06 12:00] taak: B3 domain transfer | indxr.ai canonical op indxr-marketing, www.indxr.ai 301 redirect naar apex, app.indxr.ai op indxr-app. Curl-verificatie ✓. | gewijzigd: docs/wiki/operations/deployment.md, docs/wiki/operations/known-issues.md
---
[2026-05-06 11:00] taak: docs update na Vercel migratie (B1.2/B2) | deployment.md bijgewerkt: beide Vercel projects operationeel, env var quotes-waarschuwing toegevoegd. known-issues.md: B1.2/B2 afgevinkt, B3–B7 checklist toegevoegd. LESSONS.md: Vercel UI quotes-regel. 
---
[2026-05-06 10:30] taak: B2 env vars migratie | 18 vars naar indxr-app (incl. Stripe live), 15 vars naar indxr-marketing (geen Stripe). Quotes-cleanup nodig op Upstash URL. STRIPE_WEBHOOK_SECRET wacht op B5.
---
[2026-05-06 10:20] taak: B1.2 Vercel projects aanmaken | indxr-marketing + indxr-app aangemaakt in INDXR TEAM (Pro), root directories apps/marketing en apps/app. Turborepo auto-detect werkt. Beide builds slagen.
---
[2026-05-06 10:15] taak: turbo.json passThroughEnv → globalPassThroughEnv | secrets verplaatst naar top-level globalPassThroughEnv (DRY, alle tasks). ADR-047 bijgewerkt met secret-handling rationale. Build ✓ (26s)
---
[2026-05-06 10:00] taak: turbo.json passThroughEnv server-side secrets | Vercel build apps/app faalde door Turborepo strip van STRIPE_SECRET_KEY e.a. Toegevoegd aan passThroughEnv: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, BACKEND_API_SECRET, PYTHON_BACKEND_URL, SENTRY_AUTH_TOKEN, ADMIN_EMAIL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN. Build ✓ (28s)
---
[2026-05-05 20:00] taak: B1.1-revisie 2 vercel.json minimaliseren | beide vercel.json gereduceerd tot {framework: "nextjs"} — Vercel zero-config Turborepo integratie. Fallback config gedocumenteerd in known-issues.md (Risk monitoring sectie). deployment.md bijgewerkt.
---
[2026-05-05 19:45] taak: B1.1-revisie ignoreCommand verwijderen | ignoreCommand uit beide vercel.json verwijderd, turbo-ignore gedeinstalleerd. Vercel native "skip unnecessary deployments" feature vervangt dit — TODO in pre-launch checklist. known-issues.md turbo-ignore entry verwijderd. deployment.md bijgewerkt. pnpm turbo build ✓
---
[2026-05-05 19:30] taak: B1.1 vercel.json per app | apps/marketing/vercel.json + apps/app/vercel.json aangemaakt (buildCommand via turbo filter, installCommand pnpm root, ignoreCommand turbo-ignore). turbo-ignore@2.9.9 apart geïnstalleerd (niet in turbo binary). Beide filter-builds ✓. turbo-ignore deprecated (→ turbo query affected), genoteerd in known-issues.md. deployment.md bijgewerkt met vercel.json sectie.
---
[2026-05-05 19:00] taak: B0.8 Turborepo introduceren | turbo@2.9.9 geïnstalleerd, turbo.json aangemaakt, root scripts bijgewerkt (turbo run build/dev/lint/typecheck + pnpm filter commands behouden), .gitignore bijgewerkt (.turbo/). Cold build 51.3s, warm build 63ms (FULL TURBO), partial invalidation verified. ADR-047 aangemaakt. CLAUDE.md Lokale commando's bijgewerkt naar pnpm/turbo workflow.
---
[2026-05-05 18:30] taak: B0 env var audit + cleanup | NEXT_PUBLIC_PYTHON_BACKEND_URL verwijderd uit apps/app/.env.local (stale — AudioTab gebruikt al NEXT_PUBLIC_AUDIO_UPLOAD_URL). NEXT_PUBLIC_SITE_URL: 0 hits, al dood. PYTHON_BACKEND_URL: 11 hits, KEEP. TODO toegevoegd aan known-issues.md: verwijder NEXT_PUBLIC_PYTHON_BACKEND_URL ook uit Vercel dashboard. Beide builds ✓
---
[2026-05-05 18:00] taak: commit 1794f6b opsplitsen in 2 logische commits | soft reset → commit f8aab3d (monorepo code, 333 files) + commit a7f8ac5 (tooling + wiki, 13 files). LESSONS.md bijgewerkt met git-workflow regel.
---
[2026-05-05 17:30] taak: orphan-verificatie docs-componenten | verwijderd: apps/marketing/src/components/docs/AnchorHeading.tsx, InPageTOC.tsx, ReferenceTable.tsx — geen MDX-bestanden, geen MDX-config, nul referenties buiten eigen definitie. Build ✓
---
[2026-05-05 17:00] taak: tsconfig @indxr/shared/* refactor (A1b) + orphan-audit + stop hook fix | gewijzigd: apps/marketing/tsconfig.json, apps/app/tsconfig.json, 100 .ts(x) bestanden (@indxr/shared/* imports), apps/app/src/lib/pollingBackoff.ts (verwijderd), docs/wiki/decisions/046-monorepo-import-aliases.md (nieuw), docs/wiki/INDEX.md, docs/wiki/architecture/pricing-source-of-truth.md, .claude/settings.json, .claude/hooks/check-wiki.sh
---
[2026-05-05 16:00] taak: ratelimit + auth-actions consolideren naar shared (A1.5) | gewijzigd: packages/shared/src/lib/ratelimit.ts (nieuw), packages/shared/src/actions/auth-actions.ts (nieuw), packages/shared/package.json (+upstash deps), apps/marketing/src/lib/ratelimit.ts (verwijderd), apps/app/src/lib/ratelimit.ts (verwijderd), apps/marketing/src/app/auth/actions.ts (verwijderd), apps/app/src/app/auth/actions.ts (verwijderd), 5× import pad bijgewerkt
---
[2026-05-05 15:30] taak: dubbele files opruimen na monorepo-split | gewijzigd: packages/shared/src/lib/pricing.ts (nieuw), apps/marketing/src/lib/pricing.ts (verwijderd), apps/app/src/lib/pricing.ts (verwijderd), apps/app/src/lib/eta.ts (verwijderd), apps/app/src/app/actions/rag-export.ts (verwijderd), DeveloperExportsCard.tsx (import pad), TranscriptViewer.tsx (import pad)
---
[2026-05-05 14:35] wiki: deployment.md bijgewerkt voor twee-Vercel-projecten architectuur (env vars per app, Stripe webhook → app.indxr.ai, lokale dev → pnpm) | gewijzigd: docs/wiki/operations/deployment.md
---
[2026-05-05 14:30] migration: pnpm monorepo split complete — apps/marketing, apps/app, packages/shared | gewijzigd: alle src/* bestanden verplaatst; package.json herschreven; pnpm-workspace.yaml + pnpm-lock.yaml aangemaakt; apps/marketing/src/, apps/app/src/, packages/shared/src/ aangemaakt; beide builds groen; docs/wiki/migration/migration-002-report.md
---
[2026-05-05 09:15] taak: pre-migratie cleanup (cleanup-001) — cross-host links (7 fixes in TranscriptCard, contact/page, PlaylistManager, AudioTab, VideoTab), NEXT_PUBLIC_SITE_URL → APP/MARKETING_URL in auth/actions.ts (4 regels), CORS app.indxr.ai toegevoegd aan backend/main.py, 4 dode componenten verwijderd (HeroImage, AuthModal, CreditBalance, FeatureCard), LESSONS.md uitgebreid | gewijzigd: src/components/TranscriptCard.tsx, src/app/contact/page.tsx, src/components/PlaylistManager.tsx, src/components/free-tool/AudioTab.tsx, src/components/free-tool/VideoTab.tsx, src/app/auth/actions.ts, backend/main.py, docs/LESSONS.md, docs/wiki/migration/cleanup-001-report.md
---
[2026-05-05 08:03] audit: monorepo migratie audit-001 aangemaakt — read-only codebase audit (12 secties: middleware routing, cross-host links, lekkende links, route verhuiskaart, auth flows, shared components, supabase utils, manifest/robots/sitemap, env vars matrix, CORS, deps, observaties) | gewijzigd: docs/wiki/migration/audit-001.md, docs/LOG.md
---
[2026-05-05 06:00] docs: corrigeer migratie-checkpoint van d13c30e naar 1fc0589 in priorities.md — 1fc0589 bevat bug-fix d13c30e plus handoff-documentatie (ADR-045 + status-docs); bij rollback wil je docs ook behouden | gewijzigd: docs/wiki/roadmap/priorities.md, docs/LOG.md
---
[2026-05-05 05:45] docs: sessie-handoff documentatie — ADR-045 aangemaakt (twee Vercel projecten monorepo beslissing, context: RSC architectural mismatch met middleware 308-redirects); priorities.md: Werksessie C status-sectie toegevoegd (TypeError-bug gesloten, resterende items beoordeeld, C.4 migratie-placeholder); INDEX.md: ADR-045 toegevoegd aan beslissingen-tabel | gewijzigd: docs/wiki/decisions/045-two-vercel-projects-decision.md, docs/wiki/roadmap/priorities.md, docs/wiki/INDEX.md
---
[2026-05-05 05:20] fix: "Uncaught (in promise) Error: NEXT_REDIRECT" cosmetisch console-issue — catch-block in login/page.tsx re-throwde NEXT_REDIRECT maar event handler heeft geen NEXT_REDIRECT boundary; 303 redirect al geïnitieerd door Next.js vóór throw bereikt catch; fix: `throw err` → `return` zodat NEXT_REDIRECT silently geswallowed wordt; build groen | gewijzigd: src/app/login/page.tsx
---
[2026-05-05 05:00] fix: TypeError "Error in input stream" tijdens login flow — root cause: Server Action (loginAction) triggerde browser RSC stream abort doordat window.location.href navigeerde weg terwijl Next.js de action response nog streemde (bevestigd door Next.js GitHub Issue #81377). Fix: loginAction retourneert nu redirect(finalTarget) i.p.v. { success: true }; finalTarget gevalideerd op server (app.indxr.ai / localhost / app.localhost hostnames); client stuurt altijd resolvePostLoginTarget() als redirectTo via formData; client-side navigatie (window.location.href + router.push) verwijderd; useRouter import verwijderd; NEXT_REDIRECT catch-block gebleven; build groen (86 routes, 0 errors) | gewijzigd: src/app/auth/actions.ts, src/app/login/page.tsx
---
[2026-05-05 04:30] fix: Server Component redirect("/login") → absolute marketing URL — 6 instances in dashboard/* Server Components (layout ×2, billing, settings, account, library/[id]); /suspended bevestigd als marketing-route; NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000' als fallback; admin/layout.tsx redirect("/dashboard") onaangeroerd (app-path); LESSONS.md bijgewerkt; build groen | gewijzigd: src/app/(app)/dashboard/layout.tsx, src/app/(app)/dashboard/billing/page.tsx, src/app/(app)/dashboard/settings/page.tsx, src/app/(app)/dashboard/account/page.tsx, src/app/(app)/dashboard/library/[id]/page.tsx, docs/LESSONS.md
---
[2026-05-05 04:10] fix: cross-host navigatie bugs — (1) app-sidebar.tsx:189 router.push("/login") → window.location.href = marketingHref('/login'); router.refresh() verwijderd (overbodig na full reload); marketingHref import toegevoegd; useRouter import gebleven (nog 3 andere uses). (2) WelcomeCreditCard.tsx:128 window.location.href = '/pricing' → marketingHref('/pricing'); import toegevoegd. Build groen | gewijzigd: src/components/app-sidebar.tsx, src/components/dashboard/WelcomeCreditCard.tsx
---
[2026-05-05 03:50] fix: C.2.2 — Header <Link href="/dashboard*"> → <a href={appHref(...)}> voor alle 5 app-path instanties (AvatarDropdown dashboard/account/settings, desktop "Go to app", mobile "Go to app"); Link import verwijderd, appHref toegevoegd aan cross-host-links import; docs/account-and-data/credits-and-billing/page.tsx Link import verwijderd (<Link href="/pricing"> → <a>, <Link href="/dashboard/account"> → appHref); build groen | gewijzigd: src/components/Header.tsx, src/app/docs/account-and-data/credits-and-billing/page.tsx
---
[2026-05-05 02:00] wiki: Werksessie C openstaande items gedocumenteerd in priorities.md (nieuwe sectie "Werksessie C — app.indxr.ai subdomain split"): C.1.1 [~] auth-recovery verify, C.1.2 productie-tests, C.1.3 OAuth, C.2.1 manifest CORS bug (bevestigd), C.2.2 Header /dashboard → appHref (nieuw gevonden), C.2.3 email templates, C.2.4 Python CORS ontbreekt (bevestigd), C.2.5 robots.txt, C.3.1 [!] Upstash quota blocker, C.3.2 [~] rate limiting uitgeschakeld; afgewezen items: Stripe checkout (correct), sitemap (geen dashboard URLs), admin fetch (passthrough werkt), OG/metadata (niet geïndexeerd); known-issues.md inconsistentie over Upstash gedocumenteerd; LESSONS.md 2 regels bijgewerkt | gewijzigd: docs/wiki/roadmap/priorities.md, docs/LESSONS.md, docs/LOG.md
---
[2026-05-05 01:15] fix: auth-error recovery in updateSession() — clearAuthCookies() helper toegevoegd die sb-* cookies met maxAge:0 en correcte domain wist op zowel response als request; getUser() omgeven door try/catch: bij error of exception cookies clearen + console.error('[auth-recovery] ...'), user=null; voorkomt infinite refresh-loop bij stale/revoked tokens (refresh_token_not_found → Redis quota explosie); LESSONS.md bijgewerkt; build groen (86 routes, 0 errors) | gewijzigd: src/utils/supabase/middleware.ts, docs/LESSONS.md
---
[2026-05-04 15:45] fix: cross-host prefetch crash vervolg — resterende marketing <Link>/<a> in app-host components gefixed: VideoTab (/pricing → <a>, /dashboard/credits → /dashboard/billing), PlaylistTab (/pricing → <a>), AudioTab (/login×2 + /pricing×2 → <a>), PlaylistAvailabilitySummary (/pricing → <a>), billing/cancel (/pricing → <a>), TranscriptViewer (/pricing in toast → <a>), TranscriptCard (/signup + /login×2 plain <a> → marketingHref), dashboard/transcribe/page.tsx (/docs → marketingHref); Header signout handlers: router.push("/login") → window.location.href = marketingHref('/login'), useRouter import verwijderd; LESSONS.md bijgewerkt; build groen (86 routes, 0 errors) | gewijzigd: src/components/free-tool/{VideoTab,PlaylistTab,AudioTab}.tsx, src/components/PlaylistAvailabilitySummary.tsx, src/components/library/TranscriptViewer.tsx, src/components/TranscriptCard.tsx, src/components/Header.tsx, src/app/(app)/dashboard/billing/cancel/page.tsx, src/app/(app)/dashboard/transcribe/page.tsx, docs/LESSONS.md
---
[2026-05-04 15:00] fix: cross-host prefetch crash op app.indxr.ai — Next.js <Link> naar marketing-paths vervangen door plain <a href={marketingHref(...)}> in Header (12 links: logo, /pricing×2, /docs×2, /articles×2, /transcribe×2, /login×2, /signup×2), Footer (13 links: alle /pricing, /docs, /about, /privacy, /terms, /contact, /articles/* via FooterColumn), DocsShell (/docs×3); src/lib/cross-host-links.ts aangemaakt (marketingHref + appHref); app-targets (/dashboard, /dashboard/account, /dashboard/settings) blijven <Link>; build groen (86 routes, 0 errors); openstaand sessie 2: VideoTab/PlaylistTab/AudioTab/PlaylistAvailabilitySummary/billing/cancel hebben nog relatieve /pricing links op app-host | gewijzigd: src/lib/cross-host-links.ts (nieuw), src/components/Header.tsx, src/components/Footer.tsx, src/components/docs/DocsShell.tsx
---
[2026-05-04 14:15] infra: Werksessie C Sessie 1 fixes — middleware.ts: marketingOnlyPaths array vervangen door inverse !isAppPath check; localhost-branch ?next gebruikt nextUrl.origin i.p.v. APP_URL (voorkomt app.localhost redirect lokaal); login/page.tsx: resolvePostLoginTarget accepteert ook localhost als valid next-hostname, single-host fallback naar relatief '/dashboard/transcribe', call site conditioneel router.push vs window.location.href; @supabase/ssr 0.8.0 source-inspectie bevestigd: cookieOptions.domain wordt gespread in alle set/remove paden — client.ts ongewijzigd; build groen (86 routes, 0 errors) | gewijzigd: src/middleware.ts, src/app/login/page.tsx
---
[2026-05-04 13:30] infra: Werksessie C Code Sessie 1 — subdomain split implementatie (app.indxr.ai): (1) src/app/dashboard/ + src/app/admin/ verplaatst naar route group src/app/(app)/ (URL's ongewijzigd); (2) Supabase cookie domain ingesteld op .indxr.ai in alle 3 supabase utils (server.ts, client.ts, middleware.ts) voor cross-subdomain session sharing; (3) updateSession() gerefactord naar {response, user} tuple; (4) src/middleware.ts volledig herschreven met hostname-aware routing (indxr.ai/dashboard → 308 app.indxr.ai/dashboard, app.indxr.ai zonder auth → indxr.ai/login?next=..., app.indxr.ai marketing-paths → 308 indxr.ai); (5) login/page.tsx: ?redirect → ?next, router.push → window.location.href met open-redirect validatie; auth/callback/route.ts: ${origin}/... → ${APP_URL}/... en ${MARKETING_URL}/...; AuthContext.tsx: SIGNED_OUT op app host → redirect naar MARKETING_URL/login; (6) .env.example bijgewerkt met NEXT_PUBLIC_APP_URL + NEXT_PUBLIC_MARKETING_URL; build groen (86 routes, 0 errors) | gewijzigd: src/app/(app)/dashboard/*, src/app/(app)/admin/*, src/utils/supabase/{server,client,middleware}.ts, src/middleware.ts, src/app/login/page.tsx, src/app/auth/callback/route.ts, src/contexts/AuthContext.tsx, .env.example, docs/wiki/architecture/auth-and-security.md, docs/LOG.md
---
[2026-05-04 12:00] docs + scaffold: Batch 1 / page-type 4 — /docs hernesting flat → categorisch: docs-config.ts herschreven (4 secties: Getting started / How INDXR works / Account & data / Help); DocsSidebar bijgewerkt (Search verwijderd, indent-prop toegevoegd); 15 nieuwe docs-componenten in src/components/docs/ (DocsBreadcrumb, DefinitionLeadOpening, ReferenceTable, EdgeCasesCallout, RelatedTopicsList, AnchorHeading, InPageTOC, TutorialOpening, PrerequisitesBlock, TutorialStep, WhatJustHappened, NextStepsBlock, DocsHubHero, FeaturedDocsGrid, DocsCategorySection); 22 nieuwe page.tsx bestanden aangemaakt onder /docs/how-indxr-works/*, /docs/account-and-data/*, /docs/help/*; 11 oude directories verwijderd; /docs/page.tsx herschreven (CollectionPage schema); /docs/getting-started herschreven (Tutorial layout + HowTo schema); 20 redirects toegevoegd aan next.config.ts; sitemap.ts bijgewerkt (22 docs-routes); Footer /docs/faq → /docs/help/faq; llms.txt bijgewerkt (verouderde URLs); wiki: docs-hub.md + reference-doc.md + tutorial-doc.md aangemaakt; sitemap.md Laag 2A volledig herschreven; INDEX.md + README.md bijgewerkt | gewijzigd: src/lib/docs-config.ts, src/components/docs/DocsSidebar.tsx, src/components/docs/{15 nieuwe}, src/app/docs/page.tsx, src/app/docs/getting-started/page.tsx, src/app/docs/how-indxr-works/** (15 nieuwe), src/app/docs/account-and-data/** (2 nieuwe), src/app/docs/help/** (3 nieuwe), next.config.ts, src/app/sitemap.ts, src/components/Footer.tsx, public/llms.txt, docs/wiki/architecture/page-structures/{docs-hub.md,reference-doc.md,tutorial-doc.md} (nieuw), docs/wiki/architecture/page-structures/README.md, docs/wiki/architecture/sitemap.md, docs/wiki/INDEX.md, docs/LOG.md
---
[2026-05-04 02:45] cleanup: INBOX.md uitgefaseerd — pricing-discrepantie tabel + Khidr-actie gemigreerd naar pricing-source-of-truth.md (nieuwe sectie "Migration history"); /transcribe deferred polish-items (format-export gating 3c + playlist eerste-3-free UI) gemigreerd naar wiki/roadmap/priorities.md (nieuwe sectie "Polish / deferred UI"); INBOX.md-verwijzingen in free-tool.md bijgewerkt naar priorities.md; INBOX.md verwijderd; CLAUDE.md sessiestart-protocol bijgewerkt (stap 3 vervallen, nieuwe handoff-instructie → priorities.md) | gewijzigd: docs/INBOX.md (verwijderd), docs/wiki/architecture/pricing-source-of-truth.md, docs/wiki/roadmap/priorities.md, docs/wiki/architecture/page-structures/free-tool.md, CLAUDE.md, docs/LOG.md
---
[2026-05-04 02:15] docs + scaffold: Batch 1 / page-type 3 — Pricing (/pricing) page-structure gedocumenteerd (wiki/architecture/page-structures/pricing.md + pricing-source-of-truth.md + README.md + INDEX.md bijgewerkt); src/lib/pricing.ts aangemaakt als single source of truth voor PACKAGES (try €2.49/150cr, basic €5.99/500cr, plus €11.99/1200cr, pro €24.99/2800cr, power €49.99/6000cr), CREDIT_COSTS, FREE_TIER limits + helper functions (formatEur, pricePerCredit, costInTier, pricePerMinute); Stripe checkout route gerefactord om van pricing.ts te lezen; 9 nieuwe skeleton-componenten in src/components/pricing/ (PricingHero, AlwaysFreeBlock, BuyButton, PricingTierCard, PricingTierGrid, SecondaryTierStrip, TrustRowCards, VatLine, CreditCostTable); /pricing gerefactord van CLIENT naar SERVER component; AggregateOffer + FAQPage JSON-LD toegevoegd; 3 prominente tiers (Basic/Plus/Pro) + 2 secondary (Try/Power); CreditCostTable als client island met tier-selector toggle; 10 FAQ-items (3 placeholders voor Khidr); geen vergelijkingstabel, geen B2B toggle; VatLine vervangt B2B-toggle; build groen (85 routes, 0 errors) | gewijzigd: docs/wiki/architecture/page-structures/pricing.md (nieuw), docs/wiki/architecture/pricing-source-of-truth.md (nieuw), docs/wiki/architecture/page-structures/README.md, docs/wiki/INDEX.md, docs/LOG.md, src/lib/pricing.ts (nieuw), src/app/api/stripe/checkout/route.ts, src/components/pricing/*.tsx (9 nieuw), src/app/pricing/page.tsx
---
[2026-05-04 01:30] docs + scaffold: Batch 1 / page-type 2 — Free tool (/transcribe) page-structure gedocumenteerd (wiki/architecture/page-structures/free-tool.md + README.md + INDEX.md bijgewerkt); 3 nieuwe skeleton-componenten aangemaakt (MicroTrustRow, FrictionConversionCard, FAQAccordion); ClosingCTASection uitgebreid met 6 copy-override props (homepage onveranderd); /transcribe gerefactord: AudioTab gated voor anonymous (FrictionConversionCard i.p.v. AudioTab), PlaylistTab onAuthRequired-callback toont inline FrictionConversionCard i.p.v. AuthModal, MicroTrustRow onder tool, FAQAccordion (6 placeholder vragen), PricingTeaserBlock + ClosingCTASection toegevoegd; format-export gating (3c) en playlist eerste-3-free UI gedocumenteerd in INBOX.md (deferred); build groen (85 routes, 0 errors) | gewijzigd: docs/wiki/architecture/page-structures/free-tool.md (nieuw), docs/wiki/architecture/page-structures/README.md, docs/wiki/INDEX.md, docs/LOG.md, docs/INBOX.md, src/components/marketing/MicroTrustRow.tsx (nieuw), src/components/marketing/FrictionConversionCard.tsx (nieuw), src/components/marketing/FAQAccordion.tsx (nieuw), src/components/marketing/ClosingCTASection.tsx, src/app/transcribe/page.tsx
---
[2026-05-04 00:30] docs + scaffold: Batch 1 / page-type 1 — Homepage page-structure gedocumenteerd in wiki/architecture/page-structures/homepage.md (+ README.md index); 9 skeleton-componenten aangemaakt in src/components/marketing/ (HeroImage, HowItWorksBlock, MacbookMockupFrame, RemotionLoop, DifferentiatorStrip, StatsFromTesting, TestimonialPlaceholder, PricingTeaserBlock, ClosingCTASection); Header aangepast (Articles nav toegevoegd, "Start free" → "Sign up", logged-in: "Go to app" → /dashboard, CreditBalance/AvatarDropdown verwijderd uit marketing header); homepage gerefactord naar 8-sectie structuur (Hero → HowItWorks 5 blocks → Differentiators → Stats → Pricing teaser → Closing CTA → Footer); fake testimonials verwijderd (ADR-044); INDEX.md "Page structures" sectie toegevoegd; build groen (85 routes) | gewijzigd: docs/wiki/architecture/page-structures/README.md (nieuw), docs/wiki/architecture/page-structures/homepage.md (nieuw), docs/wiki/INDEX.md, docs/LOG.md, src/components/marketing/*.tsx (9 nieuw), src/components/Header.tsx, src/app/(marketing)/page.tsx
---
[2026-05-03 23:59] fix + adrs: Werksessie B-Fix — self-review nieuwe scaffolds (geen issues gevonden, build groen); 5 nieuwe ADR's geschreven: 040 (audience-aware article pattern mix), 041 (system default color scheme), 042 (about page Organization schema), 043 (author byline INDXR Editorial), 044 (drie gebruikersfeedback channels); INDEX.md + LOG.md bijgewerkt | gewijzigd: docs/wiki/decisions/040-044*.md, docs/wiki/INDEX.md, docs/LOG.md
---
[2026-05-03 23:30] refactor: Werksessie B — drie-lagen architectuur geïmplementeerd: /alternative/* (5 pages) verwijderd; /youtube-transcript-generator → /transcribe (301); /support → /contact (301); 18 top-level SEO-articles + 3 /blog/* verhuisd naar /articles/* (18× 301); /about + /privacy + /terms scaffolds aangemaakt; 17 nieuwe /docs/* scaffold-pages (credits, accuracy, export-formats, limits, languages, privacy-handling, how-to, troubleshooting + subs); DocsShell verwijderd uit ArticleTemplate/ToolPageTemplate/TutorialTemplate; docs-config.ts herschreven (alleen /docs/*); Header/Footer/homepage bijgewerkt (/transcribe links); sitemap.ts volledig herschreven (marketing 9 + docs 21 + articles 19 routes); next.config.ts 23 redirects; sitemap.md bijgewerkt naar post-Werksessie B staat | gewijzigd: next.config.ts, src/app/sitemap.ts, src/components/Header.tsx, src/components/Footer.tsx, src/app/(marketing)/page.tsx, src/lib/docs-config.ts, src/components/content/templates/ArticleTemplate.tsx, src/components/content/templates/ToolPageTemplate.tsx, src/components/content/templates/TutorialTemplate.tsx, src/app/transcribe/*, src/app/contact/*, src/app/about/*, src/app/privacy/*, src/app/terms/*, src/app/articles/*, src/app/docs/*, docs/wiki/architecture/sitemap.md, docs/wiki/INDEX.md
---
[2026-05-03 22:00] wiki: Werksessie A2 — ADR cleanup (S001-S007 hernoemd naar 033-039, verhuisd naar wiki/decisions/, Dutch format); marketing.md herschreven (verouderde URL-tabellen weg, nieuwe structuur, Decodo i.p.v. IPRoyal); /support gecorrigeerd CLIENT in sitemap.md; /pricing metadata-issue gedocumenteerd in INBOX.md | gewijzigd: docs/wiki/decisions/033-039*.md (nieuw), docs/wiki/strategy/decisions/ (verwijderd), docs/wiki/strategy/principles.md, docs/wiki/INDEX.md, docs/wiki/business/marketing.md, docs/wiki/architecture/sitemap.md, docs/INBOX.md
---
[2026-05-03 21:00] cleanup + wiki: Werksessie A — drie-lagen architectuur vastgesteld; dev artifacts verwijderd (test-tokens, youtube-transcript-downloader); redirect-ghosts opgeschoond (faq/page.tsx, how-it-works/page.tsx, account/credits/page.tsx); console.logs verwijderd (webhook, app-sidebar, TranscriptViewer, AuthContext); metadataBase toegevoegd aan root layout; llms.txt prijzen gesynchroniseerd; sitemap.ts gefixed (faq+how-it-works verwijderd, docs/* toegevoegd, youtube-transcript-non-english toegevoegd); sitemap.md volledig herschreven (drie-lagen); strategy wiki aangemaakt (principles.md + 7 ADR's); INDEX.md bijgewerkt | gewijzigd: src/app/api/stripe/webhook/route.ts, src/components/app-sidebar.tsx, src/components/library/TranscriptViewer.tsx, src/contexts/AuthContext.tsx, src/app/layout.tsx, public/llms.txt, src/app/sitemap.ts, docs/wiki/architecture/sitemap.md, docs/wiki/business/INDXR-SITEMAP.md, docs/wiki/business/marketing.md, docs/wiki/strategy/principles.md, docs/wiki/strategy/decisions/*.md, docs/wiki/INDEX.md
---
[2026-05-03 17:00] audit: sitemap + pagina-structuur audit voor research fase | nieuw bestand: docs/wiki/architecture/sitemap-audit-2026-05.md
---
[2026-05-03 10:00] docs: Sentry frontend server-side capture gecorrigeerd naar bekende beperking — known-issues "Opgelost" teruggedraaid naar "Bekende beperking", monitoring.md en test-reports bijgewerkt met definitieve conclusie (Sentry issue #17604) | gewijzigd: docs/wiki/operations/known-issues.md, docs/wiki/operations/monitoring.md, docs/wiki/operations/test-reports.md, docs/LOG.md
---
[2026-05-02 21:00] fix: Sentry edge runtime mismatch opgelost — export const runtime = 'nodejs' op 6 API routes; api/video/metadata geïnstrumenteerd; instrumentation.ts diag-logs verwijderd; known-issues resolved, monitoring.md + test-reports bijgewerkt | gewijzigd: instrumentation.ts, src/app/api/extract/route.ts, src/app/api/stripe/webhook/route.ts, src/app/api/ai/summarize/route.ts, src/app/api/transcribe/preflight/route.ts, src/app/api/playlist/info/route.ts, src/app/api/video/metadata/[videoId]/route.ts, docs/wiki/operations/known-issues.md, docs/wiki/operations/monitoring.md, docs/wiki/operations/test-reports.md, docs/LOG.md
---
[2026-05-02 19:00] fix: Sentry.flush(2000) toegevoegd na elke captureException in 5 API routes — serverless transport kreeg geen tijd om envelope te versturen vóór process kill | gewijzigd: src/app/api/extract/route.ts, src/app/api/stripe/webhook/route.ts, src/app/api/ai/summarize/route.ts, src/app/api/transcribe/preflight/route.ts, src/app/api/playlist/info/route.ts
---
[2026-05-02 18:00] docs: Sentry frontend diagnose — root cause gevonden: testmethode onjuist (Zod-validatie bereikt outer catch nooit), sentry-config structureel correct, verificatiestap gedocumenteerd in known-issues.md | gewijzigd: docs/wiki/operations/known-issues.md
---
[2026-05-02 17:00] docs: Sentry audit test-reports + known-issues — verificatieresultaten (worker ✅ / frontend ❌), onderzoek frontend-capture hypotheses, get_video_metadata flow, open issue NEXT_PUBLIC_SENTRY_DSN | gewijzigd: docs/wiki/operations/test-reports.md, docs/wiki/operations/known-issues.md
---
[2026-05-02 16:30] fix: remove Sentry force-error tests — alle 3 verwijderd na verificatie | gewijzigd: backend/worker.py, backend/main.py, src/app/api/extract/route.ts
---
[2026-05-02 16:00] fix: Sentry observability audit — capture_exception toegevoegd aan watchdog passes 1a/1b/2 + structurele catches in worker.py, main.py, transcription_pipeline.py, youtube_utils.py; captureException in 5 Next.js API routes; monitoring.md bijgewerkt | gewijzigd: backend/worker.py, backend/main.py, backend/transcription_pipeline.py, backend/youtube_utils.py, src/app/api/extract/route.ts, src/app/api/stripe/webhook/route.ts, src/app/api/ai/summarize/route.ts, src/app/api/transcribe/preflight/route.ts, src/app/api/playlist/info/route.ts, docs/wiki/operations/monitoring.md
---
[2026-05-02 05:30] docs: test-reports.md productie-tests 2026-05-02 toegevoegd — meertalige cache + retry_pending flow + watchdog Pass 1a bugfixes | gewijzigd: docs/wiki/operations/test-reports.md
---
[2026-05-02 05:10] fix: watchdog Pass 1a title kolom-fix — title uit select verwijderd (kolom bestaat niet), video_url → video_id extraheren via urllib.parse voor run_whisper_job enqueue | gewijzigd: backend/worker.py, backend/test_watchdog.py
---
[2026-05-02 05:00] fix: watchdog Pass 1a kolom-fix video_id → video_url | gewijzigd: backend/worker.py, backend/test_watchdog.py
---
[2026-05-02 04:45] supabase (productie): migratie 20260502_playlist_retry_pending_status.sql gedraaid — RPC update_playlist_video_progress nu retry_pending-aware (v_has_retryable + should_retry veld)
---
[2026-05-02 04:45] supabase (productie): TRUNCATE master_transcripts CASCADE — clean slate voor canonical ISO 639-1 taalcodes; count geverifieerd = 0 (R2 bucket indxr-transcripts door Khidr geleegd)
---
[2026-05-02 00:00] fix: language-aware master cache lookups — normalize_language_code + YouTube Data API pre-fetch vóór cache-read in caption paths (main.py + worker.py) + transcription_pipeline.py lingua normalisatie | gewijzigd: backend/language_utils.py (nieuw), backend/test_language_utils.py (nieuw), backend/requirements.txt, backend/youtube_utils.py, backend/youtube_client.py, backend/main.py, backend/worker.py, backend/transcription_pipeline.py
---
[2026-05-02 00:05] fix: ADR-030 Gap 1 — retry_pending status + watchdog detectie + frontend mount-check | gewijzigd: supabase/migrations/20260502_playlist_retry_pending_status.sql (nieuw), backend/worker.py, src/components/free-tool/PlaylistTab.tsx, backend/test_watchdog.py, backend/test_playlist_retry_pending.py (nieuw)
---
[2026-05-02 00:10] docs: ADR-032 + ADR-021 language-aware sectie + ADR-030 Gap 1 opgelost + INDEX + backlog + error-taxonomy | gewijzigd: docs/wiki/decisions/032-retry-pending-status.md (nieuw), docs/wiki/decisions/021-master-transcripts-cache.md, docs/wiki/decisions/030-fase4-crash-recovery-leerervaring.md, docs/wiki/INDEX.md, docs/wiki/roadmap/backlog.md, docs/wiki/operations/error-taxonomy.md
---
[2026-05-01 19:30] feat: Supabase Realtime + polling fallback (taak 1.10) — useJobStatus hook, VideoTab/AudioTab/PlaylistTab gerefactored; pollWhisperJob/runPollLoop/startPollInterval verwijderd | gewijzigd: src/hooks/useJobStatus.ts (nieuw), src/components/free-tool/VideoTab.tsx, src/components/free-tool/AudioTab.tsx, src/components/free-tool/PlaylistTab.tsx
---
[2026-05-01 19:25] feat: master_transcripts cache read in /api/extract/youtube (taak 1.11) | gewijzigd: backend/main.py
---
[2026-05-01 19:20] feat: master_transcripts cache read in worker.py — _process_caption_video + run_whisper_job (taak 1.11) | gewijzigd: backend/worker.py
---
[2026-05-01 19:15] feat: master_transcripts_read() + unit-tests (taak 1.11) | gewijzigd: backend/master_cache.py, backend/test_master_cache.py (nieuw)
---
[2026-05-01 19:10] feat: watchdog ARQ cron + unit-tests (taak 1.7) | gewijzigd: backend/worker.py, backend/test_watchdog.py (nieuw)
---
[2026-05-01 19:05] db: migration watchdog_attempts kolom (taak 1.7) | gewijzigd: supabase/migrations/20260501_watchdog_attempts.sql (nieuw)
---
[2026-05-01 19:35] docs: wiki bijgewerkt (taak 1.7 + 1.10 + 1.11) — priorities.md [x], known-issues Railway restart, backlog language-aware caption cache-implicatie | gewijzigd: docs/wiki/roadmap/priorities.md, docs/wiki/operations/known-issues.md, docs/wiki/roadmap/backlog.md
---
[2026-05-01 06:00] fix: yt-dlp partial-write retry — keyword match + session-rotatie per attempt (ADR-031) | gewijzigd: backend/audio_utils.py, backend/transcription_pipeline.py
---
[2026-05-01 06:05] test: unit-tests audio retry — 11 tests groen (partial_write trigger, proxy-rotatie, backward-compat, members-only guard) | gewijzigd: backend/test_audio_retry.py (nieuw)
---
[2026-05-01 06:10] docs: ADR-031 + error-taxonomy partial_write + ai-pipeline fallback path + known-issues fix + INDEX | gewijzigd: docs/wiki/decisions/031-yt-dlp-audio-retry-strategy.md (nieuw), docs/wiki/operations/error-taxonomy.md, docs/wiki/architecture/ai-pipeline.md, docs/wiki/operations/known-issues.md, docs/wiki/INDEX.md
---
[2026-05-01 02:30] feat: spoor 1 — wegklik-bescherming (beforeunload) + VideoTab Whisper-resume via sessionStorage | gewijzigd: src/components/free-tool/AudioTab.tsx, src/components/free-tool/PlaylistTab.tsx, src/components/free-tool/VideoTab.tsx
---
[2026-05-01 02:35] feat: spoor 2 — upload progress UI in AudioTab — XHR, Progress bar, uploadPhase drietrap | gewijzigd: src/components/free-tool/AudioTab.tsx
---
[2026-05-01 02:45] feat: spoor 3a — TranscriptionProgress 4-stap stepper + ETA calc | gewijzigd: src/lib/eta.ts (nieuw), src/components/transcription/TranscriptionProgress.tsx (nieuw), src/components/free-tool/AudioTab.tsx, src/components/free-tool/VideoTab.tsx
---
[2026-05-01 02:55] feat: spoor 3b — per-video AI-transcriptie feedback in playlist (heartbeat dot + elapsed timer) | gewijzigd: src/components/free-tool/PlaylistTab.tsx, src/components/PlaylistManager.tsx
---
[2026-05-01 03:05] feat: spoor 4 — partial completion wrap-up: free count badge, failed video lijst met thumbnails, disabled "Save failed"-knop | gewijzigd: src/components/PlaylistManager.tsx
---
[2026-05-01 03:15] feat: spoor 5 — persistent active jobs indicator boven credits coin in sidebar | gewijzigd: src/components/dashboard/ActiveJobsIndicator.tsx (nieuw), src/components/app-sidebar.tsx
---
[2026-05-01 04:10] fix: video resume banner — catch behoudt sessionStorage key bij netwerk-exceptie; verwijdert alleen bij 401/403/404 | gewijzigd: src/components/free-tool/VideoTab.tsx
---
[2026-05-01 04:20] feat: resume-UX herontwerp — auto-resume na 5s met CSS progressbalk op knop; Dismiss verwijderd; aria-live | gewijzigd: src/components/free-tool/VideoTab.tsx
---
[2026-05-01 04:30] refactor: ActiveJobsIndicator verplaatst van sidebar naar transcribe-pagina boven tab-rij | gewijzigd: src/components/app-sidebar.tsx, src/app/dashboard/transcribe/page.tsx
---
[2026-05-01 05:10] feat: PlaylistTab resume-banner — auto-fill 5s countdown, geen Dismiss, aria-live, fout-afhandeling identiek aan VideoTab | gewijzigd: src/components/free-tool/PlaylistTab.tsx
---
[2026-05-01 05:10] feat: AudioTab resume-banner — auto-fill 5s countdown, geen Dismiss, aria-live, fout-afhandeling identiek aan VideoTab | gewijzigd: src/components/free-tool/AudioTab.tsx
---
[2026-04-30] feat: grondverf sessie 2 — sitemap, DocsShell, header, sidebar, messages, support, welcome, suspended, footer, MobileTabBar | gewijzigd: next.config.ts, src/lib/docs-config.ts, src/components/docs/DocsShell.tsx, src/components/docs/DocsSidebar.tsx, src/app/docs/page.tsx, src/app/docs/getting-started/page.tsx, src/app/docs/faq/page.tsx, src/app/docs/account/page.tsx, src/components/content/templates/ArticleTemplate.tsx, src/components/content/templates/ToolPageTemplate.tsx, src/components/content/templates/TutorialTemplate.tsx, src/components/Header.tsx, src/components/app-sidebar.tsx, src/components/dashboard/MobileTabBar.tsx, src/app/dashboard/layout.tsx, src/app/dashboard/page.tsx, src/app/dashboard/messages/page.tsx, src/app/dashboard/messages/MessagesClient.tsx, src/app/support/page.tsx, src/app/onboarding/page.tsx, src/app/suspended/page.tsx, src/components/Footer.tsx, src/app/dashboard/transcribe/page.tsx, docs/wiki/architecture/sitemap.md, docs/wiki/INDEX.md
---
[2026-04-30] docs: wiki-onderhoud-richtlijn toegevoegd aan INDEX.md — broncode-verificatie protocol, code-change→wiki mapping tabel, bekende valkuilen (ack_late, idempotency_keys, status='complete') | gewijzigd: docs/wiki/INDEX.md
---
[2026-04-30] docs: wiki-audit correcties — ADR-019 (idempotency_keys nooit aangemaakt, completed_count→completed), ADR-025 (run_playlist_job→process_playlist_video, RPC-naam fix, ack_late verwijderd), database-schema.md (transcription_jobs 8 ontbrekende kolommen, Fase 4 kolommen, saved_videos tabel, legacy-tabel sectie), playlist-engine.md (RPC 5→7 arg), credit-system.md (run_playlist_job referentie gefixed) | gewijzigd: docs/wiki/decisions/019-arq-job-queue.md, docs/wiki/decisions/025-per-video-decompositie.md, docs/wiki/architecture/database-schema.md, docs/wiki/architecture/playlist-engine.md, docs/wiki/architecture/credit-system.md
---
[2026-04-30] docs: ADR-030 Fase 4 crash-recovery leerervaring — wat gepland was, wat ontdekt werd (ack_late bestaat niet), wat wél gebouwd is (M1 credits_deducted, M2 heartbeat, B1 heartbeat-loop, B2 stale-detectie, M3 atomische RPC credits, uuid5 job-IDs), openstaande gaps (crashed retry-pass onzichtbaar, geen auto-refund, idempotency_keys nooit aangemaakt) | gewijzigd: docs/wiki/decisions/030-fase4-crash-recovery-leerervaring.md, docs/wiki/INDEX.md
---
[2026-04-30] docs: Fase 4 ack_late realiteit gedocumenteerd — ADR-019 herschreven, priorities.md taak 1.5+1.7 bijgewerkt, backlog job-continuation entry, known-issues refund-bevinding | gewijzigd: docs/wiki/decisions/019-arq-job-queue.md, docs/wiki/roadmap/priorities.md, docs/wiki/roadmap/backlog.md, docs/wiki/operations/known-issues.md
---
[2026-04-30] feat: WorkerSettings job_timeout=7200; ack_late niet beschikbaar in arq 0.28.0 — gedocumenteerd in code | gewijzigd: backend/worker.py
---
[2026-04-30] docs: credit-system.md + database-schema.md gecorrigeerd — user_credits tabel gedocumenteerd als canonieke balance, credit_transactions als audit-log, Fase 4 RPC credit-deductie sectie toegevoegd | gewijzigd: docs/wiki/architecture/credit-system.md, docs/wiki/architecture/database-schema.md
---
[2026-04-30] fix: HEARTBEAT_STALE_SECS 180→300 (5 missed heartbeats geeft marge voor event-loop blips) | gewijzigd: backend/main.py
---
[2026-04-30] feat: fase 4 B3 — main.py: PlaylistExtractRequest.video_metadata, /extract INSERT, stale-detectie GET /api/jobs + GET /api/playlist/jobs | gewijzigd: backend/main.py
---
[2026-04-30] feat: fase 4 B2 — worker.py idempotency + heartbeat + uuid5 + caption RPC credit-deductie | gewijzigd: backend/worker.py
---
[2026-04-30] feat: fase 4 B1 — transcription_pipeline.py heartbeat + credit-idempotency: _heartbeat_loop + _run_with_heartbeat helpers, heartbeat_fn parameter op do_assemblyai_transcription, stap 1 (download) + stap 6 (AssemblyAI) omhuld, credit_cost altijd berekend (ook deduct=False), credits_deducted best-effort write na deductie | gewijzigd: backend/transcription_pipeline.py
---
[2026-04-30] db: fase 4 migraties M1–M4 toegepast — transcription_jobs (credits_deducted + last_heartbeat_at), playlist_extraction_jobs (last_heartbeat_at + video_metadata), update_playlist_video_progress RPC uitgebreid met atomische credit-deductie (p_amount/p_reason, v_already_done idempotency), saved_videos tabel + RLS + index | gewijzigd: supabase/migrations/20260430_fase4_*.sql
---
[2026-04-30] test: taak 1.19b productiebewijs sessie 1 — members_only fail-fast (geen AI-toggle), no_captions met AI-suggestie v2 + refund disclaimer, no_speech end-to-end refund flow 140s/41min/42cr; ADR-029 volledig geverifieerd | gewijzigd: docs/wiki/operations/test-reports.md
---
[2026-04-30] feat: taak 1.19b — error messaging audit + AI-suggestie differentiatie — backend no_captions error_type fix, VideoTab structured error routing (error_type preserved, throw verwijderd), Whisper toggle blacklist voor age_restricted/members_only/youtube_restricted, bot_detection + no_captions render blocks v2, PlaylistTab mapBackendStatus no_captions + no_speech fix, failedOther filter (2×), PlaylistManager VideoStatus type + badge + progress bar + allDone check, error-taxonomy.md v2 messages alle 9 error_types | gewijzigd: backend/main.py, src/components/free-tool/VideoTab.tsx, src/components/free-tool/PlaylistTab.tsx, src/components/PlaylistManager.tsx, docs/wiki/operations/error-taxonomy.md
---
[2026-04-30 05:00] design: foundation V1.0 — OKLCH token systeem, IBM Plex fonts, data-theme ThemeProvider, alle 32 shadcn componenten gemigreerd, feature components + pagina's gemigreerd, support-pagina dark-only fixed, test-tokens pagina | gewijzigd: src/app/styles/tokens.css, src/app/globals.css, src/app/layout.tsx, tailwind.config.ts, src/components/ui/*, src/components/*, src/app/**
---
[2026-04-29] docs: cascade afsluiten + ADR-029 — caption extraction vs AI transcription als aparte producten; taak 1.6 ✅; taak 1.19b toegevoegd; ai-pipeline cascade-eind-sectie; error-taxonomy AI-suggestie kolom | gewijzigd: docs/wiki/decisions/029-caption-vs-ai-transcription-products.md, docs/wiki/INDEX.md, docs/wiki/roadmap/priorities.md, docs/wiki/architecture/ai-pipeline.md, docs/wiki/operations/error-taxonomy.md
---
[2026-04-29] test: cascade stap 1+2+3 orchestratie sessie 2 — vier scenario's getest (stap 1 succes ×2, MembersOnly fail-fast zonder stap 3, no_captions zonder stap 3); scheidings-logica geverifieerd in productie | gewijzigd: docs/wiki/operations/test-reports.md
---
[2026-04-29] feat: cascade stap 3 (tv/android client-rotatie) + stap 2 productiebewijs — extract_with_ytdlp clients-parameter + [YT-DLP-ROT] prefix, stap 2/3 try/except orchestratie in main.py + worker.py, MODEL_QUALITY_RANK youtube_captions_rotated=15, test-reports stap 1+2 sessie 1 toegevoegd, ADR-027 status bijgewerkt | gewijzigd: backend/youtube_utils.py, backend/main.py, backend/worker.py, backend/master_cache.py, docs/wiki/operations/test-reports.md, docs/wiki/roadmap/priorities.md, docs/wiki/architecture/ai-pipeline.md, docs/wiki/decisions/027-bgutil-deprioritization.md
---
[2026-04-29] feat: cascade stap 2 formaliseren — [YT-DLP] log-prefix in extract_with_ytdlp (attempting/success/no_captions/MembersOnly/error), MODEL_QUALITY_RANK youtube_captions 30→20, ai-pipeline.md cascade-sectie uitgebreid, priorities stap 2 ✅ | gewijzigd: backend/youtube_utils.py, backend/master_cache.py, docs/wiki/architecture/ai-pipeline.md, docs/wiki/roadmap/priorities.md
---
[2026-04-28] docs: frontend design audit — volledige inventarisatie (47 routes, 4 layouts, alle componenten, Tiptap subsectie, CSS var-systeem, dark mode status, hardcoded kleuren, icon library, form patterns, inconsistenties, 12 vragen voor redesign) | gewijzigd: docs/wiki/design/audit-frontend.md, docs/wiki/INDEX.md
---
[2026-04-28] fix: root logger Sentry-override — definitieve fix voor verdwijnende INFO logs; root logger stond op WARNING (level 30) ondanks basicConfig force=True omdat Sentry SDK root reset ná onze config; opgelost via logging.getLogger().setLevel(INFO) ná sentry_sdk.init(); debug-endpoints verwijderd; known-issues.md bijgewerkt met volledige root cause | gewijzigd: backend/main.py, backend/worker.py, docs/wiki/operations/known-issues.md
---
[2026-04-28] docs: data-collection-wishlist.md — PostHog event wishlist voor cascade-pad tracking, master cache hit/miss attribution, cost-tracking per extractie | gewijzigd: docs/wiki/operations/data-collection-wishlist.md
---
[2026-04-28] fix: basicConfig force=True — uvicorn overschrijft root logger vóór app start waardoor named loggers zonder setLevel op WARNING bleven; force=True zorgt dat alle loggers INFO erven van root | gewijzigd: backend/main.py, backend/worker.py, docs/wiki/operations/known-issues.md
---
[2026-04-28] feat: cascade stap 1 logging + ADR-012 pricing-evolutie — extract_via_youtube_transcript_api() per-exception INFO logging (RequestBlocked/IpBlocked/TranscriptsDisabled/NoTranscriptFound/VideoUnavailable/VideoUnplayable) + [YT-API] attempting prefix; ADR-012 pricing-evolutie sectie toegevoegd (premium-positionering + early-adopter strategie); priorities.md: stap 1 logging-notitie + 1.13 pre-uitvoering ADR-012 verwijzing | gewijzigd: backend/youtube_utils.py, docs/wiki/decisions/012-pricing-tiers.md, docs/wiki/roadmap/priorities.md
---
[2026-04-28] fix: caption-cache hardening + flush-script — CACHED_CAPTION_REQUIRED_KEYS frozenset in main.py; malformed entries geëvict bij eerste read (redis.delete + cache-miss fall-through); backend/scripts/flush_caption_cache.py (--dry-run, --yes flags); backend/.gitignore: scripts/ → specifieke exclusie zodat flush-script getrackt wordt; known-issues.md bijgewerkt | gewijzigd: backend/main.py, backend/scripts/flush_caption_cache.py, backend/.gitignore, docs/wiki/operations/known-issues.md
---
[2026-04-28] fix: KeyError 'title' bij cascade stap 1 succes (ADR-028) — YouTube Data API videos.list als metadata-bron na stap 1; get_video_details() uitgebreid met channel + upload_date; metadata-fetch failure → stap 1 weggooien + cascade naar stap 2; [YT-DATA-API quota exceeded] log-prefix; worker.py: YouTubeClient import + _yt_client singleton + zelfde metadata-patroon in _process_caption_video(); ADR-028 aangemaakt; 6 wiki-pagina's bijgewerkt (INDEX, priorities, known-issues, ai-pipeline, ADR-021, ADR-028) | gewijzigd: backend/youtube_client.py, backend/main.py, backend/worker.py, docs/wiki/decisions/028-youtube-data-api-metadata.md, docs/wiki/INDEX.md, docs/wiki/roadmap/priorities.md, docs/wiki/operations/known-issues.md, docs/wiki/architecture/ai-pipeline.md, docs/wiki/decisions/021-master-transcripts-cache.md
---
[2026-04-28] feat: taak 1.8 ✅ + 1.9 ✅ + cascade stap 1 (taak 1.6[~]) — R2 storage helper (backend/storage.py, boto3==1.42.97); master_transcripts schema (supabase/migrations/20260428_master_transcripts_cache.sql) + write helper (backend/master_cache.py: master_transcripts_write, CAPTION_REFRESH_DAYS=90, MODEL_QUALITY_RANK, CURRENT_PRODUCTION_AI_MODEL); youtube-transcript-api==1.2.4 cascade stap 1 (extract_via_youtube_transcript_api in youtube_utils.py, [YT-API] log prefix); cascade geïntegreerd in main.py /api/extract/youtube + worker.py _process_caption_video(); master cache write fire-and-forget via asyncio.create_task na elke succesvolle caption-extractie. Handmatig door Khidr: R2 buckets aanmaken + API tokens + Railway env vars (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) + Supabase migratie uitvoeren | gewijzigd: backend/storage.py, backend/master_cache.py, backend/youtube_utils.py, backend/worker.py, backend/main.py, backend/requirements.txt, supabase/migrations/20260428_master_transcripts_cache.sql, docs/wiki/roadmap/priorities.md, docs/wiki/architecture/database-schema.md, docs/wiki/operations/deployment.md, docs/wiki/decisions/021-master-transcripts-cache.md
---
[2026-04-28] refactor: Optie C — bgutil-pot + Deno volledig verwijderd (ADR-027); main.py: DENO_PATH blok + _start_bgutil_server() verwijderd; audio_utils.py: plugin_dirs + youtubepot-bgutilhttp uit ydl_opts; worker.py: _startup() bgutil health check verwijderd; youtube_utils.py + main.py: enabled_runtimes ['node','deno']→['node']; Dockerfile: bgutil COPY/chmod/mkdir/zip regels verwijderd; backend/bin/ verwijderd; ADR-027 aangemaakt + ADR-007 superseded; cascade taak 1.6 stap 3 = client-rotatie ipv PO-tokens; 7 wiki-pagina's bijgewerkt | gewijzigd: backend/main.py, backend/audio_utils.py, backend/worker.py, backend/youtube_utils.py, backend/Dockerfile, docs/wiki/decisions/027-bgutil-deprioritization.md, docs/wiki/decisions/007-bgutil-pot.md, docs/wiki/INDEX.md, docs/wiki/architecture/overview.md, docs/wiki/architecture/ai-pipeline.md, docs/wiki/operations/deployment.md, docs/wiki/operations/known-issues.md, docs/wiki/roadmap/priorities.md
---
[2026-04-28] feat: taak 1.5b ✅ — raw yt-dlp logging bij extraction_error geïmplementeerd; _classify_download_error() uitgebreid met video_id + job_id params + WARNING log op catch-all; 3 call sites bijgewerkt (transcription_pipeline.py:155, worker.py:255+389); bgutil startup logging debug→info/warning in main.py; worker bgutil health check bij startup (socket probe 127.0.0.1:4416) via WorkerSettings.on_startup; priorities.md + error-taxonomy.md bijgewerkt | gewijzigd: backend/transcription_pipeline.py, backend/worker.py, backend/main.py, docs/wiki/roadmap/priorities.md, docs/wiki/operations/error-taxonomy.md
---
[2026-04-28] docs: taak 1.5b — error-taxonomy.md aangemaakt met 9 error_types (bot_detection, youtube_restricted, age_restricted, members_only, timeout, extraction_error, no_captions, no_speech, insufficient_credits); retry-pass bot_detection ineffectiviteit gedocumenteerd (verified Fase 3b.3 logs); priorities.md bijgewerkt | gewijzigd: docs/wiki/operations/error-taxonomy.md, docs/wiki/roadmap/priorities.md, docs/wiki/operations/test-reports.md
---
[2026-04-28] feat: taak 1.5 fase 3b.3 ✅ — productie verificatie 22-video playlist (Joe Rogan); 18/22 succesvol in 295s; 45cr afgetrokken (30cr Whisper + 15cr captions); 4 failures YouTube-kant (2× bot_detection, 1× youtube_restricted, 1× extraction_error); architecture chain volledig gevalideerd | testrapport: docs/wiki/operations/test-reports.md
---
[2026-04-28] fix: taak 1.5 fase 3b.3 — AttributeError fix in /api/playlist/extract: variabele-naam-clash 'request' (Pydantic body vs FastAPI Request); http_request: Request toegevoegd als tweede parameter; http_request.app.state.arq_pool | gewijzigd: backend/main.py
---
[2026-04-28] feat: taak 1.5 fase 3b.2 ✅ — per-video chain refactor; youtube_utils.py + transcription_pipeline.py nieuw; worker.py: run_whisper_job → do_assemblyai_transcription wrapper + process_playlist_video + process_playlist_retries ARQ tasks; main.py: run_whisper_job + run_playlist_job + VTT helpers verwijderd; /api/playlist/extract → ARQ enqueue(_job_id="{playlist_id}:0"); upload-pad refactored naar do_assemblyai_transcription | gewijzigd: backend/youtube_utils.py, backend/transcription_pipeline.py, backend/worker.py, backend/main.py
---
[2026-04-28] fix: taak 1.5 fase 3b.1 ✅ — RPC-fix migratie applied via Supabase MCP; status 'completed'→'complete' in update_playlist_video_progress; geverifieerd: 1-video test-playlist bereikt status='complete' na success-call; test-rij opgeruimd | gewijzigd: supabase/migrations/20260428_playlist_progress_rpc_status_fix.sql
---
[2026-04-28] feat: taak 1.5 fase 3a ✅ — Supabase-laag voor per-video chain; last_progress_at kolom + partial index + update_playlist_video_progress RPC (idempotent, auto-completion); handmatig testscript aangemaakt; database-schema.md bijgewerkt | gewijzigd: supabase/migrations/20260428_playlist_per_video_chain.sql, supabase/migrations/20260428_playlist_per_video_chain__manual_test.sql, docs/wiki/architecture/database-schema.md
---
[2026-04-28] docs: ARQ research verwerkt — ADR-019 herzien (maintenance-mode, per-video architectuur, post-launch heroverweging); ADR-025 nieuw (per-video decompositie); ADR-026 nieuw (ARQ maintenance-mode acceptatie); priorities.md fase 3 fasenplan bijgewerkt + taak 3.11 toegevoegd | gewijzigd: docs/wiki/decisions/019-arq-job-queue.md, docs/wiki/decisions/025-per-video-decompositie.md, docs/wiki/decisions/026-arq-maintenance-mode-acceptatie.md, docs/wiki/roadmap/priorities.md, docs/wiki/INDEX.md
---
[2026-04-27] verificatie: taak 1.5 fase 2 ✅ — YouTube Whisper via worker bewezen (job 2c11e87d, 26.54s, bao5kiMmXoU, 2cr); upload-pad asyncio bewezen (job fea97ef1, 9.2s); 3 deploy-issues opgelost (UPSTASH_REDIS_URL op API, 8 env vars op worker, PROXY_PASSWORD mismatch); wiki bijgewerkt | gewijzigd: docs/wiki/roadmap/priorities.md, docs/wiki/decisions/019-arq-job-queue.md, docs/wiki/operations/deployment.md, docs/wiki/operations/known-issues.md
---
[2026-04-27] feat: taak 1.5 fase 1 ✅ — ARQ infra opgezet; arq==0.28.0 + redis==5.3.1 + hiredis==3.3.1 in requirements.txt; backend/worker.py (stub noop_task + WorkerSettings); Fase 0 TCP verificatie geslaagd | gewijzigd: backend/requirements.txt, backend/worker.py
---
[2026-04-27] fix: taak 1.4 [x] done — tijdelijke diagnostische logs verwijderd; logger.setLevel(INFO) permanent (uvicorn basicConfig gotcha); cross-user cache HIT op DZ6mNMS0HQ0 geverifieerd | gewijzigd: backend/main.py, docs/wiki/roadmap/priorities.md
---
[2026-04-27] feat: caption cache in Redis geïmplementeerd (taak 1.4) — upstash-redis==1.7.0; get_caption_redis() lazy init; cache key caption:{video_id}:en, TTL 30 dagen; PostHog events caption_cache_hit/miss/write_error; graceful degradatie als env vars afwezig | gewijzigd: backend/main.py, backend/requirements.txt, docs/wiki/roadmap/priorities.md
---
[2026-04-27] docs: taak 1.3 smart polling backoff [x] done — geverifieerd op 8-min AssemblyAI job | gewijzigd: docs/wiki/roadmap/priorities.md, docs/LOG.md
---
[2026-04-27] feat: smart polling backoff geïmplementeerd (taak 1.3) — getPollingInterval() in src/lib/pollingBackoff.ts (1s/5s/15s op 0-30s/30-300s/300s+); VideoTab pollWhisperJob + AudioTab runPollLoop op elapsed-based interval; PlaylistTab setInterval→recursive setTimeout | gewijzigd: src/lib/pollingBackoff.ts, src/components/free-tool/VideoTab.tsx, src/components/free-tool/AudioTab.tsx, src/components/free-tool/PlaylistTab.tsx
---
[2026-04-27] docs: taak 1.2 Sentry User Feedback gemarkeerd als [x] done — geverifieerd door Khidr | gewijzigd: docs/wiki/roadmap/priorities.md, docs/LOG.md
---
[2026-04-27] feat: Sentry User Feedback verplaatst naar /dashboard/account — SentryFeedbackCard client component in dashboard/settings/; dode /account pagina verwijderd; sentry-test routes (frontend + backend) opgeruimd | gewijzigd: src/components/dashboard/settings/SentryFeedbackCard.tsx, src/app/dashboard/account/page.tsx, backend/main.py, src/app/account/page.tsx (verwijderd), src/app/sentry-test/ (verwijderd), src/app/api/sentry-test/ (verwijderd)
---
[2026-04-26] fix: sentry-test pagina: hardcoded localhost:8000 vervangen door /api/sentry-test proxy (PYTHON_BACKEND_URL server-side) | gewijzigd: src/app/sentry-test/page.tsx, src/app/api/sentry-test/route.ts, docs/wiki/roadmap/priorities.md
---
[2026-04-26] feat: Sentry frontend + backend geïmplementeerd (taak 1.1) — @sentry/nextjs@10.50.0 + sentry-sdk[fastapi]==2.58.0; sentry.{client,server,edge}.config.ts aangemaakt; instrumentation.ts + instrumentation-client.ts aangemaakt; next.config.ts gewrapped met withSentryConfig; sentry init in backend/main.py vóór FastAPI(); /sentry-test endpoint + /sentry-test pagina toegevoegd | gewijzigd: next.config.ts, sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts, instrumentation.ts, instrumentation-client.ts, src/app/sentry-test/page.tsx, backend/main.py, backend/requirements.txt, package.json, docs/wiki/roadmap/priorities.md, docs/wiki/operations/known-issues.md
---
[2026-04-26] fix+refactor: audit-bevindingen geïmplementeerd — processing_method type uitgebreid met 'assemblyai' + PROCESSING_METHODS const; admin Whisper-query gefixed (.in); PostHog analytics whisper_ai→assemblyai; ADR-018 Optie A: formatTranscript.ts is nu single source of truth voor CSV/Markdown/TXT, inline logica TranscriptCard.tsx verwijderd; 6 dode component-bestanden verwijderd; backend/main.py: import json + duplicate extract_video_id + dead video_url assignment; 6 npm packages verwijderd + @tiptap/core/@tiptap/pm als directe deps; assemblyai==0.63.0 gepind | gewijzigd: src/types/transcript.ts, src/components/free-tool/VideoTab.tsx, src/app/admin/page.tsx, src/utils/formatTranscript.ts, src/components/TranscriptCard.tsx, backend/main.py, backend/requirements.txt, package.json, docs/AUDIT_REPORT_2026-04-26.md, docs/wiki/decisions/018-export-consolidation.md, docs/wiki/operations/known-issues.md
---
[2026-04-26] audit: AUDIT_REPORT_2026-04-26.md aangemaakt — knip + vulture + ruff + depcheck; bevindingen doorgeschreven naar known-issues.md (admin Whisper count bug, processing_method inconsistentie, assemblyai unpinned, 6 dode bestanden, export-duplicatie); ADR-018 aangemaakt; CODEBASE_AUDIT.md gemarkeerd als verouderd | gewijzigd: docs/AUDIT_REPORT_2026-04-26.md, docs/CODEBASE_AUDIT.md, docs/wiki/operations/known-issues.md, docs/wiki/decisions/018-export-consolidation.md, docs/wiki/INDEX.md, docs/LOG.md
---
[2026-04-26] docs: wiki bijgewerkt na sessie — processing_method 'whisper_ai'→'assemblyai' in database-schema.md; RAG JSON backlog-item verwijderd uit known-issues.md; channel/language propagatie toegevoegd aan ai-pipeline.md | gewijzigd: docs/wiki/architecture/database-schema.md, docs/wiki/architecture/ai-pipeline.md, docs/wiki/operations/known-issues.md
---
[2026-04-26] feat: channel + language in AssemblyAI job completion response — GET /api/jobs haalt channel/language op via transcript_id query; WhisperCompleteEvent + job type uitgebreid; handleWhisperSuccess + Pad B roepen setVideoChannel/setVideoLanguage aan | gewijzigd: backend/main.py, src/components/free-tool/VideoTab.tsx
---
[2026-04-26] fix: lastSuccessTimestampRef in handleWhisperSuccess — ontbrekende toewijzing toegevoegd vóór setUrl(""); voorkomt dat cooldown-check mislukt bij upsell pad; debug logs verwijderd | gewijzigd: src/components/free-tool/VideoTab.tsx, src/components/TranscriptCard.tsx
---
[2026-04-26] fix: videoId fallback in deductRagExportCreditsAction — als transcriptId undefined is, query server-side op video_id + processing_method='assemblyai' om transcript te resolven; TranscriptCard geeft videoId mee | gewijzigd: src/app/actions/rag-export.ts, src/components/TranscriptCard.tsx
---
[2026-04-25] fix: existingTranscriptId ref-guard — existingTranscriptIdRef.current gespiegeld naast state op alle 7 setExistingTranscriptId call sites; TranscriptCard transcriptId prop leest state ?? ref zodat RAG export altijd correcte id krijgt vóór render | gewijzigd: src/components/free-tool/VideoTab.tsx, src/components/TranscriptCard.tsx
---
[2026-04-25] fix: transcript_id race condition — WhisperCompleteEvent + pollWhisperJob geven transcript_id terug; handleWhisperSuccess gebruikt transcript_id direct; Pad B gebruikt event.transcript_id; setExistingTranscriptMethod 'whisper_ai'→'assemblyai' op Pad B | gewijzigd: src/components/free-tool/VideoTab.tsx
---
[2026-04-25] refactor: rag-export.ts dode code verwijderd — confirmExport param + rag_export_confirmed UPDATE verwijderd; downloadRagJsonFromLibraryAction verwijderd (geen importers); call sites bijgewerkt | gewijzigd: src/app/actions/rag-export.ts, src/components/TranscriptCard.tsx, src/components/library/TranscriptViewer.tsx
---
[2026-04-25] fix: refresh() verwijderd uit rag-export.ts — revalidatePath alleen is de correcte Next.js aanpak; refresh import + aanroep verwijderd | gewijzigd: src/app/actions/rag-export.ts
---
[2026-04-25] fix: processing_method mismatch VideoTab — 'whisper_ai' → 'assemblyai' op 4 plaatsen; existingTranscriptId vond nooit AssemblyAI rij waardoor rag_exports nooit werd geschreven | gewijzigd: src/components/free-tool/VideoTab.tsx
---
[2026-04-25] fix: channel + language in RAG JSON export library — TranscriptViewer accepteert nu language prop; page.tsx geeft channel + language door; buildRagJson bevat nu channel/language voor library-pad | gewijzigd: src/components/library/TranscriptViewer.tsx, src/app/dashboard/library/[id]/page.tsx, backend/audio_utils.py (uploader-or-channel fallback)
---
[2026-04-25] fix: library pagina force-dynamic — export const dynamic = 'force-dynamic' toegevoegd zodat rag_exports altijd vers zijn bij navigatie | gewijzigd: src/app/dashboard/library/[id]/page.tsx
---
[2026-04-25] fix: handleRagFirstExport UI-flits — setShowRagModal(false) vóór setLocalRagExports; refreshCredits fire-and-forget (geen await) | gewijzigd: src/components/library/TranscriptViewer.tsx
---
[2026-04-25] feat: channel + language opslaan in transcripts — AssemblyAI: extract_youtube_audio channel + lingua detector taal → INSERT; captions: channel/language via TranscriptMetadata → VideoTab → transcribe/page.tsx INSERT | gewijzigd: backend/main.py, src/types/transcript.ts, src/components/free-tool/VideoTab.tsx, src/app/dashboard/transcribe/page.tsx
---
[2026-04-25] feat: revalidatePath na RAG export — deductRagExportCreditsAction roept revalidatePath(/dashboard/library/{id}) aan na succesvolle rag_exports write | gewijzigd: src/app/actions/rag-export.ts
---
[2026-04-25] fix: AssemblyAI INSERT — channel_title en language verwijderd; kolommen bestaan niet in transcripts tabel; extract_youtube_audio retourneert nog steeds 3-tuple maar channel wordt genegeerd | gewijzigd: backend/main.py
---
[2026-04-25] refactor: chunk selector in TranscriptCard RAG modal — ragSelectedChunkSize state (init op profile.rag_chunk_size), 4-knops grid selector vervangt read-only label + settings-link, alreadyConfirmed shortcut verwijderd (modal altijd tonen) | gewijzigd: src/components/TranscriptCard.tsx
---
[2026-04-25] refactor: "Don't show again" verwijderd uit TranscriptCard en TranscriptViewer RAG modals — confirmExport altijd true, ragModalDontShowAgain/ragDontShowAgain state + checkbox verwijderd | gewijzigd: src/components/TranscriptCard.tsx, src/components/library/TranscriptViewer.tsx
---
[2026-04-25] refactor: reset-knop verwijderd uit DeveloperExportsCard + resetRagExportConfirmationAction verwijderd — "Export confirmation" sectie volledig weggehaald | gewijzigd: src/components/dashboard/settings/DeveloperExportsCard.tsx, src/app/actions/rag-export.ts
---
[2026-04-25] feat: channel en language opslaan bij AssemblyAI transcripties — extract_youtube_audio geeft nu ook channel (uploader) terug, lingua detector detecteert taal na whisper, INSERT bevat channel_title + language | gewijzigd: backend/audio_utils.py, backend/main.py
---
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
[2026-04-25 19:09] commit: feat: library RAG JSON export — eerste export met credits-modal + herexport met chunk selector
Changed: docs/LOG.md
src/app/dashboard/library/[id]/page.tsx
src/components/library/TranscriptViewer.tsx
---
[2026-04-25 19:24] precompact: context compaction triggered
[2026-04-25 19:34] commit: feat: RAG modal chunk selector + remove don't-show-again + channel/language fix in AssemblyAI
Changed: backend/audio_utils.py
backend/main.py
docs/LOG.md
docs/wiki/decisions/015-rag-json-export.md
src/app/actions/rag-export.ts
src/components/TranscriptCard.tsx
src/components/dashboard/settings/DeveloperExportsCard.tsx
src/components/free-tool/VideoTab.tsx
src/components/library/RagExportView.tsx
src/components/library/TranscriptViewer.tsx
---
[2026-04-25 19:53] commit: fix: AssemblyAI INSERT — channel_title/language kolommen bestaan niet, verwijderd uit INSERT
Changed: backend/main.py
docs/LOG.md
docs/wiki/decisions/015-rag-json-export.md
---
[2026-04-25 20:47] commit: fix: revalidatePath na RAG export + channel/language opslaan in transcripts (AssemblyAI + captions)
Changed: backend/main.py
docs/LOG.md
docs/wiki/architecture/database-schema.md
docs/wiki/decisions/015-rag-json-export.md
src/app/actions/rag-export.ts
src/app/dashboard/transcribe/page.tsx
src/components/free-tool/VideoTab.tsx
src/types/transcript.ts
---
[2026-04-25 21:12] commit: fix: library force-dynamic + RAG modal volgorde fix
Changed: docs/LOG.md
src/app/dashboard/library/[id]/page.tsx
src/components/library/TranscriptViewer.tsx
---
[2026-04-25 21:34] precompact: context compaction triggered
[2026-04-25 21:39] commit: fix: processing_method mismatch whisper_ai→assemblyai + channel/language in library RAG export
Changed: backend/audio_utils.py
docs/LOG.md
docs/wiki/decisions/015-rag-json-export.md
src/app/dashboard/library/[id]/page.tsx
src/components/free-tool/VideoTab.tsx
src/components/library/TranscriptViewer.tsx
---
[2026-04-25 22:16] commit: fix: verwijder refresh() en force-dynamic — revalidatePath alleen is correct
Changed: docs/LOG.md
docs/wiki/decisions/015-rag-json-export.md
src/app/dashboard/library/[id]/page.tsx
---
[2026-04-25 22:39] commit: fix: transcript_id race condition + dode code opruimen
Changed: docs/LOG.md
docs/wiki/decisions/015-rag-json-export.md
src/app/actions/rag-export.ts
src/components/TranscriptCard.tsx
src/components/free-tool/VideoTab.tsx
src/components/library/TranscriptViewer.tsx
---
[2026-04-25 23:14] commit: debug: RAG transcriptId logging
Changed: src/components/TranscriptCard.tsx
src/components/free-tool/VideoTab.tsx
---
[2026-04-25 23:28] commit: debug: PAD B transcriptId logging
Changed: src/components/free-tool/VideoTab.tsx
---
[2026-04-25 23:47] commit: fix: useRef guard voor existingTranscriptId race condition
Changed: docs/LOG.md
src/components/TranscriptCard.tsx
src/components/free-tool/VideoTab.tsx
---
[2026-04-26 00:17] commit: fix: videoId fallback in server action — resolveert transcript via video_id als transcriptId undefined is
Changed: docs/LOG.md
src/app/actions/rag-export.ts
src/components/TranscriptCard.tsx
src/components/free-tool/VideoTab.tsx
---
[2026-04-26 00:37] commit: fix: lastSuccessTimestampRef in handleWhisperSuccess + debug logs verwijderd

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
src/components/TranscriptCard.tsx
src/components/free-tool/VideoTab.tsx
---
[2026-04-26 00:38] commit: fix: lastSuccessTimestampRef in handleWhisperSuccess + debug logs verwijderd
Changed: docs/LOG.md
---
[2026-04-26 03:49] commit: feat: channel/language in AssemblyAI job completion response + VideoTab state
Changed: backend/main.py
docs/LOG.md
docs/wiki/decisions/015-rag-json-export.md
src/components/free-tool/VideoTab.tsx
---
[2026-04-26 03:51] precompact: context compaction triggered
[2026-04-26 03:59] commit: docs: wiki update — processing_method fix, RAG parking lot cleared, ai-pipeline channel/language
Changed: docs/wiki/architecture/ai-pipeline.md
docs/wiki/architecture/database-schema.md
docs/wiki/operations/known-issues.md
---
[2026-04-26 23:25] commit: feat(observability): add Sentry frontend + backend (taak 1.1)
Changed: backend/main.py
backend/requirements.txt
docs/.obsidian/workspace.json
docs/AUDIT_REPORT_2026-04-26.md
docs/CODEBASE_AUDIT.md
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/decisions/018-export-consolidation.md
docs/wiki/decisions/019-arq-job-queue.md
docs/wiki/decisions/020-cloudflare-r2-storage.md
docs/wiki/decisions/021-master-transcripts-cache.md
docs/wiki/decisions/022-realtime-plus-polling-fallback.md
docs/wiki/decisions/023-observability-stack.md
docs/wiki/decisions/024-anti-abuse-welcome-credits.md
docs/wiki/operations/known-issues.md
docs/wiki/roadmap/priorities.md
instrumentation-client.ts
instrumentation.ts
knip.json
next.config.ts
package-lock.json
package.json
sentry.client.config.ts
sentry.edge.config.ts
sentry.server.config.ts
src/app/admin/page.tsx
src/app/sentry-test/page.tsx
src/components/ConditionalHeader.tsx
src/components/HeroUIPreview.tsx
src/components/PlaylistAvailabilityModal.tsx
src/components/TranscriptCard.tsx
src/components/free-tool/VideoTab.tsx
src/components/library/CollectionPanel.tsx
src/components/library/LibraryTranscriptCard.tsx
src/components/library/StorageMeter.tsx
src/types/transcript.ts
src/utils/formatTranscript.ts
---
[2026-04-27 00:01] commit: fix(sentry-test): proxy via /api/sentry-test instead of hardcoded localhost
Changed: docs/.obsidian/workspace.json
docs/LOG.md
docs/wiki/roadmap/priorities.md
src/app/api/sentry-test/route.ts
src/app/sentry-test/page.tsx
---
[2026-04-27 00:08] commit: docs: markeer taak 1.1 Sentry als [x] done — geverifieerd door Khidr

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/roadmap/priorities.md
---
[2026-04-27 00:13] commit: feat(observability): Sentry User Feedback widget op account-settings (taak 1.2)

- feedbackIntegration({ autoInject: false }) toegevoegd aan sentry.client.config.ts
- Sentry.setUser() in account/page.tsx zodra sessie geladen is
- "Report a problem" card toegevoegd aan /account
- Dialog via createForm() → appendToDom() → open() (correcte @sentry/nextjs v10 API)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: sentry.client.config.ts
src/app/account/page.tsx
---
[2026-04-27 00:22] commit: feat(observability): verplaats Sentry feedback naar /dashboard/account + opruimen

- SentryFeedbackCard client component aangemaakt (settings/)
- Sentry.setUser() + Report a problem knop in /dashboard/account
- Dode /account pagina (reliek) verwijderd
- Sentry-test routes verwijderd: /sentry-test, /api/sentry-test, backend /sentry-test
- feedbackIntegration({ autoInject: false }) al in sentry.client.config.ts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/LOG.md
src/app/account/page.tsx
src/app/api/sentry-test/route.ts
src/app/dashboard/account/page.tsx
src/app/sentry-test/page.tsx
src/components/dashboard/settings/SentryFeedbackCard.tsx
---
[2026-04-27 00:34] commit: feat(polling): smart backoff — 1s→5s→15s op elapsed tijd (taak 1.3)

- getPollingInterval(elapsedSeconds) in src/lib/pollingBackoff.ts
- VideoTab pollWhisperJob: verwijdert vaste POLL_INTERVAL_MS, gebruikt elapsed-based interval
- AudioTab runPollLoop: zelfde aanpak
- PlaylistTab: setInterval vervangen door recursive setTimeout met backoff

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/roadmap/priorities.md
src/components/free-tool/AudioTab.tsx
src/components/free-tool/PlaylistTab.tsx
src/components/free-tool/VideoTab.tsx
src/lib/pollingBackoff.ts
---
[2026-04-27 00:44] commit: docs: markeer taak 1.3 smart polling backoff als [x] done — geverifieerd door Khidr

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/roadmap/priorities.md
---
[2026-04-27 00:49] commit: feat(cache): caption cache in Upstash Redis (taak 1.4)

- upstash-redis==1.7.0 toegevoegd aan requirements.txt
- get_caption_redis() lazy init — graceful degradatie als env vars afwezig
- Cache key: caption:{video_id}:en, TTL 30 dagen
- Cache read vóór yt-dlp call; write ná succesvolle extractie (best-effort)
- PostHog events: caption_cache_hit, caption_cache_miss, caption_cache_write_error
- Errors (MembersOnly, no captions) worden niet gecached

⚠️  Vereist UPSTASH_REDIS_REST_URL + _TOKEN in Railway env vars

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/requirements.txt
docs/LOG.md
docs/wiki/roadmap/priorities.md
---
[2026-04-27 01:40] commit: debug(cache): tijdelijke diagnostische logging voor taak 1.4 verificatie

- Log redis client initialisatie status + env var aanwezigheid
- Log cache_key vóór SET
- Log exception type expliciet bij cache write error

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
---
[2026-04-27 01:50] commit: fix(logging): logger.setLevel(INFO) op named logger — basicConfig is no-op onder uvicorn

logging.basicConfig() wordt genegeerd als uvicorn de root logger al heeft
geconfigureerd. Uvicorn zet root op WARNING, waardoor indxr-backend INFO
calls silent worden gefilterd. Expliciet setLevel op de named logger bypast dit.

Wiki monitoring.md bijgewerkt met uitleg om herhaling te voorkomen.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/wiki/operations/monitoring.md
---
[2026-04-27 02:43] commit: chore(cache): verwijder tijdelijke diagnostische logs — taak 1.4 [x] done

Cross-user cache HIT geverifieerd via tweede account: DZ6mNMS0HQ0
in <200ms, geen yt-dlp call. Diagnostische logs (redis client, env URL
set, about to SET key) verwijderd. Permanente logs (HIT/SET/write error)
en logger.setLevel(INFO) blijven.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/LOG.md
docs/wiki/roadmap/priorities.md
---
[2026-04-27 04:00] commit: feat(queue): ARQ infrastructure setup (taak 1.5 fase 1)
Changed: backend/requirements.txt
backend/worker.py
docs/.obsidian/workspace.json
docs/INBOX.md
docs/LOG.md
docs/wiki/architecture/overview.md
docs/wiki/decisions/019-arq-job-queue.md
docs/wiki/decisions/021-master-transcripts-cache.md
docs/wiki/operations/deployment.md
docs/wiki/roadmap/priorities.md
---
[2026-04-27 04:30] commit: feat(queue): Whisper YouTube → ARQ migration (taak 1.5 fase 2)
Changed: backend/main.py
backend/worker.py
docs/.obsidian/workspace.json
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/operations/deployment.md
docs/wiki/operations/known-issues.md
docs/wiki/roadmap/priorities.md
---
[2026-04-28 09:10] precompact: context compaction triggered
[2026-04-28 09:15] commit: feat: per-video playlist chain architecture (Fase 3a + 3b.1 + 3b.2)
Changed: backend/main.py
backend/transcription_pipeline.py
backend/worker.py
backend/youtube_utils.py
docs/.obsidian/workspace.json
docs/INBOX.md
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/database-schema.md
docs/wiki/architecture/playlist-engine.md
docs/wiki/decisions/019-arq-job-queue.md
docs/wiki/decisions/025-per-video-decompositie.md
docs/wiki/decisions/026-arq-maintenance-mode-acceptatie.md
docs/wiki/operations/deployment.md
docs/wiki/operations/known-issues.md
docs/wiki/roadmap/priorities.md
supabase/migrations/20260428_playlist_per_video_chain.sql
supabase/migrations/20260428_playlist_per_video_chain__manual_test.sql
supabase/migrations/20260428_playlist_progress_rpc_status_fix.sql
---
[2026-04-28 09:30] commit: fix: variable name clash in /api/playlist/extract (Fase 3b.3)
Changed: backend/main.py
docs/LOG.md
---
[2026-04-28 10:20] commit: docs: Fase 3b.3 testrapport + error taxonomy (taak 1.5b)
Changed: docs/.obsidian/workspace.json
docs/LOG.md
docs/wiki/operations/error-taxonomy.md
docs/wiki/operations/test-reports.md
docs/wiki/roadmap/priorities.md
---
[2026-04-28 10:26] commit: chore: ignore Obsidian UI state files
Changed: .gitignore
docs/.obsidian/workspace.json
---
[2026-04-28 11:20] commit: feat: taak 1.5b ✅ — raw yt-dlp logging + bgutil verificatie

- _classify_download_error(): optionele video_id + job_id params;
  WARNING log op catch-all extraction_error met raw error string
- 3 call sites bijgewerkt met context (transcription_pipeline + worker)
- main.py: bgutil startup logging debug→info/warning; INFO na Popen start
- worker.py: _startup() via WorkerSettings.on_startup — socket probe op
  127.0.0.1:4416 bij worker-start, logt of bgutil bereikbaar is of niet

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/transcription_pipeline.py
backend/worker.py
docs/LOG.md
docs/wiki/operations/error-taxonomy.md
docs/wiki/roadmap/priorities.md
---
[2026-04-28 11:46] commit: refactor: bgutil-pot + Deno volledig verwijderd — Optie C (ADR-027)

bgutil-pot was geconfigureerd op de API-container maar yt-dlp draait
op de worker-container (split via ADR-025). Nooit werkend in productie.
iOS client bypasses PO tokens — bgutil was onnodig.

Code:
- main.py: _start_bgutil_server() + DENO_PATH blok verwijderd
- audio_utils.py: plugin_dirs + youtubepot-bgutilhttp uit ydl_opts
- worker.py: _startup() bgutil health check verwijderd
- youtube_utils.py + main.py: enabled_runtimes ['node','deno']→['node']
- Dockerfile: bgutil COPY/chmod/mkdir/zip regels verwijderd
- backend/bin/: binary + zip verwijderd (directory weg)

Docs: ADR-027 aangemaakt, ADR-007 superseded, 7 wiki-pagina's bijgewerkt

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/Dockerfile
backend/audio_utils.py
backend/bin/bgutil-pot-linux-x86_64
backend/bin/bgutil-ytdlp-pot-provider-rs.zip
backend/main.py
backend/worker.py
backend/youtube_utils.py
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/architecture/overview.md
docs/wiki/decisions/007-bgutil-pot.md
docs/wiki/decisions/027-bgutil-deprioritization.md
docs/wiki/operations/deployment.md
docs/wiki/operations/known-issues.md
docs/wiki/roadmap/priorities.md
---
[2026-04-28 13:35] commit: feat: taak 1.8 + 1.9 + cascade stap 1 — R2 storage, master_transcripts cache, youtube-transcript-api

Taak 1.8: backend/storage.py — boto3 wrapper voor Cloudflare R2 met graceful degradatie
als env vars ontbreken (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).

Taak 1.9: supabase/migrations/20260428_master_transcripts_cache.sql + backend/master_cache.py.
Schema: video_id, language, transcription_model, r2_key, source_method, model_quality_rank,
character_count, word_count, fetched_from_provider_at, deprecated_at. Service-role only (RLS,
geen policies). master_transcripts_write() is best-effort fire-and-forget, nooit blocking.
Constanten: CAPTION_REFRESH_DAYS=90, MODEL_QUALITY_RANK, CURRENT_PRODUCTION_AI_MODEL.

Cascade stap 1 (taak 1.6): youtube-transcript-api==1.2.4 als eerste stap vóór yt-dlp.
extract_via_youtube_transcript_api() in youtube_utils.py — [YT-API] log prefix.
Geïntegreerd in main.py /api/extract/youtube (na Redis-miss) + worker.py _process_caption_video().
Na elke succesvolle extractie: asyncio.create_task(master_transcripts_write()) — non-blocking.

Handmatig door Khidr na push: Cloudflare R2 buckets aanmaken (indxr-audio + indxr-transcripts),
API tokens per bucket, lifecycle rule 24u op indxr-audio, Railway env vars zetten op beide
services, Supabase migratie uitvoeren via MCP.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/master_cache.py
backend/requirements.txt
backend/storage.py
backend/worker.py
backend/youtube_utils.py
docs/LOG.md
docs/wiki/architecture/database-schema.md
docs/wiki/decisions/021-master-transcripts-cache.md
docs/wiki/operations/deployment.md
docs/wiki/roadmap/priorities.md
supabase/migrations/20260428_master_transcripts_cache.sql
---
[2026-04-28 14:46] commit: fix: KeyError 'title' cascade stap 1 + ADR-028 — YouTube Data API metadata-aanvulling

youtube_client.get_video_details() uitgebreid met channel + upload_date.
Na stap 1 succes: videos.list aanroepen; bij failure → stap 1 weggooien,
cascade naar stap 2 (yt-dlp). [YT-DATA-API quota exceeded] log-prefix.
worker.py: _yt_client singleton + zelfde patroon in _process_caption_video().
ADR-028 aangemaakt met ToS-citatie + URL. 6 wiki-pagina's bijgewerkt.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/worker.py
backend/youtube_client.py
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/decisions/021-master-transcripts-cache.md
docs/wiki/decisions/028-youtube-data-api-metadata.md
docs/wiki/operations/known-issues.md
docs/wiki/roadmap/priorities.md
---
[2026-04-28 16:09] commit: fix: caption-cache hardening + flush-script voor malformed entries

CACHED_CAPTION_REQUIRED_KEYS frozenset in main.py; cache-read valideert
alle required keys na json.loads — bij missing keys: redis.delete() +
behandelen als cache-miss (geen crash, geen herhaalbare failure).
flush_caption_cache.py: SCAN caption:* + DEL met --dry-run / --yes flags.
backend/.gitignore: scripts/ verfijnd zodat het script getrackt wordt.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/.gitignore
backend/main.py
backend/scripts/flush_caption_cache.py
docs/LOG.md
docs/wiki/operations/known-issues.md
---
[2026-04-28 17:24] commit: feat: cascade stap 1 per-exception logging + ADR-012 pricing-evolutie

extract_via_youtube_transcript_api(): [YT-API] attempting prefix +
individuele except-blokken per type (RequestBlocked, IpBlocked,
TranscriptsDisabled, NoTranscriptFound, VideoUnavailable, VideoUnplayable)
elk met logger.info. Geen logica-wijzigingen.
ADR-012: nieuwe sectie pricing-evolutie en early-adopter strategie.
priorities.md: logging-notitie stap 1 + pre-uitvoering verwijzing 1.13.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/youtube_utils.py
docs/LOG.md
docs/wiki/decisions/012-pricing-tiers.md
docs/wiki/roadmap/priorities.md
---
[2026-04-28 17:56] commit: fix: basicConfig force=True — uvicorn root logger override

logging.basicConfig() is een silent no-op als de root logger al handlers
heeft. Uvicorn registreert eigen handlers vóór app start, waardoor named
loggers zonder expliciete setLevel() van uvicorn root (WARNING) erfden
in plaats van onze geconfigureerde INFO root.

force=True toegevoegd in main.py en worker.py zodat alle named loggers
(indxr-youtube-utils, indxr-backend, etc.) correct INFO erven van root.
known-issues.md bijgewerkt met root cause + fix.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/worker.py
docs/LOG.md
docs/wiki/operations/known-issues.md
---
[2026-04-28 18:00] commit: docs: data-collection wishlist voor PostHog events + cost-tracking

Nieuwe wiki-pagina met wishlist voor toekomstige data-verzameling:
cascade-pad tracking per extractie (welke stap slaagde + latency),
master cache hit/miss attribution (moat-groei zichtbaar maken), en
cost-tracking per extractie (input voor taak 2.5 cost-report).

Geen ADR, geen taak — vindbaar bij implementatie van taak 2.5 en 2.6.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/data-collection-wishlist.md
---
[2026-04-28 23:03] commit: DEBUG: temporary diagnostic endpoints

/api/debug/loggers — runtime logger state (level, handlers, propagate)
/api/debug/trace-cascade-step1/{video_id} — force-triggers extract_via_youtube_transcript_api with logger + print tracing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
---
[2026-04-28 23:16] precompact: context compaction triggered
[2026-04-28 23:21] commit: fix: root logger Sentry-override — definitieve logging fix

Root cause bewezen via /api/debug/loggers: root logger level 30 (WARNING)
ondanks basicConfig force=True. Sentry SDK reset root ná onze basicConfig call.

Fix: logging.getLogger().setLevel(INFO) toegevoegd ná sentry_sdk.init() in
main.py en worker.py. Debug-endpoints verwijderd — diagnose voltooid.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/worker.py
docs/LOG.md
docs/wiki/operations/known-issues.md
---
[2026-04-29 16:30] commit: feat: cascade stap 2 formaliseren + quality rank fix

[YT-DLP] logging toegevoegd aan extract_with_ytdlp: attempting/success,
no_captions voor alle 3 silent return-paths, MembersOnly (beide varianten),
en prefix op VTT retry warnings + generic error. Consistent met [YT-API] patroon.

MODEL_QUALITY_RANK youtube_captions 30 → 20: yt-dlp captions zijn iets
minder schoon dan youtube-transcript-api output. Master cache write was al
aanwezig voor stap 2 in main.py + worker.py — geen wijzigingen nodig daar.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/master_cache.py
backend/youtube_utils.py
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/roadmap/priorities.md
---
[2026-04-29 21:19] commit: feat: cascade stap 3 (tv/android client-rotatie) + stap 2 productiebewijs

extract_with_ytdlp krijgt clients-parameter met default ['ios', 'web_embedded'];
log-prefix dynamisch: [YT-DLP] voor stap 2, [YT-DLP-ROT] voor stap 3.
player_client nu expliciet ingesteld in ydl_opts (was impliciet default).

Cascade-orchestratie in main.py + worker.py: stap 2 gewrapped in try/except;
MembersOnlyVideoError re-raist direct (structureel, stap 3 helpt niet);
return {} (no_captions) triggert stap 3 ook niet; alleen extraction errors
gaan door naar stap 3 (tv/android). MODEL_QUALITY_RANK youtube_captions_rotated=15.

Test-rapport sessie 2026-04-29 toegevoegd: vier scenario's bewezen in productie.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/master_cache.py
backend/worker.py
backend/youtube_utils.py
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/decisions/027-bgutil-deprioritization.md
docs/wiki/operations/test-reports.md
docs/wiki/roadmap/priorities.md
---
[2026-04-29 21:43] commit: test: cascade stap 1+2+3 orchestratie sessie 2 — productiebewijs

Vier scenario's geverifieerd: stap 1 succes ×2, MembersOnly fail-fast
(stap 3 correct overgeslagen), no_captions fail-fast (stap 3 correct
overgeslagen). Scheidings-logica bewezen via negative-test.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/test-reports.md
---
[2026-04-29 22:06] commit: docs: cascade afsluiten + ADR-029 + taak 1.19b

ADR-029: caption extraction (gratis, stap 1-3) en AI transcription
(betaald, user-gestuurd) zijn aparte producten. Stap 4+5 uit de
originele roadmap vervallen als automatische cascade-stappen.

Taak 1.6 gesloten ✅. Taak 1.19b toegevoegd: error messaging audit
+ AI-suggestie differentiatie per error_type. error-taxonomy.md
uitgebreid met "AI-suggestie?" kolom. ai-pipeline.md: sectie
"cascade-eind zonder succes" toegevoegd.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/decisions/029-caption-vs-ai-transcription-products.md
docs/wiki/operations/error-taxonomy.md
docs/wiki/roadmap/priorities.md
---
[2026-04-29 23:55] commit: design: foundation — OKLCH tokens, IBM Plex fonts, data-theme ThemeProvider

- New src/app/styles/tokens.css: full OKLCH color scale (light + dark),
  typography, radius, shadow, motion tokens via @theme inline
- globals.css: imports tokens.css, removes old hex/Shadcn vars, updates
  base layer (focus-visible, reduced-motion, font-feature-settings)
  Updates prose-content + ts-link utilities to new token names
- layout.tsx: Geist → IBM Plex Sans (variable) + IBM Plex Mono (static);
  ThemeProvider attribute="class" → attribute="data-theme"
- tailwind.config.ts: strips deprecated fontFamily + borderRadius extensions

Colors are broken until Commit 2 migrates shadcn components to new tokens.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/globals.css
src/app/layout.tsx
src/app/styles/tokens.css
tailwind.config.ts
---
[2026-04-29 23:55] precompact: context compaction triggered
[2026-04-30 00:05] commit: design: shadcn UI component token migratie naar OKLCH systeem

Alle 32 componenten in src/components/ui/ gemigreerd van Shadcn-tokens
(bg-card, text-muted-foreground, bg-primary, etc.) en oude custom vars
(var(--color-error), var(--bg-elevated), etc.) naar het nieuwe semantische
OKLCH token systeem. Sidebar aliases toegevoegd aan tokens.css.
Build geverifieerd.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/dashboard/layout.tsx
src/app/styles/tokens.css
src/components/ui/PasswordInput.tsx
src/components/ui/alert-dialog.tsx
src/components/ui/alert.tsx
src/components/ui/avatar.tsx
src/components/ui/badge.tsx
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/checkbox.tsx
src/components/ui/command.tsx
src/components/ui/credit-balance.tsx
src/components/ui/dialog.tsx
src/components/ui/dropdown-menu.tsx
src/components/ui/empty-state.tsx
src/components/ui/form.tsx
src/components/ui/input.tsx
src/components/ui/loading-skeleton.tsx
src/components/ui/pricing-card.tsx
src/components/ui/progress.tsx
src/components/ui/scroll-area.tsx
src/components/ui/select.tsx
src/components/ui/sheet.tsx
src/components/ui/sidebar.tsx
src/components/ui/skeleton.tsx
src/components/ui/slider.tsx
src/components/ui/sonner.tsx
src/components/ui/switch.tsx
src/components/ui/table.tsx
src/components/ui/tabs.tsx
src/components/ui/theme-toggle.tsx
src/components/ui/tooltip.tsx
---
[2026-04-30 00:09] commit: design: feature components + pagina's naar OKLCH token systeem

Alle feature-componenten (Header, UserAvatar, AuthModal, Footer, etc.)
en pagina's gemigreerd van hardcoded zinc/white/red/green/yellow klassen
en oude CSS vars naar het nieuwe semantische OKLCH token systeem.
Support-pagina fixed (was dark-only). Build geverifieerd.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/(marketing)/page.tsx
src/app/account/credits/page.tsx
src/app/admin/credits/page.tsx
src/app/admin/layout.tsx
src/app/admin/page.tsx
src/app/admin/paid-users/page.tsx
src/app/admin/transcripts/TranscriptDeleteButton.tsx
src/app/admin/transcripts/[id]/page.tsx
src/app/admin/transcripts/page.tsx
src/app/admin/users/UsersTable.tsx
src/app/admin/users/page.tsx
src/app/dashboard/account/page.tsx
src/app/dashboard/billing/cancel/page.tsx
src/app/dashboard/billing/page.tsx
src/app/dashboard/billing/success/page.tsx
src/app/dashboard/library/[id]/page.tsx
src/app/dashboard/library/page.tsx
src/app/dashboard/page.tsx
src/app/dashboard/settings/page.tsx
src/app/dashboard/transcribe/page.tsx
src/app/faq/page.tsx
src/app/forgot-password/page.tsx
src/app/login/page.tsx
src/app/onboarding/page.tsx
src/app/pricing/page.tsx
src/app/signup/page.tsx
src/app/support/page.tsx
src/app/suspended/page.tsx
src/app/youtube-to-text/page.tsx
src/app/youtube-transcript-generator/page.tsx
src/components/AuthModal.tsx
src/components/CreditBalance.tsx
src/components/FeatureCard.tsx
src/components/Footer.tsx
src/components/Header.tsx
src/components/HeroImage.tsx
src/components/PlaylistAvailabilitySummary.tsx
src/components/PlaylistManager.tsx
src/components/SaveErrorModal.tsx
src/components/TranscriptCard.tsx
src/components/UserAvatar.tsx
src/components/app-sidebar.tsx
src/components/content/AuthorCard.tsx
src/components/content/templates/ArticleTemplate.tsx
src/components/content/templates/ToolPageTemplate.tsx
src/components/content/templates/TutorialTemplate.tsx
src/components/dashboard/WelcomeCreditCard.tsx
src/components/dashboard/settings/DeveloperExportsCard.tsx
src/components/dashboard/settings/ProfileSettingsCard.tsx
src/components/dashboard/settings/SecuritySettingsCard.tsx
src/components/dashboard/settings/TransactionHistoryCard.tsx
src/components/free-tool/AudioTab.tsx
src/components/free-tool/PlaylistTab.tsx
src/components/free-tool/VideoTab.tsx
src/components/library/AiSummaryView.tsx
src/components/library/RagExportView.tsx
src/components/library/TranscriptList.tsx
src/components/library/TranscriptViewer.tsx
---
[2026-04-30 00:10] commit: design: test-tokens pagina + token cleanup verificatie

Nieuwe /test-tokens route met kleur-swatches, typografie-schaal,
radius/shadow demos, button variants en semantische state voorbeelden.
Grep-verificatie: 0 resterende oude token-namen in src/.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/test-tokens/page.tsx
---
[2026-04-30 00:10] commit: docs: wiki maintenance — design system V1.0 gedocumenteerd

INDEX.md bijgewerkt met design sectie (principles, system.md, tokens.css).
LOG.md entry toegevoegd voor foundation V1.0 implementatie.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/INDEX.md
---
[2026-04-30 01:11] commit: fix: null-safe library search filter
Changed: src/app/dashboard/library/page.tsx
---
[2026-04-30 01:13] commit: docs: design wiki bestanden + LOG.md update

audit-frontend.md, principles-v0.1-final.md, system.md en research-batch
bestanden gecommit. LOG.md bijgewerkt met foundation V1.0 entry.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/design/audit-frontend.md
docs/wiki/design/principles-v0.1-final.md
docs/wiki/design/research/README.md
docs/wiki/design/research/batch-1-foundation.md
docs/wiki/design/research/batch-2-architecture.md
docs/wiki/design/research/batch-3a-ia-naming.md
docs/wiki/design/research/batch-3b-ux-aesthetic.md
docs/wiki/design/system.md
docs/wiki/design/working-sessions/README.md
---
[2026-04-30 01:45] precompact: context compaction triggered
[2026-04-30 06:27] commit: feat: taak 1.19b — error messaging audit + AI-suggestie differentiatie

- backend/main.py: +error_type="no_captions" aan no_captions ExtractResponse
- VideoTab: error_type bewaard (throw verwijderd), structured routing voor
  alle 9 error_types, Whisper toggle verborgen voor blacklisted types,
  bot_detection + no_captions render blocks met v2 messages
- PlaylistTab: mapBackendStatus no_captions case toegevoegd, no_speech_detected
  → no_speech fix, failedOther filter +no_captions (2×)
- PlaylistManager: VideoStatus type +no_captions, badge + progress bar +
  allDone terminal-status check bijgewerkt
- error-taxonomy.md: v2 user-facing messages voor alle 9 error_types

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/LOG.md
docs/wiki/operations/error-taxonomy.md
src/components/PlaylistManager.tsx
src/components/free-tool/PlaylistTab.tsx
src/components/free-tool/VideoTab.tsx
---
[2026-04-30 06:45] commit: test: taak 1.19b productiebewijs sessie 1 — drie scenario's geverifieerd

members_only fail-fast (geen AI-toggle), no_captions met v2 foutbox +
AI-suggestie + refund disclaimer, no_speech end-to-end flow
(yt-dlp→ffmpeg→AssemblyAI→refund 2670→2628→2670, 140s/41min).
ADR-029 volledig in productie geverifieerd.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/test-reports.md
---
[2026-04-30 07:57] precompact: context compaction triggered
[2026-04-30 08:07] commit: db: fase 4 migraties M1–M4 — idempotency + heartbeat + saved_videos

M1: transcription_jobs — credits_deducted (idempotency vlag voor ack_late) + last_heartbeat_at
M2: playlist_extraction_jobs — last_heartbeat_at + video_metadata JSONB
M3: update_playlist_video_progress RPC — p_amount + p_reason parameters; atomische
    credit-deductie (UPDATE user_credits + INSERT credit_transactions) beschermd door
    v_already_done; oude 5-arg overload gedropped
M4: saved_videos tabel — RLS (eigen rijen), idx_saved_videos_user_id, ON DELETE CASCADE

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
supabase/migrations/20260430_fase4_playlist_extraction_jobs.sql
supabase/migrations/20260430_fase4_saved_videos.sql
supabase/migrations/20260430_fase4_transcription_jobs.sql
supabase/migrations/20260430_fase4_update_playlist_progress_rpc.sql
---
[2026-04-30 08:24] commit: feat: fase 4 B1 — heartbeat + credit-idempotency in transcription_pipeline

- _heartbeat_loop: tikt elke 60s via asyncio.create_task, swallowed exceptions
- _run_with_heartbeat: wrapper die heartbeat-task start + cancelt; no-op als heartbeat_fn=None
- do_assemblyai_transcription: heartbeat_fn=None parameter toegevoegd
- Stap 1 (yt-dlp download) omhuld met _run_with_heartbeat
- Stap 4: credit_cost = calculate_credit_cost(duration) buiten if-block; altijd
  beschikbaar in return-waarden ook als deduct_credits_on_success=False
- Stap 4: credits_deducted=True best-effort wegschrijven naar transcription_jobs
  direct na succesvolle deductie — B2 (worker) leest dit bij ack_late-restart
- Stap 6 (AssemblyAI-call) omhuld met _run_with_heartbeat

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/transcription_pipeline.py
docs/LOG.md
---
[2026-04-30 08:30] commit: feat: fase 4 B2 — worker.py idempotency + heartbeat + uuid5 + RPC credit-deductie

run_whisper_job:
- Leest credits_deducted uit transcription_jobs vóór pipeline-call
- Fail-safe default: bij Supabase read-fout → already_deducted=True + WARNING
  (liever één gratis transcriptie dan dubbele aftrek bij ack_late-retry)
- Heartbeat-closure _hb schrijft last_heartbeat_at op transcription_jobs elke 60s

process_playlist_video + process_playlist_retries (Whisper-tak):
- uuid5(WHISPER_NS, "{playlist_id}:{video_id}") geeft deterministisch whisper_job_id
- Upsert transcription_jobs met ignore_duplicates=True (idempotent bij replay)
- Zelfde fail-safe idempotency-check als run_whisper_job
- Heartbeat-closure schrijft naar playlist_extraction_jobs (stale-detectie voor poll-endpoint)
- Geeft job_id, deduct_credits_on_success, heartbeat_fn door aan pipeline

_process_caption_video:
- heartbeat_fn parameter; yt-dlp cascade (stap 2 + 3) via _run_with_heartbeat
- deduct_credits call verwijderd — deductie zit nu atomisch in de RPC (M3)
- Return-type uitgebreid naar 4-tuple: (success, transcript_id, error_type, credit_amount)
- credit_amount = 0 if is_free else 1

_call_progress_rpc:
- amount: int = 0 parameter toegevoegd → p_amount in RPC-params
- Alle callers geven rpc_credit_amount door

Imports: uuid, datetime/timezone, _run_with_heartbeat toegevoegd; deduct_credits verwijderd.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/worker.py
docs/LOG.md
---
[2026-04-30 08:35] commit: feat: fase 4 B3 — main.py: video_metadata + stale-detectie poll-endpoints

PlaylistExtractRequest:
- video_metadata: Optional[dict] = {} — structuur {video_id: {title, duration, thumbnail}}
  Wordt bij aanmaak weggeschreven naar playlist_extraction_jobs.video_metadata (M2-kolom).
  Wrap-up UI gebruikt dit om gefaalde videos bij naam te tonen (F2).

/api/playlist/extract:
- 'video_metadata': request.video_metadata or {} toegevoegd aan INSERT

GET /api/jobs/{job_id} + GET /api/playlist/jobs/{job_id} — stale-detectie:
- Als status='running' EN last_heartbeat_at IS NOT NULL EN age > HEARTBEAT_STALE_SECS (180s):
  UPDATE status='interrupted', return geüpdatete staat aan frontend
- NULL heartbeat → check overgeslagen. Reden: legacy running jobs vóór Fase 4 deploy hebben
  geen heartbeat-writer gehad; we weten niet of ze echt gestopt zijn. False-positive
  (running → interrupted terwijl worker nog draait) is erger dan false-negative.
- Side-effect in poll-GET is opzettelijk: geen aparte cron/background-service.
  Implicatie: unpolled jobs blijven op 'running' — acceptabel omdat gestoorde jobs
  alleen relevant zijn als de gebruiker ze ziet (en de frontend altijd pollt).

HEARTBEAT_STALE_SECS = 180 als module-constante bovenaan.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/LOG.md
---
[2026-04-30 08:45] commit: fix: HEARTBEAT_STALE_SECS 180 → 300 (5 missed heartbeats)

3 missed heartbeats (180s) geeft te weinig marge bij incidentele event-loop
blips of Supabase write-haperingen. 5 missed (300s) is veiliger zonder de
detectie-tijd onacceptabel lang te maken.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/LOG.md
---
[2026-04-30 08:47] commit: docs: corrigeer credit-system.md + database-schema.md (Fase 4)

credit-system.md:
- Database Schema sectie: user_credits tabel (canonieke balance) gedocumenteerd;
  credit_transactions gecorrigeerd van "Credits = SUM(amount)" naar audit-log rol
- Atomic Deduction: stap 2 gecorrigeerd van "SUM(amount)" naar "user_credits.credits";
  stap 3 verduidelijkt: beide mutaties (UPDATE user_credits + INSERT credit_transactions)
  in één transactie
- Nieuwe sectie: "Playlist Caption Deductie via RPC (Fase 4)" — uitleg van atomische
  deductie via update_playlist_video_progress, idempotency via v_already_done,
  verschil Whisper-pad (credits_deducted vlag) vs caption-pad (RPC)

database-schema.md:
- user_credits tabel toegevoegd (tussen credit_transactions en playlist_extraction_jobs)
- credit_transactions header gecorrigeerd: "Credits = SUM(amount)" verwijderd, audit-log
  rol verduidelijkt, type kolom toegevoegd
- update_playlist_video_progress RPC: Fase 4 parameters (p_amount, p_reason) gedocumenteerd

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/architecture/credit-system.md
docs/wiki/architecture/database-schema.md
---
[2026-04-30 08:47] commit: feat: WorkerSettings job_timeout=7200 + ack_late bevinding gedocumenteerd

job_timeout = 7200 (2 uur):
- ARQ default is 300s — te kort voor lange Whisper-jobs (4-uur video ≈ 30 min)
  en playlist-jobs met 100+ videos.
- job_timeout IS ondersteund in arq 0.28.0 (Worker.__init__ parameter, default 300).

ack_late — NIET geïmplementeerd, reden gedocumenteerd in code:
- ack_late bestaat niet in arq 0.28.0, ook niet in eerdere versies.
  Het is een Celery-concept zonder equivalent in arq.
- Jobs worden in arq altijd geacknowledged bij pickup; bij worker-crash
  verdwijnt de job uit de queue zonder automatische retry.
- De idempotency-vlaggen (credits_deducted, v_already_done) zijn live
  en beschermen bij handmatige herstart, maar niet bij crash.
- Echte crash-recovery vereist een custom retry-mechanisme buiten arq scope.
- requirements.txt blijft op arq==0.28.0 (geen upgrade zonder expliciete opdracht).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/worker.py
docs/LOG.md
---
[2026-04-30 08:59] precompact: context compaction triggered
[2026-04-30 09:03] commit: docs: Fase 4 eerlijke documentatie — ack_late bestaat niet, crash-recovery paden in backlog

ADR-019 herschreven: ack_late-sectie vervangen door eerlijke analyse van wat Fase 4 wél
en niet heeft opgeleverd. Drie paden naar echte crash-recovery gedocumenteerd (watchdog,
Resume-knop, library-swap). priorities.md taak 1.7 bijgewerkt van [todo] naar [~] met
accurate scope. Backlog: nieuw "Job continuation na crash" item onder Stabiliteit.
known-issues: Railway restart sectie bijgewerkt met refund-bevinding en tijdelijke workaround.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/decisions/019-arq-job-queue.md
docs/wiki/operations/known-issues.md
docs/wiki/roadmap/backlog.md
docs/wiki/roadmap/priorities.md
---
[2026-04-30 17:34] precompact: context compaction triggered
[2026-04-30 17:37] commit: docs: ADR-030 Fase 4 crash-recovery leerervaring + wiki-onderhoud-richtlijn

Nieuwe ADR-030: volledige documentatie van de Fase 4 leerervaring —
ack_late bestaat niet in ARQ 0.28.0, wat wél gebouwd is (credits_deducted,
heartbeat, atomische RPC credit-deductie, uuid5 job-IDs), openstaande gaps
(crashed retry-pass onzichtbaar, geen auto-refund, idempotency_keys nooit
aangemaakt in productie).

INDEX.md: ADR-030 toegevoegd aan beslissingentabel + wiki-onderhoud-richtlijn
(broncode-verificatie protocol, code-change→wiki mapping, bekende valkuilen).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/wiki/INDEX.md
docs/wiki/decisions/030-fase4-crash-recovery-leerervaring.md
---
[2026-04-30 17:37] commit: docs: wiki-audit correcties — broncode is de waarheid

ADR-019: idempotency_keys als nooit geïmplementeerd gemarkeerd, completed_count
→ completed/failed, ack_late referentie vervangen door ADR-030 verwijzing.

ADR-025: run_playlist_job → process_playlist_video/process_playlist_retries,
update_playlist_video_result → update_playlist_video_progress RPC, ack_late
claim verwijderd, video_results type gecorrigeerd ({} niet []).

database-schema.md: transcription_jobs 8 ontbrekende kolommen toegevoegd,
BIGINT fix, 'interrupted' status, Fase 4 kolommen (credits_deducted,
last_heartbeat_at, video_metadata), saved_videos tabel, legacy-tabellen sectie,
migration chronologie compleet.

playlist-engine.md: update_playlist_video_progress RPC 5→7 args (p_amount,
p_reason voor Fase 4 atomische credit-deductie).

credit-system.md: run_playlist_job referentie → process_playlist_video.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/wiki/architecture/credit-system.md
docs/wiki/architecture/database-schema.md
docs/wiki/architecture/playlist-engine.md
docs/wiki/decisions/019-arq-job-queue.md
docs/wiki/decisions/025-per-video-decompositie.md
---
[2026-04-30 17:38] commit: docs: LOG.md — drie Fase 4 documentatie-taken gelogd

ADR-030 aanmaak, wiki-audit correcties (vijf bestanden), en
wiki-onderhoud-richtlijn toevoeging aan INDEX.md.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
---
[2026-04-30 17:57] commit: feat: batch A+B — redirects + docs config

301 redirects: /faq → /docs/faq, /account/credits → /dashboard/account,
/how-it-works → /. New src/lib/docs-config.ts with full SEO article
mapping across 7 sections (Getting started, Transcribe, Export,
Workflows, Compare, Account, FAQ) + findPageInDocs helper.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: next.config.ts
src/lib/docs-config.ts
---
[2026-04-30 18:00] commit: feat: batch C — DocsShell + /docs pages + template updates

New components: DocsSidebar (collapsible sections, active highlight,
search placeholder) + DocsShell (sidebar + breadcrumb layout).
New routes: /docs, /docs/getting-started, /docs/faq, /docs/account.
ArticleTemplate, ToolPageTemplate, TutorialTemplate now wrapped in
DocsShell — all 30+ SEO articles gain docs sidebar automatically.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/docs/account/page.tsx
src/app/docs/faq/page.tsx
src/app/docs/getting-started/page.tsx
src/app/docs/page.tsx
src/components/content/templates/ArticleTemplate.tsx
src/components/content/templates/ToolPageTemplate.tsx
src/components/content/templates/TutorialTemplate.tsx
src/components/docs/DocsShell.tsx
src/components/docs/DocsSidebar.tsx
---
[2026-04-30 18:01] commit: feat: batch D — marketing header update

Nav: remove Transcribe/How-It-Works/FAQ links. Add Pricing + Docs +
"Try it free" button (accent styled, links to /youtube-transcript-generator).
Right side: rename Sign Up → Start free, Log In → Log in.
Mobile sheet: same restructure.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/Header.tsx
---
[2026-04-30 18:03] commit: feat: batch E — dashboard sidebar update

Nav items: Overview→Home (Home icon), Transcribe (AudioLines icon),
Messages (Inbox icon) replacing Credits. Library icon BookOpen→Library.
Credits coin display (CircleDollarSign placeholder) persistent above
footer nav, shows live balance from useAuth. Footer: Account + Settings.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/app-sidebar.tsx
---
[2026-04-30 18:04] commit: feat: batch F — mobile tab bar + layout padding

New MobileTabBar: 4 tabs (Home/Transcribe/Library/Messages) with active
state, amber accent border-top, Messages unread badge support. Renders
only on <md via md:hidden. Dashboard layout adds safe-area-aware bottom
padding to prevent content hiding behind tab bar.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/dashboard/layout.tsx
src/components/dashboard/MobileTabBar.tsx
---
[2026-04-30 18:05] commit: feat: batch G — dashboard Home redesign (5 sections)

Label: Overview → Home. Sections: credits balance + Buy more,
Transcribe CTA, last messages preview (mock data, TODO backend hookup),
recent transcripts (3, live from Supabase), library stats (count +
collections). Uses get_credit_balance RPC for live credit count.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/dashboard/page.tsx
---
[2026-04-30 18:07] commit: feat: batch H — Messages page (/dashboard/messages)

Two-column desktop layout (list left, detail right), single-column
mobile with back nav. 5 mock messages (Khidr sender). Actions:
mark-read on click, archive per message, mark-all-read. Unread badge
in header. TODO comments for backend API hookup.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/dashboard/messages/MessagesClient.tsx
src/app/dashboard/messages/page.tsx
---
[2026-04-30 18:08] precompact: context compaction triggered
[2026-04-30 18:10] commit: feat: batch I+J+K — support, onboarding, suspended pages

Support: two-card entry (help / suggestion) + contact form with
category state, confirmation linking to Messages inbox. TODO for
POST /api/support backend.

Onboarding: updated welcome copy, 25 credits mention, step-by-step
checklist on left panel. KHIDR placeholder for first-run wizard.

Suspended: rewritten as neutral "Account paused" — no emoji, no
punitive language, KHIDR placeholder for contact details.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/onboarding/page.tsx
src/app/support/page.tsx
src/app/suspended/page.tsx
---
[2026-04-30 18:12] commit: feat: batch L — footer + docs interlinking

Footer: renamed "Guides" → "Learn" column, added /docs,
/docs/getting-started, /docs/faq, /support links. Removed /how-it-works.
Bottom bar: replaced "How It Works" with "Docs" + "Support" links.

Transcribe page: added "Learn more →" link to /docs in page subtitle.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/dashboard/transcribe/page.tsx
src/components/Footer.tsx
---
[2026-04-30 18:15] commit: docs: batch M — wiki audit + sitemap.md + INDEX update

New: docs/wiki/architecture/sitemap.md — post-refactor source of
truth for all routes, navigation, redirects, and scope boundaries.

Updated: INDEX.md — sitemap.md added to Architecture table, new
"Recente structurele wijzigingen" section documenting the 2026-04-30
refactor (redirects, label changes, new routes, new components).

Audit corrections:
- audit-frontend.md: /faq and /how-it-works marked as redirected,
  /dashboard updated to "Home" description, /dashboard/messages and
  /docs/* sections added
- INDXR-SITEMAP.md: post-refactor warning header added
- marketing.md: /how-it-works marked as 301 redirect
- INDXR-WRITING-FRAMEWORK.md: /how-it-works → /docs/getting-started,
  /faq → /docs/faq in interlinking tables

LOG.md: grondverf sessie 2 entry appended.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/sitemap.md
docs/wiki/business/INDXR-SITEMAP.md
docs/wiki/business/INDXR-WRITING-FRAMEWORK.md
docs/wiki/business/marketing.md
docs/wiki/design/audit-frontend.md
---
[2026-05-01 01:54] commit: feat: wegklik-bescherming dichten + Whisper session resume (Spoor 1)

AudioTab: beforeunload handler toegevoegd terwijl isTranscribing === true
(met e.returnValue='' voor cross-browser support). Ontbrak volledig.

PlaylistTab: e.returnValue='' toegevoegd aan bestaande beforeunload handler
voor consistente cross-browser werking.

VideoTab: sessionStorage resume voor Whisper polling — schrijft {jobId,
videoId, title, duration, startTime} bij job-start, leest op mount en
toont resume-banner als job nog loopt. handleVideoResume() herstelt
polling + timer. Network-disconnect bewaart sessie voor volgende reload.
Beide Whisper-paden (confirm + upsell) gedekt.

Naamgeving: "Whisper" → "AI" in PlaylistManager badge,
"Whisper video" → "video requiring AI transcription" in PlaylistTab
foutmelding.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/PlaylistManager.tsx
src/components/free-tool/AudioTab.tsx
src/components/free-tool/PlaylistTab.tsx
src/components/free-tool/VideoTab.tsx
---
[2026-05-01 01:55] precompact: context compaction triggered
[2026-05-01 01:58] commit: feat: spoor 2 — upload progress UI in AudioTab

Replaced fetch() with XMLHttpRequest to get byte-level upload events.
uploadPhase ('idle' | 'uploading' | 'processing') drives three distinct UI
states: Shadcn Progress bar with formatBytes label during upload, spinner
with elapsed timer during server processing, plain button at rest.
Phase resets in both catch and runPollLoop finally blocks.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/free-tool/AudioTab.tsx
---
[2026-05-01 02:00] commit: feat: spoor 3a — TranscriptionProgress 4-step stepper + ETA

New src/lib/eta.ts: calcEta() and formatElapsed() using TRANSCRIPTION_RATIO=0.1.
New src/components/transcription/TranscriptionProgress.tsx: step list with
done/active/pending states, elapsed counter, and ETA label in one reusable component.
AudioTab uses it in the 'processing' upload phase; VideoTab replaces its inline
status span with the same component, passing videoDuration for ETA calculation.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/free-tool/AudioTab.tsx
src/components/free-tool/VideoTab.tsx
src/components/transcription/TranscriptionProgress.tsx
src/lib/eta.ts
---
[2026-05-01 02:03] commit: feat: spoor 3b — per-video AI transcription feedback in playlist

PlaylistTab tracks whisperVideoIds (Set) and persists to sessionStorage
(whisperIds key), restores on resume. Passed to PlaylistManager as new prop.

PlaylistManager: when a video is 'extracting' AND in whisperVideoIds, renders
a pulsing heartbeat dot + "Transcribing with AI" label instead of the generic
spinner; shows elapsed timer (font-mono) next to the video duration.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/PlaylistManager.tsx
src/components/free-tool/PlaylistTab.tsx
---
[2026-05-01 02:04] commit: feat: spoor 4 — partial completion wrap-up in playlist banner

Completion banner now shows:
- Free video count badge with explanatory label
- Failed video list (no_captions + no_speech) with thumbnails, title, and
  failure type badge; scrollable when >4 entries
- Disabled "Save failed videos for later" button (placeholder, coming soon)

All derived from existing videoStatuses + playlist.entries — no new props needed.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/PlaylistManager.tsx
---
[2026-05-01 02:06] commit: feat: spoor 5 — persistent active jobs indicator in sidebar

New ActiveJobsIndicator component reads sessionStorage for all three job
keys (audio, video, playlist), verifies each is still running against
existing job endpoints, and renders a pulsing accent dot with count above
the credits coin in the sidebar. Checks every 30s and cleans up stale
sessionStorage entries automatically. Hidden when no jobs are active.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/app-sidebar.tsx
src/components/dashboard/ActiveJobsIndicator.tsx
---
[2026-05-01 02:07] commit: docs: LOG.md bijgewerkt met 6 spoor-entries (progress-UX upgrade)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
---
[2026-05-01 03:18] precompact: context compaction triggered
[2026-05-01 03:24] commit: fix+feat: video resume-banner bug fix + UX herontwerp + indicator verplaatst

Stap 3 — fix: catch-block behoudt sessionStorage key bij netwerk-exceptie
(bijv. Vercel→Railway cold-start). Verwijdert key alleen bij 401/403/404.

Stap 4 — feat: Resume-banner herontworpen. Geen Dismiss-knop. Auto-resume
na 5 seconden met CSS progressbalk op de knop (scaleX 0→1, linear).
aria-live="polite" op banner-container; clearTimeout bij klik + unmount.

Stap 5 — refactor: ActiveJobsIndicator verplaatst van sidebar naar
transcribe-pagina boven de tab-rij.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
src/app/dashboard/transcribe/page.tsx
src/components/app-sidebar.tsx
src/components/free-tool/VideoTab.tsx
---
[2026-05-01 03:25] commit: docs: LOG.md bijgewerkt na fix+feat commit (stap 3+4+5)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
---
[2026-05-01 16:10] commit: feat: resume-banner uitgebreid naar PlaylistTab en AudioTab

Exact hetzelfde patroon als VideoTab (commit f241882):
- resumeBarActive state + autoResumeRef + auto-countdown useEffect (5s)
- Geen Dismiss-knop; alleen Resume met scaleX 0→1 progressbalk
- aria-live="polite" op banner container
- Fout-afhandeling: 401/403/404 verwijdert key; 5xx/netwerk-exception
  toont banner optimistisch (Resume re-pollt status zelf)
- clearTimeout bij klik op Resume en bij unmount

Geverifieerd (Playwright, productie-build, page.route mock):
- VideoTab: ✅ banner, countdown, klik-cancel, geen Dismiss
- AudioTab: ✅ banner, countdown, klik-cancel, geen Dismiss
- PlaylistTab: ✅ banner, countdown, klik-cancel, geen Dismiss

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
src/components/free-tool/AudioTab.tsx
src/components/free-tool/PlaylistTab.tsx
---
[2026-05-01 16:10] commit: docs: LOG.md bijgewerkt na resume-banner commit (PlaylistTab + AudioTab)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
---
[2026-05-01 18:06] precompact: context compaction triggered
[2026-05-01 18:09] commit: fix: yt-dlp partial-write retry + session-rotatie per attempt (ADR-031)

Root cause: 'bytes read, N more expected' matchte niet op retry-keywords
→ else: break na 1 poging. Plus: retry hergebruikte zelfde dode proxy-IP.

Fix A — keyword: 'bytes read'/'more expected' triggert nu outer retry-loop.
Fix B — session-rotatie: transcription_pipeline bouwt proxy_urls lijst met
  {base_sid}-r{1..3} zodat elke attempt een vers Decodo exit-IP gebruikt.
Fix C — retries=3 in ydl_opts: sneller falen op dood proxy-IP zodat outer
  retry eerder vuurt (was default 10, ~5 minuten verspilling).

Nieuw: partial_write error-type in _classify_download_error.
Backward-compat: proxy_url= callers werken ongewijzigd.

Geverifieerd: 11 unit tests groen — trigger, proxy-rotatie,
backward-compat, members-only guard, keyword matching.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/audio_utils.py
backend/test_audio_retry.py
backend/transcription_pipeline.py
docs/INVESTIGATION-yt-dlp-partial-write.md
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/decisions/031-yt-dlp-audio-retry-strategy.md
docs/wiki/operations/error-taxonomy.md
docs/wiki/operations/known-issues.md
---
[2026-05-01 18:09] commit: chore: verwijder INVESTIGATION-doc na merge ADR-031

Tijdelijk onderzoeksdocument — bevindingen zijn opgenomen in ADR-031
en error-taxonomy. Na merge verwijderd per spec.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/INVESTIGATION-yt-dlp-partial-write.md
---
[2026-05-01 19:09] commit: db: migration watchdog_attempts kolom op beide job-tabellen

Voegt watchdog_attempts INTEGER DEFAULT 0 toe aan transcription_jobs
en playlist_extraction_jobs. Gebruikt door watchdog_interrupted_jobs()
in worker.py om max-1-re-enqueue en auto-refund te bewaken.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: supabase/migrations/20260501_watchdog_attempts.sql
---
[2026-05-01 19:09] commit: feat: watchdog ARQ cron voor crash-recovery van interrupted jobs (taak 1.7)

watchdog_interrupted_jobs() draait elke 2 minuten als ARQ cron.

Pass 1 — re-enqueue (attempts=0):
  Selecteert transcription_jobs/playlist_extraction_jobs met status=interrupted,
  credits_deducted=True, geen transcript, aangemaakt <24u geleden, heartbeat stale.
  Verwijdert arq Redis-keys (ADR-030 Exp 3b) en enqueued opnieuw met dezelfde
  _job_id zodat idempotency-vlaggen dubbele credit-aftrek voorkomen.
  Reset status naar pending/running + watchdog_attempts=1.

Pass 2 — auto-refund (attempts>=1, ouder dan 24u):
  Als ook de re-enqueue crashte: credits terugboeken via add_credits(),
  status naar error + error_type=watchdog_permanent_failure.
  Alleen transcription_jobs (playlist-credits zijn per-video atomisch in RPC).

WorkerSettings: cron_jobs toegevoegd + watchdog opgenomen in functions.
7 unit tests: re-enqueue, idempotentie, Gap 1, playlist video_index, auto-refund.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/test_watchdog.py
backend/worker.py
---
[2026-05-01 19:10] commit: feat: master_transcripts_read() — cache read-logic (taak 1.11)

master_cache.py uitgebreid met master_transcripts_read(video_id, source_method, language).

Caption-pad: filtert op source_method='caption_extraction', deprecated_at IS NULL,
fetched_from_provider_at > NOW() - 90d. language='en' als default bij callers —
non-EN content mist de cache en valt door naar yt-dlp cascade (backlog item).

AI-pad: filtert op source_method='audio_transcription', model_quality_rank >=
CURRENT_PRODUCTION_AI_MODEL rank. Geen language-filter — AssemblyAI detecteert
de taal en de caller kent die niet vooraf.

Bij cache-hit: fetcht transcript JSON van R2 via r2_read_json, retourneert dict
met transcript, duration_seconds, language, transcription_model.
Bij R2-miss op bestaande DB-rij: logt warning, behandelt als miss.
Nooit raises — alle fouten zijn cache-misses.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/master_cache.py
---
[2026-05-01 19:11] commit: feat: master_transcripts cache read in /api/extract/youtube (taak 1.11)

Warm-path check na Redis-miss, vóór yt-dlp cascade stap 1.
language='en' default — non-EN content valt door naar cascade (backlog).
Bij cache-hit: metadata via YouTube Data API (1 quota-unit), Redis backfill,
ExtractResponse teruggeven zonder yt-dlp round-trip.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
---
[2026-05-01 19:12] commit: feat: master_transcripts cache read in worker.py (taak 1.11)

_process_caption_video: cache check vóór yt-dlp cascade.
Bij hit: transcript uit R2 direct in transcripts-tabel, skip yt-dlp.
language='en' default — non-EN content valt door naar cascade (backlog).

run_whisper_job: cache check vóór audio-download + AssemblyAI.
Bij hit: transcript uit R2, deduct_credits(), job→complete, return.
Geen language-filter (AssemblyAI detecteert taal, onbekend vooraf).
Gebruiker betaalt altijd bij cache-hit (ADR-021).

7 unit tests: hit, miss, R2-miss, AI, low-rank, Supabase-exc, R2-exc.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/test_master_cache.py
backend/worker.py
---
[2026-05-01 19:12] precompact: context compaction triggered
[2026-05-01 19:26] commit: feat: Supabase Realtime + polling fallback via useJobStatus hook (taak 1.10)

RLS verified: transcription_jobs USING (auth.uid() = user_id) blocks cross-user events.
New hook src/hooks/useJobStatus.ts: postgres_changes subscription (primary) + backoff
polling loop (fallback/data source). Both paths share handlers; done-guard prevents
double-firing. VideoTab, AudioTab, PlaylistTab refactored to use hook — pollWhisperJob,
runPollLoop, startPollInterval removed.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/free-tool/AudioTab.tsx
src/components/free-tool/PlaylistTab.tsx
src/components/free-tool/VideoTab.tsx
src/hooks/useJobStatus.ts
---
[2026-05-01 19:27] commit: docs: wiki + LOG bijgewerkt na taak 1.7 + 1.10 + 1.11

priorities.md: 1.7 [x] watchdog live, 1.10 [x] Realtime hook, 1.11 [x] cache read.
known-issues: Railway restart sectie bijgewerkt — watchdog live, resterende gap gedocumenteerd.
backlog: language-aware caption cache-implicatie toegevoegd.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/known-issues.md
docs/wiki/roadmap/backlog.md
docs/wiki/roadmap/priorities.md
---
[2026-05-02 00:18] precompact: context compaction triggered
---
[2026-05-02 01:45] fix: watchdog Pass 2 refund binnen ~10 min, schrap 24u-pad | gewijzigd: backend/worker.py, backend/test_watchdog.py, src/components/free-tool/VideoTab.tsx, src/components/free-tool/AudioTab.tsx, src/components/free-tool/PlaylistTab.tsx, docs/wiki/decisions/030-fase4-crash-recovery-leerervaring.md, docs/wiki/operations/error-taxonomy.md
[2026-05-02 00:21] commit: fix: watchdog refund binnen ~10 min + schrap 24u-pad (ADR-030 Gap 2)
---
[2026-05-02 02:00] supabase (productie): migratie watchdog_attempts gedraaid — watchdog_attempts INTEGER DEFAULT 0 toegevoegd aan transcription_jobs + playlist_extraction_jobs | buiten Git
---
[2026-05-02 02:00] supabase (productie): Realtime publicatie — transcription_jobs + playlist_extraction_jobs toegevoegd aan supabase_realtime publication; REPLICA IDENTITY FULL gezet op beide tabellen | buiten Git
---
[2026-05-02 02:00] docs: priorities.md 1.7 Pass 2-beschrijving gecorrigeerd (24u-pad → heartbeat stale ~10 min)

Pass 2 triggert nu op stale heartbeat (>5 min) in plaats van job-age >24u.
Frontend detecteert watchdog_permanent_failure op mount en toont inline
dismissable notice (geen Resume-banner). Tests bijgewerkt (2 nieuwe).
error-taxonomy.md: watchdog_permanent_failure toegevoegd.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/test_watchdog.py
backend/worker.py
docs/LOG.md
docs/wiki/decisions/030-fase4-crash-recovery-leerervaring.md
docs/wiki/operations/error-taxonomy.md
src/components/free-tool/AudioTab.tsx
src/components/free-tool/PlaylistTab.tsx
src/components/free-tool/VideoTab.tsx
---
[2026-05-02 00:24] commit: docs: supabase migratie + realtime publicatie gelogd; priorities.md 1.7 gecorrigeerd

watchdog_attempts migratie gedraaid op productie (2026-05-02).
Realtime publicatie + REPLICA IDENTITY FULL gezet op beide job-tabellen.
priorities.md: Pass 2-beschrijving corrigeert '24u-pad' naar 'heartbeat stale ~10 min'.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/roadmap/priorities.md
---
[2026-05-02 04:01] commit: feat: language_utils.normalize_language_code + langcodes dependency

Centralises all language code normalisation (yt-dlp, YouTube Data API,
AssemblyAI lingua detection) through a single helper that always returns
ISO 639-1 lowercase two-letter codes (en, nl, ar, ...) or None.

Prerequisite for language-aware master cache lookups (Fix 1).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/language_utils.py
backend/requirements.txt
backend/test_language_utils.py
---
[2026-05-02 04:01] commit: fix: normalise yt-dlp language via normalize_language_code in youtube_utils

Replaces raw [:2].lower() with the canonical normalizer for both yt-dlp
info.language and lingua-detected language paths.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/youtube_utils.py
---
[2026-05-02 04:02] commit: feat: add language field to youtube_client.get_video_details

Returns snippet.defaultAudioLanguage (or defaultLanguage fallback) from
the YouTube Data API snippet. Already-fetched part — zero extra quota units.
Used by language-aware master cache lookups in main.py and worker.py.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/youtube_client.py
---
[2026-05-02 04:04] commit: fix: language-aware master cache lookup in /api/extract/youtube (caption path)

- Hoists get_video_details call to before master cache read; result is
  reused for cascade metadata enrichment (zero extra quota units, ADR-028)
- Redis cache key drops ':en' suffix — language lives in stored value
- master_transcripts_read now uses normalised language from YouTube Data API
- Falls back to cascade on quota exhaustion or unknown language (no regression)
- Normalises language via normalize_language_code before master cache write

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
---
[2026-05-02 04:05] commit: fix: language-aware master cache lookup in _process_caption_video (playlist path)

- Hoists get_video_details before master cache read; result reused for
  cascade enrichment (same quota behaviour as main.py fix)
- master_transcripts_read now uses normalised language from YouTube Data API
- Cache write normalises language via normalize_language_code
- Also includes language in cache-hit transcript title (was hardcoded video_id)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/worker.py
---
[2026-05-02 04:05] commit: fix: normalise lingua-detected language in transcription_pipeline.py

Wraps lingua's iso_code_639_1.name.lower() through normalize_language_code()
before writing to transcripts.language (Whisper + Audio Upload paths).
Already canonical format — this makes the pipeline consistent and future-proof.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/transcription_pipeline.py
---
[2026-05-02 04:06] commit: feat: RPC sets retry_pending status when retryable failures exist (ADR-030 Gap 1)

update_playlist_video_progress now sets status='retry_pending' (instead of
'complete') when completion reveals bot_detection or timeout failures.
Returns should_retry in payload so worker can decide without re-reading.
process_playlist_retries will set status='complete' when done.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: supabase/migrations/20260502_playlist_retry_pending_status.sql
---
[2026-05-02 04:06] commit: feat: process_playlist_retries sets status=complete on finish (ADR-030 Gap 1)

- Updates heartbeat at start so watchdog can detect a stale retry-pass
- Sets status='complete' + completed_at at end of retry pass (success or
  all-failed) — previously the RPC set this on last video, now it's here
- Handles early-return case (no eligible videos) with same status update

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/worker.py
---
[2026-05-02 04:07] commit: fix: watchdog Pass 1b detects crashed retry-pass via retry_pending status

ADR-030 Gap 1 fix:
- Query now includes 'retry_pending' alongside 'interrupted' for Pass 1b
- 'retry_pending' + stale heartbeat → re-enqueue process_playlist_retries
- 'retry_pending' + fresh heartbeat → skip (retry-pass still running)
- 'interrupted' handling unchanged; stale-check applied explicitly since
  retry_pending rows bypass the SQL filter

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/worker.py
---
[2026-05-02 04:08] commit: feat: PlaylistTab handles retry_pending status (ADR-030 Gap 1 frontend)

- _handlePlaylistUpdate shows "Retrying failed videos..." when status=retry_pending
- Mount-check: retry_pending auto-resumes without a Resume banner (no user
  action needed — retry-pass runs automatically in the background)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/components/free-tool/PlaylistTab.tsx
---
[2026-05-02 04:11] commit: test: update test_watchdog + add test_playlist_retry_pending

test_watchdog.py:
- Add status + last_heartbeat_at fields to _make_playlist_job
- Add .in_() to chain mock (query now uses .in_() for Pass 1b)
- Rename test_playlist_gap1_skipped → test_playlist_interrupted_all_done_skipped

test_playlist_retry_pending.py (new):
- retry_pending + stale heartbeat → re-enqueue process_playlist_retries
- retry_pending + None heartbeat → re-enqueue
- retry_pending + fresh heartbeat → skip
- no eligible videos → _set_complete called (smoke test)

All 43 backend tests green.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/test_playlist_retry_pending.py
backend/test_watchdog.py
---
[2026-05-02 04:15] commit: docs: wiki + LOG — language-aware cache fix + ADR-030 Gap 1 opgelost

- ADR-021: language-aware cache lookup sectie toegevoegd
- ADR-030: Gap 1 gemarkeerd opgelost ✅ met samenvatting
- ADR-032: nieuw — retry_pending status architectuur
- INDEX.md: ADR-032 rij toegevoegd
- backlog.md: language-aware caption sectie afgevinkt + beperking gedocumenteerd
- error-taxonomy.md: job-status waarden tabel toegevoegd (retry_pending)
- LOG.md: 3 entries voor 2026-05-02 commits

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/decisions/021-master-transcripts-cache.md
docs/wiki/decisions/030-fase4-crash-recovery-leerervaring.md
docs/wiki/decisions/032-retry-pending-status.md
docs/wiki/operations/error-taxonomy.md
docs/wiki/roadmap/backlog.md
---
[2026-05-02 04:27] precompact: context compaction triggered
[2026-05-02 04:52] commit: docs: supabase migratie + truncate productie-acties gelogd
Changed: docs/LOG.md
---
[2026-05-02 13:51] commit: fix: watchdog Pass 1a kolom-fix video_id → video_url in transcription_jobs query

Pass 1a selecteerde een niet-bestaande kolom video_id; de juiste kolomnaam is video_url.
Productie-logs toonden elke 2 min: "column transcription_jobs.video_id does not exist".

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/test_watchdog.py
backend/worker.py
docs/LOG.md
---
[2026-05-02 14:02] commit: fix: watchdog Pass 1a title kolom-fix + video_url → video_id extractie

`title` bestaat niet als kolom op transcription_jobs — verwijderd uit .select().
`run_whisper_job` verwacht `video_id` (YouTube-ID), niet `video_url` (volledige URL).
Watchdog extraheert nu video_id via urllib.parse.parse_qs voor de enqueue-call.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/test_watchdog.py
backend/worker.py
docs/LOG.md
---
[2026-05-02 14:11] commit: docs: test-reports.md productie-tests 2026-05-02 toegevoegd

Sessie-entry voor meertalige cache (NL cache hit bewezen), retry_pending flow
(Joe Rogan 20-video playlist, Gap 1 gesloten), en watchdog Pass 1a bugfix context.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/test-reports.md
---
[2026-05-02 15:03] commit: fix: Sentry observability audit — capture_exception + context-enrichment

Vult de volledige observability gap: nergens in de codebase werd
sentry_sdk.capture_exception() aangeroepen, waardoor structurele bugs
(SQL-failures, crashes in de watchdog, financial errors) nooit in Sentry
verschenen.

Backend:
- worker.py: watchdog passes 1a/1b/2 — alle 6 catch-blokken gecaptured
  met push_scope tags (task_name, pass, job_id, user_id, refund_amount)
- worker.py: process_playlist_video, process_playlist_retries, enqueue_next,
  _call_progress_rpc — structurele catches + gefilterde caption catches
  (bot_detection/timeout/members_only/no_captions worden bewust niet gecaptured)
- main.py: 8 endpoint catches — extract, playlist_info, video_metadata, JWT,
  credit_balance, DeepSeek API, summarize outer, playlist job creation
- transcription_pipeline.py: import sentry_sdk + top-level catch, refund
  failure, audio download (gefilterd)
- youtube_utils.py: import sentry_sdk + add_breadcrumb in cascade (geen
  capture_exception — re-raise naar caller voorkomt duplicaten)

Frontend:
- 5 API routes: api/extract, api/stripe/webhook, api/ai/summarize,
  api/transcribe/preflight, api/playlist/info — Sentry import +
  captureException in alle catch-blokken

Inclusief tijdelijke force-error tests (worker.py Pass 1a, main.py
get_video_metadata, api/extract) — verwijder na verificatie in Sentry.

monitoring.md: Sentry-sectie toegevoegd met capture-pattern, tags-overzicht,
en lijst van bewust niet-gecapturde uitzonderingen.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/transcription_pipeline.py
backend/worker.py
backend/youtube_utils.py
docs/LOG.md
docs/wiki/operations/monitoring.md
src/app/api/ai/summarize/route.ts
src/app/api/extract/route.ts
src/app/api/playlist/info/route.ts
src/app/api/stripe/webhook/route.ts
src/app/api/transcribe/preflight/route.ts
---
[2026-05-02 15:37] commit: fix: remove Sentry force-error tests

Alle drie tijdelijke force-errors verwijderd na verificatie:
- backend/worker.py Pass 1a: ✅ bevestigd (INDXR-BACKEND-14+15 in Sentry)
- backend/main.py get_video_metadata: verwijderd (niet getriggerd)
- src/app/api/extract/route.ts: verwijderd (frontend Sentry capture
  niet bevestigd — zie known-issues.md voor open issue NEXT_PUBLIC_SENTRY_DSN)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/worker.py
docs/LOG.md
src/app/api/extract/route.ts
---
[2026-05-02 15:37] commit: docs: Sentry audit — test-reports + known-issues bijgewerkt

test-reports.md: sessie-entry Sentry observability audit 2026-05-02
- worker watchdog Pass 1a: ✅ 2 events + email alert, tags correct
- frontend api/extract: ❌ event niet ontvangen ondanks 503-respons
- main.py get_video_metadata: niet getriggerd; flow gedocumenteerd
  (VideoTab.tsx:525 → /api/video/metadata/[videoId] → Python GET)
- Onderzoek 1: primaire hypothese NEXT_PUBLIC_SENTRY_DSN ontbreekt op Vercel
- Onderzoek 2: get_video_metadata trigger = Single Video → extractie → metadatafetch

known-issues.md: open issue "Frontend Sentry capture niet bevestigd"
- Verificatiestap + fix beschreven
- Notitie: /api/video/metadata/[videoId]/route.ts nog niet geïnstrumenteerd

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/known-issues.md
docs/wiki/operations/test-reports.md
---
[2026-05-02 21:55] commit: debug: Sentry serverless diagnostic logging

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/api/extract/route.ts
---
[2026-05-02 22:11] commit: fix: Sentry.flush() before return in API routes — wait for serverless transport

Vercel serverless functions kill the process after NextResponse.json() returns,
before the async Sentry transport can send the HTTP envelope. Added
await Sentry.flush(2000) after every captureException call in all 5 routes.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: src/app/api/ai/summarize/route.ts
src/app/api/extract/route.ts
src/app/api/playlist/info/route.ts
src/app/api/stripe/webhook/route.ts
src/app/api/transcribe/preflight/route.ts
---
[2026-05-02 22:14] commit: docs: LOG entry voor Sentry.flush fix
Changed: docs/LOG.md
---
[2026-05-02 22:26] commit: debug: enable Sentry SDK debug logging on server config

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: sentry.server.config.ts
---
[2026-05-02 22:37] commit: debug: verify instrumentation register() execution + remove unused Sentry debug flag

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: instrumentation.ts
sentry.server.config.ts
---
[2026-05-02 22:51] commit: fix: force nodejs runtime on API routes + instrument video/metadata

Root cause: Next.js 16 on Vercel defaulted all API routes to edge runtime.
instrumentation.ts only loaded sentry.server.config for nodejs runtime, so
Sentry.init() never ran for these routes. captureException returned an event
ID but no HTTP envelope was sent to Sentry.

Fix: export const runtime = 'nodejs' on all 6 affected routes:
api/extract, api/stripe/webhook, api/ai/summarize,
api/transcribe/preflight, api/playlist/info, api/video/metadata/[videoId]

Also: add Sentry captureException + flush to api/video/metadata catch block
(previously unhandled, error was silently swallowed).
Cleanup: remove diagnostic console.logs from instrumentation.ts.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: instrumentation.ts
src/app/api/ai/summarize/route.ts
src/app/api/extract/route.ts
src/app/api/playlist/info/route.ts
src/app/api/stripe/webhook/route.ts
src/app/api/transcribe/preflight/route.ts
src/app/api/video/metadata/[videoId]/route.ts
---
[2026-05-02 22:53] commit: docs: Sentry edge runtime root cause — known-issues resolved + monitoring + test-reports

- known-issues.md: mark "Frontend Sentry capture niet bevestigd" as resolved.
  Corrects the earlier (wrong) diagnosis (DSN-empty was real but not the root
  cause). Documents full diagnosis chain and permanent rule for new routes.
- monitoring.md: add "Sentry runtime vereisten" section — every route that
  calls captureException must declare export const runtime = 'nodejs', plus
  await Sentry.flush(2000) before return.
- test-reports.md: add Sessie 2 entry with the full evidence chain.
- LOG.md: updated.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/known-issues.md
docs/wiki/operations/monitoring.md
docs/wiki/operations/test-reports.md
---
[2026-05-03 16:30] commit: docs: Sentry frontend server-side capture is bekende Vercel beperking, niet opgelost

known-issues.md: corrigeer "✅ Opgelost" naar "🔶 Bekende beperking". De runtime=nodejs
fix (a47a15c) liet Sentry.init() wél lopen maar events arriveren nog steeds niet.
Structureel probleem gedocumenteerd in Sentry GitHub issue #17604 (closed-not-planned).
Workaround: Vercel function logs voor server-side debugging.

test-reports.md: Sessie 3 entry met definitieve conclusie; Sessie 2 herzien.
monitoring.md: runtime-sectie bijgewerkt — best-practice blijft staan, beperking erkend.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/known-issues.md
docs/wiki/operations/monitoring.md
docs/wiki/operations/test-reports.md
---
[2026-05-03 16:55] commit: docs: LOG entry voor commit 4befded
Changed: docs/LOG.md
---
[2026-05-03 18:19] commit: docs: sitemap + pagina-structuur audit voor research/design/implementatie fase

Volledig codebase-gefundeerde audit van alle routes, componenten, metadata,
auth-states, placeholders, en inconsistenties. Input voor 3 vervolgfases:
strategische research, Claude Design visuele afwerking, Claude Code implementatie.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/sitemap-audit-2026-05.md
---
[2026-05-03 22:33] commit: cleanup + docs: Werksessie A — drie-lagen architectuur + site cleanup

Code cleanup:
- Verwijder dev artifact: src/app/test-tokens/
- Verwijder empty stub: src/app/youtube-transcript-downloader/ (al leeg)
- Verwijder redirect-ghost page.tsx files (faq, how-it-works, account/credits)
- Verwijder console.log debug statements (webhook, app-sidebar, TranscriptViewer, AuthContext)

Fixes:
- metadataBase toegevoegd aan root layout (fixt canonical URLs en OG images)
- llms.txt: prijzen gesynchroniseerd met live Stripe PACKAGES (was: €6.99/13.99/27.99, nu: €5.99/11.99/24.99)
- llms.txt: /how-it-works vervangen door /docs/getting-started
- sitemap.ts: /faq en /how-it-works verwijderd (zijn 301-redirects); /docs/* en /youtube-transcript-non-english toegevoegd

Wiki:
- sitemap.md volledig herschreven: drie-lagen architectuur (marketing / docs+articles / app-subdomain)
- docs/wiki/strategy/ aangemaakt: principles.md + 7 ADR's (architectuur-beslissingen 2026-05-03)
- INDXR-SITEMAP.md: gemarkeerd als vervangen met verwijzing naar nieuwe docs
- marketing.md: architectuur-update note toegevoegd
- INDEX.md: strategy sectie toegevoegd, recente wijzigingen bijgewerkt

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/sitemap.md
docs/wiki/business/INDXR-SITEMAP.md
docs/wiki/business/marketing.md
docs/wiki/strategy/decisions/001-three-layer-architecture.md
docs/wiki/strategy/decisions/002-app-subdomain.md
docs/wiki/strategy/decisions/003-no-audience-hubs.md
docs/wiki/strategy/decisions/004-no-comparison-pages.md
docs/wiki/strategy/decisions/005-articles-single-umbrella.md
docs/wiki/strategy/decisions/006-auth-on-marketing-domain.md
docs/wiki/strategy/decisions/007-llms-txt-low-priority.md
docs/wiki/strategy/principles.md
public/llms.txt
src/app/account/credits/page.tsx
src/app/api/stripe/webhook/route.ts
src/app/faq/page.tsx
src/app/how-it-works/page.tsx
src/app/layout.tsx
src/app/sitemap.ts
src/app/test-tokens/page.tsx
src/components/app-sidebar.tsx
src/components/library/TranscriptViewer.tsx
src/contexts/AuthContext.tsx
---
[2026-05-03 23:01] commit: wiki: Werksessie A2 — ADR cleanup, marketing.md herschreven, sitemap fixes

ADR cleanup (Taak 1):
- Strategy ADRs S001-S007 hernoemd naar 033-039 en verhuisd naar
  docs/wiki/decisions/ — zelfde folder als alle bestaande ADRs
- Format geconverteerd naar bestaande conventie: "# Beslissing NNN:" (Dutch),
  Status/Datum/Gerelateerde code fields, ## Context / ## Beslissing /
  ## Rationale / ## Consequenties secties
- docs/wiki/strategy/decisions/ map verwijderd
- Alle references bijgewerkt (INDEX.md, principles.md)

Reden voor merge in bestaande decisions/ map: consistentie boven over aparte
mappen per domein. ADRs zijn al genummerd sequentieel; een tweede reeks in een
aparte map zou de INDEX-tabel splitsen en navigatie compliceren.

marketing.md herschreven (Taak 2):
- Verouderde URL-tabellen verwijderd (routes die niet bestaan of verwijderd worden)
- /alternative/* entries verwijderd (worden verwijderd per ADR-037)
- Toekomstige structuur (/articles/*) correct weerspiegeld
- IPRoyal → Decodo proxy gecorrigeerd
- Waardevolle secties behouden: conversie funnel, copy anchors, channel FAQ, analytics

Server/Client fixes (Taak 3):
- /support gecorrigeerd van SERVER naar CLIENT in sitemap.md (code is leidend)
- Alle andere dashboard/admin/marketing routes geverifieerd — geen verdere mismatches

INBOX:
- /pricing metadata-issue gedocumenteerd: CLIENT component kan geen metadata
  export hebben → erft root layout fallback, geen eigen OG-tags of JSON-LD

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/INBOX.md
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/sitemap.md
docs/wiki/business/marketing.md
docs/wiki/decisions/033-three-layer-site-architecture.md
docs/wiki/decisions/034-app-subdomain.md
docs/wiki/decisions/035-articles-single-umbrella.md
docs/wiki/decisions/036-auth-on-marketing-domain.md
docs/wiki/decisions/037-no-comparison-pages.md
docs/wiki/decisions/038-no-audience-hubs.md
docs/wiki/decisions/039-llms-txt-low-priority.md
docs/wiki/strategy/decisions/001-three-layer-architecture.md
docs/wiki/strategy/decisions/002-app-subdomain.md
docs/wiki/strategy/decisions/003-no-audience-hubs.md
docs/wiki/strategy/decisions/004-no-comparison-pages.md
docs/wiki/strategy/decisions/005-articles-single-umbrella.md
docs/wiki/strategy/decisions/006-auth-on-marketing-domain.md
docs/wiki/strategy/decisions/007-llms-txt-low-priority.md
docs/wiki/strategy/principles.md
---
[2026-05-03 23:12] precompact: context compaction triggered
[2026-05-03 23:17] commit: refactor: Werksessie B — drie-lagen site-architectuur geïmplementeerd

- /alternative/* (5 comparison pages) verwijderd (ADR-037)
- /youtube-transcript-generator → /transcribe (301)
- /support → /contact (301)
- 18 top-level SEO-articles + 3 /blog/* → /articles/* (18× 301)
- /about, /privacy, /terms scaffolds aangemaakt
- 17 nieuwe /docs/* scaffold-pages (credits, accuracy, export-formats, limits, languages, privacy-handling, how-to, troubleshooting + subs)
- DocsShell ontkoppeld uit ArticleTemplate/ToolPageTemplate/TutorialTemplate
- docs-config.ts herschreven (alleen /docs/* in sidebar)
- Header/Footer/homepage: alle /transcribe links bijgewerkt, Footer kolommen herschreven
- sitemap.ts: 3-groepen structuur (marketing 9 + docs 21 + articles 19)
- next.config.ts: 23 redirects totaal
- Build: 85 routes, 0 errors

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/sitemap.md
next.config.ts
src/app/(marketing)/page.tsx
src/app/about/page.tsx
src/app/alternative/downsub/page.tsx
src/app/alternative/happyscribe/page.tsx
src/app/alternative/notegpt/page.tsx
src/app/alternative/tactiq/page.tsx
src/app/alternative/turboscribe/page.tsx
src/app/articles/audio-to-text/page.tsx
src/app/articles/bulk-youtube-transcript/page.tsx
src/app/articles/chunk-youtube-transcripts-for-rag/page.tsx
src/app/articles/page.tsx
src/app/articles/youtube-age-restricted-transcript/page.tsx
src/app/articles/youtube-channel-knowledge-base/page.tsx
src/app/articles/youtube-members-only-transcript/page.tsx
src/app/articles/youtube-playlist-transcript/page.tsx
src/app/articles/youtube-srt-download/page.tsx
src/app/articles/youtube-to-text/page.tsx
src/app/articles/youtube-transcript-csv/page.tsx
src/app/articles/youtube-transcript-for-rag/page.tsx
src/app/articles/youtube-transcript-json/page.tsx
src/app/articles/youtube-transcript-markdown/page.tsx
src/app/articles/youtube-transcript-non-english/page.tsx
src/app/articles/youtube-transcript-not-available/page.tsx
src/app/articles/youtube-transcript-obsidian/page.tsx
src/app/articles/youtube-transcript-without-extension/page.tsx
src/app/articles/youtube-transcripts-vector-database/page.tsx
src/app/audio-to-text/page.tsx
src/app/blog/chunk-youtube-transcripts-for-rag/page.tsx
src/app/blog/youtube-channel-knowledge-base/page.tsx
src/app/blog/youtube-transcripts-vector-database/page.tsx
src/app/bulk-youtube-transcript/page.tsx
src/app/contact/page.tsx
src/app/docs/accuracy/ai-transcription/page.tsx
src/app/docs/accuracy/auto-captions/page.tsx
src/app/docs/accuracy/page.tsx
src/app/docs/api/page.tsx
src/app/docs/credits/page.tsx
src/app/docs/export-formats/csv/page.tsx
src/app/docs/export-formats/json/page.tsx
src/app/docs/export-formats/markdown/page.tsx
src/app/docs/export-formats/page.tsx
src/app/docs/export-formats/srt/page.tsx
src/app/docs/export-formats/txt/page.tsx
src/app/docs/export-formats/vtt/page.tsx
src/app/docs/faq/page.tsx
src/app/docs/getting-started/page.tsx
src/app/docs/how-to/page.tsx
src/app/docs/languages/page.tsx
src/app/docs/limits/page.tsx
src/app/docs/privacy-handling/page.tsx
src/app/docs/troubleshooting/page.tsx
src/app/privacy/page.tsx
src/app/sitemap.ts
src/app/support/page.tsx
src/app/terms/page.tsx
src/app/transcribe/layout.tsx
src/app/transcribe/page.tsx
src/app/youtube-age-restricted-transcript/page.tsx
src/app/youtube-members-only-transcript/page.tsx
src/app/youtube-playlist-transcript/page.tsx
src/app/youtube-srt-download/page.tsx
src/app/youtube-to-text/page.tsx
src/app/youtube-transcript-csv/page.tsx
src/app/youtube-transcript-for-rag/page.tsx
src/app/youtube-transcript-generator/layout.tsx
src/app/youtube-transcript-generator/page.tsx
src/app/youtube-transcript-json/page.tsx
src/app/youtube-transcript-markdown/page.tsx
src/app/youtube-transcript-non-english/page.tsx
src/app/youtube-transcript-not-available/page.tsx
src/app/youtube-transcript-obsidian/page.tsx
src/app/youtube-transcript-without-extension/page.tsx
src/components/Footer.tsx
src/components/Header.tsx
src/components/content/templates/ArticleTemplate.tsx
src/components/content/templates/ToolPageTemplate.tsx
src/components/content/templates/TutorialTemplate.tsx
src/lib/docs-config.ts
---
[2026-05-03 23:46] commit: docs: Werksessie B-Fix — self-review clean + ADR-040 t/m ADR-044

Taak 1: self-review op alle nieuwe Werksessie B scaffolds — geen issues
gevonden. Imports, metadata en DocsShell-scope correct in alle ~25 files.

Taak 2: 5 nieuwe ADR's:
- ADR-040: audience-aware article pattern — mix per artikel (niet dogmatisch)
- ADR-041: light + dark mode beide first-class, system default
- ADR-042: /about gebruikt Organization schema, geen Person schema (founder anoniem)
- ADR-043: author byline = "INDXR Editorial" als enige author op articles
- ADR-044: drie aparte feedback channels (Messages / Support / Testimonials post-launch)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/decisions/040-audience-aware-article-pattern.md
docs/wiki/decisions/041-system-default-color-scheme.md
docs/wiki/decisions/042-about-page-organization-schema.md
docs/wiki/decisions/043-author-byline-indxr-editorial.md
docs/wiki/decisions/044-user-feedback-channels.md
---
[2026-05-04 01:45] precompact: context compaction triggered
[2026-05-04 08:15] commit: refactor: Batch 1 — marketing, pricing, free tool, reference docs

Page-type 1 — Homepage:
- Header: Articles nav, Sign up (was Start free), logged-in Go to app
- 9 new marketing components (HowItWorks, Differentiators, Stats, etc.)
- Homepage: 8-section structure, fake testimonials removed

Page-type 2 — Free tool (/transcribe):
- FrictionConversionCard, MicroTrustRow, FAQAccordion (new)
- Audio tab gated for anonymous, Playlist inline friction
- ClosingCTASection extended with copy-override props

Page-type 3 — Pricing (/pricing):
- src/lib/pricing.ts as single source of truth (PACKAGES, CREDIT_COSTS, FREE_TIER)
- Stripe checkout route reads from pricing.ts
- 9 new pricing components, /pricing refactored SERVER with JSON-LD
- AggregateOffer + FAQPage schema, 3 prominent + 2 secondary tiers

Page-type 4 — Reference docs + hub:
- docs-config.ts: 4 categories (Getting started / How INDXR works / Account & data / Help)
- URL restructure: flat → nested (20 redirects)
- 15 new skeleton components in src/components/docs/
- /docs hub: CollectionPage schema
- /docs/getting-started: Tutorial layout, HowTo schema
- All reference docs: TechArticle + BreadcrumbList schema

Other:
- INBOX.md retired → priorities.md
- CLAUDE.md: LESSONS.md protocol added
- sitemap.ts, Footer, llms.txt, wiki docs updated
- Build: 86 routes, 0 errors

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: CLAUDE.md
docs/INBOX.md
docs/LESSONS.md
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/page-structures/README.md
docs/wiki/architecture/page-structures/docs-hub.md
docs/wiki/architecture/page-structures/free-tool.md
docs/wiki/architecture/page-structures/homepage.md
docs/wiki/architecture/page-structures/pricing.md
docs/wiki/architecture/page-structures/reference-doc.md
docs/wiki/architecture/page-structures/tutorial-doc.md
docs/wiki/architecture/pricing-source-of-truth.md
docs/wiki/architecture/sitemap.md
docs/wiki/roadmap/priorities.md
next.config.ts
public/llms.txt
src/app/(marketing)/page.tsx
src/app/api/stripe/checkout/route.ts
src/app/docs/account-and-data/credits-and-billing/page.tsx
src/app/docs/account-and-data/data-handling/page.tsx
src/app/docs/account/page.tsx
src/app/docs/accuracy/ai-transcription/page.tsx
src/app/docs/accuracy/auto-captions/page.tsx
src/app/docs/accuracy/page.tsx
src/app/docs/api/page.tsx
src/app/docs/credits/page.tsx
src/app/docs/export-formats/csv/page.tsx
src/app/docs/export-formats/json/page.tsx
src/app/docs/export-formats/markdown/page.tsx
src/app/docs/export-formats/page.tsx
src/app/docs/export-formats/srt/page.tsx
src/app/docs/export-formats/txt/page.tsx
src/app/docs/export-formats/vtt/page.tsx
src/app/docs/faq/page.tsx
src/app/docs/getting-started/page.tsx
src/app/docs/help/faq/page.tsx
src/app/docs/help/how-to/page.tsx
src/app/docs/help/troubleshooting/page.tsx
src/app/docs/how-indxr-works/accuracy/ai-transcription/page.tsx
src/app/docs/how-indxr-works/accuracy/auto-captions/page.tsx
src/app/docs/how-indxr-works/accuracy/page.tsx
src/app/docs/how-indxr-works/api/page.tsx
src/app/docs/how-indxr-works/credits/page.tsx
src/app/docs/how-indxr-works/export-formats/csv/page.tsx
src/app/docs/how-indxr-works/export-formats/json/page.tsx
src/app/docs/how-indxr-works/export-formats/markdown/page.tsx
src/app/docs/how-indxr-works/export-formats/page.tsx
src/app/docs/how-indxr-works/export-formats/srt/page.tsx
src/app/docs/how-indxr-works/export-formats/txt/page.tsx
src/app/docs/how-indxr-works/export-formats/vtt/page.tsx
src/app/docs/how-indxr-works/languages/page.tsx
src/app/docs/how-indxr-works/limits/page.tsx
src/app/docs/how-indxr-works/overview/page.tsx
src/app/docs/how-to/page.tsx
src/app/docs/languages/page.tsx
src/app/docs/limits/page.tsx
src/app/docs/page.tsx
src/app/docs/privacy-handling/page.tsx
src/app/docs/troubleshooting/page.tsx
src/app/pricing/page.tsx
src/app/sitemap.ts
src/app/transcribe/page.tsx
src/components/Footer.tsx
src/components/Header.tsx
src/components/docs/AnchorHeading.tsx
src/components/docs/DefinitionLeadOpening.tsx
src/components/docs/DocsBreadcrumb.tsx
src/components/docs/DocsCategorySection.tsx
src/components/docs/DocsHubHero.tsx
src/components/docs/DocsSidebar.tsx
src/components/docs/EdgeCasesCallout.tsx
src/components/docs/FeaturedDocsGrid.tsx
src/components/docs/InPageTOC.tsx
src/components/docs/NextStepsBlock.tsx
src/components/docs/PrerequisitesBlock.tsx
src/components/docs/ReferenceTable.tsx
src/components/docs/RelatedTopicsList.tsx
src/components/docs/TutorialOpening.tsx
src/components/docs/TutorialStep.tsx
src/components/docs/WhatJustHappened.tsx
src/components/marketing/ClosingCTASection.tsx
src/components/marketing/DifferentiatorStrip.tsx
src/components/marketing/FAQAccordion.tsx
src/components/marketing/FrictionConversionCard.tsx
src/components/marketing/HeroImage.tsx
src/components/marketing/HowItWorksBlock.tsx
src/components/marketing/MacbookMockupFrame.tsx
src/components/marketing/MicroTrustRow.tsx
src/components/marketing/PricingTeaserBlock.tsx
src/components/marketing/RemotionLoop.tsx
src/components/marketing/StatsFromTesting.tsx
src/components/marketing/TestimonialPlaceholder.tsx
src/components/pricing/AlwaysFreeBlock.tsx
src/components/pricing/BuyButton.tsx
src/components/pricing/CreditCostTable.tsx
src/components/pricing/PricingHero.tsx
src/components/pricing/PricingTierCard.tsx
src/components/pricing/PricingTierGrid.tsx
src/components/pricing/SecondaryTierStrip.tsx
src/components/pricing/TrustRowCards.tsx
src/components/pricing/VatLine.tsx
src/lib/docs-config.ts
src/lib/pricing.ts
---
[2026-05-04 09:28] precompact: context compaction triggered
[2026-05-04 12:19] commit: feat(auth): app.indxr.ai subdomain split — middleware hostname routing + cross-subdomain Supabase cookies

- src/app/dashboard/* → src/app/(app)/dashboard/* (route group, URLs unchanged)
- src/app/admin/* → src/app/(app)/admin/* (route group, URLs unchanged)
- middleware.ts: hostname-aware routing (indxr.ai vs app.indxr.ai), 308 redirects, ?next deep-link preservation, open-redirect validation
- supabase/{server,client,middleware}.ts: cookieDomain = .indxr.ai in production, undefined locally
- updateSession() refactored to {response, user} tuple
- login/page.tsx: ?redirect → ?next, conditional router.push vs window.location.href
- auth/callback/route.ts: redirect to APP_URL/dashboard/transcribe instead of ${origin}
- AuthContext: SIGNED_OUT on app host → redirect to MARKETING_URL/login

Implements ADR-034 (app-subdomain) and ADR-036 (auth-on-marketing-domain).
Local tests pass (single-host). Production verification pending after Vercel deploy.
Changed: docs/LOG.md
docs/wiki/architecture/auth-and-security.md
src/app/(app)/admin/credits/CreditsCsvExport.tsx
src/app/(app)/admin/credits/page.tsx
src/app/(app)/admin/layout.tsx
src/app/(app)/admin/page.tsx
src/app/(app)/admin/paid-users/page.tsx
src/app/(app)/admin/transcripts/TranscriptDeleteButton.tsx
src/app/(app)/admin/transcripts/[id]/page.tsx
src/app/(app)/admin/transcripts/page.tsx
src/app/(app)/admin/users/UsersTable.tsx
src/app/(app)/admin/users/page.tsx
src/app/(app)/dashboard/account/page.tsx
src/app/(app)/dashboard/billing/cancel/page.tsx
src/app/(app)/dashboard/billing/page.tsx
src/app/(app)/dashboard/billing/success/page.tsx
src/app/(app)/dashboard/layout.tsx
src/app/(app)/dashboard/library/[id]/page.tsx
src/app/(app)/dashboard/library/page.tsx
src/app/(app)/dashboard/messages/MessagesClient.tsx
src/app/(app)/dashboard/messages/page.tsx
src/app/(app)/dashboard/page.tsx
src/app/(app)/dashboard/settings/page.tsx
src/app/(app)/dashboard/transcribe/page.tsx
src/app/admin/credits/CreditsCsvExport.tsx
src/app/admin/credits/page.tsx
src/app/admin/layout.tsx
src/app/admin/page.tsx
src/app/admin/paid-users/page.tsx
src/app/admin/transcripts/TranscriptDeleteButton.tsx
src/app/admin/transcripts/[id]/page.tsx
src/app/admin/transcripts/page.tsx
src/app/admin/users/UsersTable.tsx
src/app/admin/users/page.tsx
src/app/auth/callback/route.ts
src/app/dashboard/account/page.tsx
src/app/dashboard/billing/cancel/page.tsx
src/app/dashboard/billing/page.tsx
src/app/dashboard/billing/success/page.tsx
src/app/dashboard/layout.tsx
src/app/dashboard/library/[id]/page.tsx
src/app/dashboard/library/page.tsx
src/app/dashboard/messages/MessagesClient.tsx
src/app/dashboard/messages/page.tsx
src/app/dashboard/page.tsx
src/app/dashboard/settings/page.tsx
src/app/dashboard/transcribe/page.tsx
src/app/login/page.tsx
src/contexts/AuthContext.tsx
src/middleware.ts
src/utils/supabase/client.ts
src/utils/supabase/middleware.ts
src/utils/supabase/server.ts
---
[2026-05-05 02:33] commit: fix(routing): cross-host prefetch crash — Link → marketingHref sweep + signout handlers

Next.js prefetcht <Link href='/pricing'> etc. op app.indxr.ai → 307 cross-origin block → TypeError 'Error in input stream' tijdens login redirect overgang.

Fix: alle marketing-targets in app-host renderpath worden plain <a> met absolute URL via nieuwe utility marketingHref()/appHref().

Header signout handlers: router.push -> window.location.href = marketingHref('/login') om 308-hop te vermijden.

VideoTab path-correctie: /dashboard/credits -> /dashboard/billing (oud path bestond niet).

Build groen (86 routes). Productie-verificatie pending.
Changed: docs/LESSONS.md
docs/LOG.md
src/app/(app)/dashboard/billing/cancel/page.tsx
src/app/(app)/dashboard/transcribe/page.tsx
src/components/Footer.tsx
src/components/Header.tsx
src/components/PlaylistAvailabilitySummary.tsx
src/components/TranscriptCard.tsx
src/components/docs/DocsShell.tsx
src/components/free-tool/AudioTab.tsx
src/components/free-tool/PlaylistTab.tsx
src/components/free-tool/VideoTab.tsx
src/components/library/TranscriptViewer.tsx
src/lib/cross-host-links.ts
---
[2026-05-05 03:28] commit: fix: auth-error recovery in updateSession + Werksessie C priorities

Voorkomt infinite refresh-loop bij stale Supabase auth cookies door
clearAuthCookies() te triggeren bij refresh_token_not_found of getUser
exception. Wist sb-* cookies op zowel response als request.cookies met
maxAge:0 en correcte parent-domain (.indxr.ai).

Bewezen oorzaak van 500K Upstash commands in 5 dagen: stale cookies +
Vercel rate-limit-checks per loop-iteratie.

Werksessie C openstaande items gedocumenteerd in priorities.md.
Changed: docs/LESSONS.md
docs/LOG.md
docs/wiki/roadmap/priorities.md
src/utils/supabase/middleware.ts
---
[2026-05-05 03:42] precompact: context compaction triggered
[2026-05-05 03:48] commit: fix(C.2.2): Header /dashboard Links → appHref to prevent cross-host prefetch crash

5 <Link href="/dashboard*"> instances in Header.tsx (dropdown 3, desktop, mobile)
veroorzaakten Next.js RSC prefetch op marketing-host → 308 cross-origin → CORS
block → TypeError 'Error in input stream' → 'Application error' flash van ~1s
tijdens login redirect.

Vervangen door <a href={appHref(...)}> conform sessie 1 patroon.
Bonus: docs/credits-and-billing /dashboard/account Link ook gefixed.
Changed: docs/LOG.md
src/app/docs/account-and-data/credits-and-billing/page.tsx
src/components/Header.tsx
---
[2026-05-05 04:31] commit: fix(C.2.2): cross-host navigation in app-sidebar signout + WelcomeCreditCard

app-sidebar.tsx:189 router.push('/login') triggerde Next.js client-side
navigation naar app.indxr.ai/login → middleware 308 → indxr.ai/login →
cross-origin RSC fetch crash → persistente TypeError 'Error in input stream'
op alle dashboard pages.

WelcomeCreditCard.tsx:128 window.location.href = '/pricing' veroorzaakte
onnodige redirect-hop op app-host (functioneel werkte het, maar 308 extra).

Beide vervangen door window.location.href = marketingHref(...) conform
sessie 1 patroon. router.refresh() in signout verwijderd (overbodig na
full page reload).
Changed: docs/LOG.md
src/components/app-sidebar.tsx
src/components/dashboard/WelcomeCreditCard.tsx
---
[2026-05-05 04:48] commit: fix(C.2.6): Server Component redirect('/login') → absolute marketing URL

6 instances in dashboard Server Components: layout.tsx (login + suspended),
billing, settings, account, library/[id]. Op app.indxr.ai veroorzaakte
relatief pad redirect 307 → middleware 308 cross-origin chain → RSC prefetch
parser kreeg redirect-response in plaats van RSC stream → TypeError 'Error
in input stream' persistent op alle dashboard pages.

Fix: redirect(`${NEXT_PUBLIC_MARKETING_URL}/login`) gebruikt absolute
marketing URL → browser volgt direct naar marketing-host zonder middleware
intercept. /suspended bevestigd als marketing-route.

admin/layout.tsx:16 redirect('/dashboard') onaangeroerd (app-path, blijft
relatief).

Sluit C.2.2 / C.2.6 prefetch-crash bug-klasse: cross-host navigation moet
absolute URL gebruiken in alle lagen (Link → marketingHref/appHref,
window.location → marketingHref, redirect() → process.env URL).
Changed: docs/LESSONS.md
docs/LOG.md
src/app/(app)/dashboard/account/page.tsx
src/app/(app)/dashboard/billing/page.tsx
src/app/(app)/dashboard/layout.tsx
src/app/(app)/dashboard/library/[id]/page.tsx
src/app/(app)/dashboard/settings/page.tsx
---
[2026-05-05 05:19] commit: fix(login): Server Action redirect to prevent RSC stream abort

loginAction retourneert nu redirect(finalTarget) i.p.v. { success: true }
gevolgd door client-side window.location.href. Browser aborteerde de RSC
action-response stream mid-transmission zodra client navigeerde →
TypeError 'Error in input stream' + 'Application error' flash op
www.indxr.ai tijdens elke login.

Bevestigd via Next.js GitHub #81377: redirect() in Server Action is
atomisch (303 response, browser volgt zonder concurrent stream).

Hostname-validatie toegevoegd voor cross-host redirects (app.indxr.ai,
localhost, app.localhost). resolvePostLoginTarget() altijd doorgegeven
als redirectTo via formData.

Sluit definitief de bug-klasse die we sinds Werksessie C deploy
hebben gechased: TypeError 'Error in input stream'.
Changed: docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/auth-and-security.md
src/app/auth/actions.ts
src/app/login/page.tsx
---
[2026-05-05 05:32] commit: fix(login): swallow NEXT_REDIRECT in client catch-block

NEXT_REDIRECT throw uit Server Action's redirect() bereikte client-side
catch maar React event handler heeft geen NEXT_REDIRECT boundary →
unhandled promise rejection in console. De 303 redirect response is
al verwerkt door Next.js voordat de throw bij ons catch-block aankomt;
re-throwen had geen ontvanger. Silently returnen sluit de error chain
zonder gedragswijziging.

Sluit cosmetisch console-issue na 825574f.
Changed: docs/LOG.md
src/app/login/page.tsx
---
[2026-05-05 07:41] commit: docs: handoff documentation for two-Vercel-projects migration

- ADR-045 created: decision rationale for monorepo with two Vercel projects
  (apps/marketing + apps/app + packages/shared). Context: RSC architectural
  mismatch with middleware 308-redirects caused persistent TypeError 'Error
  in input stream'. Linear/Vercel/Notion don't actually do subdomain split;
  Slack pattern (separate deployments per host) is the correct precedent.

- priorities.md Werksessie C status section added: bug definitively closed
  via commits 825574f + d13c30e. d13c30e marked as migration-restore
  checkpoint. Remaining C.x items assessed as non-blockers (C.2.1 + C.2.4
  fixed during migration; C.3.1 Upstash quota independent).

- C.4.1 placeholder added for migration execution (separate session).

- INDEX.md updated with ADR-045 row.

Prepares clean handoff state for new session focused on migration.
Changed: docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/decisions/045-two-vercel-projects-decision.md
docs/wiki/roadmap/priorities.md
---
[2026-05-05 07:45] commit: docs: correct migration checkpoint reference in priorities.md

Two references to d13c30e (the bug-fix commit) have been updated to 1fc0589
(the handoff commit, which includes d13c30e + ADR-045 + status documentation).

On rollback the desired state is the bug-fix code AND the handoff documentation,
not just the bug-fix alone. 1fc0589 is the correct restore baseline.
Changed: docs/LOG.md
docs/wiki/roadmap/priorities.md
---
[2026-05-05 10:37] commit: cleanup(pre-migration): cross-host links, NEXT_PUBLIC_SITE_URL decommissioning, CORS, dead code

- Fix raw /dashboard links in TranscriptCard, contact, PlaylistManager
- Fix <Link href=/dashboard/...> in free-tool/* (rendered on marketing host)
- Replace NEXT_PUBLIC_SITE_URL with APP_URL/MARKETING_URL in auth/actions.ts
- Add https://app.indxr.ai to backend CORS allow_origins
- Delete unused components: AuthModal, CreditBalance, FeatureCard, HeroImage (root)

Prepares codebase for monorepo migration (ADR-045).
Changed: backend/main.py
src/app/auth/actions.ts
src/app/contact/page.tsx
src/components/AuthModal.tsx
src/components/CreditBalance.tsx
src/components/FeatureCard.tsx
src/components/HeroImage.tsx
src/components/PlaylistManager.tsx
src/components/TranscriptCard.tsx
src/components/free-tool/AudioTab.tsx
src/components/free-tool/VideoTab.tsx
---
[2026-05-05 10:37] commit: docs: cleanup-001 report + LESSONS + wiki updates

- Add migration audit-001.md and cleanup-001-report.md
- Update C.2.4 (CORS) to resolved in priorities.md
- Add cross-host link scan patterns + env-var naming lessons
- Remove TODO comment from auth-and-security.md (CORS now live)
Changed: docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/auth-and-security.md
docs/wiki/migration/audit-001.md
docs/wiki/migration/cleanup-001-report.md
docs/wiki/roadmap/priorities.md
---
[2026-05-05 11:03] precompact: context compaction triggered
[2026-05-05 12:24] precompact: context compaction triggered
[2026-05-05 12:28] commit: feat(monorepo): split into pnpm workspace with apps/marketing, apps/app, packages/shared

- Scaffold pnpm-workspace.yaml + monorepo root package.json (no deps)
- Move shared components, hooks, utils, types to packages/shared with relative imports
- Move marketing routes to apps/marketing (Next.js, port 3000)
- Move dashboard/admin routes to apps/app (Next.js, port 3001)
- Duplicate API routes (extract, check-playlist-availability, video) in both apps
- Rewrite all @/ shared-bound imports to @indxr/shared/* explicit alias (100 files)
- Remove @/* fallback to shared — shadow risk eliminated (ADR-046)
- Consolidate auth-actions.ts, ratelimit.ts, pricing.ts, rag-export.ts to single shared source
- Add .gitignore entries for apps/*/.next/ and apps/*/node_modules/
- Extract stop hook to .claude/hooks/check-wiki.sh
- Both builds pass: marketing (60 routes) + app (dashboard + admin)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: .claude/hooks/check-wiki.sh
.claude/settings.json
.gitignore
apps/app/eslint.config.mjs
apps/app/instrumentation.ts
apps/app/next.config.ts
apps/app/package.json
apps/app/postcss.config.mjs
apps/app/public/apple-touch-icon.png
apps/app/public/favicon-96x96.png
apps/app/public/favicon.ico
apps/app/public/favicon.svg
apps/app/public/file.svg
apps/app/public/globe.svg
apps/app/public/hero-dark.jpg
apps/app/public/hero-light.jpg
apps/app/public/llms.txt
apps/app/public/logo/indxr-horizontal-black-on-white.png
apps/app/public/logo/indxr-horizontal-black-transparent.png
apps/app/public/logo/indxr-horizontal-black-transparent.svg
apps/app/public/logo/indxr-horizontal-white-on-black.png
apps/app/public/logo/indxr-horizontal-white-transparent.png
apps/app/public/logo/indxr-horizontal-white-transparent.svg
apps/app/public/logo/indxr-mark-black-on-white.png
apps/app/public/logo/indxr-mark-black-transparent.png
apps/app/public/logo/indxr-mark-black-transparent.svg
apps/app/public/logo/indxr-mark-white-on-black.png
apps/app/public/logo/indxr-mark-white-transparent.png
apps/app/public/logo/indxr-mark-white-transparent.svg
apps/app/public/logo/indxr-wordmark-black-on-white.png
apps/app/public/logo/indxr-wordmark-black-transparent.png
apps/app/public/logo/indxr-wordmark-black-transparent.svg
apps/app/public/logo/indxr-wordmark-white-on-black.png
apps/app/public/logo/indxr-wordmark-white-transparent.png
apps/app/public/logo/indxr-wordmark-white-transparent.svg
apps/app/public/next.svg
apps/app/public/robots.txt
apps/app/public/site.webmanifest
apps/app/public/vercel.svg
apps/app/public/web-app-manifest-192x192.png
apps/app/public/web-app-manifest-512x512.png
apps/app/public/window.svg
apps/app/sentry.client.config.ts
apps/app/sentry.edge.config.ts
apps/app/sentry.server.config.ts
apps/app/src/app/actions/credits.ts
apps/app/src/app/admin/credits/CreditsCsvExport.tsx
apps/app/src/app/admin/credits/page.tsx
apps/app/src/app/admin/layout.tsx
apps/app/src/app/admin/page.tsx
apps/app/src/app/admin/paid-users/page.tsx
apps/app/src/app/admin/transcripts/TranscriptDeleteButton.tsx
apps/app/src/app/admin/transcripts/[id]/page.tsx
apps/app/src/app/admin/transcripts/page.tsx
apps/app/src/app/admin/users/UsersTable.tsx
apps/app/src/app/admin/users/page.tsx
apps/app/src/app/api/admin/add-credits/route.ts
apps/app/src/app/api/admin/delete-transcript/route.ts
apps/app/src/app/api/admin/delete-user/route.ts
apps/app/src/app/api/admin/suspend-user/route.ts
apps/app/src/app/api/admin/user-detail/route.ts
apps/app/src/app/api/ai/summarize/route.ts
apps/app/src/app/api/check-playlist-availability/route.ts
apps/app/src/app/api/extract/route.ts
apps/app/src/app/api/jobs/[job_id]/route.ts
apps/app/src/app/api/playlist/extract/route.ts
apps/app/src/app/api/playlist/info/route.ts
apps/app/src/app/api/playlist/jobs/[jobId]/route.ts
apps/app/src/app/api/stripe/checkout/route.ts
apps/app/src/app/api/stripe/webhook/route.ts
apps/app/src/app/api/transcribe/preflight/route.ts
apps/app/src/app/api/transcribe/whisper/route.ts
apps/app/src/app/api/video/metadata/[videoId]/route.ts
apps/app/src/app/dashboard/account/page.tsx
apps/app/src/app/dashboard/billing/cancel/page.tsx
apps/app/src/app/dashboard/billing/page.tsx
apps/app/src/app/dashboard/billing/success/page.tsx
apps/app/src/app/dashboard/layout.tsx
apps/app/src/app/dashboard/library/[id]/page.tsx
apps/app/src/app/dashboard/library/page.tsx
apps/app/src/app/dashboard/messages/MessagesClient.tsx
apps/app/src/app/dashboard/messages/page.tsx
apps/app/src/app/dashboard/page.tsx
apps/app/src/app/dashboard/settings/page.tsx
apps/app/src/app/dashboard/transcribe/page.tsx
apps/app/src/app/favicon.ico
apps/app/src/app/globals.css
apps/app/src/app/layout.tsx
apps/app/src/app/styles/tokens.css
apps/app/src/components/SaveErrorModal.tsx
apps/app/src/components/app-sidebar.tsx
apps/app/src/components/dashboard/ActiveJobsIndicator.tsx
apps/app/src/components/dashboard/MobileTabBar.tsx
apps/app/src/components/dashboard/WelcomeCreditCard.tsx
apps/app/src/components/dashboard/billing/BillingPurchaseGrid.tsx
apps/app/src/components/dashboard/settings/DeveloperExportsCard.tsx
apps/app/src/components/dashboard/settings/ProfileSettingsCard.tsx
apps/app/src/components/dashboard/settings/SecuritySettingsCard.tsx
apps/app/src/components/dashboard/settings/SentryFeedbackCard.tsx
apps/app/src/components/dashboard/settings/TransactionHistoryCard.tsx
apps/app/src/components/library/AiSummaryView.tsx
apps/app/src/components/library/RagExportView.tsx
apps/app/src/components/library/TranscriptList.tsx
apps/app/src/components/library/TranscriptViewer.tsx
apps/app/src/lib/stripe.ts
apps/app/src/middleware.ts
apps/app/tsconfig.json
apps/marketing/eslint.config.mjs
apps/marketing/instrumentation.ts
apps/marketing/next.config.ts
apps/marketing/package.json
apps/marketing/postcss.config.mjs
apps/marketing/public/apple-touch-icon.png
apps/marketing/public/favicon-96x96.png
apps/marketing/public/favicon.ico
apps/marketing/public/favicon.svg
apps/marketing/public/file.svg
apps/marketing/public/globe.svg
apps/marketing/public/hero-dark.jpg
apps/marketing/public/hero-light.jpg
apps/marketing/public/llms.txt
apps/marketing/public/logo/indxr-horizontal-black-on-white.png
apps/marketing/public/logo/indxr-horizontal-black-transparent.png
apps/marketing/public/logo/indxr-horizontal-black-transparent.svg
apps/marketing/public/logo/indxr-horizontal-white-on-black.png
apps/marketing/public/logo/indxr-horizontal-white-transparent.png
apps/marketing/public/logo/indxr-horizontal-white-transparent.svg
apps/marketing/public/logo/indxr-mark-black-on-white.png
apps/marketing/public/logo/indxr-mark-black-transparent.png
apps/marketing/public/logo/indxr-mark-black-transparent.svg
apps/marketing/public/logo/indxr-mark-white-on-black.png
apps/marketing/public/logo/indxr-mark-white-transparent.png
apps/marketing/public/logo/indxr-mark-white-transparent.svg
apps/marketing/public/logo/indxr-wordmark-black-on-white.png
apps/marketing/public/logo/indxr-wordmark-black-transparent.png
apps/marketing/public/logo/indxr-wordmark-black-transparent.svg
apps/marketing/public/logo/indxr-wordmark-white-on-black.png
apps/marketing/public/logo/indxr-wordmark-white-transparent.png
apps/marketing/public/logo/indxr-wordmark-white-transparent.svg
apps/marketing/public/next.svg
apps/marketing/public/robots.txt
apps/marketing/public/site.webmanifest
apps/marketing/public/vercel.svg
apps/marketing/public/web-app-manifest-192x192.png
apps/marketing/public/web-app-manifest-512x512.png
apps/marketing/public/window.svg
apps/marketing/sentry.client.config.ts
apps/marketing/sentry.edge.config.ts
apps/marketing/sentry.server.config.ts
apps/marketing/src/app/about/page.tsx
apps/marketing/src/app/api/check-playlist-availability/route.ts
apps/marketing/src/app/api/extract/route.ts
apps/marketing/src/app/api/video/metadata/[videoId]/route.ts
apps/marketing/src/app/articles/audio-to-text/page.tsx
apps/marketing/src/app/articles/bulk-youtube-transcript/page.tsx
apps/marketing/src/app/articles/chunk-youtube-transcripts-for-rag/page.tsx
apps/marketing/src/app/articles/page.tsx
apps/marketing/src/app/articles/youtube-age-restricted-transcript/page.tsx
apps/marketing/src/app/articles/youtube-channel-knowledge-base/page.tsx
apps/marketing/src/app/articles/youtube-members-only-transcript/page.tsx
apps/marketing/src/app/articles/youtube-playlist-transcript/page.tsx
apps/marketing/src/app/articles/youtube-srt-download/page.tsx
apps/marketing/src/app/articles/youtube-to-text/page.tsx
apps/marketing/src/app/articles/youtube-transcript-csv/page.tsx
apps/marketing/src/app/articles/youtube-transcript-for-rag/page.tsx
apps/marketing/src/app/articles/youtube-transcript-json/page.tsx
apps/marketing/src/app/articles/youtube-transcript-markdown/page.tsx
apps/marketing/src/app/articles/youtube-transcript-non-english/page.tsx
apps/marketing/src/app/articles/youtube-transcript-not-available/page.tsx
apps/marketing/src/app/articles/youtube-transcript-obsidian/page.tsx
apps/marketing/src/app/articles/youtube-transcript-without-extension/page.tsx
apps/marketing/src/app/articles/youtube-transcripts-vector-database/page.tsx
apps/marketing/src/app/auth/callback/route.ts
apps/marketing/src/app/contact/page.tsx
apps/marketing/src/app/docs/account-and-data/credits-and-billing/page.tsx
apps/marketing/src/app/docs/account-and-data/data-handling/page.tsx
apps/marketing/src/app/docs/getting-started/page.tsx
apps/marketing/src/app/docs/help/faq/page.tsx
apps/marketing/src/app/docs/help/how-to/page.tsx
apps/marketing/src/app/docs/help/troubleshooting/page.tsx
apps/marketing/src/app/docs/how-indxr-works/accuracy/ai-transcription/page.tsx
apps/marketing/src/app/docs/how-indxr-works/accuracy/auto-captions/page.tsx
apps/marketing/src/app/docs/how-indxr-works/accuracy/page.tsx
apps/marketing/src/app/docs/how-indxr-works/api/page.tsx
apps/marketing/src/app/docs/how-indxr-works/credits/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/csv/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/json/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/markdown/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/srt/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/txt/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/vtt/page.tsx
apps/marketing/src/app/docs/how-indxr-works/languages/page.tsx
apps/marketing/src/app/docs/how-indxr-works/limits/page.tsx
apps/marketing/src/app/docs/how-indxr-works/overview/page.tsx
apps/marketing/src/app/docs/page.tsx
apps/marketing/src/app/favicon.ico
apps/marketing/src/app/forgot-password/page.tsx
apps/marketing/src/app/globals.css
apps/marketing/src/app/layout.tsx
apps/marketing/src/app/login/page.tsx
apps/marketing/src/app/onboarding/page.tsx
apps/marketing/src/app/page.tsx
apps/marketing/src/app/pricing/page.tsx
apps/marketing/src/app/privacy/page.tsx
apps/marketing/src/app/signup/page.tsx
apps/marketing/src/app/sitemap.ts
apps/marketing/src/app/styles/tokens.css
apps/marketing/src/app/suspended/page.tsx
apps/marketing/src/app/terms/page.tsx
apps/marketing/src/app/transcribe/layout.tsx
apps/marketing/src/app/transcribe/page.tsx
apps/marketing/src/components/content/AuthorCard.tsx
apps/marketing/src/components/content/templates/ArticleTemplate.tsx
apps/marketing/src/components/content/templates/ToolPageTemplate.tsx
apps/marketing/src/components/content/templates/TutorialTemplate.tsx
apps/marketing/src/components/docs/AnchorHeading.tsx
apps/marketing/src/components/docs/DefinitionLeadOpening.tsx
apps/marketing/src/components/docs/DocsBreadcrumb.tsx
apps/marketing/src/components/docs/DocsCategorySection.tsx
apps/marketing/src/components/docs/DocsHubHero.tsx
apps/marketing/src/components/docs/DocsShell.tsx
apps/marketing/src/components/docs/DocsSidebar.tsx
apps/marketing/src/components/docs/EdgeCasesCallout.tsx
apps/marketing/src/components/docs/FeaturedDocsGrid.tsx
apps/marketing/src/components/docs/InPageTOC.tsx
apps/marketing/src/components/docs/NextStepsBlock.tsx
apps/marketing/src/components/docs/PrerequisitesBlock.tsx
apps/marketing/src/components/docs/ReferenceTable.tsx
apps/marketing/src/components/docs/RelatedTopicsList.tsx
apps/marketing/src/components/docs/TutorialOpening.tsx
apps/marketing/src/components/docs/TutorialStep.tsx
apps/marketing/src/components/docs/WhatJustHappened.tsx
apps/marketing/src/components/marketing/ClosingCTASection.tsx
apps/marketing/src/components/marketing/DifferentiatorStrip.tsx
apps/marketing/src/components/marketing/FAQAccordion.tsx
apps/marketing/src/components/marketing/FrictionConversionCard.tsx
apps/marketing/src/components/marketing/HeroImage.tsx
apps/marketing/src/components/marketing/HowItWorksBlock.tsx
apps/marketing/src/components/marketing/MacbookMockupFrame.tsx
apps/marketing/src/components/marketing/MicroTrustRow.tsx
apps/marketing/src/components/marketing/PricingTeaserBlock.tsx
apps/marketing/src/components/marketing/RemotionLoop.tsx
apps/marketing/src/components/marketing/StatsFromTesting.tsx
apps/marketing/src/components/marketing/TestimonialPlaceholder.tsx
apps/marketing/src/components/pricing/AlwaysFreeBlock.tsx
apps/marketing/src/components/pricing/BuyButton.tsx
apps/marketing/src/components/pricing/CreditCostTable.tsx
apps/marketing/src/components/pricing/PricingHero.tsx
apps/marketing/src/components/pricing/PricingTierCard.tsx
apps/marketing/src/components/pricing/PricingTierGrid.tsx
apps/marketing/src/components/pricing/SecondaryTierStrip.tsx
apps/marketing/src/components/pricing/TrustRowCards.tsx
apps/marketing/src/components/pricing/VatLine.tsx
apps/marketing/src/components/seo/JsonLd.tsx
apps/marketing/src/lib/authors.ts
apps/marketing/src/lib/docs-config.ts
apps/marketing/src/middleware.ts
apps/marketing/tsconfig.json
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/auth-and-security.md
docs/wiki/architecture/pricing-source-of-truth.md
docs/wiki/decisions/015-rag-json-export.md
docs/wiki/decisions/046-monorepo-import-aliases.md
docs/wiki/migration/migration-002-report.md
docs/wiki/operations/deployment.md
docs/wiki/operations/known-issues.md
package-lock.json
package.json
packages/shared/package.json
packages/shared/src/actions/auth-actions.ts
packages/shared/src/actions/rag-export.ts
packages/shared/src/components/Footer.tsx
packages/shared/src/components/Header.tsx
packages/shared/src/components/PlaylistAvailabilitySummary.tsx
packages/shared/src/components/PlaylistManager.tsx
packages/shared/src/components/TranscriptCard.tsx
packages/shared/src/components/UserAvatar.tsx
packages/shared/src/components/free-tool/AudioTab.tsx
packages/shared/src/components/free-tool/PlaylistTab.tsx
packages/shared/src/components/free-tool/VideoTab.tsx
packages/shared/src/components/theme-provider.tsx
packages/shared/src/components/transcription/TranscriptionProgress.tsx
packages/shared/src/components/ui/PasswordInput.tsx
packages/shared/src/components/ui/alert-dialog.tsx
packages/shared/src/components/ui/alert.tsx
packages/shared/src/components/ui/avatar.tsx
packages/shared/src/components/ui/badge.tsx
packages/shared/src/components/ui/button.tsx
packages/shared/src/components/ui/card.tsx
packages/shared/src/components/ui/checkbox.tsx
packages/shared/src/components/ui/command.tsx
packages/shared/src/components/ui/credit-balance.tsx
packages/shared/src/components/ui/dialog.tsx
packages/shared/src/components/ui/dropdown-menu.tsx
packages/shared/src/components/ui/empty-state.tsx
packages/shared/src/components/ui/form.tsx
packages/shared/src/components/ui/input.tsx
packages/shared/src/components/ui/label.tsx
packages/shared/src/components/ui/loading-skeleton.tsx
packages/shared/src/components/ui/logo.tsx
packages/shared/src/components/ui/pricing-card.tsx
packages/shared/src/components/ui/progress.tsx
packages/shared/src/components/ui/scroll-area.tsx
packages/shared/src/components/ui/select.tsx
packages/shared/src/components/ui/separator.tsx
packages/shared/src/components/ui/sheet.tsx
packages/shared/src/components/ui/sidebar.tsx
packages/shared/src/components/ui/skeleton.tsx
packages/shared/src/components/ui/slider.tsx
packages/shared/src/components/ui/sonner.tsx
packages/shared/src/components/ui/switch.tsx
packages/shared/src/components/ui/table.tsx
packages/shared/src/components/ui/tabs.tsx
packages/shared/src/components/ui/theme-toggle.tsx
packages/shared/src/components/ui/tooltip.tsx
packages/shared/src/contexts/AuthContext.tsx
packages/shared/src/hooks/use-mobile.ts
packages/shared/src/hooks/useAuth.ts
packages/shared/src/hooks/useJobStatus.ts
packages/shared/src/lib/cross-host-links.ts
packages/shared/src/lib/eta.ts
packages/shared/src/lib/pollingBackoff.ts
packages/shared/src/lib/pricing.ts
packages/shared/src/lib/ratelimit.ts
packages/shared/src/lib/utils.ts
packages/shared/src/providers/PostHogProvider.tsx
packages/shared/src/types/sbd.d.ts
packages/shared/src/types/transcript.ts
packages/shared/src/utils/disposable-email.ts
packages/shared/src/utils/formatTranscript.ts
packages/shared/src/utils/supabase/admin.ts
packages/shared/src/utils/supabase/client.ts
packages/shared/src/utils/supabase/middleware.ts
packages/shared/src/utils/supabase/server.ts
packages/shared/src/utils/validation.ts
packages/shared/src/utils/youtube.ts
packages/shared/tsconfig.json
pnpm-lock.yaml
pnpm-workspace.yaml
src/app/(app)/admin/credits/CreditsCsvExport.tsx
src/app/(app)/admin/credits/page.tsx
src/app/(app)/admin/layout.tsx
src/app/(app)/admin/page.tsx
src/app/(app)/admin/paid-users/page.tsx
src/app/(app)/admin/transcripts/TranscriptDeleteButton.tsx
src/app/(app)/admin/transcripts/[id]/page.tsx
src/app/(app)/admin/transcripts/page.tsx
src/app/(app)/admin/users/UsersTable.tsx
src/app/(app)/admin/users/page.tsx
src/app/(app)/dashboard/account/page.tsx
src/app/(app)/dashboard/billing/cancel/page.tsx
src/app/(app)/dashboard/billing/page.tsx
src/app/(app)/dashboard/billing/success/page.tsx
src/app/(app)/dashboard/layout.tsx
src/app/(app)/dashboard/library/[id]/page.tsx
src/app/(app)/dashboard/library/page.tsx
src/app/(app)/dashboard/messages/MessagesClient.tsx
src/app/(app)/dashboard/messages/page.tsx
src/app/(app)/dashboard/page.tsx
src/app/(app)/dashboard/settings/page.tsx
src/app/(app)/dashboard/transcribe/page.tsx
src/app/(marketing)/page.tsx
src/app/about/page.tsx
src/app/actions/credits.ts
src/app/actions/rag-export.ts
src/app/api/admin/add-credits/route.ts
src/app/api/admin/delete-transcript/route.ts
src/app/api/admin/delete-user/route.ts
src/app/api/admin/suspend-user/route.ts
src/app/api/admin/user-detail/route.ts
src/app/api/ai/summarize/route.ts
src/app/api/check-playlist-availability/route.ts
src/app/api/extract/route.ts
src/app/api/jobs/[job_id]/route.ts
src/app/api/playlist/extract/route.ts
src/app/api/playlist/info/route.ts
src/app/api/playlist/jobs/[jobId]/route.ts
src/app/api/stripe/checkout/route.ts
src/app/api/stripe/webhook/route.ts
src/app/api/transcribe/preflight/route.ts
src/app/api/transcribe/whisper/route.ts
src/app/api/video/metadata/[videoId]/route.ts
src/app/articles/audio-to-text/page.tsx
src/app/articles/bulk-youtube-transcript/page.tsx
src/app/articles/chunk-youtube-transcripts-for-rag/page.tsx
src/app/articles/page.tsx
src/app/articles/youtube-age-restricted-transcript/page.tsx
src/app/articles/youtube-channel-knowledge-base/page.tsx
src/app/articles/youtube-members-only-transcript/page.tsx
src/app/articles/youtube-playlist-transcript/page.tsx
src/app/articles/youtube-srt-download/page.tsx
src/app/articles/youtube-to-text/page.tsx
src/app/articles/youtube-transcript-csv/page.tsx
src/app/articles/youtube-transcript-for-rag/page.tsx
src/app/articles/youtube-transcript-json/page.tsx
src/app/articles/youtube-transcript-markdown/page.tsx
src/app/articles/youtube-transcript-non-english/page.tsx
src/app/articles/youtube-transcript-not-available/page.tsx
src/app/articles/youtube-transcript-obsidian/page.tsx
src/app/articles/youtube-transcript-without-extension/page.tsx
src/app/articles/youtube-transcripts-vector-database/page.tsx
src/app/auth/actions.ts
src/app/auth/callback/route.ts
src/app/contact/page.tsx
src/app/docs/account-and-data/credits-and-billing/page.tsx
src/app/docs/account-and-data/data-handling/page.tsx
src/app/docs/getting-started/page.tsx
src/app/docs/help/faq/page.tsx
src/app/docs/help/how-to/page.tsx
src/app/docs/help/troubleshooting/page.tsx
src/app/docs/how-indxr-works/accuracy/ai-transcription/page.tsx
src/app/docs/how-indxr-works/accuracy/auto-captions/page.tsx
src/app/docs/how-indxr-works/accuracy/page.tsx
src/app/docs/how-indxr-works/api/page.tsx
src/app/docs/how-indxr-works/credits/page.tsx
src/app/docs/how-indxr-works/export-formats/csv/page.tsx
src/app/docs/how-indxr-works/export-formats/json/page.tsx
src/app/docs/how-indxr-works/export-formats/markdown/page.tsx
src/app/docs/how-indxr-works/export-formats/page.tsx
src/app/docs/how-indxr-works/export-formats/srt/page.tsx
src/app/docs/how-indxr-works/export-formats/txt/page.tsx
src/app/docs/how-indxr-works/export-formats/vtt/page.tsx
src/app/docs/how-indxr-works/languages/page.tsx
src/app/docs/how-indxr-works/limits/page.tsx
src/app/docs/how-indxr-works/overview/page.tsx
src/app/docs/page.tsx
src/app/favicon.ico
src/app/forgot-password/page.tsx
src/app/globals.css
src/app/layout.tsx
src/app/login/page.tsx
src/app/onboarding/page.tsx
src/app/pricing/page.tsx
src/app/privacy/page.tsx
src/app/signup/page.tsx
src/app/sitemap.ts
src/app/styles/tokens.css
src/app/suspended/page.tsx
src/app/terms/page.tsx
src/app/transcribe/layout.tsx
src/app/transcribe/page.tsx
src/components/Footer.tsx
src/components/Header.tsx
src/components/PlaylistAvailabilitySummary.tsx
src/components/PlaylistManager.tsx
src/components/PlaylistManager_additions.txt
src/components/SaveErrorModal.tsx
src/components/TranscriptCard.tsx
src/components/UserAvatar.tsx
src/components/app-sidebar.tsx
src/components/content/AuthorCard.tsx
src/components/content/templates/ArticleTemplate.tsx
src/components/content/templates/ToolPageTemplate.tsx
src/components/content/templates/TutorialTemplate.tsx
src/components/dashboard/ActiveJobsIndicator.tsx
src/components/dashboard/MobileTabBar.tsx
src/components/dashboard/WelcomeCreditCard.tsx
src/components/dashboard/billing/BillingPurchaseGrid.tsx
src/components/dashboard/settings/DeveloperExportsCard.tsx
src/components/dashboard/settings/ProfileSettingsCard.tsx
src/components/dashboard/settings/SecuritySettingsCard.tsx
src/components/dashboard/settings/SentryFeedbackCard.tsx
src/components/dashboard/settings/TransactionHistoryCard.tsx
src/components/docs/AnchorHeading.tsx
src/components/docs/DefinitionLeadOpening.tsx
src/components/docs/DocsBreadcrumb.tsx
src/components/docs/DocsCategorySection.tsx
src/components/docs/DocsHubHero.tsx
src/components/docs/DocsShell.tsx
src/components/docs/DocsSidebar.tsx
src/components/docs/EdgeCasesCallout.tsx
src/components/docs/FeaturedDocsGrid.tsx
src/components/docs/InPageTOC.tsx
src/components/docs/NextStepsBlock.tsx
src/components/docs/PrerequisitesBlock.tsx
src/components/docs/ReferenceTable.tsx
src/components/docs/RelatedTopicsList.tsx
src/components/docs/TutorialOpening.tsx
src/components/docs/TutorialStep.tsx
src/components/docs/WhatJustHappened.tsx
src/components/free-tool/AudioTab.tsx
src/components/free-tool/PlaylistTab.tsx
src/components/free-tool/VideoTab.tsx
src/components/library/AiSummaryView.tsx
src/components/library/RagExportView.tsx
src/components/library/TranscriptList.tsx
src/components/library/TranscriptViewer.tsx
src/components/marketing/ClosingCTASection.tsx
src/components/marketing/DifferentiatorStrip.tsx
src/components/marketing/FAQAccordion.tsx
src/components/marketing/FrictionConversionCard.tsx
src/components/marketing/HeroImage.tsx
src/components/marketing/HowItWorksBlock.tsx
src/components/marketing/MacbookMockupFrame.tsx
src/components/marketing/MicroTrustRow.tsx
src/components/marketing/PricingTeaserBlock.tsx
src/components/marketing/RemotionLoop.tsx
src/components/marketing/StatsFromTesting.tsx
src/components/marketing/TestimonialPlaceholder.tsx
src/components/pricing/AlwaysFreeBlock.tsx
src/components/pricing/BuyButton.tsx
src/components/pricing/CreditCostTable.tsx
src/components/pricing/PricingHero.tsx
src/components/pricing/PricingTierCard.tsx
src/components/pricing/PricingTierGrid.tsx
src/components/pricing/SecondaryTierStrip.tsx
src/components/pricing/TrustRowCards.tsx
src/components/pricing/VatLine.tsx
src/components/seo/JsonLd.tsx
src/components/theme-provider.tsx
src/components/transcription/TranscriptionProgress.tsx
src/components/ui/PasswordInput.tsx
src/components/ui/alert-dialog.tsx
src/components/ui/alert.tsx
src/components/ui/avatar.tsx
src/components/ui/badge.tsx
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/checkbox.tsx
src/components/ui/command.tsx
src/components/ui/credit-balance.tsx
src/components/ui/dialog.tsx
src/components/ui/dropdown-menu.tsx
src/components/ui/empty-state.tsx
src/components/ui/form.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/loading-skeleton.tsx
src/components/ui/logo.tsx
src/components/ui/pricing-card.tsx
src/components/ui/progress.tsx
src/components/ui/scroll-area.tsx
src/components/ui/select.tsx
src/components/ui/separator.tsx
src/components/ui/sheet.tsx
src/components/ui/sidebar.tsx
src/components/ui/skeleton.tsx
src/components/ui/slider.tsx
src/components/ui/sonner.tsx
src/components/ui/switch.tsx
src/components/ui/table.tsx
src/components/ui/tabs.tsx
src/components/ui/theme-toggle.tsx
src/components/ui/tooltip.tsx
src/contexts/AuthContext.tsx
src/hooks/use-mobile.ts
src/hooks/useAuth.ts
src/hooks/useJobStatus.ts
src/lib/authors.ts
src/lib/cross-host-links.ts
src/lib/docs-config.ts
src/lib/eta.ts
src/lib/pollingBackoff.ts
src/lib/pricing.ts
src/lib/ratelimit.ts
src/lib/stripe.ts
src/lib/utils.ts
src/middleware.ts
src/providers/PostHogProvider.tsx
src/types/sbd.d.ts
src/types/transcript.ts
src/utils/disposable-email.ts
src/utils/formatTranscript.ts
src/utils/supabase/admin.ts
src/utils/supabase/client.ts
src/utils/supabase/middleware.ts
src/utils/supabase/server.ts
src/utils/validation.ts
src/utils/youtube.ts
---
[2026-05-05 12:54] commit: feat(monorepo): split src/ into apps/marketing, apps/app, packages/shared

Pnpm workspace migration. Single Next.js src/ tree split into:
- apps/marketing — public site, auth, docs, free transcribe tool (indxr.ai)
- apps/app — authenticated dashboard, admin, billing (app.indxr.ai)
- packages/shared — shared UI components, hooks, utils, types

Includes post-migration cleanup (A1+A1.5+A1b):
- Shared files consolidated in packages/shared/src/ (pricing, eta,
  rag-export, ratelimit, auth-actions)
- Tsconfig path aliases: @/* local-only, @indxr/shared/* explicit
- Orphans removed: pollingBackoff.ts, 3 docs components
- .gitignore updated for monorepo structure

Both apps verified building successfully.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: .gitignore
apps/app/eslint.config.mjs
apps/app/instrumentation.ts
apps/app/next.config.ts
apps/app/package.json
apps/app/postcss.config.mjs
apps/app/public/apple-touch-icon.png
apps/app/public/favicon-96x96.png
apps/app/public/favicon.ico
apps/app/public/favicon.svg
apps/app/public/file.svg
apps/app/public/globe.svg
apps/app/public/hero-dark.jpg
apps/app/public/hero-light.jpg
apps/app/public/llms.txt
apps/app/public/logo/indxr-horizontal-black-on-white.png
apps/app/public/logo/indxr-horizontal-black-transparent.png
apps/app/public/logo/indxr-horizontal-black-transparent.svg
apps/app/public/logo/indxr-horizontal-white-on-black.png
apps/app/public/logo/indxr-horizontal-white-transparent.png
apps/app/public/logo/indxr-horizontal-white-transparent.svg
apps/app/public/logo/indxr-mark-black-on-white.png
apps/app/public/logo/indxr-mark-black-transparent.png
apps/app/public/logo/indxr-mark-black-transparent.svg
apps/app/public/logo/indxr-mark-white-on-black.png
apps/app/public/logo/indxr-mark-white-transparent.png
apps/app/public/logo/indxr-mark-white-transparent.svg
apps/app/public/logo/indxr-wordmark-black-on-white.png
apps/app/public/logo/indxr-wordmark-black-transparent.png
apps/app/public/logo/indxr-wordmark-black-transparent.svg
apps/app/public/logo/indxr-wordmark-white-on-black.png
apps/app/public/logo/indxr-wordmark-white-transparent.png
apps/app/public/logo/indxr-wordmark-white-transparent.svg
apps/app/public/next.svg
apps/app/public/robots.txt
apps/app/public/site.webmanifest
apps/app/public/vercel.svg
apps/app/public/web-app-manifest-192x192.png
apps/app/public/web-app-manifest-512x512.png
apps/app/public/window.svg
apps/app/sentry.client.config.ts
apps/app/sentry.edge.config.ts
apps/app/sentry.server.config.ts
apps/app/src/app/actions/credits.ts
apps/app/src/app/admin/credits/CreditsCsvExport.tsx
apps/app/src/app/admin/credits/page.tsx
apps/app/src/app/admin/layout.tsx
apps/app/src/app/admin/page.tsx
apps/app/src/app/admin/paid-users/page.tsx
apps/app/src/app/admin/transcripts/TranscriptDeleteButton.tsx
apps/app/src/app/admin/transcripts/[id]/page.tsx
apps/app/src/app/admin/transcripts/page.tsx
apps/app/src/app/admin/users/UsersTable.tsx
apps/app/src/app/admin/users/page.tsx
apps/app/src/app/api/admin/add-credits/route.ts
apps/app/src/app/api/admin/delete-transcript/route.ts
apps/app/src/app/api/admin/delete-user/route.ts
apps/app/src/app/api/admin/suspend-user/route.ts
apps/app/src/app/api/admin/user-detail/route.ts
apps/app/src/app/api/ai/summarize/route.ts
apps/app/src/app/api/check-playlist-availability/route.ts
apps/app/src/app/api/extract/route.ts
apps/app/src/app/api/jobs/[job_id]/route.ts
apps/app/src/app/api/playlist/extract/route.ts
apps/app/src/app/api/playlist/info/route.ts
apps/app/src/app/api/playlist/jobs/[jobId]/route.ts
apps/app/src/app/api/stripe/checkout/route.ts
apps/app/src/app/api/stripe/webhook/route.ts
apps/app/src/app/api/transcribe/preflight/route.ts
apps/app/src/app/api/transcribe/whisper/route.ts
apps/app/src/app/api/video/metadata/[videoId]/route.ts
apps/app/src/app/dashboard/account/page.tsx
apps/app/src/app/dashboard/billing/cancel/page.tsx
apps/app/src/app/dashboard/billing/page.tsx
apps/app/src/app/dashboard/billing/success/page.tsx
apps/app/src/app/dashboard/layout.tsx
apps/app/src/app/dashboard/library/[id]/page.tsx
apps/app/src/app/dashboard/library/page.tsx
apps/app/src/app/dashboard/messages/MessagesClient.tsx
apps/app/src/app/dashboard/messages/page.tsx
apps/app/src/app/dashboard/page.tsx
apps/app/src/app/dashboard/settings/page.tsx
apps/app/src/app/dashboard/transcribe/page.tsx
apps/app/src/app/favicon.ico
apps/app/src/app/globals.css
apps/app/src/app/layout.tsx
apps/app/src/app/styles/tokens.css
apps/app/src/components/SaveErrorModal.tsx
apps/app/src/components/app-sidebar.tsx
apps/app/src/components/dashboard/ActiveJobsIndicator.tsx
apps/app/src/components/dashboard/MobileTabBar.tsx
apps/app/src/components/dashboard/WelcomeCreditCard.tsx
apps/app/src/components/dashboard/billing/BillingPurchaseGrid.tsx
apps/app/src/components/dashboard/settings/DeveloperExportsCard.tsx
apps/app/src/components/dashboard/settings/ProfileSettingsCard.tsx
apps/app/src/components/dashboard/settings/SecuritySettingsCard.tsx
apps/app/src/components/dashboard/settings/SentryFeedbackCard.tsx
apps/app/src/components/dashboard/settings/TransactionHistoryCard.tsx
apps/app/src/components/library/AiSummaryView.tsx
apps/app/src/components/library/RagExportView.tsx
apps/app/src/components/library/TranscriptList.tsx
apps/app/src/components/library/TranscriptViewer.tsx
apps/app/src/lib/stripe.ts
apps/app/src/middleware.ts
apps/app/tsconfig.json
apps/marketing/eslint.config.mjs
apps/marketing/instrumentation.ts
apps/marketing/next.config.ts
apps/marketing/package.json
apps/marketing/postcss.config.mjs
apps/marketing/public/apple-touch-icon.png
apps/marketing/public/favicon-96x96.png
apps/marketing/public/favicon.ico
apps/marketing/public/favicon.svg
apps/marketing/public/file.svg
apps/marketing/public/globe.svg
apps/marketing/public/hero-dark.jpg
apps/marketing/public/hero-light.jpg
apps/marketing/public/llms.txt
apps/marketing/public/logo/indxr-horizontal-black-on-white.png
apps/marketing/public/logo/indxr-horizontal-black-transparent.png
apps/marketing/public/logo/indxr-horizontal-black-transparent.svg
apps/marketing/public/logo/indxr-horizontal-white-on-black.png
apps/marketing/public/logo/indxr-horizontal-white-transparent.png
apps/marketing/public/logo/indxr-horizontal-white-transparent.svg
apps/marketing/public/logo/indxr-mark-black-on-white.png
apps/marketing/public/logo/indxr-mark-black-transparent.png
apps/marketing/public/logo/indxr-mark-black-transparent.svg
apps/marketing/public/logo/indxr-mark-white-on-black.png
apps/marketing/public/logo/indxr-mark-white-transparent.png
apps/marketing/public/logo/indxr-mark-white-transparent.svg
apps/marketing/public/logo/indxr-wordmark-black-on-white.png
apps/marketing/public/logo/indxr-wordmark-black-transparent.png
apps/marketing/public/logo/indxr-wordmark-black-transparent.svg
apps/marketing/public/logo/indxr-wordmark-white-on-black.png
apps/marketing/public/logo/indxr-wordmark-white-transparent.png
apps/marketing/public/logo/indxr-wordmark-white-transparent.svg
apps/marketing/public/next.svg
apps/marketing/public/robots.txt
apps/marketing/public/site.webmanifest
apps/marketing/public/vercel.svg
apps/marketing/public/web-app-manifest-192x192.png
apps/marketing/public/web-app-manifest-512x512.png
apps/marketing/public/window.svg
apps/marketing/sentry.client.config.ts
apps/marketing/sentry.edge.config.ts
apps/marketing/sentry.server.config.ts
apps/marketing/src/app/about/page.tsx
apps/marketing/src/app/api/check-playlist-availability/route.ts
apps/marketing/src/app/api/extract/route.ts
apps/marketing/src/app/api/video/metadata/[videoId]/route.ts
apps/marketing/src/app/articles/audio-to-text/page.tsx
apps/marketing/src/app/articles/bulk-youtube-transcript/page.tsx
apps/marketing/src/app/articles/chunk-youtube-transcripts-for-rag/page.tsx
apps/marketing/src/app/articles/page.tsx
apps/marketing/src/app/articles/youtube-age-restricted-transcript/page.tsx
apps/marketing/src/app/articles/youtube-channel-knowledge-base/page.tsx
apps/marketing/src/app/articles/youtube-members-only-transcript/page.tsx
apps/marketing/src/app/articles/youtube-playlist-transcript/page.tsx
apps/marketing/src/app/articles/youtube-srt-download/page.tsx
apps/marketing/src/app/articles/youtube-to-text/page.tsx
apps/marketing/src/app/articles/youtube-transcript-csv/page.tsx
apps/marketing/src/app/articles/youtube-transcript-for-rag/page.tsx
apps/marketing/src/app/articles/youtube-transcript-json/page.tsx
apps/marketing/src/app/articles/youtube-transcript-markdown/page.tsx
apps/marketing/src/app/articles/youtube-transcript-non-english/page.tsx
apps/marketing/src/app/articles/youtube-transcript-not-available/page.tsx
apps/marketing/src/app/articles/youtube-transcript-obsidian/page.tsx
apps/marketing/src/app/articles/youtube-transcript-without-extension/page.tsx
apps/marketing/src/app/articles/youtube-transcripts-vector-database/page.tsx
apps/marketing/src/app/auth/callback/route.ts
apps/marketing/src/app/contact/page.tsx
apps/marketing/src/app/docs/account-and-data/credits-and-billing/page.tsx
apps/marketing/src/app/docs/account-and-data/data-handling/page.tsx
apps/marketing/src/app/docs/getting-started/page.tsx
apps/marketing/src/app/docs/help/faq/page.tsx
apps/marketing/src/app/docs/help/how-to/page.tsx
apps/marketing/src/app/docs/help/troubleshooting/page.tsx
apps/marketing/src/app/docs/how-indxr-works/accuracy/ai-transcription/page.tsx
apps/marketing/src/app/docs/how-indxr-works/accuracy/auto-captions/page.tsx
apps/marketing/src/app/docs/how-indxr-works/accuracy/page.tsx
apps/marketing/src/app/docs/how-indxr-works/api/page.tsx
apps/marketing/src/app/docs/how-indxr-works/credits/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/csv/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/json/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/markdown/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/srt/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/txt/page.tsx
apps/marketing/src/app/docs/how-indxr-works/export-formats/vtt/page.tsx
apps/marketing/src/app/docs/how-indxr-works/languages/page.tsx
apps/marketing/src/app/docs/how-indxr-works/limits/page.tsx
apps/marketing/src/app/docs/how-indxr-works/overview/page.tsx
apps/marketing/src/app/docs/page.tsx
apps/marketing/src/app/favicon.ico
apps/marketing/src/app/forgot-password/page.tsx
apps/marketing/src/app/globals.css
apps/marketing/src/app/layout.tsx
apps/marketing/src/app/login/page.tsx
apps/marketing/src/app/onboarding/page.tsx
apps/marketing/src/app/page.tsx
apps/marketing/src/app/pricing/page.tsx
apps/marketing/src/app/privacy/page.tsx
apps/marketing/src/app/signup/page.tsx
apps/marketing/src/app/sitemap.ts
apps/marketing/src/app/styles/tokens.css
apps/marketing/src/app/suspended/page.tsx
apps/marketing/src/app/terms/page.tsx
apps/marketing/src/app/transcribe/layout.tsx
apps/marketing/src/app/transcribe/page.tsx
apps/marketing/src/components/content/AuthorCard.tsx
apps/marketing/src/components/content/templates/ArticleTemplate.tsx
apps/marketing/src/components/content/templates/ToolPageTemplate.tsx
apps/marketing/src/components/content/templates/TutorialTemplate.tsx
apps/marketing/src/components/docs/AnchorHeading.tsx
apps/marketing/src/components/docs/DefinitionLeadOpening.tsx
apps/marketing/src/components/docs/DocsBreadcrumb.tsx
apps/marketing/src/components/docs/DocsCategorySection.tsx
apps/marketing/src/components/docs/DocsHubHero.tsx
apps/marketing/src/components/docs/DocsShell.tsx
apps/marketing/src/components/docs/DocsSidebar.tsx
apps/marketing/src/components/docs/EdgeCasesCallout.tsx
apps/marketing/src/components/docs/FeaturedDocsGrid.tsx
apps/marketing/src/components/docs/InPageTOC.tsx
apps/marketing/src/components/docs/NextStepsBlock.tsx
apps/marketing/src/components/docs/PrerequisitesBlock.tsx
apps/marketing/src/components/docs/ReferenceTable.tsx
apps/marketing/src/components/docs/RelatedTopicsList.tsx
apps/marketing/src/components/docs/TutorialOpening.tsx
apps/marketing/src/components/docs/TutorialStep.tsx
apps/marketing/src/components/docs/WhatJustHappened.tsx
apps/marketing/src/components/marketing/ClosingCTASection.tsx
apps/marketing/src/components/marketing/DifferentiatorStrip.tsx
apps/marketing/src/components/marketing/FAQAccordion.tsx
apps/marketing/src/components/marketing/FrictionConversionCard.tsx
apps/marketing/src/components/marketing/HeroImage.tsx
apps/marketing/src/components/marketing/HowItWorksBlock.tsx
apps/marketing/src/components/marketing/MacbookMockupFrame.tsx
apps/marketing/src/components/marketing/MicroTrustRow.tsx
apps/marketing/src/components/marketing/PricingTeaserBlock.tsx
apps/marketing/src/components/marketing/RemotionLoop.tsx
apps/marketing/src/components/marketing/StatsFromTesting.tsx
apps/marketing/src/components/marketing/TestimonialPlaceholder.tsx
apps/marketing/src/components/pricing/AlwaysFreeBlock.tsx
apps/marketing/src/components/pricing/BuyButton.tsx
apps/marketing/src/components/pricing/CreditCostTable.tsx
apps/marketing/src/components/pricing/PricingHero.tsx
apps/marketing/src/components/pricing/PricingTierCard.tsx
apps/marketing/src/components/pricing/PricingTierGrid.tsx
apps/marketing/src/components/pricing/SecondaryTierStrip.tsx
apps/marketing/src/components/pricing/TrustRowCards.tsx
apps/marketing/src/components/pricing/VatLine.tsx
apps/marketing/src/components/seo/JsonLd.tsx
apps/marketing/src/lib/authors.ts
apps/marketing/src/lib/docs-config.ts
apps/marketing/src/middleware.ts
apps/marketing/tsconfig.json
docs/wiki/migration/migration-002-report.md
package-lock.json
package.json
packages/shared/package.json
packages/shared/src/actions/auth-actions.ts
packages/shared/src/actions/rag-export.ts
packages/shared/src/components/Footer.tsx
packages/shared/src/components/Header.tsx
packages/shared/src/components/PlaylistAvailabilitySummary.tsx
packages/shared/src/components/PlaylistManager.tsx
packages/shared/src/components/TranscriptCard.tsx
packages/shared/src/components/UserAvatar.tsx
packages/shared/src/components/free-tool/AudioTab.tsx
packages/shared/src/components/free-tool/PlaylistTab.tsx
packages/shared/src/components/free-tool/VideoTab.tsx
packages/shared/src/components/theme-provider.tsx
packages/shared/src/components/transcription/TranscriptionProgress.tsx
packages/shared/src/components/ui/PasswordInput.tsx
packages/shared/src/components/ui/alert-dialog.tsx
packages/shared/src/components/ui/alert.tsx
packages/shared/src/components/ui/avatar.tsx
packages/shared/src/components/ui/badge.tsx
packages/shared/src/components/ui/button.tsx
packages/shared/src/components/ui/card.tsx
packages/shared/src/components/ui/checkbox.tsx
packages/shared/src/components/ui/command.tsx
packages/shared/src/components/ui/credit-balance.tsx
packages/shared/src/components/ui/dialog.tsx
packages/shared/src/components/ui/dropdown-menu.tsx
packages/shared/src/components/ui/empty-state.tsx
packages/shared/src/components/ui/form.tsx
packages/shared/src/components/ui/input.tsx
packages/shared/src/components/ui/label.tsx
packages/shared/src/components/ui/loading-skeleton.tsx
packages/shared/src/components/ui/logo.tsx
packages/shared/src/components/ui/pricing-card.tsx
packages/shared/src/components/ui/progress.tsx
packages/shared/src/components/ui/scroll-area.tsx
packages/shared/src/components/ui/select.tsx
packages/shared/src/components/ui/separator.tsx
packages/shared/src/components/ui/sheet.tsx
packages/shared/src/components/ui/sidebar.tsx
packages/shared/src/components/ui/skeleton.tsx
packages/shared/src/components/ui/slider.tsx
packages/shared/src/components/ui/sonner.tsx
packages/shared/src/components/ui/switch.tsx
packages/shared/src/components/ui/table.tsx
packages/shared/src/components/ui/tabs.tsx
packages/shared/src/components/ui/theme-toggle.tsx
packages/shared/src/components/ui/tooltip.tsx
packages/shared/src/contexts/AuthContext.tsx
packages/shared/src/hooks/use-mobile.ts
packages/shared/src/hooks/useAuth.ts
packages/shared/src/hooks/useJobStatus.ts
packages/shared/src/lib/cross-host-links.ts
packages/shared/src/lib/eta.ts
packages/shared/src/lib/pollingBackoff.ts
packages/shared/src/lib/pricing.ts
packages/shared/src/lib/ratelimit.ts
packages/shared/src/lib/utils.ts
packages/shared/src/providers/PostHogProvider.tsx
packages/shared/src/types/sbd.d.ts
packages/shared/src/types/transcript.ts
packages/shared/src/utils/disposable-email.ts
packages/shared/src/utils/formatTranscript.ts
packages/shared/src/utils/supabase/admin.ts
packages/shared/src/utils/supabase/client.ts
packages/shared/src/utils/supabase/middleware.ts
packages/shared/src/utils/supabase/server.ts
packages/shared/src/utils/validation.ts
packages/shared/src/utils/youtube.ts
packages/shared/tsconfig.json
pnpm-lock.yaml
pnpm-workspace.yaml
src/app/(app)/admin/credits/CreditsCsvExport.tsx
src/app/(app)/admin/credits/page.tsx
src/app/(app)/admin/layout.tsx
src/app/(app)/admin/page.tsx
src/app/(app)/admin/paid-users/page.tsx
src/app/(app)/admin/transcripts/TranscriptDeleteButton.tsx
src/app/(app)/admin/transcripts/[id]/page.tsx
src/app/(app)/admin/transcripts/page.tsx
src/app/(app)/admin/users/UsersTable.tsx
src/app/(app)/admin/users/page.tsx
src/app/(app)/dashboard/account/page.tsx
src/app/(app)/dashboard/billing/cancel/page.tsx
src/app/(app)/dashboard/billing/page.tsx
src/app/(app)/dashboard/billing/success/page.tsx
src/app/(app)/dashboard/layout.tsx
src/app/(app)/dashboard/library/[id]/page.tsx
src/app/(app)/dashboard/library/page.tsx
src/app/(app)/dashboard/messages/MessagesClient.tsx
src/app/(app)/dashboard/messages/page.tsx
src/app/(app)/dashboard/page.tsx
src/app/(app)/dashboard/settings/page.tsx
src/app/(app)/dashboard/transcribe/page.tsx
src/app/(marketing)/page.tsx
src/app/about/page.tsx
src/app/actions/credits.ts
src/app/actions/rag-export.ts
src/app/api/admin/add-credits/route.ts
src/app/api/admin/delete-transcript/route.ts
src/app/api/admin/delete-user/route.ts
src/app/api/admin/suspend-user/route.ts
src/app/api/admin/user-detail/route.ts
src/app/api/ai/summarize/route.ts
src/app/api/check-playlist-availability/route.ts
src/app/api/extract/route.ts
src/app/api/jobs/[job_id]/route.ts
src/app/api/playlist/extract/route.ts
src/app/api/playlist/info/route.ts
src/app/api/playlist/jobs/[jobId]/route.ts
src/app/api/stripe/checkout/route.ts
src/app/api/stripe/webhook/route.ts
src/app/api/transcribe/preflight/route.ts
src/app/api/transcribe/whisper/route.ts
src/app/api/video/metadata/[videoId]/route.ts
src/app/articles/audio-to-text/page.tsx
src/app/articles/bulk-youtube-transcript/page.tsx
src/app/articles/chunk-youtube-transcripts-for-rag/page.tsx
src/app/articles/page.tsx
src/app/articles/youtube-age-restricted-transcript/page.tsx
src/app/articles/youtube-channel-knowledge-base/page.tsx
src/app/articles/youtube-members-only-transcript/page.tsx
src/app/articles/youtube-playlist-transcript/page.tsx
src/app/articles/youtube-srt-download/page.tsx
src/app/articles/youtube-to-text/page.tsx
src/app/articles/youtube-transcript-csv/page.tsx
src/app/articles/youtube-transcript-for-rag/page.tsx
src/app/articles/youtube-transcript-json/page.tsx
src/app/articles/youtube-transcript-markdown/page.tsx
src/app/articles/youtube-transcript-non-english/page.tsx
src/app/articles/youtube-transcript-not-available/page.tsx
src/app/articles/youtube-transcript-obsidian/page.tsx
src/app/articles/youtube-transcript-without-extension/page.tsx
src/app/articles/youtube-transcripts-vector-database/page.tsx
src/app/auth/actions.ts
src/app/auth/callback/route.ts
src/app/contact/page.tsx
src/app/docs/account-and-data/credits-and-billing/page.tsx
src/app/docs/account-and-data/data-handling/page.tsx
src/app/docs/getting-started/page.tsx
src/app/docs/help/faq/page.tsx
src/app/docs/help/how-to/page.tsx
src/app/docs/help/troubleshooting/page.tsx
src/app/docs/how-indxr-works/accuracy/ai-transcription/page.tsx
src/app/docs/how-indxr-works/accuracy/auto-captions/page.tsx
src/app/docs/how-indxr-works/accuracy/page.tsx
src/app/docs/how-indxr-works/api/page.tsx
src/app/docs/how-indxr-works/credits/page.tsx
src/app/docs/how-indxr-works/export-formats/csv/page.tsx
src/app/docs/how-indxr-works/export-formats/json/page.tsx
src/app/docs/how-indxr-works/export-formats/markdown/page.tsx
src/app/docs/how-indxr-works/export-formats/page.tsx
src/app/docs/how-indxr-works/export-formats/srt/page.tsx
src/app/docs/how-indxr-works/export-formats/txt/page.tsx
src/app/docs/how-indxr-works/export-formats/vtt/page.tsx
src/app/docs/how-indxr-works/languages/page.tsx
src/app/docs/how-indxr-works/limits/page.tsx
src/app/docs/how-indxr-works/overview/page.tsx
src/app/docs/page.tsx
src/app/favicon.ico
src/app/forgot-password/page.tsx
src/app/globals.css
src/app/layout.tsx
src/app/login/page.tsx
src/app/onboarding/page.tsx
src/app/pricing/page.tsx
src/app/privacy/page.tsx
src/app/signup/page.tsx
src/app/sitemap.ts
src/app/styles/tokens.css
src/app/suspended/page.tsx
src/app/terms/page.tsx
src/app/transcribe/layout.tsx
src/app/transcribe/page.tsx
src/components/Footer.tsx
src/components/Header.tsx
src/components/PlaylistAvailabilitySummary.tsx
src/components/PlaylistManager.tsx
src/components/PlaylistManager_additions.txt
src/components/SaveErrorModal.tsx
src/components/TranscriptCard.tsx
src/components/UserAvatar.tsx
src/components/app-sidebar.tsx
src/components/content/AuthorCard.tsx
src/components/content/templates/ArticleTemplate.tsx
src/components/content/templates/ToolPageTemplate.tsx
src/components/content/templates/TutorialTemplate.tsx
src/components/dashboard/ActiveJobsIndicator.tsx
src/components/dashboard/MobileTabBar.tsx
src/components/dashboard/WelcomeCreditCard.tsx
src/components/dashboard/billing/BillingPurchaseGrid.tsx
src/components/dashboard/settings/DeveloperExportsCard.tsx
src/components/dashboard/settings/ProfileSettingsCard.tsx
src/components/dashboard/settings/SecuritySettingsCard.tsx
src/components/dashboard/settings/SentryFeedbackCard.tsx
src/components/dashboard/settings/TransactionHistoryCard.tsx
src/components/docs/AnchorHeading.tsx
src/components/docs/DefinitionLeadOpening.tsx
src/components/docs/DocsBreadcrumb.tsx
src/components/docs/DocsCategorySection.tsx
src/components/docs/DocsHubHero.tsx
src/components/docs/DocsShell.tsx
src/components/docs/DocsSidebar.tsx
src/components/docs/EdgeCasesCallout.tsx
src/components/docs/FeaturedDocsGrid.tsx
src/components/docs/InPageTOC.tsx
src/components/docs/NextStepsBlock.tsx
src/components/docs/PrerequisitesBlock.tsx
src/components/docs/ReferenceTable.tsx
src/components/docs/RelatedTopicsList.tsx
src/components/docs/TutorialOpening.tsx
src/components/docs/TutorialStep.tsx
src/components/docs/WhatJustHappened.tsx
src/components/free-tool/AudioTab.tsx
src/components/free-tool/PlaylistTab.tsx
src/components/free-tool/VideoTab.tsx
src/components/library/AiSummaryView.tsx
src/components/library/RagExportView.tsx
src/components/library/TranscriptList.tsx
src/components/library/TranscriptViewer.tsx
src/components/marketing/ClosingCTASection.tsx
src/components/marketing/DifferentiatorStrip.tsx
src/components/marketing/FAQAccordion.tsx
src/components/marketing/FrictionConversionCard.tsx
src/components/marketing/HeroImage.tsx
src/components/marketing/HowItWorksBlock.tsx
src/components/marketing/MacbookMockupFrame.tsx
src/components/marketing/MicroTrustRow.tsx
src/components/marketing/PricingTeaserBlock.tsx
src/components/marketing/RemotionLoop.tsx
src/components/marketing/StatsFromTesting.tsx
src/components/marketing/TestimonialPlaceholder.tsx
src/components/pricing/AlwaysFreeBlock.tsx
src/components/pricing/BuyButton.tsx
src/components/pricing/CreditCostTable.tsx
src/components/pricing/PricingHero.tsx
src/components/pricing/PricingTierCard.tsx
src/components/pricing/PricingTierGrid.tsx
src/components/pricing/SecondaryTierStrip.tsx
src/components/pricing/TrustRowCards.tsx
src/components/pricing/VatLine.tsx
src/components/seo/JsonLd.tsx
src/components/theme-provider.tsx
src/components/transcription/TranscriptionProgress.tsx
src/components/ui/PasswordInput.tsx
src/components/ui/alert-dialog.tsx
src/components/ui/alert.tsx
src/components/ui/avatar.tsx
src/components/ui/badge.tsx
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/checkbox.tsx
src/components/ui/command.tsx
src/components/ui/credit-balance.tsx
src/components/ui/dialog.tsx
src/components/ui/dropdown-menu.tsx
src/components/ui/empty-state.tsx
src/components/ui/form.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/loading-skeleton.tsx
src/components/ui/logo.tsx
src/components/ui/pricing-card.tsx
src/components/ui/progress.tsx
src/components/ui/scroll-area.tsx
src/components/ui/select.tsx
src/components/ui/separator.tsx
src/components/ui/sheet.tsx
src/components/ui/sidebar.tsx
src/components/ui/skeleton.tsx
src/components/ui/slider.tsx
src/components/ui/sonner.tsx
src/components/ui/switch.tsx
src/components/ui/table.tsx
src/components/ui/tabs.tsx
src/components/ui/theme-toggle.tsx
src/components/ui/tooltip.tsx
src/contexts/AuthContext.tsx
src/hooks/use-mobile.ts
src/hooks/useAuth.ts
src/hooks/useJobStatus.ts
src/lib/authors.ts
src/lib/cross-host-links.ts
src/lib/docs-config.ts
src/lib/eta.ts
src/lib/pollingBackoff.ts
src/lib/pricing.ts
src/lib/ratelimit.ts
src/lib/stripe.ts
src/lib/utils.ts
src/middleware.ts
src/providers/PostHogProvider.tsx
src/types/sbd.d.ts
src/types/transcript.ts
src/utils/disposable-email.ts
src/utils/formatTranscript.ts
src/utils/supabase/admin.ts
src/utils/supabase/client.ts
src/utils/supabase/middleware.ts
src/utils/supabase/server.ts
src/utils/validation.ts
src/utils/youtube.ts
---
[2026-05-05 12:54] commit: docs(monorepo): tooling, ADR-046, wiki updates after monorepo split

- .claude/hooks/check-wiki.sh: extracted inline stop hook to readable script
- ADR-046: import alias decision (@/* local, @indxr/shared/* shared)
- INDEX.md: ADR-046 entry added
- pricing-source-of-truth.md: import path finalized
- auth-and-security.md, known-issues.md: ratelimit path updated
- deployment.md: two-Vercel architecture documented
- LOG.md: A1 through orphan-cleanup entries
- Orphan cleanup: AnchorHeading, InPageTOC, ReferenceTable removed
  (no MDX files in project, zero references outside own definitions)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: .claude/hooks/check-wiki.sh
.claude/settings.json
apps/marketing/src/components/docs/AnchorHeading.tsx
apps/marketing/src/components/docs/InPageTOC.tsx
apps/marketing/src/components/docs/ReferenceTable.tsx
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/auth-and-security.md
docs/wiki/architecture/pricing-source-of-truth.md
docs/wiki/decisions/015-rag-json-export.md
docs/wiki/decisions/046-monorepo-import-aliases.md
docs/wiki/operations/deployment.md
docs/wiki/operations/known-issues.md
---
[2026-05-05 12:58] commit: docs: LOG entry + LESSONS git-workflow rule
Changed: docs/LESSONS.md
docs/LOG.md
---
[2026-05-05 14:33] commit: feat(monorepo): Turborepo + minimal vercel.json + wiki updates

- Turborepo introduced for build orchestration (ADR-047)
- vercel.json per app: minimal zero-config (framework: nextjs)
- LOG.md, INDEX.md, deployment.md, known-issues.md updates
- pnpm-lock.yaml updates
- .gitignore: .turbo/ added
Changed: .gitignore
CLAUDE.md
apps/app/vercel.json
apps/marketing/vercel.json
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/decisions/047-turborepo-build-orchestration.md
docs/wiki/operations/deployment.md
docs/wiki/operations/known-issues.md
package.json
pnpm-lock.yaml
turbo.json
---
[2026-05-06 05:12] commit: fix(turbo): use globalPassThroughEnv for server-side secrets

Vercel build of apps/app failed because Turborepo strict mode strips
env vars not whitelisted in turbo.json. After initial per-task fix,
refactored to globalPassThroughEnv for DRY config — secrets are
available to all tasks (build, dev, lint, typecheck) without
duplication. Future tasks (test, e2e, db:migrate) inherit access
automatically.

ADR-047 updated with secret-handling rationale.
Changed: docs/LOG.md
docs/wiki/decisions/047-turborepo-build-orchestration.md
turbo.json
---
[2026-05-06 05:57] precompact: context compaction triggered
[2026-05-06 20:27] commit: feat: cross-host redirects + B3-B5 migratie afronding

- apps/app/next.config.ts: 308 redirects voor /login, /signup,
  /forgot-password naar marketing host (SaaS standaard pattern)
- B3 domain transfer: indxr.ai canonical, www 301 → apex,
  app.indxr.ai → indxr-app project
- B4 DNS: A-record geüpdatet naar 216.150.1.1 (Vercel IP range)
- B5 Stripe webhook: live mode op app.indxr.ai/api/stripe/webhook,
  3 events, STRIPE_WEBHOOK_SECRET in Vercel
- Upstash quota recurrence: env vars verwijderd uit beide projects,
  noopLimiter actief tot bron 60s ping gediagnosticeerd is
- Nieuwe docs: cross-host-auth.md (architectuur baseline),
  cross-host-smoke-tests.md (productie validatie checklist)
Changed: apps/app/next.config.ts
docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/cross-host-auth.md
docs/wiki/operations/cross-host-smoke-tests.md
docs/wiki/operations/deployment.md
docs/wiki/operations/known-issues.md
---
[2026-05-06 23:14] precompact: context compaction triggered
[2026-05-06 23:32] commit: feat: app-host skelet — AppTopbar + sidebar rework

- Marketing Header verwijderd uit apps/app root layout
- Nieuwe AppTopbar (logo + theme/messages/credits/avatar)
- Sidebar: één toggle bovenin (desktop), SidebarTrigger in topbar (mobile)
- Admin nav: theme + avatar toegevoegd
- ThemeToggle: resolvedTheme fix (system state preserved)
- Library default ingeklapt buiten /dashboard/library route
- AvatarDropdown app-host variant met relatieve links
Changed: apps/app/src/app/admin/layout.tsx
apps/app/src/app/dashboard/layout.tsx
apps/app/src/app/dashboard/messages/MessagesClient.tsx
apps/app/src/app/layout.tsx
apps/app/src/components/AppTopbar.tsx
apps/app/src/components/AvatarDropdown.tsx
apps/app/src/components/app-sidebar.tsx
docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/cross-host-auth.md
packages/shared/src/components/ui/theme-toggle.tsx
---
[2026-05-07 00:11] commit: fix: app-host skelet visueel + post-login routing

- ThemeToggle relative overflow-hidden (Moon positioning bug)
- AppTopbar icon sizes uniform, credits pill, avatar smaller
- Dashboard layout restructured: AppTopbar buiten SidebarProvider
- Sidebar collapsible='none' (geen fixed top-16 meer)
- Post-login redirect: /dashboard/transcribe → /dashboard
- Nieuwe baseline doc: app-host-skeleton.md
Changed: apps/app/src/app/dashboard/layout.tsx
apps/app/src/components/AppTopbar.tsx
apps/app/src/components/AvatarDropdown.tsx
apps/app/src/components/app-sidebar.tsx
docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/app-host-skeleton.md
packages/shared/src/actions/auth-actions.ts
packages/shared/src/components/ui/theme-toggle.tsx
---
[2026-05-07 00:22] commit: fix: hotfix SidebarProvider als outer wrapper

useSidebar context error: AppTopbar bevat SidebarTrigger maar stond
buiten SidebarProvider. Fix: Provider als outer wrapper, layout-flex
in geneste div.
Changed: apps/app/src/app/dashboard/layout.tsx
docs/LESSONS.md
docs/LOG.md
---
[2026-05-07 14:30] precompact: context compaction triggered
[2026-05-07 14:37] commit: fix: post-login redirect /dashboard/transcribe → /dashboard

Twee plekken op marketing-host overrulden vorige server-action fix:
- login/page.tsx getRedirectTarget()
- auth/callback/route.ts post-OAuth redirect
Changed: apps/marketing/src/app/auth/callback/route.ts
apps/marketing/src/app/login/page.tsx
---
[2026-05-07 15:19] commit: fix: 9 layout + visuele fixes app-host

Pagina layouts (4): home mx-auto centering, library/[id] dubbele
padding verwijderd, billing max-w-4xl + single column grid.

Shared VideoTab (2): input max-w-xl→2xl, placeholder min-h-200px.
Raakt ook marketing /transcribe (akkoord).

Visuele bugs (3): sidebar Progress CSS-cycle gefixt (track zichtbaar),
ThemeToggle Moon inset-0 m-auto centering, AppTopbar credits h-9
gelijke baseline.
Changed: apps/app/src/app/dashboard/billing/page.tsx
apps/app/src/app/dashboard/library/[id]/page.tsx
apps/app/src/app/dashboard/page.tsx
apps/app/src/components/AppTopbar.tsx
apps/app/src/components/app-sidebar.tsx
docs/LESSONS.md
docs/LOG.md
packages/shared/src/components/free-tool/VideoTab.tsx
packages/shared/src/components/ui/theme-toggle.tsx
---
[2026-05-07 15:31] precompact: context compaction triggered
[2026-05-07 15:37] commit: fix: 3 visuele issues — VideoTab input + hint, theme toggle

- VideoTab: input neemt nu beschikbare ruimte (flex altijd row,
  min-w-0 op wrapper, shrink-0 op button)
- VideoTab: 'Paste any YouTube URL' hint nu boven de input rij
- ThemeToggle: CSS dark: variants vervangen door JS conditional
  render (useState mounted + resolvedTheme) — één icon tegelijk
Changed: docs/LOG.md
packages/shared/src/components/free-tool/VideoTab.tsx
packages/shared/src/components/ui/theme-toggle.tsx
---
[2026-05-07 17:07] commit: fix: 3 finale visuele fixes — icons + topbar baseline

- VideoTab: Search icon + pl-10 verwijderd uit URL input
- PlaylistManager: ListOrdered icon + pl-10 verwijderd
- AppTopbar: flex items-center op Messages wrapper voor gelijke
  baseline met andere icons
Changed: apps/app/src/components/AppTopbar.tsx
docs/LOG.md
packages/shared/src/components/PlaylistManager.tsx
packages/shared/src/components/free-tool/VideoTab.tsx
---
[2026-05-08 21:20] commit: feat: docs consolidation + Playwright cross-host smoke tests

DEEL 1: known-issues B6 herschreven, app-host-skeleton geüpdatet,
cross-host-auth redirect targets gefixt, smoke-tests doc bijgewerkt
met automatisering-kolom + run-instructies, nieuwe migration-summary.md

DEEL 2: 6 spec files (auth.setup, redirects, auth-flow, nav, logout,
admin), playwright.smoke.config.ts, pnpm test:smoke scripts.
8 van 13 tests geautomatiseerd.
Changed: .gitignore
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/architecture/app-host-skeleton.md
docs/wiki/architecture/cross-host-auth.md
docs/wiki/operations/cross-host-smoke-tests.md
docs/wiki/operations/known-issues.md
docs/wiki/operations/migration-summary.md
package.json
playwright.smoke.config.ts
tests/playwright/specs/cross-host/admin.spec.ts
tests/playwright/specs/cross-host/auth-flow.spec.ts
tests/playwright/specs/cross-host/auth.setup.ts
tests/playwright/specs/cross-host/logout.spec.ts
tests/playwright/specs/cross-host/nav.spec.ts
tests/playwright/specs/cross-host/redirects.spec.ts
---
[2026-05-08 21:39] precompact: context compaction triggered
[2026-05-17 06:58] commit: fix: OAuth callback PKCE bug — getClaims() + matcher exclude

Root cause: clearAuthCookies (commit 22a0059) wiste alle sb-* cookies
op getUser() error, inclusief PKCE code-verifier. exchangeCodeForSession
faalde silently → fallback redirect zonder sessie.

Fix C: middleware gebruikt nu getClaims() per officieel Supabase template.
Geen error-recovery, geen retry-loop, geen cookie-clearing.

Fix A: /auth/callback uitgesloten van marketing middleware matcher als
defense-in-depth.
Changed: apps/marketing/src/middleware.ts
docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/cross-host-auth.md
docs/wiki/operations/known-issues.md
packages/shared/src/utils/supabase/middleware.ts
---
[2026-05-17 07:22] precompact: context compaction triggered
[2026-05-17 07:34] commit: fix: TEST 9 + 10 — onboarding cross-host redirect + password reset PKCE

TEST 9: router.push('/dashboard/transcribe') op marketing-host
bleef op indxr.ai → 404. Fix: window.location.href = appHref('/dashboard').

TEST 10: resetPasswordForEmail redirectTo wees direct naar app-host
settings → PKCE code nooit ingewisseld → otp_expired. Fix: redirect
via marketing /auth/callback?next=<encoded-target>, callback wisselt
code in en redirect daarna met hostname-validatie.
Changed: apps/marketing/src/app/auth/callback/route.ts
apps/marketing/src/app/onboarding/page.tsx
docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/cross-host-auth.md
docs/wiki/operations/known-issues.md
packages/shared/src/actions/auth-actions.ts
---
[2026-05-17 10:21] commit: docs: B6 checkpoint — TEST 8/9/10 PASS + new pre-launch items

cross-host-smoke-tests TEST 8/9/10 afgevinkt 2026-05-17.
TEST 10 stap bijgewerkt voor /auth/callback?next= flow.
Twee nieuwe pre-launch items: MOCK_MESSAGES placeholder +
welcome message gap. migration-summary geüpdatet.
Changed: docs/LOG.md
docs/wiki/operations/cross-host-smoke-tests.md
docs/wiki/operations/known-issues.md
docs/wiki/operations/migration-summary.md
---
[2026-05-17 10:29] commit: chore: trigger redeploy for BACKEND_API_SECRET
Changed: 
---
[2026-05-17 16:38] commit: docs: sessie wrap-up 2026-05-17 + BACKEND_API_SECRET correctie
Changed: CLAUDE.md
docs/LESSONS.md
docs/LOG.md
docs/wiki/operations/known-issues.md
---
[2026-05-18 14:58] commit: fix: 4 cross-host link bugs uit post-migratie audit

VideoTab.tsx (packages/shared) rendert op zowel marketing- als app-host.
Drie relatieve /dashboard/... paden braken op indxr.ai/transcribe → 404:
- :163 window.location.href → appHref('/dashboard/library')
- :1110/:1142 <Link href> → <a href={appHref(...)}>

next.config.ts (apps/marketing): /account/credits redirect had relatief
destination /dashboard/account → bleef op marketing-host → 404.
Fix: absolute URL via NEXT_PUBLIC_APP_URL.

Build: pnpm turbo run build — 2/2 ✅, 0 TS errors.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/marketing/next.config.ts
docs/LOG.md
docs/wiki/operations/post-migration-audit-2026-05.md
packages/shared/src/components/free-tool/VideoTab.tsx
---
[2026-06-04 11:12] commit: fix: header nav leeg + button kleuren ontbreken op marketing site

Tailwind v4 scande packages/shared/src/ niet automatisch waardoor
kritieke CSS classes ontbraken in de marketing build:
- md:flex / md:hidden → desktop nav altijd verborgen (Bug 1)
- bg-accent, hover:bg-accent-hover, text-fg-subtle, text-fg-on-accent
  → Button component zonder achtergrond/tekstkleur (Bug 2)

Fix: @source directive toegevoegd aan apps/marketing/tokens.css.
Build: 2/2 ✅, alle ontbrekende classes bevestigd aanwezig na build.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/marketing/src/app/styles/tokens.css
docs/LESSONS.md
docs/LOG.md
---
[2026-06-04 12:49] commit: docs: ADR-048 Redis-splitsing Upstash/Railway — fase 1 documentatie

Diagnose (2026-06-04): ARQ worker genereert ~10.860 Redis-commando's/uur
idle (7,84M/maand) door poll_delay=0.5s + health_check_interval=1s —
structureel onmogelijk binnen Upstash Free Tier (500K/maand).

Beslissing: Upstash voor frontend (rate-limiter + caption-cache, past
binnen Free Tier zonder worker), Railway-Redis voor ARQ worker (container,
geen kosten per commando, private netwerk).

Fase 2 (implementatie) volgt na review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LESSONS.md
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/decisions/048-redis-split-upstash-railway.md
docs/wiki/operations/known-issues.md
---
[2026-06-05 10:19] commit: fix: ADR-048 fase 2 — UPSTASH_REDIS_URL → ARQ_REDIS_URL (API + worker)

Beide ARQ-producers/consumers omgezet naar nieuwe env var ARQ_REDIS_URL:
- backend/main.py r.121: arq_pool leest ARQ_REDIS_URL (producent)
- backend/worker.py r.1005: WorkerSettings leest ARQ_REDIS_URL (consument)

Lokale dev-fallback ongewijzigd: ARQ_REDIS_URL unset → arq_pool=None →
Whisper valt terug op asyncio.create_task, playlists geven 503.

ADR-048 gecorrigeerd:
- caption-cache.ts (niet-bestaand) verwijderd uit gerelateerde code
- API-service toegevoegd als verplichte migratiestap (was missing)
- Worker-als-interne-producent (ctx['redis']) gedocumenteerd
- Fase-2-checklist: code-stappen afgevinkt, Railway-stappen open voor Khidr

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/worker.py
docs/LOG.md
docs/wiki/decisions/048-redis-split-upstash-railway.md
---
[2026-06-05 10:19] precompact: context compaction triggered
[2026-06-05 11:25] commit: debug: tijdelijke env-var logging in worker voor ADR-048 diagnose

Logt of ARQ_REDIS_URL en UPSTASH_REDIS_URL aanwezig zijn in os.environ
bij worker-startup, vóór WorkerSettings.redis_settings evaluatie.
Verwijderen na diagnose.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/worker.py
---
[2026-06-05 11:44] commit: fix: dual-stack DNS patch voor Railway IPv6 private networking (ADR-048)

redis-py asyncio Connection._connection_arguments() doet standaard IPv4-only
DNS-lookup. railway.internal resolvet alleen via IPv6 in dit project.
ARQ biedt geen hook voor connection_class of socket-family. Oplossing:
monkey-patch in beide services om family=AF_UNSPEC (dual-stack) mee te geven.
Verwijdert ook de tijdelijke debug-logging uit commit 62eb075.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/worker.py
docs/LOG.md
docs/wiki/decisions/048-redis-split-upstash-railway.md
docs/wiki/operations/deployment.md
---
[2026-06-06 09:51] commit: fix: ADR-048 afronding — monkey-patch + debug-logging verwijderd

Root cause was cross-project Railway isolatie, niet IPv6-resolutie.
Na consolidatie naar één project is de patch overbodig.
ADR-048: status → geïmplementeerd+geverifieerd, Fase 3 afgevinkt.
deployment.md: 3-services-in-1-project structuur, YOUTUBE_API_KEY
gecorrigeerd naar beide services (worker gebruikt YouTubeClient).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/worker.py
docs/LOG.md
docs/wiki/decisions/048-redis-split-upstash-railway.md
docs/wiki/operations/deployment.md
---
[2026-06-06 09:54] commit: docs: Railway service-namen actualiseren na project-herstructurering

agile-creation → api, fortunate-mindfulness → worker,
project-naam → indxr-backend. Historische namen in ADR-048 voorzien
van parenthetische noot voor context.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/decisions/048-redis-split-upstash-railway.md
docs/wiki/operations/deployment.md
---
[2026-06-25 11:57] commit: fix: Tailwind @source directive + TranscriptViewer scroll-bug

Bevinding 1: apps/app/tokens.css miste @source directive voor
packages/shared/src/ — zelfde root cause als marketing-fix van
2026-06-04. Alle Tailwind classes exclusief in shared components
(md:flex, md:hidden, bg-accent, text-fg-muted, etc.) ontbraken
uit de app CSS-output.

Bevinding 2: TranscriptViewer h-[calc(100vh-4rem)] overflow-hidden
op de outer div conflicteerde met dashboard layout (overflow-y-auto
+ padding wrapper + tab nav). Hoogte-berekening was ~4rem te groot
(topbar=3.5rem, padding=1-2rem, tab nav=~2.75rem niet meegeteld).
Fix: fixed height verwijderd, scroll gedelegeerd aan layout's
overflow-y-auto, action bar sticky top-0, video sidebar
lg:sticky lg:top-0 lg:h-[calc(100svh-3.5rem)] zodat split-view
UX behouden blijft op desktop.

Build: 2/2 ✅ (app 31 routes, marketing 60 routes)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/app/styles/tokens.css
apps/app/src/components/library/TranscriptViewer.tsx
docs/LOG.md
---
[2026-06-25 12:21] commit: fix: styling-herstel afronding — bevindingen 3 & 4 + cleanup

Bevinding 3: --warning-hover en --warning-border tokens aangemaakt in
@theme inline + :root/:dark van beide apps (marketing + app).
Waarden volgen het patroon van --accent-hover (donkerder in light,
lichter in dark). Gerelateerde classes in TranscriptViewer opgeschoond
naar hover:bg-warning-hover en border-warning-border.

Bevinding 4: text-accent-foreground (Shadcn-conventie, undefined token)
→ text-fg-on-accent (custom token, consistent met rest van codebase
zoals transcribe/page.tsx). Actieve editor toolbar-iconen zijn nu
zichtbaar op hun accent-achtergrond.

Cleanup: 20 bestanden — alle bg-[var(--...)], text-[var(--...)],
border-[var(--...)] → semantische Tailwind equivalenten (bg-accent,
text-fg-muted, border-border, hover:bg-surface-elevated, etc.).
Opacity-modifier varianten (bg-accent/50) werken correct in Tailwind v4
via color-mix. Typo bg-[var(--bg-surface-elevated)] gefixed naar
bg-surface-elevated. Inline style={{ }} properties ongewijzigd (bewust).
Bewust gelaten: border-[var(--color-success-border)] 2× in
TranscriptList.tsx (--color-success-border undefined, analogous aan
Bev.3 maar buiten scope).

Build: 2/2 ✅ (app 31 routes, marketing 60 routes)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/app/dashboard/billing/page.tsx
apps/app/src/app/dashboard/library/[id]/page.tsx
apps/app/src/app/dashboard/library/page.tsx
apps/app/src/app/dashboard/messages/MessagesClient.tsx
apps/app/src/app/dashboard/page.tsx
apps/app/src/app/dashboard/settings/page.tsx
apps/app/src/app/dashboard/transcribe/page.tsx
apps/app/src/app/styles/tokens.css
apps/app/src/components/AppTopbar.tsx
apps/app/src/components/app-sidebar.tsx
apps/app/src/components/dashboard/ActiveJobsIndicator.tsx
apps/app/src/components/dashboard/MobileTabBar.tsx
apps/app/src/components/dashboard/settings/DeveloperExportsCard.tsx
apps/app/src/components/dashboard/settings/ProfileSettingsCard.tsx
apps/app/src/components/dashboard/settings/SecuritySettingsCard.tsx
apps/app/src/components/library/RagExportView.tsx
apps/app/src/components/library/TranscriptList.tsx
apps/app/src/components/library/TranscriptViewer.tsx
apps/marketing/src/app/styles/tokens.css
docs/LOG.md
packages/shared/src/components/Footer.tsx
packages/shared/src/components/Header.tsx
---
[2026-06-25 14:15] commit: fix: yt-dlp 2026.3.17 → 2026.06.09 + Dockerfile Node.js v18 → v22

Root cause van bot-detection: web_embedded client was kapot in
2026.3.17 (gefixt in 2026.03.13), waardoor stap 2 altijd escaleerde
naar stap 3 — die ook faalde door verouderde YouTube-signatures.

Wijzigingen:
- yt-dlp==2026.06.09 (was 2026.3.17)
- yt-dlp-ejs==0.8.0 gepind (was ongepind — mismatch-risico bij pip)
- Dockerfile: Node.js v22 via NodeSource (yt-dlp 2026.06.09 vereist
  v22+; Debian Bookworm apt levert slechts v18)

Geen wijzigingen aan cascade-logica, player_client, extractor_args,
subtitles-API of YoutubeDL embedding-API.

Lokale test (zonder proxy, vanuit residentieel IP):
- qG4k4vJUhaI: ✅ SUCCESS (was bot_detection)
- FMX-6LiLaB8: ✅ SUCCESS (eerder 429 op tlang=en — was misclassified,
  extractie zelf werkte al, alleen cross-language translation blokkeerde)

Na deploy: Railway-logs 48–72u monitoren op bot_detection events.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/Dockerfile
backend/requirements.txt
docs/LOG.md
---
[2026-06-25 14:16] commit: docs: dependency-onderhoud wiki — optie 2 + update-discipline

B1 — Optie 2 (interne JS-runtime) als roadmap taak 2.8:
Bewust gekozen voor optie 1 (Node.js v22 via NodeSource) als acute
fix. Optie 2 (quickjs-ng, geen externe Node) gedocumenteerd als
post-launch onderzoekstaak met expliciete afweging en aandachtspunt
voor de latente enabled_runtimes vs js_runtimes inconsistentie.

B2 — Dependency-update-discipline als taak 2.9 + monitoring.md:
Nieuwe sectie "Dependency-onderhoud" in monitoring.md:
- Principe: pin + handmatige promotie na groene test
- Per-dependency risicotabel (yt-dlp, Node.js, Next.js, overige)
- Verificatietest-recept per hoog-risico dependency
- Nightly/master-builds bewust uitgesloten van productie
- Latente js_runtimes inconsistentie gedocumenteerd als kleine
  opschoontaak (niet aanraken in deze pass)

deployment.md: Node.js versie-koppeling gedocumenteerd met verwijzing
naar taak 2.8 en monitoring.md.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/wiki/operations/deployment.md
docs/wiki/operations/monitoring.md
docs/wiki/roadmap/priorities.md
---
[2026-06-25 18:33] commit: fix: brontaal-eerst caption cascade — vermijdt tlang= 429

Root cause: door altijd subtitleslangs=['en'] + languages=["en"] te
vragen genereerde YouTube een vertaal-URL (lang=ar&tlang=en). Die URL
triggert HTTP 429 — YouTube's rate-limit zit specifiek op de
tlang=-parameter (vertaalservice). Originele-taal-URLs (lang=ar, geen
tlang) geven consistent HTTP 200.

Fix:
- extract_via_youtube_transcript_api: lang_pref parameter toegevoegd;
  languages=[lang_pref, "en"] als lang_pref != 'en', anders ["en"]
- extract_with_ytdlp: lang_pref parameter toegevoegd; subtitleslangs
  en selectielogica passen de taalvoorkeur toe; fallback naar 'en'
- main.py + worker.py: normalised_lang (al beschikbaar uit YouTube
  Data API pre-fetch) doorgegeven als lang_pref aan alle 6 cascade-
  aanroepen (stap 1+2+3 in beide paden)

Geverifieerd lokaal:
- Arabische auto-only (qG4k4vJUhaI, lang_pref='ar'):
  776 segmenten in Arabisch, geen machine-vertaling ✅
- Engelse video (dQw4w9WgXcQ, lang_pref='en'): ongewijzigd ✅
- lang_pref=None: gedrag identiek aan voor de fix ✅
- youtube-transcript-api stap 1 met ar: lang_code='ar' ✅

ADR-002 brontaal-eerst-volgorde is nu werkelijk geïmplementeerd.
Wiki gecorrigeerd: ADR-002 status, ai-pipeline.md (tlang-claim),
known-issues.md (429-documentatie), LOG.md (upgrade-test-claim).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/worker.py
backend/youtube_utils.py
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
docs/wiki/decisions/002-youtube-captions.md
docs/wiki/operations/known-issues.md
---
[2026-06-25 18:58] commit: fix: AI-transcriptie success-card + bot-detection copy

Issue 1 — success-card verschijnt niet na AI-transcriptie:
useJobStatus riep onComplete aan met de raw transcription_jobs-rij
uit het Realtime-event. Die rij heeft geen transcript-kolom (transcript
staat in de aparte transcripts-tabel). VideoTab._handleWhisperComplete
en AudioTab.onComplete controleren beide op transcript.length > 0 vóór
ze saveStatus='saved' en whisperMetadata zetten — zonder transcript in
de payload retourneerden ze vroegtijdig zonder de success-card te tonen.

Fix: bij complete via Realtime doet useJobStatus één extra poll naar
het API-endpoint (GET /api/jobs/{id}) dat de transcript-data ophaalt
via JOIN op de transcripts-tabel. Polling-pad was al correct.

Issue 2 — bot_detection copy klopt niet voor anonieme gebruikers:
De "Generate with AI"-toggle is alleen zichtbaar voor ingelogde users
(user && ... op regel 997). De bot_detection- en no_captions-error-
berichten verwezen naar "enable 'Generate with AI' above" — voor
anonieme gebruikers verwijst dit naar een niet-zichtbare toggle.

Fix: berichten zijn nu auth-context-aware:
- user: verwijst naar "Generate with AI" toggle (correct, zichtbaar)
- anoniem: verwijst naar /signup link als alternatief

Build: 2/2 ✅

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
packages/shared/src/components/free-tool/VideoTab.tsx
packages/shared/src/hooks/useJobStatus.ts
---
[2026-06-26 12:17] commit: fix: AI-transcriptie master-cache write — herstel dood cache-pad

master_transcripts_write (source_method='audio_transcription') werd nergens
aangeroepen: pipeline importeerde master_cache niet en had geen write na de
succesvolle AssemblyAI-transcriptie. De read-kant in run_whisper_job was
correct maar gaf structureel een miss.

Fix: fire-and-forget asyncio.create_task ná de Supabase INSERT in
do_assemblyai_transcription (analoog aan caption-flow in worker.py).
Guards: video_id is not None (YouTube-pad, nooit uploads — privacy-grens)
ÉN language truthy (geen 'unknown' forceren bij lingua-miss —
language TEXT NOT NULL, schone cache boven minimale hit-rate).

Openstaande gap (niet nu): playlist-Whisper-route checkt master-cache
niet vóór transcriptie; herhaalde playlist-aanvragen besparen de
AssemblyAI-call nog niet.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/transcription_pipeline.py
docs/LOG.md
docs/wiki/decisions/021-master-transcripts-cache.md
docs/wiki/operations/known-issues.md
---
[2026-06-27 11:28] commit: fix: cache-hit AI-insert crash — video_url uit transcripts-insert verwijderd

Sentry: APIError: Could not find the 'video_url' column of 'transcripts'
in the schema cache — op worker.py run_whisper_job cache-hit branch.

Root cause: de cache-hit insert bevatte video_url, maar die kolom bestaat
niet in de productie transcripts-tabel (alle drie werkende inserts laten
het weg). Crash trad pas nu op omdat dit de eerste echte AI-cache-hit was
(het write-pad was dood tot commit 42d3da7 gisteren).

Fix: video_url verwijderd. Bijkomend: character_count toegevoegd (aanwezig
in alle werkende inserts, ontbrak hier), language-fallback "en" vervangen
door conditionele opname (consistent met transcription_pipeline.py).

Credit-veiligheid bevestigd: insert crashte vóór deduct_credits-aanroep —
de gebruiker is niet afgeschreven bij de fout.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/worker.py
docs/LOG.md
---
[2026-06-27 11:55] precompact: context compaction triggered
[2026-06-27 11:58] commit: feat: deduplicatie single-video AI-transcriptie

Backend: dedup-check vóór job-aanmaak filtert op (user_id, video_url,
actieve statussen). Bij hit: retourneert bestaande job_id + status
met deduplicated:true — geen nieuwe ARQ-job, geen dubbele AssemblyAI-call.

Frontend: isAlreadyProcessing state + informatie-card bij dedup-hit
(zelfde card-patroon als bestaande error-cards), status als initialStatus
doorgegeven zodat TranscriptionProgress direct de juiste fase toont.

Post-launch hardening (Redis-lock race-afdichting) gedocumenteerd in
known-issues.md.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
docs/LOG.md
docs/wiki/operations/known-issues.md
packages/shared/src/components/free-tool/VideoTab.tsx
---
[2026-06-27 13:03] commit: feat: dead-job reaper (ADR-049) + dedup stale-filter

Pass 0 toegevoegd aan watchdog_interrupted_jobs:
- Pass 0a: stuck pending-jobs (NULL heartbeat + created_at >30min) →
  error (credits_deducted=False) of interrupted (=True, Pass 1a hervatten)
- Pass 0b: stuck active-jobs met stale heartbeat >10min (IS NOT NULL) →
  zelfde logica

Playlist-veiligheid (kritiek, geverifieerd): playlist-Whisper-video's
schrijven heartbeat naar playlist_extraction_jobs, nooit naar
transcription_jobs.last_heartbeat_at. Pass 0b's IS NOT NULL guard sluit
ze per definitie uit — actieve playlist-jobs worden nooit gereapt.

Dedup-check (main.py) bijgewerkt met OR-tijdsfilter: alleen jobs die
<30min oud zijn OF een heartbeat hebben van <10min geleden tellen als
"actief". Defense-in-depth naast de reaper (dekt 2-min reaper-venster).

timedelta import toegevoegd aan main.py. Import-check ✅

Oplost de BEWz4SXfyCQ stuck-job bug zonder handmatige SQL: reaper sluit
hem binnen 2 min na deploy, daarna geeft de volgende aanvraag een
master-cache-hit.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/worker.py
docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/decisions/049-dead-job-reaper.md
docs/wiki/operations/test-reports.md
---
[2026-06-27 13:50] commit: fix: title+channel in master-cache + playlist grammar fix

master_cache: master_transcripts_write accepteert nu optionele title en
channel parameters; master_transcripts_read retourneert ze als extra keys.
transcription_pipeline: geeft video_title en channel mee aan de write.
worker: cache-hit branch gebruikt mc.get("title") or title or video_id
en voegt channel conditioneel toe — cache-hit toont nu de echte YouTube-
titel in de library i.p.v. het video-ID.

Migratie vereist (kolommen in master_transcripts): supabase/config.toml
ontbreekt dus CLI-push niet mogelijk. SQL geleverd in commit message voor
handmatige run via Dashboard.

  ALTER TABLE master_transcripts ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE master_transcripts ADD COLUMN IF NOT EXISTS channel TEXT;

PlaylistManager: singular/plural gecorrigeerd voor botOrTimeout, membersOnly
en youtubeRestricted ("1 video were" → "1 video was", "These were" → "It was").

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/master_cache.py
backend/transcription_pipeline.py
backend/worker.py
docs/LOG.md
docs/wiki/architecture/database-schema.md
docs/wiki/operations/test-reports.md
docs/wiki/roadmap/backlog.md
packages/shared/src/components/PlaylistManager.tsx
---
[2026-06-27 14:07] precompact: context compaction triggered
[2026-06-27 15:41] precompact: context compaction triggered
[2026-06-27 15:44] commit: refactor: centraliseer AI cache-read in do_assemblyai_transcription (Step 0)

Playlist-Whisper-pad miste de master_transcripts cache volledig: process_playlist_video
roept do_assemblyai_transcription direct aan, waardoor de inline cache-read in
run_whisper_job nooit bereikt werd. Opgelost door cache-read naar Step 0 van de gedeelde
helper te verplaatsen — beide paden (standalone + playlist) raken nu altijd de cache.

- transcription_pipeline.py: voeg Step 0 cache-check toe aan do_assemblyai_transcription
- worker.py: verwijder inline cache-hit block + dode imports (math, deduct_credits)
- wiki: playlist-engine.md + ADR-021 bijgewerkt

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/transcription_pipeline.py
backend/worker.py
docs/wiki/architecture/playlist-engine.md
docs/wiki/decisions/021-master-transcripts-cache.md
---
[2026-06-27 15:44] commit: ops: Railway CLI installeren + log-toegang configureren voor CC

CC kan nu zelfstandig worker- en api-logs ophalen zonder interactieve login.
Account-scoped token (no-workspace) vereist — workspace-scoped tokens worden
geweigerd door CLI (bug #845). Token staat persistent in ~/.bashrc als
RAILWAY_API_TOKEN, niet in de repo.

- railway-cli.md: volledig recept (installatie, token-type, project/service IDs,
  log-commando's, filter-voorbeelden, persistentie-tabel)
- INDEX.md: verwijzing naar railway-cli.md toegevoegd
- LOG.md: sessie-entries bijgewerkt

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/INDEX.md
docs/wiki/operations/railway-cli.md
---
[2026-06-27 20:24] commit: docs: AI-cache productieverificatie + Railway CLI leerpunten

ADR-021 uitgebreid met logbewijs voor de Step 0 cache-hit in productie
(playlist 75a84011, kBdfcR-8hEY: CACHE HIT 3.17s, 55cr, geen download).
test-reports.md nieuw rapport: 19/19 video's in 0:54, 1 AI-hit + 17
caption-hits + 1 live extractie (iKtPI8IMuOM, tlang-kandidaat).
railway-cli.md twee valkuil-noten: inline token/PATH export + ~500-regels
log-cap. LESSONS.md: playlist-shared-helper patroon.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LESSONS.md
docs/LOG.md
docs/wiki/decisions/021-master-transcripts-cache.md
docs/wiki/operations/railway-cli.md
docs/wiki/operations/test-reports.md
---
[2026-06-27 20:29] precompact: context compaction triggered
[2026-06-27 20:44] commit: fix: native caption track selectie — altijd -orig, nooit tlang=

Voor niet-Engelse video's waarvan de YT Data API ten onrechte language='en'
teruggeeft, pakte extract_with_ytdlp automatic_captions['en'] — een
machinevertaal-URL (tlang=en) → 429 + ongewenste Engelse vertaling.

yt-dlp markeert de native ASR-track met een -orig suffix (bv. ja-orig).
Die heeft nooit tlang= in de URL, ongeacht wat lang_pref zegt.

Prioriteitslogica:
1. info['subtitles'] (handmatig, altijd native)
2. automatic_captions[*-orig] (native ASR, nooit tlang=)
3. automatic_captions[lang] mits VTT-URL geen tlang= bevat
+ safety net: reject elke URL met tlang= vlak vóór download

Reparatie geldt voor single-video én playlist (gedeelde helper).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/youtube_utils.py
---
[2026-06-27 20:47] commit: docs: tlang-fix gedocumenteerd — -orig selectie, subtitleslangs filter

ai-pipeline.md: cascade note bijgewerkt met nieuwe prioriteitslogica
(-orig suffix als native-track indicator, tlang= URL als safety net).
LESSONS.md: yt-dlp subtitleslangs filtert info-dict NIET in extract_info
mode + YT Data API onbetrouwbaar voor taaldetectie (iKtPI8IMuOM bewijs).
LOG.md: taak gemarkeerd als [~] (verificatie in productie lopend).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/ai-pipeline.md
---
[2026-06-27 21:13] commit: fix: title+channel meegeven aan caption master-cache-write

main.py en worker.py riepen master_transcripts_write voor caption-
extracties aan zonder title/channel → cache-rij kreeg title=null.
Bij latere cache-hit viel de read terug op video_id als titel
(bijv. kBdfcR-8hEY in de library).

title en channel zijn op het aanroepdpunt beschikbaar (uit yt-dlp/
YouTube Data API metadata) — worden nu doorgegeven in beide paden:
single-video (main.py) en playlist (worker.py _process_caption_video).

Bestaande title=null-rijen verdwijnen bij de pre-launch master-cache-flush.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: backend/main.py
backend/worker.py
---
[2026-06-27 21:15] commit: docs: title+channel caption-cache-write fix gedocumenteerd

ADR-021: fix beschreven (write-kant null-titel, fallback naar video_id,
fix in main.py + worker.py, bestaande null-rijen verdwijnen bij flush).
database-schema.md: title/channel beschrijving gecorrigeerd — gevuld
bij alle writes, niet alleen audio_transcription.
LOG.md: tlang-fix als ✅ gesloten + title-fix als [~].

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/architecture/database-schema.md
docs/wiki/decisions/021-master-transcripts-cache.md
---
[2026-06-27 21:26] precompact: context compaction triggered
[2026-06-27 21:30] commit: docs: sessie-afronding — post-launch observaties + RAG JSON tlang-item ✅

known-issues.md: nieuwe sectie "Post-launch overwegingen" met:
- Sentry-ruis bij verwachte bot-detectie (goedaardig, overweging)
- Preview-credit-schatting wijkt af van werkelijke aftrek (goedaardig)
- RAG JSON tlang pre-launch item gesloten ✅ (fix 2026-06-27)

LOG.md: ongewijzigd (al bijgewerkt in vorige commit van deze sessie).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/known-issues.md
---
[2026-06-30 16:15] taak: Supabase migration-sync baseline-squash ✅ | gewijzigd: supabase/migrations/20260630155944_baseline.sql (nieuw), supabase/migrations_archive/ (24 gearchiveerde bestanden + backup), supabase_migrations.schema_migrations (gereset naar 1 rij), docs/wiki/architecture/database-schema.md, docs/wiki/operations/known-issues.md, docs/LESSONS.md
[2026-06-30 16:02] commit: chore: Supabase migration-sync baseline-squash ✅

Schema-drift hersteld: 8-cijferige timestamp-prefixen en SQL-Editor-wijzigingen
(master_transcripts.title + .channel) waren onzichtbaar voor de CLI-tracking.

Wijzigingen:
- supabase/migrations/20260630155944_baseline.sql — volledige DDL-snapshot productie-DB
  (11 tabellen, 25 indexes, 18 RLS policies, 8 functies, on_auth_user_created trigger)
- 24 pre-baseline bestanden → supabase/migrations_archive/ (git-geschiedenis intact)
- supabase/migrations_archive/schema_migrations_backup_2026-06-30.sql — herstelnet 15-rij staat
- supabase_migrations.schema_migrations gereset naar 1 rij (version=20260630155944)
- docs/wiki/architecture/database-schema.md — Migrations-sectie vervangen door baseline-notitie
- docs/wiki/operations/known-issues.md — migration-sync opgelost ✅ + TODO legacy DROP
- docs/LESSONS.md — les over schema-drift + baseline-squash-recept
- docs/LOG.md — sessie-entry

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/database-schema.md
docs/wiki/operations/known-issues.md
supabase/.gitignore
supabase/config.toml
supabase/migrations/20260301144045_add_avatar_color_to_profiles.sql
supabase/migrations/20260302_add_tiptap_fields.sql
supabase/migrations/20260304_tiptap_fields_to_jsonb.sql
supabase/migrations/20260305_collections.sql
supabase/migrations/20260306000442_add_ai_summary_to_transcripts.sql
supabase/migrations/20260306_add_viewed_at_to_transcripts.sql
supabase/migrations/20260307_add_updated_at_to_transcripts.sql
supabase/migrations/20260408_add_suspended_to_profiles.sql
supabase/migrations/20260408_backfill_missing_profiles.sql
supabase/migrations/20260412_job_metrics_and_rename.sql
supabase/migrations/20260412_playlist_extraction_jobs.sql
supabase/migrations/20260422_add_rag_settings_to_profiles.sql
supabase/migrations/20260423_rag_chunk_size_90.sql
supabase/migrations/20260428_master_transcripts_cache.sql
supabase/migrations/20260428_playlist_per_video_chain.sql
supabase/migrations/20260428_playlist_per_video_chain__manual_test.sql
supabase/migrations/20260428_playlist_progress_rpc_status_fix.sql
supabase/migrations/20260430_fase4_playlist_extraction_jobs.sql
supabase/migrations/20260430_fase4_saved_videos.sql
supabase/migrations/20260430_fase4_transcription_jobs.sql
supabase/migrations/20260430_fase4_update_playlist_progress_rpc.sql
supabase/migrations/20260501_watchdog_attempts.sql
supabase/migrations/20260502_playlist_retry_pending_status.sql
supabase/migrations/20260630155944_baseline.sql
supabase/migrations/add_playlist_jobs.sql
supabase/migrations_archive/20260301144045_add_avatar_color_to_profiles.sql
supabase/migrations_archive/20260302_add_tiptap_fields.sql
supabase/migrations_archive/20260304_tiptap_fields_to_jsonb.sql
supabase/migrations_archive/20260305_collections.sql
supabase/migrations_archive/20260306000442_add_ai_summary_to_transcripts.sql
supabase/migrations_archive/20260306_add_viewed_at_to_transcripts.sql
supabase/migrations_archive/20260307_add_updated_at_to_transcripts.sql
supabase/migrations_archive/20260408_add_suspended_to_profiles.sql
supabase/migrations_archive/20260408_backfill_missing_profiles.sql
supabase/migrations_archive/20260412_job_metrics_and_rename.sql
supabase/migrations_archive/20260412_playlist_extraction_jobs.sql
supabase/migrations_archive/20260422_add_rag_settings_to_profiles.sql
supabase/migrations_archive/20260423_rag_chunk_size_90.sql
supabase/migrations_archive/20260428_master_transcripts_cache.sql
supabase/migrations_archive/20260428_playlist_per_video_chain.sql
supabase/migrations_archive/20260428_playlist_per_video_chain__manual_test.sql
supabase/migrations_archive/20260428_playlist_progress_rpc_status_fix.sql
supabase/migrations_archive/20260430_fase4_playlist_extraction_jobs.sql
supabase/migrations_archive/20260430_fase4_saved_videos.sql
supabase/migrations_archive/20260430_fase4_transcription_jobs.sql
supabase/migrations_archive/20260430_fase4_update_playlist_progress_rpc.sql
supabase/migrations_archive/20260501_watchdog_attempts.sql
supabase/migrations_archive/20260502_playlist_retry_pending_status.sql
supabase/migrations_archive/add_playlist_jobs.sql
supabase/migrations_archive/schema_migrations_backup_2026-06-30.sql
---
[2026-06-30 16:30] taak: FAQ "why nearly instant" Q&A toegevoegd aan Technical-sectie | gewijzigd: apps/marketing/src/app/docs/help/faq/page.tsx
[2026-06-30 16:10] commit: content: FAQ — waarom is een transcript soms bijna instant?

Nieuwe Q&A toegevoegd aan de Technical-sectie van /docs/help/faq.
Legt uit dat een eerder verwerkte video direct geserveerd wordt uit cache.
Geen prijs-implicaties — puur over snelheid (guardrail ADR-021).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/marketing/src/app/docs/help/faq/page.tsx
docs/LOG.md
---
[2026-06-30 16:20] precompact: context compaction triggered
[2026-06-30 18:00] audit: read-only audit admin/messages/worker — wiki correcties geschreven | gewijzigd: docs/wiki/roadmap/priorities.md, docs/wiki/operations/known-issues.md
[2026-06-30 16:28] commit: docs: audit-correcties worker/Redis/admin/messages — wiki bijgewerkt

Worker draait op Railway Redis (ARQ_REDIS_URL, geverifieerd 2026-06-30 14:12 UTC).
Fase 2 ADR-048 Redis-splitsing afgerond. Upstash vars nog niet hersteld op Vercel/Railway.
known-issues.md: ARQ worker sectie gemarkeerd als opgelost, Upstash-sectie gecorrigeerd.
priorities.md: C.3.1 status bijgewerkt, Fase 2 todo aangevinkt.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/known-issues.md
docs/wiki/roadmap/priorities.md
---
[2026-06-30 19:00] feat: messages-systeem — tabel + welcome-trigger + echte frontend | gewijzigd: supabase/migrations/20260630164156_messages.sql, apps/app/src/app/dashboard/messages/page.tsx, apps/app/src/app/dashboard/messages/MessagesClient.tsx, apps/app/src/components/AppTopbar.tsx, docs/wiki/architecture/database-schema.md, docs/wiki/operations/known-issues.md
[2026-06-30 16:46] commit: feat: messages tabel + welkomst-trigger + echte frontend

- Nieuwe migratie 20260630164156_messages.sql: messages tabel + RLS
  (SELECT + UPDATE voor eigenaar, geen user-INSERT), exception-safe
  trigger on_auth_user_created_welcome_message op auth.users AFTER INSERT.
  Aparte functie van handle_new_user — raak bestaande trigger niet aan.
- MessagesPage: server component, laadt echte rows uit messages tabel.
- MessagesClient: MOCK_MESSAGES verwijderd, initialMessages prop,
  mark-as-read schrijft naar DB via Supabase client, archive lokale state.
- AppTopbar: MOCK_MESSAGES import + hardcoded unread badge verwijderd.
- schema_migrations geverifieerd: exact 2 rijen (baseline + messages).
- Trigger-test via Management API geslaagd: user aangemaakt →
  user_credits aanwezig (handle_new_user) + welkomstbericht aanwezig.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/app/dashboard/messages/MessagesClient.tsx
apps/app/src/app/dashboard/messages/page.tsx
apps/app/src/components/AppTopbar.tsx
docs/LOG.md
docs/wiki/architecture/database-schema.md
docs/wiki/operations/known-issues.md
supabase/migrations/20260630164156_messages.sql
---
[2026-06-30 17:05] precompact: context compaction triggered
[2026-06-30 17:08] commit: feature: archive-actie messages — DB-backed (archived kolom + Inbox/Archived tabs)

- Migratie 20260630170359: archived BOOLEAN NOT NULL DEFAULT false op messages
- archive(id) + unarchive(id) schrijven naar Supabase via UPDATE
- Inbox/Archived tab-toggle (client-side filter op DB-waarden)
- page.tsx selecteert nu ook archived kolom
- MessagesClient: archived: boolean (niet optional), geen local-state override meer

Wacht op Khidr-verificatie ([~]).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/app/dashboard/messages/MessagesClient.tsx
apps/app/src/app/dashboard/messages/page.tsx
docs/LOG.md
docs/wiki/architecture/database-schema.md
supabase/migrations/20260630170359_messages_archived.sql
---
[2026-06-30 18:09] commit: docs: sessie-afrond 2026-06-30 — messages/archive geverifieerd, known-issues afgevinkt

- known-issues.md: messages page + welkomstbericht + archief → [x] geverifieerd Khidr
- LOG.md: sessie-afrondingsregel toegevoegd

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/operations/known-issues.md
---
[2026-06-30 18:34] commit: docs: migratie-workflow gedocumenteerd in CLAUDE.md + LESSONS.md

CLAUDE.md: supabase db push / SQL-Editor vervangen door 14-cijferige
YYYYMMDDHHMMSS-prefix workflow via Supabase MCP / Management API.
LESSONS.md: vooruitregel toegevoegd — 8-cijferig is verboden.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: CLAUDE.md
docs/LESSONS.md
---
[2026-06-30 19:45] precompact: context compaction triggered
[2026-07-01 17:52] commit: feat: contactcentrum v1 — support ticket systeem volledig

DB: support_tickets tabel + SECURITY DEFINER RPC submit_support_ticket,
messages.ticket_id FK, profiles.email_notifications bool.

Backend: /api/support/submit (rate-limit via RPC), /api/admin/tickets
(lijst + email resolve), /api/admin/tickets/[id]/close + /message.

Frontend: SupportClient (3 categorieën, inline banners), MessagesClient
uitgebreid met Support-tab (ticketlijst + expandable replies, Inbox/Archive
sub-filter behouden), /dashboard/support → redirect. EmailNotificationsToggle
in settings. Admin /admin/tickets pagina met inline Close/Reply/Credits acties.

Mail: notifyAdmin + notifyUser helper (fail-safe, opt-out, Resend REST).

Alle UI-strings NL→EN (MessagesClient, SupportClient, settings, mail.ts).

tsc --noEmit: ✓ | build: ✓ 35 routes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/app/actions/profile.ts
apps/app/src/app/admin/layout.tsx
apps/app/src/app/admin/tickets/TicketsTable.tsx
apps/app/src/app/admin/tickets/page.tsx
apps/app/src/app/api/admin/tickets/[id]/close/route.ts
apps/app/src/app/api/admin/tickets/[id]/message/route.ts
apps/app/src/app/api/admin/tickets/route.ts
apps/app/src/app/api/support/submit/route.ts
apps/app/src/app/dashboard/messages/MessagesClient.tsx
apps/app/src/app/dashboard/messages/page.tsx
apps/app/src/app/dashboard/settings/page.tsx
apps/app/src/app/dashboard/support/SupportClient.tsx
apps/app/src/app/dashboard/support/page.tsx
apps/app/src/components/dashboard/settings/EmailNotificationsToggle.tsx
apps/app/src/lib/mail.ts
docs/LOG.md
docs/wiki/architecture/database-schema.md
docs/wiki/operations/known-issues.md
supabase/migrations/20260701000000_support_tickets.sql
supabase/migrations/20260701120000_messages_ticket_id_email_pref.sql
tests/playwright/specs/cross-host/logout.spec.ts
tests/playwright/specs/cross-host/nav.spec.ts
---
[2026-07-01 18:58] commit: feat: contactcentrum v1 afwerking (A–F + toast-fix)

Migratie messages.sender_role (schema_migrations=6): onderscheid
admin vs user berichten in ticket-thread.

A: user-reply op open ticket via /api/support/tickets/[id]/reply
   (auth + RLS-ownership + open-check + notifyAdmin), thread toont
   You/INDXR Support met visueel onderscheid, closed-ticket notice.

B: dashboard/page.tsx mock MOCK_MESSAGES vervangen door echte
   Supabase-query (ticket_id IS NULL, created_at DESC, limit 3).

C: ongelezen berichten/tickets vetgedrukt (font-semibold) + accent
   dot; markTicketRepliesRead() bij uitklappen ticket.

D: category-badges drie duidelijke kleuren — feedback=success/groen,
   billing=warning/oranje, bug=error/rood — in MessagesClient en
   TicketsTable consistent.

E: formatDate in alle drie instanties (MessagesClient, dashboard,
   TicketsTable) uniform: Today/Yesterday/Jul 1/Jul 1 2025.

F: break-words op alle ticket/bericht-body elementen; admin
   TicketsTable toast→inline persistente notice met sluitknop
   (geen setTimeout — conform no-toast regel, ook LESSONS.md).

tsc --noEmit: ✓ | build: ✓ 40 routes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/app/admin/tickets/TicketsTable.tsx
apps/app/src/app/api/admin/tickets/[id]/message/route.ts
apps/app/src/app/api/support/tickets/[id]/reply/route.ts
apps/app/src/app/dashboard/messages/MessagesClient.tsx
apps/app/src/app/dashboard/messages/page.tsx
apps/app/src/app/dashboard/page.tsx
docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/database-schema.md
docs/wiki/operations/known-issues.md
supabase/migrations/20260701200000_messages_sender_role.sql
---
[2026-07-01 19:19] precompact: context compaction triggered
[2026-07-01 19:27] commit: fix: contactcentrum live-bugs — admin thread-view, sort, unread-scope, 3-state filter

Admin-kant: page.tsx haalt thread-messages op per ticket (admin client, ASC).
TicketsTable herschreven: rij-klik opent thread (origineel + replies chronologisch,
sender-onderscheid), Close/Reply/Credits ná de thread, optimistic reply-update,
3-state filter Open/Closed/All, Open-filter oudste-eerst (wachtrij-volgorde).
User-kant: replies lokaal gesorteerd ASC (Bug 2), hasUnread beperkt tot open
tickets zodat closed tickets niet meer vetgedrukt blijven.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/app/admin/tickets/TicketsTable.tsx
apps/app/src/app/admin/tickets/page.tsx
apps/app/src/app/dashboard/messages/MessagesClient.tsx
docs/LOG.md
---
[2026-07-01 19:42] commit: fix: unread dot-indicator + dashboard archived-filter

MessagesClient — inbox: verwijder bold/non-bold titelwissel; titel altijd
font-medium, bestaande accent-dot blijft. Support-tab: bold-wissel verwijderd,
standalone h-2 w-2 accent-dot toegevoegd per ticket met ongelezen admin-reply
(open én closed), reply-count altijd text-fg-muted.
dashboard/page.tsx: .eq("archived", false) zodat gearchiveerde berichten niet
in de Home-preview verschijnen.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/app/dashboard/messages/MessagesClient.tsx
apps/app/src/app/dashboard/page.tsx
docs/LOG.md
---
[2026-07-01 19:52] commit: feat: globale unread-dot op Messages-sidebar-link en topbar Mail-icoon

Nieuwe useUnreadMessages hook: één HEAD COUNT query op messages waar
read=false en sender_role!='user' — geen data-overdracht, alleen een boolean.
Refresht bij pathname-change (navigation away from messages page) en op het
"indxr-messages-read" custom event. MessagesClient dispatcht dat event na
markRead, markTicketRepliesRead en markAllRead zodat de dot real-time verdwijnt.
Dot op sidebar Messages-icoon (absolute, boven-rechts van icon, werkt collapsed
én expanded). Zelfde dot op topbar Mail-icoon.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/app/dashboard/messages/MessagesClient.tsx
apps/app/src/components/AppTopbar.tsx
apps/app/src/components/app-sidebar.tsx
apps/app/src/hooks/useUnreadMessages.ts
docs/LOG.md
---
[2026-07-01 20:09] commit: docs: sessie-afronding contactcentrum v1 — wiki bijgewerkt naar live staat

known-issues.md: contactcentrum v1-featurelijst compleet (thread-view,
3-state filter, unread-dot, archived-filter, dot-pattern), GDPR/PostHog-
hardening als launch-blocker toegevoegd (session replay + privacy policy
placeholder), bewuste niet-gedane keuzes gedocumenteerd (geen Home-tickets,
geen sorteertoggle, near-real-time via event ipv WebSocket), DNS-cleanup
precies afgebakend. database-schema.md: migrations-sectie gecorrigeerd
van 3 naar 6 rijen incl. de drie contactcentrum-migraties.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LOG.md
docs/wiki/architecture/database-schema.md
docs/wiki/operations/known-issues.md
---
[2026-07-02 15:17] precompact: context compaction triggered
[2026-07-02 16:18] precompact: context compaction triggered
[2026-07-02 16:20] commit: feat: design-sync — @indxr/shared naar claude.ai/design project

137 componenten gesyncet (20 authored previews, 117 floor-cards).
Alle previews visueel geverifieerd en graded "good". Duurzame bestanden:
config, 20 preview-TSX, bundle-override (process.env shim), tokens.css.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: .design-sync/compiled-tokens.css
.design-sync/config.json
.design-sync/overrides/bundle.mjs
.design-sync/previews/Alert.tsx
.design-sync/previews/AlertDialog.tsx
.design-sync/previews/Avatar.tsx
.design-sync/previews/Badge.tsx
.design-sync/previews/Button.tsx
.design-sync/previews/Card.tsx
.design-sync/previews/Checkbox.tsx
.design-sync/previews/Dialog.tsx
.design-sync/previews/DropdownMenu.tsx
.design-sync/previews/EmptyState.tsx
.design-sync/previews/Input.tsx
.design-sync/previews/Logo.tsx
.design-sync/previews/Progress.tsx
.design-sync/previews/Select.tsx
.design-sync/previews/Separator.tsx
.design-sync/previews/Skeleton.tsx
.design-sync/previews/Switch.tsx
.design-sync/previews/Table.tsx
.design-sync/previews/Tabs.tsx
.design-sync/previews/Tooltip.tsx
docs/LOG.md
---
[2026-07-02 18:00] commit: fix: RAG-export credit-lek dichten + bulk-RAG met atomische aftrek

Lek: gewone gebruiker kon via ?tab=developer gratis RAG JSON downloaden
zonder eerdere betaalde export. Twee guard-lagen toegevoegd:
1. Render-guard in [id]/page.tsx: RagExportView alleen bij rag_exports.length > 0
2. Component-level fallback in RagExportView: toont lock-screen bij length === 0

Bulk-RAG export toegevoegd aan TranscriptList selection-bar:
- bulkDeductRagExportCreditsAction: één atomische deduct_credits_atomic RPC
  voor het totaal (geen partial charge mogelijk)
- Per transcript: gratis re-download als al eerder geëxporteerd, anders betalen
- Bevestigingsdialoog met per-transcript breakdown + saldo-check vóór uitvoering
- Onvoldoende saldo: knop geblokkeerd, geen aftrek

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/app/dashboard/library/[id]/page.tsx
apps/app/src/components/library/RagExportView.tsx
apps/app/src/components/library/TranscriptList.tsx
docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/credit-system.md
packages/shared/src/actions/rag-export.ts
---
[2026-07-02 18:06] commit: fix: bulk-RAG toast vervangen door inline persistente feedback

toast.error/success verwijderd uit de bulk-RAG-flow (financieel pad,
auto-dismiss onacceptabel). Vervangen door ragBulkError/ragBulkSuccess
state: fouten persistent in dialog tot sluiting, success 1.2s inline
dan sluiten, knop geblokkeerd tijdens success-state.

toast-import blijft: handleBatchDownload (andere flow) gebruikt het nog.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/components/library/TranscriptList.tsx
docs/LESSONS.md
docs/LOG.md
---
[2026-07-02 18:23] precompact: context compaction triggered
[2026-07-02 18:35] precompact: context compaction triggered
[2026-07-02 18:50] commit: feat: volledige toast-eliminatie + bulk-export 8 formats + RAG chunk fix

(A) Alle sonner/toast-calls verwijderd uit 18 bestanden. FeedbackCard is
het nieuwe kanonieke feedback-component: inline, persistent, met onDismiss.
Copy-knoppen krijgen button-level bool-state (1.5s). Download-success is
stil. Sidebar-feedback is een compact inline banner. Financiële callsites
(checkout, credit-claim) tonen zowel success als error persistent.
Toaster verwijderd uit beide layouts; sonner.tsx verwijderd; sonner
als dependency verwijderd uit alle package.json-bestanden.

(B) Bulk-download dropdown uitgebreid van 4 naar 8 formats:
TXT, TXT+timestamps, MD, MD+timestamps, JSON, CSV, SRT, VTT — elk als ZIP.

(C) Bulk-RAG leest nu profiles.rag_chunk_size (ipv hardcoded 60);
bestandsnaam _rag_60s.json → _rag_<N>s.json; dialog toont chunk preset.

Build ✓ beide apps (marketing + app). grep toast → 0 hits.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: CLAUDE.md
apps/app/package.json
apps/app/src/app/dashboard/library/page.tsx
apps/app/src/app/layout.tsx
apps/app/src/components/app-sidebar.tsx
apps/app/src/components/dashboard/WelcomeCreditCard.tsx
apps/app/src/components/dashboard/billing/BillingPurchaseGrid.tsx
apps/app/src/components/dashboard/settings/ProfileSettingsCard.tsx
apps/app/src/components/dashboard/settings/SecuritySettingsCard.tsx
apps/app/src/components/library/AiSummaryView.tsx
apps/app/src/components/library/TranscriptList.tsx
apps/app/src/components/library/TranscriptViewer.tsx
apps/marketing/package.json
apps/marketing/src/app/forgot-password/page.tsx
apps/marketing/src/app/layout.tsx
apps/marketing/src/app/login/page.tsx
apps/marketing/src/app/onboarding/page.tsx
apps/marketing/src/app/signup/page.tsx
apps/marketing/src/app/transcribe/page.tsx
apps/marketing/src/components/pricing/BuyButton.tsx
docs/LESSONS.md
docs/LOG.md
packages/shared/package.json
packages/shared/src/components/PlaylistManager.tsx
packages/shared/src/components/free-tool/AudioTab.tsx
packages/shared/src/components/free-tool/VideoTab.tsx
packages/shared/src/components/ui/FeedbackCard.tsx
packages/shared/src/components/ui/sonner.tsx
---
[2026-07-02 21:28] commit: fix: regenereer pnpm-lock.yaml na sonner-verwijdering (Vercel frozen-lockfile fix)

Commit 99c7099 verwijderde sonner uit drie package.json-bestanden maar
regenereerde pnpm-lock.yaml niet. Vercel faalde met ERR_PNPM_OUTDATED_LOCKFILE.

pnpm install --frozen-lockfile slaagt nu lokaal zonder errors.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: docs/LESSONS.md
pnpm-lock.yaml
---
[2026-07-03 12:28] commit: fix: bulk-export naamgeving-collision + insufficient-render-artefact + integriteitscheck

Bug 1 (data-verlies): handleBatchDownload en handleBulkRagExecute gebruikten
safeTitle.slice(40/30) zonder uniciteitsgarantie — JSZip overschreef stil bij
identieke bestandsnamen. Fix: ${safeTitle}_${videoId}${suffix}.${ext} als
primaire disambiguator; teller-fallback (_2, _3, ...) voor resterende collisions.
Geldt voor alle 8 formats + RAG.

Bug 2 (cosmetisch): refreshCredits() was niet awaited in handleBulkRagExecute,
waardoor de re-render na credits-update de insufficient-conditie herrekende
met post-aftrek saldo < totalCost. Fix: await refreshCredits() + guard
!ragBulkExecuting && !ragBulkSuccess op de insufficient-conditie.

Nieuw: integriteitscheck na ZIP-vulling — bij fileCount !== selectedIds.size
verschijnt een warning-FeedbackCard (download gaat door).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/components/library/TranscriptList.tsx
docs/LESSONS.md
docs/LOG.md
docs/wiki/decisions/018-export-consolidation.md
---
[2026-07-03 12:40] precompact: context compaction triggered
[2026-07-03 12:44] commit: fix: bulk-export bestandsnamen — volledige-titel-slug zonder video_id of slice

Vervang safeTitle_videoId-schema door slugify(title)_type[_variant].ext.
slugify: lowercase, [^a-z0-9]+→-, leading/trailing hyphens strippen,
geen maximale lengte. Beide handlers (handleBatchDownload +
handleBulkRagExecute) bijgewerkt; teller-fallback behouden.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/components/library/TranscriptList.tsx
docs/LESSONS.md
docs/LOG.md
docs/wiki/decisions/018-export-consolidation.md
---
[2026-07-03 12:51] commit: fix: slugify strip apostrofs/quotes vóór hyphenisering (what's → whats)

Module-level slugify const vervangt twee identieke inline definities.
Strip ['''"""`] vóór [^a-z0-9]+→- zodat apostrofs geen losse koppeltekens
veroorzaken in bestandsnamen.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/components/library/TranscriptList.tsx
---
[2026-07-03 13:10] commit: fix: RAG-dialog layout, success-persistentie, ZIP-bestandsnaam

- Layout: max-w-md → max-w-lg; min-w-0 op title-span zodat truncate
  werkt in flex-context (flex-item min-width: auto bug)
- Success: setTimeout-dismiss verwijderd; FeedbackCard blijft staan
  met X-dismiss-knop; dialog sluit niet automatisch na export
- ZIP-naam: indxr-<N>-transcripts-<format>-<datum>-<HHmm>.zip
  (uniek per export, geen browser-(2)(3)-hernoeming)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/components/library/TranscriptList.tsx
---
[2026-07-03 13:23] commit: fix: RAG-dialog layout — overflow-x-hidden + viewport-marge hersteld

overflow-y-auto op de lijst-container dwong overflow-x naar auto (CSS-spec),
waardoor credit-labels niet geclipt werden en de dialogrand overlapten.
Fix: overflow-x-hidden toegevoegd aan de lijst-container.

max-w-lg conflicteerde via tailwind-merge met de base max-w-[calc(100%-2rem)]
en dropte de viewport-veiligheidsmarge op smalle schermen. Vervangen door
max-w-[min(32rem,calc(100%-2rem))]: één class, geen merge-conflict, pikt
automatisch de kleinste van 512px en viewport−32px.

Vervolg op min-w-0-fix (e3cee0c) die op het juiste element zat maar één
niveau te laag — de werkelijke clip-grens ontbrak op de container.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/components/library/TranscriptList.tsx
---
[2026-07-03 13:35] commit: fix: RAG-dialog layout definitief — min-w-0 op grid-child

Root cause: DialogContent is display:grid; directe grid-children hebben
min-width:auto by default en krimpen niet binnen de grid-track. De
space-y-4 wrapper (omvat scrolllijst + samenvatting-blok) miste min-w-0
waardoor het bg-surface-elevated samenvatting-blok over de card-rand liep.

Bewaard:
- min-w-0 op titel-span: correct voor flex-truncatie binnen de rij
- overflow-x-hidden op lijst-container: legitiem vangnet (overflow-y:auto
  impliceert overflow-x:auto; expliciete clip bij scrollbar-aanwezigheid)
- max-w-[min(32rem,calc(100%-2rem))]: viewport-marge, geen merge-conflict

Andere dialogs (TranscriptViewer, SaveErrorModal, UsersTable) hebben geen
brede grid-children die het patroon triggeren — lokale fix volstaat.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/components/library/TranscriptList.tsx
docs/LESSONS.md
---
[2026-07-03 13:54] commit: fix: DialogContent-primitive grid-cols-[minmax(0,1fr)] — structurele overflow-fix

Alle dialog-grid-children kregen min-width:auto (default) en konden de
grid-track overschrijden. Fix bij de bron: grid-cols-[minmax(0,1fr)] op
de DialogContent-primitive begrenst de kolom-track tot de beschikbare
breedte; alle huidige en toekomstige dialogs erven dit automatisch.

Absolute close button is geen grid-item → niet geraakt.
Bestaande callsites (TranscriptViewer grid-cols-4, SaveErrorModal,
UsersTable inputs, RAG-dialog) zijn gecontroleerd — geen regressie.

Redundante min-w-0 op space-y-4-wrapper in TranscriptList verwijderd;
min-w-0 op flex-span en overflow-x-hidden op scroll-container behouden
als correcte sub-lagen.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Changed: apps/app/src/components/library/TranscriptList.tsx
docs/LESSONS.md
packages/shared/src/components/ui/dialog.tsx
---
[2026-07-03 16:20] taak: [~] design-sync re-sync @indxr/shared → claude.ai/design (upload niet voltooid) | gewijzigd: .design-sync/config.json, .design-sync/conventions.md, .design-sync/NOTES.md, .gitignore, docs/wiki/operations/known-issues.md

Gecorrigeerde remote-anchor (ontbrekende sourceHashes veroorzaakte "malformed"
fallback naar full re-verify) → echte diff: FeedbackCard toegevoegd, Toaster
verwijderd uit @indxr/shared sinds vorige sync. `.design-sync/conventions.md`
aangemaakt (géén provider nodig — theming via data-theme attribuut, niet React
context; Tailwind-utility-idioom over OKLCH-tokens) en gewired via
readmeHeader. package-validate.mjs exit 0; 20 pre-existing blanke floor-cards
bevestigd als verwacht gedrag (layout-only children, niet los renderbaar),
zitten allen in de unchanged/buiten-scope verificatiepartitie.

Upload naar het claude.ai/design-project NIET voltooid: de MCP write_files
tool accepteert alleen inline file-content, _ds_bundle.js is ~860KB (boven
Read's 256KB-cap). Chunked reconstructie zou stille byte-corruptie kunnen
introduceren in code die de design-agent uitvoert — op verzoek van Khidr
gestopt vóór upload. Project staat nog op vorige werkende sync-versie, niets
corrupt. Zie docs/wiki/operations/known-issues.md en .design-sync/NOTES.md
voor vervolgstappen.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
---
[2026-07-03 16:56] commit: design-sync: author conventions.md, fix anchor validation, document pending bundle upload

Re-sync of @indxr/shared to the claude.ai/design component library caught a
missing sourceHashes field in the hand-saved remote anchor (validSidecar
requires it, else falls back to full re-verify). Fixed, then diffed clean:
FeedbackCard added, Toaster removed since last sync.

Authored .design-sync/conventions.md (no provider needed — theming is via
data-theme attribute, not context; Tailwind-utility-over-OKLCH-token idiom)
and wired it via readmeHeader. Upload itself did not complete this session:
_ds_bundle.js (~860KB) exceeds the available inline-upload tooling's 256KB
read cap, and chunked manual reconstruction risked byte corruption in code
the design agent executes — stopped rather than risk it. Documented in
NOTES.md and known-issues.md for the next sync to finish.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Changed: .design-sync/NOTES.md
.design-sync/config.json
.design-sync/conventions.md
.gitignore
docs/LOG.md
docs/wiki/operations/known-issues.md
---
[2026-07-03 16:59] commit: docs: log auto-appended entry for e51cad5

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Changed: docs/LOG.md
---
[2026-07-03 20:58] precompact: context compaction triggered
[2026-07-03 21:11] commit: redesign: Library page as dashboard style-anchor (title-driven rows, hexagon motif)

Apple-style title-driven list with hairline dividers, subtle hexagon-honeycomb
background, source/output badge families (info/violet tokens), opt-in
thumbnails, and a custom hexagon credit icon replacing CircleDollarSign in
topbar + sidebar. Full management layer (multi-select, bulk download/RAG,
collections, search, mark-as-read) preserved unchanged.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Changed: apps/app/src/app/dashboard/library/page.tsx
apps/app/src/app/styles/tokens.css
apps/app/src/components/AppTopbar.tsx
apps/app/src/components/app-sidebar.tsx
apps/app/src/components/library/TranscriptList.tsx
apps/marketing/src/app/styles/tokens.css
docs/LESSONS.md
docs/LOG.md
docs/wiki/design/research/batch-3b-ux-aesthetic.md
docs/wiki/design/system.md
packages/shared/src/components/icons/HexagonCreditIcon.tsx
packages/shared/src/components/icons/HexagonEmptyState.tsx
packages/shared/src/components/icons/HexagonPattern.tsx
---
[2026-07-03 23:03] commit: fix: add confirmation dialog before Library delete (per-row + bulk)

Per-row delete had zero confirmation; bulk delete used an unstyled
window.confirm(). Both now go through the shared AlertDialog primitive,
showing the transcript title or selection count before destroying data.
Delete logic and credit/collection side effects are unchanged.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Changed: apps/app/src/components/library/TranscriptList.tsx
---
[2026-07-03 23:14] commit: docs: log Library production-verification outcome + delete-confirmation lesson

Full checklist verified on app.indxr.ai with screenshot evidence (drag-to-
collection, RAG export + credit deduction, mark-as-read, bulk-download
uniqueness). Records the delete-confirmation fix and the confirmed
cancel/confirm behavior for both per-row and bulk delete.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Changed: docs/LESSONS.md
docs/LOG.md
---
[2026-07-03 23:15] commit: docs: log auto-appended entry for d856115

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Changed: docs/LOG.md
---
[2026-07-04 14:27] taak: Library launch-afronding (metadata-kolommen, hybride datum, hexagon→achtergrond, OKLCH badge-hue-systeem, munt-credit-icoon, topnav-spacing, mobiele nav-fixes, server-side pagination 50/pp + settings-toggle 25/50/100, check-wiki hook-hardening) — build groen beide apps; gecommit + gepusht naar master (f4fd26e, geen conflicts); migratie 20260704113930 bevestigd op PRODUCTIE (kolom profiles.library_page_size, CHECK 25/50/100, default 50, schema_migrations=7); geverifieerd op PRODUCTIE app.indxr.ai (test1, geïnjecteerde prod-sessie, seed opgeruimd) in licht+dark+mobiel met screenshots: badges alle families onderscheidbaar + WCAG AA (licht min 4.75, dark min 6.73), metadata 3 uitgelijnde kolommen, hexagon subtiel op pagina-achtergrond niet in rijen, munt-icoon+getal gegroepeerd, mobiel enkel bottom-tab-bar (geen zijbalk-overlap) + selection-bar boven tab-bar, pagination page2 (51–55/55, 50/pp default) + server-side zoek over hele dataset (Item 45 van pagina 2 gevonden) + Settings-toggle 25 persisteert na reload (library toont daarna 1–25 van 55). | gewijzigd: apps/*/src/app/styles/tokens.css, apps/app/src/components/library/TranscriptList.tsx, apps/app/src/app/dashboard/library/page.tsx, apps/app/src/app/dashboard/layout.tsx, apps/app/src/components/AppTopbar.tsx, packages/shared/src/components/icons/HexagonCreditIcon.tsx, apps/app/src/app/dashboard/settings/page.tsx, apps/app/src/components/dashboard/settings/LibraryPageSizeSelect.tsx, apps/app/src/app/actions/profile.ts, supabase/migrations/20260704113930_profiles_library_page_size.sql, .claude/settings.json, .claude/hooks/check-wiki.sh
[2026-07-04 15:07] commit: feat(library): launch polish — badge hue system, metadata columns, hybrid date, server-side pagination

- Badges: OKLCH hue-family system (sky/indigo/violet/teal) with -soft edited
  variants (same hue, higher L); replaces the info/violet two-family setup.
  WCAG AA verified both themes (light min 4.75, dark min 6.73).
- Metadata: three right-aligned parallel columns (Duration/Words/Added) on
  desktop, compact single line on mobile.
- Date: hybrid relative (<48h) / compact absolute date+time after.
- Hexagon: moved from rows to a subtle page-background layer.
- Credit icon: coin with INDXR hexagon mark; icon+count grouped as one pill
  in topbar; increased topnav spacing.
- Mobile: sidebar hidden (bottom tab bar is the only nav), removed broken
  mobile sidebar trigger, floating selection bar lifted above the tab bar.
- Pagination: server-side, 50/page default, search/sort/collection filters
  run over the full dataset in Postgres; page-size preference (25/50/100)
  persisted in profiles.library_page_size (migration 20260704113930) with a
  Settings toggle.
- Hook: harden check-wiki stop hook path via $CLAUDE_PROJECT_DIR.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Changed: .claude/hooks/check-wiki.sh
.claude/settings.json
apps/app/src/app/actions/profile.ts
apps/app/src/app/dashboard/layout.tsx
apps/app/src/app/dashboard/library/page.tsx
apps/app/src/app/dashboard/settings/page.tsx
apps/app/src/app/styles/tokens.css
apps/app/src/components/AppTopbar.tsx
apps/app/src/components/dashboard/settings/LibraryPageSizeSelect.tsx
apps/app/src/components/library/TranscriptList.tsx
apps/marketing/src/app/styles/tokens.css
docs/LESSONS.md
docs/LOG.md
docs/wiki/architecture/database-schema.md
packages/shared/src/components/icons/HexagonCreditIcon.tsx
supabase/migrations/20260704113930_profiles_library_page_size.sql
---
[2026-07-04 15:13] commit: docs: replace Library local-verification note with production confirmation

Migration 20260704113930 confirmed on production; commit f4fd26e verified on
app.indxr.ai (light/dark/mobile) — badges, metadata columns, hybrid date,
hexagon bg, credit coin, mobile nav, pagination 50/pp + persisted 25 toggle,
full-dataset search. Seed data cleaned up on test1.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Changed: docs/LOG.md
---
[2026-07-04 15:31] commit: fix(library): mobile title width, checkbox visibility, dark hexagon, dual badges, pagination spacing

- Mobile: hover-only row actions + rename button reserve no width on mobile
  (hidden sm:flex), so the title uses the full row width before clamping.
- Checkboxes: clearly-outlined filled box when unchecked (border-border-strong
  + bg-surface-sunken), AA-visible in both themes; per-row checkbox now visible
  on mobile (no hover to reveal it there).
- Dark hexagon: list container is opaque bg-surface (was bg-surface/60) so the
  page-background hexagon no longer bleeds through the table in dark mode.
- Badges: show the full-colour source badge AND a separate lighter same-hue
  "Edited" chip beside it (append instead of replace) for captions, AI
  transcription and summary. Tokens/hues unchanged.
- Mobile pagination: small bottom margin so Previous/Next clear the tab bar.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Changed: apps/app/src/app/dashboard/library/page.tsx
apps/app/src/components/library/TranscriptList.tsx
---
[2026-07-04 15:38] precompact: context compaction triggered
[2026-07-04 15:41] commit: docs: log 5 Library presentation fixes + production verification

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Changed: docs/LOG.md
---
[2026-07-04 16:01] commit: fix(library): mark-as-read optimistic update, no list reload

Replace the transcripts-updated event dispatch (which triggered a full
fetchTranscripts refetch, causing a visible reflow + scroll-reset) with the
React 19 useOptimistic + startTransition pattern. Clicking the NEW badge now
hides it instantly; the viewed_at mutation runs in the background and only a
successful write commits. On failure the optimistic overlay reverts.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Changed: apps/app/src/components/library/TranscriptList.tsx
docs/LESSONS.md
---
[2026-07-04 16:11] commit: docs: log mark-as-read optimistic update + production verification

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Changed: docs/LOG.md
---
[2026-07-04 16:11] commit: docs: log auto-appended entry for 1ecd0a1

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Changed: docs/LOG.md
---
[2026-07-04 16:46] commit: fix: playlist pagination (>50 videos) + Home credits live source

Playlist: get_playlist_items now pages through playlistItems with
nextPageToken (cap 500, matching yt-dlp fallback) and batches videos.list
in chunks of 50, so all available videos are fetched instead of the first
50. The fabricated 'unavailable = total_count - 50' banner is replaced by a
real backend unavailable_count (fetched items that don't resolve to a
playable video: private/members-only/deleted).

Home credits: /dashboard called an orphaned RPC get_credit_balance (absent
in DB) that failed and fell back to 0. Now rendered client-side via
<HomeCreditsBalance/> using useAuth().credits — same live source as
topbar/sidebar (get_user_credits -> user_credits.credits). Credit
deduction logic untouched.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Changed: apps/app/src/app/dashboard/page.tsx
apps/app/src/components/dashboard/HomeCreditsBalance.tsx
backend/main.py
backend/youtube_client.py
docs/LESSONS.md
packages/shared/src/components/PlaylistManager.tsx
---

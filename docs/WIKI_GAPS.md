# Wiki Gaps — Verschillen tussen wiki en werkelijke code

Gegenereerd: 2026-04-14. Gebaseerd op `CODEBASE_AUDIT.md` vs. alle `docs/wiki/` pagina's.

---

## Categorie A: Wiki beschrijft iets dat NIET in de code bestaat

### A1. `has_ever_purchased` veld in profiles
**Wiki:** `credit-system.md` beschrijft dat de Stripe webhook na betaling `has_ever_purchased = true` zet in `profiles`, waarna de gebruiker permanente paid-status heeft.  
**Code:** `src/app/api/stripe/webhook/route.ts` doet alleen `supabase.rpc('add_credits', ...)` — geen update van `profiles`.  
**Impact:** De "permanente paid user status, ook bij saldo 0" feature bestaat niet.

### A2. `isPaidUser: boolean` in AuthContext
**Wiki:** `credit-system.md:202` toont een AuthContextType interface met `isPaidUser: boolean`.  
**Code:** `src/contexts/AuthContext.tsx` heeft dit veld niet. Premium-check gebeurt ad-hoc per API route via `total_credits_purchased > 0`.  
**Impact:** Beschrijving van AuthContext is onjuist.

### A3. `BACKEND_API_SECRET` beveiligingslaag
**CLAUDE.md:** Beschrijft als kritiek gedeeld secret — elke Next.js → Python call verstuurt dit als header; Python valideert het.  
**Code:** Nergens geïmplementeerd in Next.js API routes of Python backend.  
**Impact:** De beweerde beveiligingslaag bestaat niet. Python backend heeft geen authenticatie voor inkomende Next.js requests.

### A4. Playlist "eerste 3 video's gratis" (ADR-010)
**Wiki/ADR-010:** "Eerste 3 video's van elke playlist-extractie zijn gratis."  
**Code:** `backend/main.py: run_playlist_job()` heeft deze logica niet. Geen gratis tier.  
**Status in ADR:** "pending implementatie" — maar ook `known-issues.md` pre-launch checklist: niet afgevinkt.

### A5. `claim_welcome_reward` geeft "5 credits" per database-schema wiki
**Wiki:** `database-schema.md:178` zegt "idempotente welkomst-bonus (5 credits, eenmalig)".  
**Code + UI:** WelcomeCreditCard en pricing pagina tonen 25 credits. Pre-launch checklist: "[x] Welcome credits RPC updaten: 5 → 25".  
**Impact:** De database-schema wiki is hier stale. De RPC geeft vermoedelijk 25 credits (conform pre-launch checklist), maar dit staat niet correct in de wiki.

---

## Categorie B: Code implementeert iets anders dan de wiki beschrijft

### B1. Credit formule in CLAUDE.md
**CLAUDE.md:** `math.ceil(duration_seconds / 600.0)` (oud model: 1 credit = 10 min)  
**Code:** `backend/credit_manager.py:48`: `math.ceil(duration_seconds / 60.0)` (nieuw model: 1 credit = 1 min)  
**Impact:** CLAUDE.md instrueert toekomstige sessies met de verkeerde formule. Dit is de meest kritieke stale instructie.

### B2. Database schema: `tiptap_content` vs. `edited_content`
**Wiki:** `database-schema.md:47` vermeldt kolom `tiptap_content JSONB`.  
**Code:** `src/components/library/TranscriptViewer.tsx:391` gebruikt `edited_content` kolom. Alle database-queries gebruiken `edited_content`.  
**Impact:** Kolomnaam in wiki is onjuist — `tiptap_content` bestaat niet (of is in productie nooit gebruikt).

### B3. `transcription_jobs` status-waarden
**Wiki:** `database-schema.md:122` toont: `'pending'|'processing'|'complete'|'failed'`  
**Code:** `backend/main.py:723,832,861,905` gebruikt: `pending` → `downloading` → `transcribing` → `saving` → `complete` of `error`  
**Impact:** `processing` en `failed` worden nooit gezet. `downloading`, `transcribing`, `saving` en `error` ontbreken in wiki.

### B4. Backend endpoint naam voor extractie
**CLAUDE.md** (snelreferentie): `/api/extract` als backend endpoint.  
**Code:** Het Python endpoint is `/api/extract/youtube` (`backend/main.py:467`). De Next.js route `/api/extract` is het client-facing endpoint en roept intern `/api/extract/youtube` aan.

### B5. `AudioTab` credit-berekening (client vs. server)
**Wiki/ADR-009:** Formule `math.ceil(duration_seconds / 60.0)` in backend.  
**Code:** `src/components/free-tool/AudioTab.tsx:54`: `Math.ceil(durationInSeconds / 60)` — klopt met backend.  
**Status:** Overeenstemming, maar AudioTab berekent 1 credit/minuut, geen 1 credit/10 minuten — consistent met huidig model.

### B6. Playlist-quota in UI vs. code
**WelcomeCreditCard:** "50 Videos / month Free" voor playlists.  
**ADR-010:** "Eerste 3 video's gratis per extractie."  
**Backend:** Geen quota-implementatie. `get_user_credits` RPC geeft `playlist_quota_used`/`playlist_quota_remaining` terug, maar `run_playlist_job` gebruikt dit niet.  
**Impact:** UI toont een belofte die noch door ADR noch door code ondersteund wordt. Drie inconsistente definities.

---

## Categorie C: Code is meer gevorderd dan de wiki zegt

### C1. ADR-009 zegt "pending implementatie" — maar is al live
**ADR-009 status:** "pending implementatie"  
**Code:** `backend/credit_manager.py` en `src/app/api/stripe/checkout/route.ts` implementeren het nieuwe model al volledig.  
**Fix:** ADR-009 status moet "Geaccepteerd en geïmplementeerd" worden.

### C2. ADR-009 PACKAGES update "pending" — al geïmplementeerd
**ADR-009 consequenties checklist:** `[ ]` Stripe PACKAGES updaten.  
**Code:** `src/app/api/stripe/checkout/route.ts` heeft al de juiste pakketten (Try €2.49/200cr t/m Power €49.99/5500cr).  
**Fix:** Afvinken in ADR.

### C3. Tiptap Highlight extension geïmplementeerd
**Wiki:** Niet vermeld.  
**Code:** `package.json` heeft `@tiptap/extension-highlight`. `TranscriptViewer.tsx:510` gebruikt highlight marks in markdown export.

---

## Categorie D: In code maar geheel afwezig in wiki

### D1. `src/app/api/transcribe/preflight/route.ts`
Preflight endpoint voor directe audio-uploads (bypast Vercel 4.5MB body limiet). Niet beschreven in CLAUDE.md noch in wiki.  
**Doel:** Auth + suspension + rate limit check vóór browser POST direct naar Railway.

### D2. `src/app/api/check-playlist-availability/route.ts`
Checkt per video of captions beschikbaar zijn, categoriseert errors. Niet vermeld in wiki of CLAUDE.md endpoints.

### D3. `src/app/api/admin/delete-transcript/route.ts`
Admin transcript-verwijdering. CLAUDE.md vermeldt alleen de vier andere admin routes.

### D4. Overlap-deduplicatie algoritme in backend
`backend/main.py:212-363` — `find_longest_overlap()`, `remove_overlaps()`, `parse_vtt_to_transcript()`.  
Geavanceerd VTT-parsing met Longest Common Substring algoritme. Niet beschreven in wiki.

### D5. YouTube Client (google-api-python-client)
`backend/youtube_client.py` — YouTube Data API v3 integratie voor playlist info en video details. Niet beschreven in wiki/CLAUDE.md.

### D6. Truncatiedetectie bij AssemblyAI transcripties
`backend/main.py:867-878` — detecteert als audio > 60s niet getranscribeerd is en geeft waarschuwing. Niet gedocumenteerd.

### D7. Markdown export (Edited MD)
`src/components/library/TranscriptViewer.tsx:547-568` — download edited content als Markdown. Niet beschreven in wiki of CLAUDE.md.

### D8. Onboarding pagina
`src/app/onboarding/page.tsx` — bestaat maar niet gedocumenteerd in wiki of user flows.

### D9. Alternative-pagina's (SEO)
`src/app/alternative/downsub/page.tsx`, `src/app/alternative/tactiq/page.tsx` — niet vermeld in wiki.

### D10. `openai` package als dependency
`package.json` heeft `openai: ^6.25.0` maar geen OpenAI-gebruik zichtbaar in de API routes. Vermoedelijk reliek of voorbereid voor toekomstig gebruik.

---

## Categorie E: ADRs beschrijven beslissingen die niet geïmplementeerd zijn

| ADR | Status in ADR | Implementatiestatus in code |
|-----|--------------|----------------------------|
| 009 | "pending implementatie" | ✅ Geïmplementeerd (formule + pakketten) |
| 010 | "pending implementatie" | ❌ Niet geïmplementeerd (eerste 3 gratis) |
| 014 | "pending implementatie" | ❌ Niet geïmplementeerd (export gating) |
| 015 | (niet gelezen) | Onbekend |
| 016 | (niet gelezen) | Onbekend |
| 017 | (niet gelezen) | Onbekend |

---

## Prioriteit fixes voor wiki

**Kritiek (onjuiste instructies):**
1. CLAUDE.md: credit formule corrigeren `/ 600.0` → `/ 60.0`
2. `database-schema.md`: `tiptap_content` → `edited_content`
3. `database-schema.md`: `transcription_jobs` statuswaarden corrigeren
4. `database-schema.md`: `claim_welcome_reward` = 5 credits → 25 credits
5. `credit-system.md`: `has_ever_purchased` sectie verwijderen of markeren als "nog niet geïmplementeerd"
6. `credit-system.md`: AuthContext interface corrigeren (geen `isPaidUser`)

**Documentatiegaten toevoegen:**
7. `CLAUDE.md` endpoints: `/api/extract/youtube` (backend), `preflight`, `check-playlist-availability`, `delete-transcript`
8. `BACKEND_API_SECRET`: markeren als "beschreven maar niet geïmplementeerd"
9. ADR-009: status → "Geïmplementeerd"
10. `architecture/overview.md`: YouTube Client, VTT deduplicatie, truncatiedetectie toevoegen

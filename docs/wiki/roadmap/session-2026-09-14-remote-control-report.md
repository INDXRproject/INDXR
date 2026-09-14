# Eindrapport — 5-takenreeks (2026-09-14)

Cold-read voor Khidr. Eén taak = één commit = één push = één deploy-verificatie. Taken 1-3 kwamen uit
twee echte mislukte jobs van 14-09; de oorzaak stond vast, dus niet opnieuw gediagnosticeerd tenzij
bewijs dat weersprak (dat gebeurde bij taak 3).

## Per taak

| # | Taak | Status | Commit(s) | Deploy / verificatie |
|---|------|--------|-----------|----------------------|
| 1 | YouTube-audio-route retry (bot-block) | ✅ done | `000062a`, `6e518b2` | Railway groen; 3 echte whisper-jobs compleet |
| 2 | Pre-flight availability vóór reservering | ✅ done | `9d40940`, `1820b39` | Railway groen; live-code-forward [~] Vercel |
| 3 | job_accepted ná backend-bevestiging | ✅ al correct — GEEN wijziging | `bd3725e` | bewijs weerlegt premisse |
| 4 | "Purchased" telt refunds/welkomst | ✅ done | `cd4691d` | build groen; DB before/after |
| 5 | e2e vaste account-pool | ✅ done | `392b710` | suite 2× groen, exact 4 accounts |

## Verificatiebewijs (kort)

- **T1:** dTAcaazDp-U is PUBLIEK (directe yt-dlp + YouTube API) → de prod "Video unavailable" egress=0B
  via de proxy was een BOT-BLOCK, geen verwijderde video. De download hàd al 3 pogingen + proxy-rotatie,
  maar de kale "Video unavailable" viel in reason='other' → break na 1 poging. Nieuwe
  `_classify_ytdlp_error`: transient (bot-block/SSL/timeout/5xx) retryt met rotatie + full-jitter backoff;
  permanent (private/removed/geo) faalt snel. Pipeline mapt een transiente kale-unavailable naar
  `bot_detection` ("probeer opnieuw") i.p.v. `youtube_restricted`. **16 unit-tests + echte lokale download
  + 3 echte whisper-jobs end-to-end op de gedeployde backend (alle compleet).**
- **T2:** `/api/video/metadata` gebruikt de YouTube Data API (betrouwbaar, niet bot-block-prone). Nieuwe
  `VideoNotFoundError` → endpoint geeft `{code:"video_not_found"}` zonder yt-dlp-fallback; VideoTab weigert
  ALLEEN op die code vóór de confirm/reserve met een directe gratis melding (andere fouten vallen door →
  geen halve check). **Vervolg:** de Next.js metadata-proxy dropte de body → code bereikte de client niet;
  gefixt (beide routes forwarden nu de body). Reserve/refund (ADR-050) ongemoeid. Live nonexistent→404 +
  available→200 bevestigd; **code-forward live-check pending Vercel-deploy `1820b39`**.
- **T3:** GEEN wijziging. Full-repo sweep: alle `job_accepted`/`job_started` (VideoTab/PlaylistTab/AudioTab)
  vuren ná `job_id`/`response.ok`, nooit op de klik — verplaatst in `d9dabba` (2026-09-11), VÓÓR het
  14-09-incident. De 14-09 "3ms apart" is inter-event (trio op job-creatie), niet klik-naar-event; de ~12s
  trio→failure-gap bevestigt het. Een re-fix zou een no-op drive-by zijn.
- **T4:** admin/users somde ALLE credits (welkomst+refund+grant) → christopherrocillo3 "69 gekocht",
  vayungupta01 "51", zonder te betalen. Fix (display-only): filter op `metadata->>stripe_session_id`
  (autoritatief, zelfde als finance-RPC's + paid-users; `kind='purchase'` mist 1 legacy-aankoop). Ook
  admin/credits "Total Purchased" (Net Balance gebruikt nu aparte `totalIssued`) + de optimistic update
  (grant ≠ purchase). **DB before/after: 69→0, 51→0.** paid-users/finance-RPC/growth-RPC waren al correct.
- **T5:** per-run-provisioning liet 24 accounts achter → vervangen door vaste pool `e2e-1..4@indxr.ai`
  (persistent, is_internal). Elke run: wachtwoord roteren + state reset (transcripts wissen, credits→200
  via RPC), nooit aanmaken/verwijderen. Geen teardown/E2E_TEARDOWN meer. **Suite 2× tegen prod: beide
  groen, DB erna = exact 4 accounts (geen accumulatie).** CLAUDE.md + wiki bijgewerkt.

## Niet gefixt (bewust / buiten scope)

- **Watchdog/refund muterende passes**, RPC's (finance `purchased_cr`, growth cohort), ledger — allemaal
  ONGEMOEID (financieel-kritiek / RPC's off-limits). De finance/growth "purchased" waren al correct
  (`is_purchase` = stripe_session_id).
- **Geo-geblokkeerde video's** worden door de T2-pre-flight NIET gevangen (de YouTube API geeft metadata
  terug; yt-dlp faalt pas bij download) → die houden het reserve→download-fail→refund-pad. Zeldzaam;
  bewust niet aangepakt (de API kan geo niet betrouwbaar per key-regio bepalen).

## Open beslissingen / loose ends (met aanbeveling)

1. **T2 code-forward live-check** wacht op de Vercel-deploy van `1820b39`. Aanbeveling: bevestig dat
   `/api/video/metadata/<nonexistent>` `code:"video_not_found"` teruggeeft (build + logica al bewezen).
2. **e2e-poolaccounts** e2e-1..4 hebben ~250 credits (200 top-up + 50 welkomst-trigger bij aanmaak) i.p.v.
   exact 200 — ruim genoeg voor tests; de reset is een vloer (top-up-tot-200), geen exacte set. Geen actie
   nodig; genoteerd voor de volledigheid.
3. **T4 live admin-UI** niet getoond (geen admin-sessie beschikbaar; ADMIN_USER_ID = Khidr's account) —
   de fix is DB-geverifieerd (69→0, 51→0) + build-groen.
4. **demo@-library** bevat sinds vorige rondes extra transcripts (linalg + de 3 whisper-jobs van T1);
   verwijderbaar door Khidr indien ongewenst (ik verwijder niets — rule #227).

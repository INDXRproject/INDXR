# Eindrapport — /remote-control 9-takenreeks (2026-09-12)

Cold-read voor Khidr. Eén taak = één commit = één push. Reeks liep autonoom door (Khidr weg).
Deploy-status geverifieerd waar publiek mogelijk; authed-verificaties waren geblokkeerd (zie onder).

> **Nummeringcorrectie:** in de vorige (afgebroken) ronde was **taak 4 (trackSignup) per abuis
> overgeslagen** — de watchdog-taak was toen "taak 4" genoemd terwijl dat taak 5 is. Deze ronde is
> taak 4 alsnog gedaan. Alle 9 zijn nu behandeld.

## Per taak

| # | Taak | Status | Commit | Deploy |
|---|------|--------|--------|--------|
| 1 | 0-byte upload-fix afmaken/verzegelen | ✅ done (1 sub-[~]) | `a152a6c` + `310d426` | **groen** — `"That file looks empty"` live in prod-bundle |
| 2 | Credit history groeperen per operatie (admin + user) | ✅ done (1 sub-[~]) | `bf4e938` | app-project serveert (307); admin-UI-shot geblokkeerd (geen admin-creds) |
| 3 | Playlist dedup-gat (match op video, niet methode) | ✅ done | `83549b6` | **groen** — ancestor van `a1b6974` (live) |
| 4 | trackSignup stabiele transaction_id | ✅ done | `a1b6974` | **groen** — `"signup_"` live in prod-bundle |
| 5 | Verouderde watchdog-tests herstellen | ✅ done | `3e1a3c0` | n.v.t. (backend-test; 8 passed) |
| 6 | max_tokens-cap meten + beslissen | ✅ done — cap GELATEN | `1b7522b` | n.v.t. (read-only meting, docs) |
| 7 | Extract-knop-flake na reset onderzoeken | ✅ done — GEEN bug, geen fix | `2042580` | n.v.t. (geen code) |
| 8 | PH frame3-playlist re-shoot @2880x1728 | 🟡 **[~] geblokkeerd** | `47a7cab` (alleen docs) | n.v.t. — zie loose ends |
| 9 | Cleanup + dit rapport + deploys herbevestigen | ✅ done | dit bestand | — |

## Verificatiebewijs (kort)
- **T1:** build 2/2 groen; 0-byte-gate vóór upload; empty_file-copy nu gemapt (review-vondst, `310d426`); deploy-marker live. **Sub-[~]:** live authed-UI e2e (0-byte-weigering in beeld) niet gedraaid — geen werkende authed omgeving; Samsung fysieke repro niet mogelijk (geen toestel).
- **T2:** `buildCreditActivity`-transform bewezen op echte prod-data (samueltrevino visible sum 14 == get_user_credits; demo 1957 ==). **Sub-[~]:** admin-UI-screenshot niet gemaakt (admin-gate vereist `ADMIN_USER_ID`).
- **T3:** dedup nu op beide plekken (PlaylistManager + PlaylistAvailabilitySummary) op de video; skipt MEER duplicaten → rekent nooit méér aan. Build groen. Behavioral prod-run geblokkeerd (auth).
- **T4:** payload-check tegen de ECHTE gtag.ts (7/7): `transaction_id=signup_<id>` ships, her-submit → identieke waarde, zonder userId weggelaten maar event vuurt, event_callback intact. Build groen.
- **T5:** `pytest test_watchdog.py -q` = **8 passed**. Oorzaak dieper dan add_credits: de gedeelde mock was positioneel → herschreven naar tabel+status+attempts-aware routing; refund-asserties tegen `refund_credits_flat` (ADR-050).
- **T6:** 111 echte log-rijen. **Regel 462 (stap-1) truncateert 0/48.** Alle truncatie (28/63) zit in stap-2 (`base_max`, regel 667) → buiten de genoemde cap. Cap gelaten (verhogen = nul voordeel; verificatiecriterium "truncatie daalt" onvervulbaar). Rapport: `docs/wiki/testing/2026-09-12-max-tokens-cap-measurement.md`.
- **T7:** repro op prod: bot-snelheid raakt disabled Extract-knop (600ms debounce dup-check), mens-snelheid enabled+klikbaar → automation-timing, geen reset-bug.

## Niet gefixt (bewust / buiten scope)
- **T6 stap-2 retry-verspilling:** initieel trunceert → retry met ZELFDE cap+model trunceert opnieuw (11/17) → Haiku-fallback rondt schoon af. Aanbeveling (niet uitgevoerd, financieel-rakend, ADR-106 accepteert de kost al): **sla de retry over bij `finish_reason=max_tokens`** (deterministisch dezelfde truncatie) → direct fallback; of hoog `base_max` op (`frag_words*2`→`*3`, of vloer 1024→1536). Beslissing aan Khidr.
- **T4 trackActivation:** heeft GÉÉN transaction_id (alleen server-truth + localStorage-guard) → Google kan niet cross-device dedupen. Een stabiele `activation_<user_id>` zou dat sluiten. Bid-kritiek → alleen gerapporteerd.
- **Stray tracked bestand:** `docs/wiki/testing/What Brought Dave Chappelle Back - PowerfulJRE (360p).mp4` (test-video, tracked, pre-existing) — NIET verwijderd (geen temp die ik maakte; geen "rule #227" vindbaar in docs/CLAUDE.md → alles pre-existing behouden). Overweeg opschonen.

## Open beslissingen (met aanbeveling)
1. **Test-account-creds herstellen** (blokkeert álle authed e2e/screenshots): test1-4@indxr-test.com weigeren de gedocumenteerde password. Aanbeveling: reset admin-side (`admin.updateUserById`) naar de password in `tests/test_accounts.json` én verifieer, als eigen kleine taak.
2. **PH frame3 re-shoot** (T8): draai `/home/aladdin/indxr-ph-launch/recapture-frame3.mjs` zodra creds werken (kant-en-klaar; 1440x864@2x → 2880x1728, caption-modus = 0 credits; gebruik een playlist die het account nog niet heeft i.v.m. T3-dedup). Herverifieer daarna de andere 8 frames op inhoud (nu alleen op dimensie gecheckt: 8× 2880x1728, frame3 was 1440x864).
3. **T6 stap-2 cap** — zie "niet gefixt".

## Loose ends
- **T8 frame3:** niet opnieuw geschoten (auth-blocker). Andere 8 frames alleen op dimensie geverifieerd, niet op inhoud (auth).
- **Behavioral prod-verificaties geblokkeerd door auth:** T2 admin-UI, T3 playlist-run. Code + deploy zijn groen; alleen de live-UI-doorloop ontbreekt.
- Werktree schoon; temp-probefiles opgeruimd (geen tracked file geraakt). `test-results/` + `tests/playwright-report/` blijven gitignored.

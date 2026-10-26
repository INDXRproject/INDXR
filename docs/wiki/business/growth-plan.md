# Groeiplan INDXR.AI — autonome groeipiloot

**Status:** GOEDGEKEURD door Khidr 2026-10-24 (prijs per bestand, Ads €10/dag + beslisregel, welkomstcredits 50→10). Landenblokkade ongewijzigd; Product Hunt geparkeerd door Khidr; Apple-login nu niet. Eén plek voor het hele groeiplan: betalen, Ads, SEO, ritme.
**Eigenaar uitvoering:** Claude (piloot, browser in Chrome-profiel "INDXR.ai") + Claude Code (bouwen) + Khidr (akkoord, accounts).
**Vervangt niet:** [google-ads-campagne.md](google-ads-campagne.md) blijft het verslag van de eerste campagne (aug–sep 2026). Dit plan bouwt erop voort.

---

## 1. Waar staan we (gemeten 2026-10-24)

| Bron | Cijfer |
|---|---|
| Google Ads, alle tijd | €463,68 · 281 klikken · 13 conversies (Google-telling) · **0 aankopen** |
| — File formats | €357,82 · 243 klikken · 13 conv. Bijna alles uit AG4 (algemene video-termen) |
| — Competitor | €105,86 · 38 klikken · 0 conv. Vrijwel alleen "free"/"youtube transcript"-zoekers |
| Funnel 31 aug–15 sep (analyse 16-09) | 260 klikken → 22 signups → 14 activaties → 0 aankopen; 50 welkomstcredits dekten 100% van het gebruik |
| Search Console, 3 mnd | 49 vertoningen · 5 klikken · enige queries = merknaam |
| Indexering | 17 geïndexeerd · 29 niet (24× "Discovered – not indexed" = geen autoriteit/externe links) |
| Verkeer na pauze | ~20 bezoekers/week, 0 activaties |

**Converterende zoektermen (alle tijd):** auto captions, subtitle generator, video to text generator, transcript a video, video transcriber (2), mp3 to text converter, ogg to text, sacar letra de un video (2).
**Wat niet werkte:** bestandsformaat-termen (m4a/wav/ogg/opus/mkv: samen ~5 klikken), concurrent-termen, en ~20–25% van de klikken met bekende zoekterm (≤44 van 190) ging naar "youtube"/"free"-intentie (= ons gratis product).

## 2. De kern: eerst een betaalmoment, dan pas verkeer

**Status: gebouwd (2026-10-25, commits f34a923…3348b75, ADR-107).** Zie
[session-2026-10-25-remote-control-report.md](../roadmap/session-2026-10-25-remote-control-report.md)
voor het volledige eindrapport (per-onderdeel bewijs + open punten). Live, nog niet geverifieerd
met een echte browser-klikdoorloop in Stripe-testmodus.

**De snelle balie (Khidr, 2026-10-24).** Naast het volledige product (account, library, credits voor terugkerende gebruikers) komt een snelle balie: één of een paar bestanden, geen account nodig, prijs zien, voorproefje van de eerste 3 minuten, afrekenen per bestand (€0,10/min, min. €2), transcript via veilige link + e-mail, met één klik alsnog een account. Het voorproefje beperkt zich tot 3 minuten zodat anoniem gebruik ons hooguit centen kost.

Het lek is niet het verkeer maar dat niemand hoefde te betalen. Bezoekers lazen de landingsartikelen niet maar gingen direct naar de tool, met **één bestand en één taak**. Daar sluit het nieuwe model op aan:

1. **Upload → prijs zien.** Na upload kennen we de duur (server-side, vóór elke afschrijving). We tonen: "36 min → €3,60 voor dit bestand, of met credits (36)".
2. **Gratis voorproefje.** De eerste 3 minuten worden direct getranscribeerd en getoond; na betaling volgt de rest. Kost ons ~€0,003/min (upload = geen proxy).
3. **Betalen per bestand óf met credits.** Per-bestand-betaling = precies de benodigde credits kopen tegen het per-bestand-tarief en ze direct op deze job reserveren. Eén grootboek (credits), geen tweede systeem.
4. **Pakketten blijven** voor wie terugkomt. Bij elke offerte tonen we het goedkoopste alternatief eerlijk ("of 100 minuten voor €5").
5. **Welkomstcredits 50 → 10.** Genoeg voor een korte spraakmemo; het voorproefje is het bewijs voor langere bestanden.

### Prijs per bestand (goedgekeurd)
**€0,10 per minuut, minimum €2 per bestand** (incl. BTW).
- Ligt 2× boven het Try-tarief (€0,05/min) zodat pakketten logisch blijven.
- Markt: BrassTranscripts $2,50 (≤15 min) / $6 (16+ min) per bestand; Sonix $10/uur; Happy Scribe $0,20/min PAYG. Wij zitten daaronder of gelijk.
- Minimum €2 dekt de Stripe-fee (~€0,25 + %) en houdt mini-bestanden winstgevend.

### Bekende haken (horen bij het werk, niet erna)
- **⚠️ Stripe-webhook is niet idempotent** (zie §6.1). Moet dicht vóór per-bestand-betaling live gaat — meer betalingen = meer kans op dubbele toekenning.
- **Webhook checkt `payment_status` niet**; vertraagde methoden (SEPA e.d.) zouden credits geven vóór het geld er is.
- **Bestand verdwijnt bij een Stripe-redirect** (staat nu alleen in geheugen/`/tmp`). Offerte vereist duurzame opslag (R2 is er al).
- **"Buy credits" bij te weinig saldo** navigeert weg en gooit het gekozen bestand weg. Dit is vandaag al een lek.
- **Misbruik voorproefje**: limiet per account (max 2 openstaande onbetaalde voorproefjes, dagbudget in minuten) + bestaande anti-abuse-laag (ADR-024).
- **Landenblokkade (ADR-062, Radar)**: blokkeert o.a. India; daar kwamen de meeste activerende gebruikers vandaan. Besluit van Khidr — staat open (§7).
- **Herroepingsrecht/refunds**: ADR-069 noemt dat de afstand van het 14-dagen-herroepingsrecht nog juridisch bevestigd moet worden. Bij betalen per bestand direct relevant.
- **Copy**: alle "50 credits"-teksten lopen via `FREE_TIER.WELCOME_CREDITS`; uitzondering = SQL-literal in `claim_welcome_reward` + inbox-bericht. Advertentieteksten ("50 Free Credits to Start") staan alleen in Google Ads en worden in de nieuwe campagne herschreven.

## 3. Google Ads — opnieuw, klein, op wat werkte

**Voorwaarde:** het betaalmoment (§2) staat live. Anders herhalen we september.

| Instelling | Waarde |
|---|---|
| Campagne | `US · Search · Video & audio to text` (nieuw; oude twee blijven gepauzeerd als historie) |
| Bieden | **Handmatige CPC** per advertentiegroep (les Zwart op Wit; in sept. werd het "Maximize clicks") |
| Dagbudget | **€10/dag** (goedgekeurd) |
| Max. CPC | €1,50 (gemeten gemiddeld €1,59–1,64 op deze termen; we kopen iets onder de markt en accepteren lagere positie) |
| Netwerk / geo | Alleen Google Search; VS, Presence; NL uitgesloten |
| Match | Exact + phrase |
| Landing | **Direct de tool** (`/transcribe`, uploadtab) — niet een artikel |
| Final URL suffix | `via=ads&kw={keyword}`; `kw` bewaren tot aankoop (net als gclid op het profiel) |
| Conversie (primair) | **Aankoop** met echte waarde. Activatie alleen observeren. Geen nepdoel. |

**Advertentiegroepen**
1. *Video to text* — video to text · video transcription · video transcriber · transcribe video to text · video to transcript converter · extract text from video · transcript a video · video to text generator
2. *Audio to text* — mp3 to text converter · transcribe audio file · voice memo to text · audio file to text
3. *Captions* — auto captions · subtitle generator · srt generator (landing: tool met SRT-export benadrukt)

**Uitsluitingen vanaf dag één** (bovenop de accountlijst): free · gratis · youtube · yt · link · url · live · real time · app · capcut · tiktok · instagram · translate · download · online free.

**Verwachting:** ~6 klikken/dag ≈ 180/maand. Bij de gemeten ~5% activatie ≈ 9 activaties/maand. Aantal betalers = onbekend; dat is precies wat we meten.

**Advertentieteksten (concept 2026-10-25, Engels, ≤30/≤90 tekens; prijsclaims handmatig bijwerken als de balieprijs verandert — staan niet in code):**

*Gedeeld (alle groepen):* Pay per File, No Subscription · See the Price Before You Pay · Free 3-Minute Preview · No Account Needed · Speaker Labels Included · Timestamps Throughout · Processed in the EU · Files Up to 10 Hours · From €2 per File
Beschrijvingen: "Upload a file, see the price, read the first 3 minutes free, then pay for that file." · "No subscription and no account needed. Pay once per file, from €2." · "Speaker labels and timestamps, ready to export as TXT, SRT, VTT or JSON." · "Coming back often? Buy credits that never expire and keep a searchable library."

*Groep Video to text:* Video to Text in Minutes · Transcribe Video to Text · Video Transcription Online · MP4, MOV, MKV and More · Export SRT, VTT and TXT · Upload, Preview, Pay
*Groep Audio to text:* MP3 to Text Converter · Transcribe Audio Files · Voice Memo to Text · Audio File to Text · MP3, M4A, WAV and More
*Groep Captions:* Auto Captions for Any Video · Subtitle Generator Online · Download SRT and VTT Files · Captions with Timestamps

*Sitelinks:* Pricing → `/pricing` · Supported formats → `/articles/supported-formats` · How it works → `/docs` · Credit packs → `/pricing`
*Callouts:* No subscription · Pay per file · Free 3-minute preview · Processed in the EU
*Landingspagina:* de balie, na herstel H7 (definitieve URL invullen zodra live).

**Beslisregel (vooraf vast):** na €300 uitgave of 30 dagen:
- ≥3 betalende klanten → doorgaan, budget naar €15.
- 1–2 → niet opschalen; offerte-/betaalpagina verbeteren met de PostHog-funnel.
- 0 → Ads stoppen. Het is dan een product-/prijsprobleem, geen verkeersprobleem. Niet harder bieden.

**Eerste week:** dagelijks zoektermen nakijken en uitsluiten (uitsluitingen veranderen het bieden niet).

### 3a. Live-status (2026-10-25 ~23:45, Claude-piloot, met akkoord Khidr)

Campagne **`US · Search · Balie (video/audio to text)`** (campaignId 24390731490) staat **aan**, status Eligible.
- Bieden: **Handmatige CPC**, standaardbod **€1,50** in alle drie groepen. Let op: de wizard zette het groepsbod op €0,01; handmatig gecorrigeerd. Bij nieuwe groepen altijd het bod controleren.
- €10/dag · alleen Google Search (geen Search Partners/Display) · VS, Presence · AI Max uit · advertenties roteren gelijk · suffix `via=ads&kw={keyword}`.
- Groepen (alleen exact + phrase, 41 zoekwoorden totaal):
  - **Video to text** (14) — landing `app.indxr.ai/transcribe?mode=audio`, pad /transcribe/video-to-text.
  - **Audio to text** (14) — pad /transcribe/audio-to-text, eigen koppen (MP3 to Text Converter, Voice Memos to Text, MP3, WAV, M4A and More).
  - **Captions and subtitles** (13) — pad /transcribe/subtitles, koppen Subtitle Generator for Video, Auto Captions for Any Video, SRT File Generator, Export SRT and VTT Subtitles.
  - Elke groep: 15 koppen, 4 beschrijvingen. Google's AI-voorinvulling ("Get a Free Trial", "text to speech" e.d.) is overal verwijderd.
- Sitelinks: Pricing → /pricing · Supported formats → /articles/supported-formats · How it works → /docs · **SRT subtitle generator** → /articles/srt-generator. Credit packs vervallen: dezelfde URL als Pricing. Alle vier gecontroleerd: laden.
- Callouts: No subscription · Pay per file · Free 3-minute preview · No account needed · Processed in the EU · Credits never expire · Speaker labels. Oude callouts "50 free credits" en "No upload limits" bewust niet gebruikt (onjuist).
- Uitsluitingen (campagne, breed): de lijst hierboven + realtime · translation · job · jobs · hiring · salary · work from home · course. Transcriptie-vacatures zijn veel gezocht. Er bestaat nog geen gedeelde uitsluitingslijst.
- Google-schatting bij €10/dag: ~144 klikken/week, gem. CPC ~€0,49.
- Geplande controles: dagelijks t/m 1 nov (09:13), weekrapport 2 nov, beslismoment 24 nov.

### 3b. Meetfout + voorproefje-lek gevonden en gerepareerd (2026-10-26, Claude-piloot, PostHog-analyse)

De eerste echte Ads-bezoeker (VS, iPhone) landde 5× op `app.indxr.ai/transcribe?mode=audio&via=ads&kw=…&gclid=…`,
uploadde twee keer een clip van 1–2 min, zag €2 als prijs en vertrok. Twee fouten kwamen daarbij
boven water:

**Bug 1 — herkomst kwam niet in de events aan.** `quote_shown` had `via`/`kw` leeg terwijl de URL ze
wel bevatte. Oorzaak: `AcquisitionCapture` (het component dat `?via=&kw=&gclid=` uit de landings-URL
in de `indxr_acq`-cookie zet) stond alleen gemonteerd in `apps/marketing`'s root-layout — **niet** in
`apps/app`'s root-layout. Omdat de Ads-campagne (§3a) direct naar `app.indxr.ai/transcribe` landt
(niet naar de marketing-host), werd de cookie op die host dus nooit gezet: `QuickCheckoutPanel`'s
`readAcquisitionCookie()` las een lege cookie, niet een lege URL — de fix moest bij de bron (de
ontbrekende mount), niet als pleister in het panel. **Fix:** `AcquisitionCapture` ook gemonteerd in
`apps/app/src/app/layout.tsx` (zelfde positie in de boom als marketing: binnen `ConsentProvider` +
`AuthProvider`). `gclid` ontbrak bovendien in de keten van `checkout_started` naar de Stripe-metadata
(alleen `via`/`kw` werden doorgegeven aan `/api/quick-checkout`) — toegevoegd op alle schakels:
`QuickCheckoutPanel.pay()` → `/api/quick-checkout`-body → Stripe session-metadata →
`quick_purchase_completed` in de webhook. `quote_shown` kreeg ook `duration_seconds` (som van alle
bestanden) en had `file_count` al.

**Bug 2 — kort bestand kreeg het VOLLEDIGE transcript gratis.** Het voorproefje knipt met ffmpeg
`-t QUICK_QUOTE_PREVIEW_SECONDS` (180s) het begin van het bestand — maar `-t` op een bestand dat
KORTER is dan 180s geeft gewoon het hele bestand terug. Een upload van 1–2 minuten (zoals deze
eerste bezoeker deed) kreeg dus de volledige, gratis getranscribeerde tekst als "voorproefje",
zonder dat er ooit een betaalmoment overbleef. **Fix** (`backend/main.py`,
`create_quick_quote`): voorproefje-duur is nu `min(180s, duur/3)` — bij 1 min dus 20s, bij 10 min
nog steeds het plafond van 180s (3 min) zoals bedoeld. Er bleek geen apart API-lek (geen veld
retourneert meer tekst dan de getrimde clip bevat — `_run_quick_quote_preview` transcribeert alleen
het getrimde preview-bestand, nooit het origineel); de ENIGE bron van het teveel was de trim-duur
zelf. Copy die "first 3 minutes free" beloofde is overal herschreven naar "free preview of the
first part, up to 3 minutes" (`QuickCheckoutPanel.tsx`, beide `/transcribe`-pagina's,
`FreeToolEmbed.tsx`, `pricing.ts`-commentaar).

**Nog open — niet door code op te lossen:** de live Ads-callouts/koppen in §3a/§3 ("Free 3-Minute
Preview") beloven dezelfde onnauwkeurigheid in de advertentietekst zelf (Google Ads account, geen
code) — moet de piloot in de browser bijwerken naar dezelfde "up to 3 minutes"-formulering.

**Geverifieerd:**
- `pnpm build` groen (2/2 apps).
- Backend-baseline: `test_error_classification.py::test_connection_like_errors_are_retryable_timeout`
  faalt zowel vóór als na deze wijziging (pre-existing, niet veroorzaakt door dit werk) — overige
  20 pure-logica-tests ongewijzigd groen.
- Lokale formule-check: 1 min → 20s preview, 2 min → 40s, 10 min → 180s (plafond), 30 min → 180s
  (plafond) — exact zoals gevraagd.
- Live productietest na deploy (commit 3fd0afb, alle vier deploys groen): zie `docs/LOG.md` voor de
  volledige resultaten — cookie-niveau bewijs van de attributie-fix (Playwright, echte browser) en
  de preview-lengtetest met een echte 1-min- en 10-min-TTS-upload tegen productie. **De HogQL-query
  zelf kon niet draaien** — geblokkeerd, geen codeprobleem: het lokale `scripts/.env.verify`
  personal-API-key heeft wel `person:read`/`person:delete` (zie LESSONS 2026-09-02) maar mist
  `query:read`, en er is geen tool om zelf een nieuw gescopet personal-key aan te maken zonder het
  PostHog-dashboard (zelfde klasse blokkade als de Supabase-secret-key eerder deze week). **Correctie
  op de opdracht:** het echte, geverifieerde PostHog-project is **298689** (EU-regio,
  `NEXT_PUBLIC_POSTHOG_PROJECT_ID` in alle `.env.local`'s, bevestigd in LOG 2026-09-02) — niet 155180.
  Extra, documentatie-bevestigde complicatie los van de keyscope: `scripts/verify-posthog-bridge.mjs`
  legt vast dat posthog-js in een GEAUTOMATISEERDE browser (zoals deze Playwright-run) nul
  capture-events verstuurt (bot-filtering, geldt voor alle events, niet alleen de alias-events uit
  die eerdere sessie) — dus zelfs met een werkende key zou een HogQL-query op `quote_shown` uit déze
  specifieke run waarschijnlijk niets gevonden hebben. Dat is een bestaande meetbeperking van de
  tool, geen regressie van deze fix.

## 4. SEO — parallel, kost niets

1. **Indexering aanvragen** voor commerciële pagina's (quotum ~10/dag). *Gedaan 2026-10-24:* `/articles/video-to-text`, `/alternatives/otter-ai`, `/articles/supported-formats`. (`/articles/audio-to-text` staat al in Google.)
2. **Dunne pagina's uit de index** (`noindex` + uit sitemap): `/docs/account/credits`, `/docs/account/billing`, `/docs/account/settings`. Ze trekken crawl-aandacht weg van pagina's die tellen.
3. **Externe links via directories** (gratis, accounts maakt Khidr; alle teksten maakt Claude). **Eerst AlternativeTo** (keuze Khidr): vermelding + als alternatief bij concurrenten waarvan de hoofdtaak echt overeenkomt (AlternativeTo weigert en blokkeert spam). Daarna SaaSHub, BetaList, Uneed, There's An AI For That, Futurepedia. Product Hunt: geparkeerd. Let op: links op directories zijn vaak nofollow; de waarde zit in ontdekking door Google (crawl), verwijzingsverkeer en vermeldingen, niet in linkkracht.
4. **Content op converterende intentie**: zoekwoordvolume meten in Keyword Planner voor *video to text*, *auto captions / subtitle generator*, *mp3 to text*. Bestaande artikelen (`video-to-text`, `srt-generator`, `audio-to-text`) aanscherpen naar het nieuwe model en een directe tool-CTA; pas daarna nieuwe artikelen. Publicatie van nieuwe pagina's: eerst akkoord Khidr.
**Zoekvolume (Keyword Planner, VS, okt 2025–sep 2026, gemeten 2026-10-25; bandbreedtes omdat er geen actieve campagne is):**

| Zoekterm | Volume/mnd | Concurrentie | Top-bod (laag–hoog) |
|---|---|---|---|
| transcribe video to text | 10K–100K | Medium | €0,99–5,14 |
| video transcription | 10K–100K | Medium | €0,75–4,31 |
| audio to text / audio file to text | 10K–100K | Medium | €0,92–4,46 |
| auto captions | 1K–10K | **Low** | €0,76–3,25 |
| subtitle generator | 1K–10K | Medium | €0,75–2,98 |
| mp3 to text / mp3 to text converter | 1K–10K | Medium | €0,42–3,09 |
| video to text | 1K–10K | Medium | €0,28–3,19 |
| transcribe audio file | 1K–10K | High | €1,95–7,36 |
| extract text from video · generate subtitles from video · srt generator · voice memo to text | 100–1K | Medium | €0,58–4,14 |
| transcription no subscription · pay per minute transcription | geen meetbaar volume | — | — |

**Contentvolgorde die hieruit volgt:**
1. `/articles/video-to-text` aanscherpen op *transcribe video to text* / *video transcription* (grootste volume, converteerde in Ads).
2. `/articles/srt-generator` verbreden naar *subtitle generator* + *auto captions* (lage concurrentie, converteerde in Ads). Staat al in Google.
3. Nieuw: *mp3 to text* (goedkoopste biedingen, gezond volume) — publicatie pas na akkoord Khidr.
4. "Geen abonnement" blijft verkoopargument op de pagina, geen zoekwoord: er is geen zoekvolume op.

5. **Interne links** vanaf de homepage en `/transcribe` naar de commerciële artikelen.

## 5. Vast ritme

| Wanneer | Wat (Claude, via browser) |
|---|---|
| Dagelijks (zolang Ads draaien) | Uitgave, klikken, zoektermen → uitsluitingen; aankopen in PostHog; afwijking = direct melden |
| Wekelijks (maandag) | Search Console (indexering, queries), PostHog-funnel (bezoek → upload → offerte → betaling), 2–3 indexeringsaanvragen; **kort verslag aan Khidr** |
| Bij beslisregel (§3) | Advies + cijfers, Khidr beslist |

**Voorwaarden voor geplande taken:** laptop aan, Claude desktop-app open, Chrome-venster "INDXR.ai" open (koppeling via `select_browser` op deviceId `992309b2-9227-434c-9913-7f4d74bd4753`).

## 5a. Bewaking eerste balie-aankopen

3. **RESEND_API_KEY/RESEND_FROM op Railway (api + worker) — ✅ afgerond 2026-10-25**, zie
   [incident-2026-10-railway-secrets.md](../operations/incident-2026-10-railway-secrets.md).
   Beide namen ontbraken op `api` én `worker` — nooit "uitgelekt", gewoon nooit gezet, `mailer.py`
   is pas deze sessie gebouwd. De bestaande Vercel-waarden waren niet terug te lezen (Vercel's
   "sensitive"-variabeletype is write-only). Khidr heeft zelf een nieuwe Resend API-key aangemaakt
   en doorgegeven; direct doorgezet naar Railway `api`+`worker` zonder ooit elders bewaard te
   worden. `RESEND_FROM` is gezet op `INDXR.AI <no-reply@send.indxr.ai>` — hetzelfde adres dat de
   Vercel-apps al gebruiken. Geverifieerd met een echte testmail via `backend/mailer.py` naar
   `contact@indxr.ai` (geen fout gelogd → verzend geslaagd).
4. **SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY — ✅ afgerond 2026-10-25.** De nieuwe
   Supabase-sleutelsystemen (`sb_secret_...`) vereisten een eenmalige dashboard-actie om een
   nieuwe secret key aan te maken (geen MCP-tool, geen CLI-device-flow voor Supabase). Khidr heeft
   die zelf aangemaakt en doorgegeven; gezet op Railway `api`+`worker` (beide variabelenamen,
   zie incident-doc) en op Vercel `indxr-app` production. Geverifieerd met een balie-offerte
   (`POST /api/quote/create` + terug-lezen) en een credit-RPC-test (reserve+refund, netto nul op
   een testaccount) tegen productie — beide geslaagd. De oude legacy service_role-sleutel staat
   nog niet ingetrokken; dat kan pas nadat de frontend ook van de legacy anon-sleutel af is (zie
   incident-doc §"Stap 3" voor het onderzoek — een pure env-var-wissel, geen codewijziging, nog
   niet uitgevoerd).

## 6. Uitvoering via Claude Code

### 6.1 Financiële vondst — eerst dichtzetten
`apps/app/src/app/api/stripe/webhook/route.ts` → `checkout.session.completed` roept `add_credits` aan zonder controle of deze `stripe_session_id` al is toegekend, en zonder `payment_status === 'paid'`-check. Of de database een unieke index op `metadata.stripe_session_id` heeft, is niet bevestigd (niet gevonden in de gelezen migraties). Een Stripe-retry na een time-out kan dan dubbel credits geven.

### 6.2 Prompt voor Claude Code — snelle balie (goedgekeurd, klaar om te plakken)

Start in **Plan Mode**. Lees eerst `docs/wiki/business/growth-plan.md`, ADR-024, ADR-050, ADR-062, ADR-069, ADR-097, `docs/wiki/architecture/credit-system.md`, en de code van de upload-, credit- en Stripe-paden. Leg het plan voor als één geheel en voer het daarna zonder tussenvragen uit. Wat je niet kunt beslissen: overslaan en rapporteren onder "OVERGESLAGEN — vraag voor Khidr".

## Doel

Een **snelle balie** naast het bestaande product. Iemand met één of een paar bestanden die gewoon snel een transcript wil: uploaden, prijs zien, voorproefje zien, afrekenen, klaar. Het bestaande product (account, library, creditpakketten) blijft volledig bestaan en is er voor terugkerende gebruikers. Daarnaast twee betaalveiligheidsfixes die vandaag al nodig zijn, en SEO-hygiëne.

## Onderdeel A — Betaalveiligheid (eerst, los committen)

1. **Webhook-idempotentie.** `checkout.session.completed` kent nu credits toe zonder te controleren of deze `stripe_session_id` al verwerkt is. Controleer eerst in de live database (Supabase MCP, alleen lezen) of er een unieke index of constraint op de session-id bestaat. Bestaat die niet, voeg dan één vangnet toe op databaseniveau, zodat dubbele toekenning onmogelijk is, ook bij gelijktijdige retries. Een check alleen in de applicatie is niet genoeg. Een herhaalde webhook moet 200 teruggeven zonder iets te doen.
2. **Betaalstatus.** Ken alleen credits toe bij `payment_status === 'paid'`. Handel `checkout.session.async_payment_succeeded` en `async_payment_failed` af als vertraagde betaalmethoden aan kunnen staan. Controleer dat via de Stripe-configuratie in code/env; als het niet vast te stellen is: rapporteren.
3. Bewijs met een test: dezelfde event twee keer afleveren levert één toekenning op.

**Financieel-kritiek:** bij twijfel stoppen en rapporteren. Geen DELETE of UPDATE op gebruikersdata of op bestaande `credit_transactions`.

## Onderdeel B — Snelle balie

Gewenste ervaring, mobiel eerst:
1. Bezoeker uploadt één of meer bestanden (maximaal 5 per keer) op `/transcribe`, uploadtab. **Er is geen account nodig.**
2. Per bestand zien ze direct: duur, prijs in euro's (`max(€2, €0,10 × ceil(min))`, incl. btw) en het totaal. Daarnaast staat eerlijk het goedkoopste alternatief: "Of koop 100 minuten voor €5 en houd de rest over" (waarden uit `PACKAGES`, nooit hardcoded).
3. **Voorproefje:** de eerste 3 minuten van elk bestand worden direct gratis getranscribeerd en getoond. Daarmee zijn de kosten zonder account begrensd.
4. **Afrekenen:** één Stripe Checkout voor alle bestanden. Apple Pay, Google Pay en iDEAL volgen de dashboardinstelling (dynamic payment methods). Het e-mailadres wordt in Checkout gevraagd. Billing address en Radar gelden hetzelfde als nu, zodat de landenblokkade (ADR-062) blijft werken.
5. Na betaling wordt de rest getranscribeerd. Het transcript is te zien op een veilige pagina met een onraadbare link en wordt ook per e-mail gestuurd (Resend). Met één klik kan de koper een account maken en het bestand in de library zetten.
6. **Ingelogde gebruiker:** zelfde offerte, plus de keuze "Betaal met credits (N)". Bij te weinig saldo blijft hij op de pagina. Het gekozen bestand mag nooit verloren gaan; dat lek bestaat nu bij "Buy credits".

Technische eisen:
- Het bestand moet een Stripe-redirect overleven. Sla het op in R2 (de client bestaat al in `backend/storage.py`) met een offerte-id en een vervaltermijn. Ruim verlopen, onbetaalde offertes automatisch op.
- De offerte legt duur en prijs vast. Na betaling wordt nooit meer afgeschreven dan geoffreerd.
- **Eén grootboek:** een betaling per bestand is een `purchase` van precies de benodigde credits (met eigen `product_type`/metadata zodat het financiële dashboard het onderscheidt), die in dezelfde transactie op de job wordt gereserveerd (ADR-050). Bouw geen tweede geldsysteem.
- Anonieme kopers: kies één schone manier om credits en job aan een koper te koppelen. Bijvoorbeeld een gast-profiel op het e-mailadres uit Checkout, dat bij een latere signup met hetzelfde adres wordt samengevoegd. Leg de keuze vast in een nieuwe ADR.
- **Misbruik:**
  - Voorproefjes zonder account rate-limiten per IP via Upstash, ook op het Railway-endpoint zelf (dat heeft nu geen eigen limiet).
  - Maximum aantal open, onbetaalde offertes per IP en per account.
  - Bestaande canonical-email-dedup (ADR-024) behouden.
- **Mislukte job na betaling:** de gebruiker krijgt automatisch de credits terug op zijn tegoed of gast-tegoed, en de foutmelding zegt eerlijk wat er gebeurde. Een terugbetaling via Stripe gaat alleen handmatig.
- **Prijs:** zet `PER_FILE_EUR_PER_MIN = 0.10` en `PER_FILE_MIN_EUR = 2` als constanten in `pricing.ts` en laat ze overal daaruit renderen.

Copy:
- Sentence case, geen toasts, inline foutmeldingen, premium toon.
- De homepage-tekst "Upload a file and see for yourself. No account, no card." moet na deze bouw kloppen. Controleer dat expliciet.
- Leg op de pricingpagina helder uit wat het verschil is tussen per bestand betalen en een pakket.

## Onderdeel C — Welkomstcredits 50 → 10

`FREE_TIER.WELCOME_CREDITS`, de SQL-literal in `claim_welcome_reward` (nieuwe migratie, 14-cijferig formaat, via `apply_migration`), het inbox-bericht, en `credit-system.md` (staat nog op 25). Bestaande gebruikers houden hun saldo. Pas daarna alle copy na die de constante gebruikt, op logische zinnen: "enough for 10 minutes" moet ook als tekst nog kloppen.

## Onderdeel D — Meting

1. Final URL-parameters `via` en `kw` (`?via=ads&kw={keyword}`) bij binnenkomst vastleggen, net als gclid, en bewaren tot aankoop. Ze moeten ook in de PostHog-events van de balie terechtkomen.
2. Nieuwe PostHog-events:
   - `quote_shown` (duur, prijs, aantal bestanden)
   - `preview_viewed`
   - `checkout_started` (balie)
   - `quick_purchase_completed` (server-side vanuit de webhook)
3. Google Ads-conversie "Purchase" vuurt ook voor balie-aankopen, met de werkelijke waarde en een stabiele `transaction_id`.

## Onderdeel E — SEO-hygiëne

1. Zet `noindex` op `/docs/account/credits`, `/docs/account/billing` en `/docs/account/settings` en haal ze uit `sitemap.ts`.
2. Voeg interne links toe van homepage en `/transcribe` naar `/articles/video-to-text`, `/articles/audio-to-text` en `/articles/srt-generator`. Doe dat waar het inhoudelijk past, geen link-stuffing.
3. Herschrijf de call-to-action in die drie artikelen naar de snelle balie.

## Onderdeel F — Klein, meenemen

`apps/app/src/app/api/transcribe/whisper/route.ts` r.47-48: de rate-limit-meldingen zijn omgedraaid. Repareren als de route nog in gebruik is; is hij dood, verwijderen en dat melden.

## Buiten scope

- Geen wijzigingen aan creditpakketten, -prijzen of de landenblokkade.
- Geen nieuwe loginproviders.
- Geen wijzigingen aan de playlist- en YouTube-paden, behalve gedeelde componenten die echt meemoeten.

## Klaar als

- Build groen; deploy Vercel (beide apps) en Railway groen.
- **Live end-to-end in Stripe testmodus** (of live met refund als testmodus niet beschikbaar is; dan eerst rapporteren):
  - anoniem 2 bestanden → offerte → voorproefje → betalen → volledig transcript op de link plus e-mail;
  - ingelogd → betalen met credits;
  - ingelogd met te weinig saldo → bestand blijft staan;
  - dubbele webhook → één toekenning;
  - mislukte job → credits terug.
- Gemeten op mobiel (375px) en desktop, licht en donker.
- Wiki bijgewerkt:
  - ADR (snelle balie + gast-koppeling)
  - `credit-system.md`
  - `pricing.md` (per-bestandtarief)
  - LESSONS (webhook-idempotentie als patroon)
  - LOG-regel per onderdeel
  - `growth-plan.md` §2 status → "gebouwd"

Commit per onderdeel, A eerst. Commit en push zelf; verifieer deploy groen; rapporteer commit-hashes en deploy-status. Draai `git log --oneline -10` vóór elke push.

Sluit af met een platte-tekst samenvatting zonder opmaak voor Khidr: wat gebouwd is, wat getest is met bewijs, wat overgeslagen is en waarom, en open punten.

### 6.3 Herstelronde snelle balie (gevonden bij controle 2026-10-25, Claude-piloot) — moet vóór Ads aan

Gevonden door de piloot na de bouw: code nagelezen + anonieme browser-doorloop op `app.indxr.ai/transcribe` met een testbestand van 9 min (betaling zelf niet doorlopen).

**Prompt voor Claude Code (klaar om te plakken):**

Start in Plan Mode. Lees `growth-plan.md` §2, §6.2 en deze §6.3, ADR-107 en het eindrapport `session-2026-10-25-remote-control-report.md`. Herstel de onderstaande punten in één reeks, elk onderdeel los committen. Financieel-kritiek (H1, H2): bij twijfel stoppen en rapporteren; geen DELETE/UPDATE op gebruikersdata of bestaande `credit_transactions`. Wat je niet kunt beslissen: overslaan en rapporteren onder "OVERGESLAGEN — vraag voor Khidr".

H1 — Webhook: mislukte toekenning moet opnieuw geprobeerd worden. `grantCreditsForSession` en `handleQuickPurchaseSession` doen bij een fout (add_credits-fout, quote niet gevonden, guest-aanmaak mislukt) alleen `return`, waarna de route 200 teruggeeft. Stripe probeert dan nooit opnieuw: klant betaald, geen credits. Nu de toekenning idempotent is (Onderdeel A), moet elke tijdelijke fout een 500 opleveren zodat Stripe retryt. Alleen echt onherstelbare gevallen (ontbrekende metadata) mogen 200 + Sentry error.

H2 — Snelle balie: betaald bestand mag nooit blijven hangen. Nu wordt de dispatch naar `/api/quote/{id}/dispatch` alleen uitgevoerd als `already_processed` false is, de response wordt niet gecontroleerd (`res.ok`), en een mislukte dispatch wordt alleen gelogd. Bij een Stripe-retry ziet de webhook "already_processed" en slaat de dispatch over → betaald, nooit getranscribeerd. Maak de dispatch idempotent op `quick_quotes.status` (dispatch zolang status ≠ dispatched/done, ongeacht already_processed), controleer `res.ok`, en geef 500 terug bij een mislukte dispatch zodat Stripe opnieuw aflevert. Voeg daarnaast een watchdog-pass toe die betaalde quotes zonder dispatch na N minuten alsnog dispatcht. Bewijs met test: (a) dispatch faalt eerste keer → retry dispatcht alsnog, één keer; (b) dubbele webhook → één toekenning, één dispatch.

H3 — Voorproefje wordt nooit getoond. `QuickCheckoutPanel` pollt niet: na `quote/create` blijft elk bestand op "Preparing free preview…" staan (gemeten: >2 min, nul netwerkverzoeken). `preview_text` wordt bovendien nergens gerenderd. Bouw polling op `GET /api/quote/{id}?token=` (met backoff en maximum), toon de voorproeftekst per bestand leesbaar (eerste ~3 min, met tijdcodes of sprekers als beschikbaar), en toon duidelijk wanneer het voorproefje mislukt. `preview_viewed` moet pas vuren als de tekst echt in beeld is.

H4 — Offerte toont geen duur. Toon per bestand de gemeten duur ("9 min") naast de prijs.

H5 — "Goedkoopste alternatief" is niet het goedkoopste. Het panel toont altijd het `mostPopular`-pakket (1.000 min voor €25), ook bij een offerte van €2. Toon het goedkoopste pakket dat de offerte dekt en alleen als dat per saldo logisch is ("Of 100 minuten voor €5 — houd 91 minuten over"); toon niets als per bestand goedkoper én voldoende is. Waarden uit `PACKAGES`, nooit hardcoded.

H6 — Het moet er goed uitzien (eis Khidr). Het anonieme panel is nu een kale native `<input type=file>`. Breng het op het niveau van de bestaande AudioTab: dropzone met slepen, bestandskaart met naam/grootte/duur, dezelfde tokens en componenten, mobiel eerst. Paginatitel van `app.indxr.ai/transcribe` is nu "INDXR.AI - Dashboard" → "Transcribe a file — INDXR.AI". Meet op 375px en desktop, licht en donker.

H7 — Weg van de bezoeker naar de balie. `indxr.ai/transcribe` heeft als H1 "Free transcript generator…" en de uploadtab vraagt eerst een klik op "Try it now →" naar een andere host. Voor betaald verkeer is "free" in de kop precies het lek uit de eerste campagne. Herschrijf H1/subkop voor het upload-pad naar de betaalde balie (gratis blijft gelden voor YouTube-captions, eerlijk benoemd), en laat de uploadtab zo direct mogelijk naar de balie gaan (minimale klikken). Geen implementatiedetails in copy (C13).

H8 — Herroepingsrecht bij betalen per bestand (ADR-069 §7). Advies piloot (geen juridisch advies): neem in het label van de bestaande akkoord-checkbox bij de balie-checkout letterlijk op dat de koper vraagt om directe levering en dat hij daarmee zijn herroepingsrecht van 14 dagen verliest zodra het transcript is geleverd (één checkbox, de tekst moet in het label zelf staan — alleen verwijzen naar de voorwaarden is niet genoeg). Voorbeeld (sentence case, premium toon, Engels): "I agree to the Terms of Service and Privacy Policy, and I ask INDXR to start right away. I understand I lose my 14-day right of withdrawal once my transcript is delivered." Bevestig deze instemming ook in de bevestigingsmail (Resend) na betaling, en leg vast in ADR-069 en `terms`. **Akkoord Khidr 2026-10-25 (§7 punt 7).**

H9 — "Met één klik een account" ontbreekt. De secure transcript-pagina moet de knop hebben om het gast-account te claimen (wachtwoord instellen of Google-login op hetzelfde e-mailadres, `is_guest` → false, transcript in library). Dit was beloofd in de balie-copy.

H10 — Migratiedrift. De migratie `welcome_credits_50_to_10` staat live in de database maar het bestand ontbreekt in `supabase/migrations/`. Schrijf het bestand met exact de toegepaste SQL (via Supabase MCP `list_migrations`/functiedefinitie ophalen), niet opnieuw toepassen.

H11 — Controleer `RESEND_API_KEY`/`RESEND_FROM` op Railway (api én worker) via de Railway CLI; ontbreken ze, rapporteren (niet zelf aanmaken). Controleer ook de tegenstrijdigheid: het eindrapport zegt dat iDEAL uit staat, het Stripe-dashboard toont iDEAL | Wero als ingeschakeld. Rapporteer welke configuratie Checkout echt gebruikt.

Klaar als: build groen; alle deploys groen; H1/H2 bewezen met tests; H3–H7 live gecontroleerd met een echte browser (Playwright, anonieme sessie, 375px + desktop, licht + donker, screenshots in het rapport); LOG-regel per onderdeel; LESSONS-regel "webhook: idempotent ≠ altijd 200 — tijdelijke fouten moeten 500 geven"; ADR-107 bijgewerkt; §2-status in dit plan → "hersteld". Commit en push zelf; verifieer deploy groen; rapporteer commit-hashes. Sluit af met een platte-tekst samenvatting voor Khidr.

## 7. Beslissingen (2026-10-24)
1. Prijs per bestand €0,10/min, minimum €2 — akkoord.
2. Ads €10/dag, beslisregel na €300 of 30 dagen — akkoord. Campagne gaat pas aan ná livegang snelle balie en met akkoord op het aanzetten.
3. Welkomstcredits 50 → 10 — akkoord.
4. Landenblokkade (ADR-062): ongewijzigd.
5. Product Hunt: geparkeerd. AlternativeTo eerst.
6. Apple-login: nu niet.
7. Herroepingsrecht bij betalen per bestand (§6.3 H8): **akkoord** (2026-10-25) — tekst in het label van de bestaande akkoord-checkbox, plus bevestiging in de mail.

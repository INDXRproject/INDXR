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

**Beslisregel (vooraf vast):** na €300 uitgave of 30 dagen:
- ≥3 betalende klanten → doorgaan, budget naar €15.
- 1–2 → niet opschalen; offerte-/betaalpagina verbeteren met de PostHog-funnel.
- 0 → Ads stoppen. Het is dan een product-/prijsprobleem, geen verkeersprobleem. Niet harder bieden.

**Eerste week:** dagelijks zoektermen nakijken en uitsluiten (uitsluitingen veranderen het bieden niet).

## 4. SEO — parallel, kost niets

1. **Indexering aanvragen** voor commerciële pagina's (quotum ~10/dag). *Gedaan 2026-10-24:* `/articles/video-to-text`, `/alternatives/otter-ai`, `/articles/supported-formats`. (`/articles/audio-to-text` staat al in Google.)
2. **Dunne pagina's uit de index** (`noindex` + uit sitemap): `/docs/account/credits`, `/docs/account/billing`, `/docs/account/settings`. Ze trekken crawl-aandacht weg van pagina's die tellen.
3. **Externe links via directories** (gratis, accounts maakt Khidr; alle teksten maakt Claude). **Eerst AlternativeTo** (keuze Khidr): vermelding + als alternatief bij concurrenten waarvan de hoofdtaak echt overeenkomt (AlternativeTo weigert en blokkeert spam). Daarna SaaSHub, BetaList, Uneed, There's An AI For That, Futurepedia. Product Hunt: geparkeerd. Let op: links op directories zijn vaak nofollow; de waarde zit in ontdekking door Google (crawl), verwijzingsverkeer en vermeldingen, niet in linkkracht.
4. **Content op converterende intentie**: zoekwoordvolume meten in Keyword Planner voor *video to text*, *auto captions / subtitle generator*, *mp3 to text*. Bestaande artikelen (`video-to-text`, `srt-generator`, `audio-to-text`) aanscherpen naar het nieuwe model en een directe tool-CTA; pas daarna nieuwe artikelen. Publicatie van nieuwe pagina's: eerst akkoord Khidr.
5. **Interne links** vanaf de homepage en `/transcribe` naar de commerciële artikelen.

## 5. Vast ritme

| Wanneer | Wat (Claude, via browser) |
|---|---|
| Dagelijks (zolang Ads draaien) | Uitgave, klikken, zoektermen → uitsluitingen; aankopen in PostHog; afwijking = direct melden |
| Wekelijks (maandag) | Search Console (indexering, queries), PostHog-funnel (bezoek → upload → offerte → betaling), 2–3 indexeringsaanvragen; **kort verslag aan Khidr** |
| Bij beslisregel (§3) | Advies + cijfers, Khidr beslist |

**Voorwaarden voor geplande taken:** laptop aan, Claude desktop-app open, Chrome-venster "INDXR.ai" open (koppeling via `select_browser` op deviceId `992309b2-9227-434c-9913-7f4d74bd4753`).

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

## 7. Beslissingen (2026-10-24)
1. Prijs per bestand €0,10/min, minimum €2 — akkoord.
2. Ads €10/dag, beslisregel na €300 of 30 dagen — akkoord. Campagne gaat pas aan ná livegang snelle balie en met akkoord op het aanzetten.
3. Welkomstcredits 50 → 10 — akkoord.
4. Landenblokkade (ADR-062): ongewijzigd.
5. Product Hunt: geparkeerd. AlternativeTo eerst.
6. Apple-login: nu niet.

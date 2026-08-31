# Beslissing 080: Transcribe-afwerking — methodekleur-conventie, kostenweergave-regel, gedeelde ErrorCard, per-video Retry vervalt

**Status:** Geaccepteerd
**Datum:** 2026-07-26
**Gerelateerde code:**
- `packages/shared/src/components/transcribe/` — `method.ts`, `MethodBadge.tsx`, `MethodRadioCards.tsx`, `CostBreakdown.tsx`, `ErrorCard.tsx`, `errorCopy.ts`
- `packages/shared/src/components/free-tool/{VideoTab,AudioTab,PlaylistTab}.tsx`
- `packages/shared/src/components/{PlaylistManager,PlaylistAvailabilitySummary}.tsx`
- `backend/transcription_pipeline.py` (`_classify_download_error` — comment naar de copy-map)

Vervolg op ADR-079 (gedeelde `TranscribeWorkbench`). Dit is de afwerking.

## Context

Na ADR-079 stond de basis, maar de afwerking lekte semantiek: de methodekeuze had dezelfde vorm als de mode-strip erboven (twee segmented controls onder elkaar lezen als twee rijen tabs); de kosten van een betaalde job stonden als kleinste/grijste tekst op het scherm; geel stond op AI-transcriptie (de betaalde kernfunctie las als waarschuwing); het playlist-afrondingsscherm tintte de hele kaart groen terwijl video's mislukten en vierde een gedeeltelijke mislukking; fouten waren deels kale rode tekst zonder herstel.

## Beslissing

1. **Methodekleur-conventie.** Een transcriptiemethode heeft één kleur door het hele product, en het zijn exact de tokens die het Library-badgecomponent (`apps/app/.../library/TranscriptList.tsx` → `BADGE_CLASSES`) al gebruikt: **auto-captions = sky** (`--sky`), **AI-transcriptie = indigo** (`--indigo`). Eén bron: `method.ts` (`METHOD_META`) — geen nieuwe kleuren, geen gedupliceerde hex. De methodekleur volgt de methode door de hele keten: methodekeuze → playlist-samenvatting → per-videorijen → voortgang → afronding → Library. **Alleen de methode-as propageert;** de bron-as (video/playlist/upload) is een Library-concern. **Audio-upload heeft géén eigen bron-badge** — een upload gaat via AssemblyAI en gebruikt dus de AI-indigo. **Groen = uitsluitend gratis/nieuw/volledig gelukt; rood = uitsluitend onbeschikbaar/fout; geel komt in deze flow niet meer voor.**

2. **Kostenweergave-regel.** De kosten van een betaalde actie zijn nooit het kleinste of grijste element. Twee vragen worden gesplitst: *"wat kost dit"* → het `Total` (~20px, semibold, `--fg-strong`) in het kostenopbouw-blok; *"kan ik dat betalen"* → de saldoregel in de actiebalk (13px, `--fg-subtle`, **niet** `--fg-muted` — er is geen `--fg-secondary` in tokens.css, `--fg-subtle` is de prominentere neutraal). Bij tekort geen dode disabled-knop maar twee echte uitwegen (Deselect / Buy credits). Gecentraliseerd in `CostBreakdown` (bar + legenda + Total) + `BalanceLine`. Video-modus toont het concrete totaal (B4) in de bevestigingsstap — de duur is dan bekend (opgehaald bij de klik op Extract, vóór de reservering), niet eerder.

3. **Gedeelde `ErrorCard` + centrale copy-map.** Eén foutkaart met vaste anatomie (titel in gewone taal · 1–2 zinnen incl. of er credits zijn gebruikt/teruggegeven · 1–2 knop-acties · foutcode klein/muted). `errorCopy.ts` mapt op backend-foutcode (drie kanalen: sync HTTP `code`, async job `error_type`, `/api/extract` `error_type`). **Onbekende codes krijgen dezelfde kaart** met neutrale tekst, zichtbare code en contact-actie, en worden gelogd (via **PostHog** — frontend-Sentry is niet gewired). Puur presentatie: de bestaande control-flow (early returns, throws, refund-/creditlogica) blijft identiek; alleen de render is geswapt. `backend/transcription_pipeline.py:_classify_download_error` verwijst per comment naar de map.

4. **Playlist-afronding (mockup C).** Neutrale kop zolang iets mislukt is ("17 of 21 videos transcribed"), groen vinkje alleen bij 100%. Bon = methode-kostenbalk + `Charged`-totaal (authoritative uit de credit-`receipt`, ongewijzigd) + refund als eigen regel. Eén mislukking-blok (retryable → `Retry all N`), één permanente-fout-notitie. Voortgang = één statusoppervlak (banner weg, selectielijst weg tijdens run, per-video rijen mét methodebadge in de voortgangskaart, URL/Fetch disabled tijdens run). Onomkeerbaarheid ("Once started, this can't be cancelled") staat nu op het bevestigingsscherm bij de Extract-knop, niet meer in het voortgangsscherm.

5. **Per-video Retry vervalt; alleen `Retry all N`.** De mislukte video's waren al geselecteerd en betaald-bedoeld; de credits zijn bij de skip teruggestort, dus retry-all rekent precies af wat de gebruiker al wilde, en levert één schoon event per ronde voor de operations-telemetrie. **Geen cap op het aantal rondes** — de rem is de UI (elke ronde toont het aantal resterende video's). Het ronde-nummer wordt bijgehouden (`retryRound` in `PlaylistTab`) en doorgegeven zodat de telemetrie (elders gebouwd) het kan gebruiken; hier verschuift het alleen de **toon** van de uitleg (na ronde ≥1 met resterende mislukkingen: structureel geblokkeerd → Audio Upload). Eén label "not fetched / could not be fetched", nooit "Blocked" in amber.

## Rationale

- **Methodekleur uit Library-tokens** maakt de keten herkenbaar en voorkomt een derde blauw-definitie; de mockup-hex zijn placeholders.
- **Kosten prominent** is een principekwestie (eerlijkheid over geld), geen stijlkwestie.
- **ErrorCard als pure presentatie** levert "geen doodlopend eind, nooit kale rode tekst" zonder de risicovolle control-flow (refund/credit) aan te raken — de foutinventaris bevestigde welke returns/throws load-bearing zijn.
- **Geen retry-cap** voorkomt dat een gebruiker achterblijft met video's die hij nooit meer kan ophalen; convergentie (40→17→6) is geen lus, en de rem zit al in de zichtbare kosten.

## Consequenties

- `SourceChoice` (ADR-079) is vervangen door `MethodRadioCards` en verwijderd.
- `CompletionReceipt` wordt niet meer door `PlaylistManager` gerenderd; de bon leest `receipt.used`/`refunded` rechtstreeks (authoritative, creditlogica ongewijzigd). De per-video credit-breakdown-uitklap vervalt daar (de mislukking-lijst toont de titels).
- **Afwijkingen (gemeld):** methode-legenda in de afrondingsbon toont counts, geen per-methode credit-split (die data zit niet in `receipt.videos`); de retry-knop toont "Retry all N" zonder een verzonnen credit-totaal (het exacte bedrag is hier niet betrouwbaar bekend); de primaire actie in de playlist-selectie-header staat op een wrap-rij i.p.v. een sticky-bottom-actiebalk (botsing + 390px opgelost, sticky-bar = follow-up); AudioTab's error-state is verbreed van `string` naar `{message, code?}` om code-gekeyde copy mogelijk te maken.
- **Niet in dit environment verifieerbaar:** de resume-matrix (echte jobs, credits) en browser-checks (WCAG, 390px, dark) — `[~]` in het taakrapport.

## Follow-up (2026-07-26, commits a9154ff + mobiel-fix)

- **Onbekende foutcodes → PostHog, niet Sentry.** De brief vroeg om Sentry-logging voor onbekende codes; frontend-Sentry is **niet gewired** (backend heeft het wel). `resolveErrorCopy` logt onbekende codes daarom via `posthog.capture('transcribe_error_unknown_code')` + `console.warn`. Dit gat staat in `operations/known-issues.md`.
- **De neutrale fallback rendert nooit een provider-string.** Ongeacht wat de backend meestuurt, is de ErrorCard-body altijd eigen copy; de rauwe `error.message` gaat alleen nog als `fallbackMessage` naar het client-gecontroleerde `unsupported_file`. De whisper-poll draagt nu `job.error_type` mee zodat de download-fout op getailorde copy landt i.p.v. de neutrale fallback.
- **Credit-regel wordt gelezen, niet beweerd.** De download-fout-copy claimt geen "No credits were charged" meer; de ErrorCard toont `creditsNote` uit `transcription_jobs.credits_refunded` (via de Realtime-payload van `useJobStatus`) — alleen als de waarde er is (>0), anders niets. **Backend-gap (rapport, niet gewijzigd):** de polling-fallback `/api/jobs/{id}` (Railway-proxy) bevat `credits_refunded` niet; alleen de Realtime-UPDATE draagt de volledige rij. Voor volledige dekking zou de proxy `credits_refunded` moeten meesturen.
- **Per-methode credit-split in de afrondingsbon** wordt nu wél getoond, afgeleid uit `receipt.videos[].credits × whisperVideoIds` (reconcilieert met `receipt.used` als de breakdown aanwezig is; anders counts-only). De eerdere "backend-veld nodig"-conclusie gold alleen als je de split níét client-side afleidt — met de methode-map is het afleidbaar. Het exacte **retry-bedrag** blijft ongetoond (per-video schatting voor de retryable set zit niet betrouwbaar in de payload).
- **Recent-lijst volledig verwijderd** (alle modi, beide apps) incl. het component, de query en de `onBusyChange`-machinerie op de drie tabs. Idle = kaart + docs-link (app) / kaart + `MicroTrustRow` voor anon (marketing).
- **Tab-bar-hoogte getokeniseerd** (`--tabbar-h` + `--safe-bottom` in beide `tokens.css`); dashboard-bodempadding + de sticky mobiele actiebalk rekenen ermee zodat de footer nooit achter de bottom tab bar valt.

## Follow-up 2 (2026-07-27, mobiele testronde op 812bb63)

- **Gratis-3 is positioneel, bedoeld.** Onderzocht: de backend rekent `is_free = video_index < 3 and not is_retry` (`worker.py:431,692`) — de eerste 3 video's **op positie** zijn gratis, ongeacht methode; dit matcht `pricing.ts` (`PLAYLIST_FREE_VIDEOS`, "eerste 3 videos"). De frontend-schatting (`captions idx >= 3`, `PlaylistAvailabilitySummary`) matcht de backend — **geen bug**. Een AI-video op positie 0-2 verbrandt een gratis slot (hij wordt als AI afgerekend, en een latere caption op idx ≥3 wordt belast). **Fix = label eerlijk gemaakt** ("First N videos free" + popover legt de positionele slot-logica uit); geen backend-/rekenwijziging. Retry rekent alles af (geen gratis-3, `and not is_retry`).
- **ActiveJobsIndicator sluit playlist-kindjobs uit** via `playlist_id IS NULL`: elke AI-video in een playlist krijgt een eigen `transcription_jobs`-rij mét `playlist_id`+`source_kind='playlist'` (`worker.py:472-473,723-724`); standalone single/upload-jobs laten `playlist_id` null. Betrouwbaar want playlist-kinderen zetten `playlist_id` altijd.
- **Retry-feedback**: de voortgangskaart komt terug voor de retry-ronde met kop "Retrying failed videos · round N" (`retryRound`). Het **retry-bedrag** valt in de knop ("Retry all N — X credits") en de volle saldoregel zodra de prop `retryEstimate` gevuld is — die wacht op de aangevraagde backend-schatting; tot dan geen half getal.
- **Sticky-balken**: mobiele spacer vóór elke sticky actiebalk (confirm + selectie) zodat de laatste inhoud boven de balk kan scrollen (de balk sticky't boven de tab bar, dus zijn flow-positie ligt erachter). Input+Fetch verborgen op het afrondingsscherm (één weg terug = "Start new extraction").
- **Voorselectie**: de eerste 10 video's zijn een start-default (geen limiet; de cap is 500) — nu uitgelegd met een balk onder de header.

## Follow-up 3 (2026-07-27, contract-opschoning JobStatusRow)

- **`error_code` verwijderd uit `JobStatusRow`.** Het veld stond backend-zijde hardcoded op `null` en betekende niets; de enige consumer (`VideoTab` whisper-poll, insufficient-credits-tak) keyt nu op `error_type === 'insufficient_credits'`. Kanaal-consistent met de rest van de download-fout-afhandeling die al op `error_type` leunt.
- **`available_credits` verwijderd uit `JobStatusRow`.** Een saldo gekopieerd uit een poll-respons is per definitie ouder dan wat de gebruiker al ziet; de frontend heeft het live saldo via `useAuth`. De insufficient-credits-kaart leest het saldo nu uit `useAuth` (`availableCredits: user ? credits : null` in de `resolveErrorCopy`-ctx van VideoTab én AudioTab). `errorCopy.insufficient_credits` kreeg een "alleen saldo"-tak ("You have Y credits, which isn't enough") zodat de kaart het live saldo toont zolang `requiredCredits` nog niet meekomt. `required_credits` **blijft** in het contract (wordt binnenkort backend-zijde gevuld); zodra dat er is, upgradet de copy vanzelf naar "This needs X and you have Y".
- **Pending (bewust niet gedaan):** standaardiseren op de rauwe `duration_seconds` + `credits_cost` i.p.v. de hernoemde aliassen in de curated dict (de hernoeming was de oorzaak dat beide leeg zijn op een Realtime-update) — pas doen zodra de backend die rauwe namen náást de aliassen emit; nagevraagd, niet vooruitgelopen.

## Follow-up 4 (2026-08-31, ErrorCard-vangnet + modus-bewuste copy)

- **Vangnetlaag tegen rauwe `SyntaxError`:** nieuwe helper `packages/shared/src/lib/http.ts` `readJson()`
  controleert **status én content-type** vóór het parsen. Een niet-JSON-body (404 HTML, proxy-fout) gooit
  een getypte `ResponseError` met een `code` (`unexpected_response` / `http_<status>`) i.p.v. de rauwe
  "Unexpected token '<'". Toegepast op de bron van de bug (`PlaylistManager` playlist-info fetch) en op de
  `AudioTab`-preflight. Nieuwe copy-entry `unexpected_response` in `errorCopy.ts`. Blijft nodig ook nadat de
  404's weg zijn — het is de vangnetlaag.
- **ErrorCard-anatomie (pt.3) hersteld:** de foutcode was al zichtbaar; de **neutrale fallback** onderdrukte
  echter de contact-actie zodra er een retry-actie was (`if (!actions.length && contactHref)`). Nu wordt
  "Contact support" **altijd** toegevoegd naast retry op de neutrale kaart — de kaart waar "wie vraag ik dit?"
  het meest telt. Waaróm de code/contact eerder "niet renderden": de rauwe `SyntaxError` bereikte
  `resolveErrorCopy`/`ErrorCard` nooit (hij ontstond bij het parsen, vóór de kaart) — dat pad is nu dichtgezet.
- **Modus-bewuste copy:** `ErrorCtx` kreeg `mode`. "…, or use Upload" (body) en de "Use Upload"-actie
  vervallen op de Upload-tab (`mode: "audio"`) — onzinnig advies daar. `AudioTab` geeft nu `mode: "audio"` mee.
- **Stale-foutkaart:** `AudioTab` wist de foutstaat aan het **enige** nieuwe-bestand-entrypunt
  (`validateAndSetFile`), zodat een oude kaart niet boven een geldige bevestigingsstap blijft staan.
  Modus-wissel wist de staat al via Radix' unmount van de inactieve tab.
- **Bevestigde eigenschap (nagegaan, geen aanname):** de 404's veroorzaakten **geen** credit-reserveringen —
  het 404 valt op het Next.js-routingniveau, vóór FastAPI (waar `reserve_credits`/`deduct_credits_atomic`
  draaien). DB-controle 2026-08-31: geen reserverings-/settlement-rijen rond de pogingen, saldi intact.
- **[~] `PlaylistManager` inline-fout toont geen code** (eigen inline-error-patroon, niet de ErrorCard);
  de boodschap is nu wél schoon (geen rauwe `SyntaxError`). Volledige code-zichtbaarheid daar = losse
  follow-up. **[~] Live browser-verificatie** van de ingelogde paden staat open (zie taakrapport/LOG).

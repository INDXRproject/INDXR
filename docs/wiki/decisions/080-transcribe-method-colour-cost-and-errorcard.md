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

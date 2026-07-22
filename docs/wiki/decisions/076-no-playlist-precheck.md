# Beslissing 076: Geen per-video pre-check voor playlists — het scherm is een keuze, geen controle

**Status:** Geaccepteerd
**Datum:** 2026-07-23
**Gerelateerde code:** `packages/shared/src/components/PlaylistManager.tsx` (`handleCheckAvailability`), `packages/shared/src/components/PlaylistAvailabilitySummary.tsx`, `apps/marketing/src/app/docs/guides/playlists/page.tsx`; verwijderd: `apps/{app,marketing}/src/app/api/check-playlist-availability/route.ts`

## Context

Het scherm achter de playlist-knop (voorheen "Check Availability") suggereerde dat het per video
controleerde of er captions waren en de video toegankelijk was — met een rode "Unavailable"-teller,
een "Availability Breakdown"-kop, en een gepubliceerde docs-pagina die een controle beschreef die
video's indeelt als *has captions / needs AI / unavailable*.

Dat gebeurt niet. `handleCheckAvailability` (`PlaylistManager.tsx:253`) doet **geen** backend-call:
het zet elke geselecteerde video optimistisch op `has_captions` met 0 credits en toont het scherm na
een korte cosmetische delay. De echte per-video-uitkomst (wél/geen captions, bereikbaar) blijkt pas
tijdens de extractie zelf, per video, in de worker.

Er bestond ook een route `check-playlist-availability` die wél een echte per-video-controle deed
(een backend-`/api/extract`-call per video) plus een losse `⌈minuten/8⌉`-creditschatting — maar die
route had **geen enkele aanroeper** (bewezen via repo-grep) en bevatte een prijsformule die met geen
enkel model klopte (het echte model is 1 credit/minuut). Dode code.

## Beslissing

We bouwen **geen** per-video pre-check. Het scherm blijft wat het feitelijk is: de **laatste stap
vóór de start**, waarin de gebruiker per video kiest tussen gratis auto-captions en AI-transcriptie
en het totaal ziet. De microcopy is daarnaar hernoemd (knop "Review extraction", kaart "Before you
start", groen vak "Using free auto-captions"); nergens claimt het scherm of de docs nog een controle.

De rode "Unavailable"-teller wordt gevuld met het **echte** getal uit de playlist-fetch
(`playlist.unavailable_count`, yt-dlp: private/members-only/deleted), niet met de altijd-0 uit de
niet-controlerende stap. Op het reviewscherm is de lijst-view verborgen, dus dit is daar geen
dubbeling — het getal reist mee naar het scherm waar de keuze gemaakt wordt.

De dode route `check-playlist-availability` (beide apps, inclusief de ÷8-berekening) is verwijderd.

## Rationale

- **Een pre-check kost een tweede ronde proxyverkeer.** Elke video vooraf controleren = per video een
  backend-`/api/extract`-call naar YouTube via de Decodo residentiële proxy. Dat is precies het dure
  verkeer dat de extractie zelf al doet — je zou het dubbel betalen (proxy-egress) en de gebruiker
  laten wachten, voor informatie die de extractie sowieso oplevert.
- **Er is geen geldrisico zonder pre-check.** Credits worden vooraf gereserveerd; een video die geen
  captions blijkt te hebben, private/members-only is, of anderszins niet verwerkt kan worden, wordt
  tijdens de extractie **overgeslagen met een melding**, en zijn deel van de reservering wordt
  **teruggeboekt** (reserved − Σsettlements, ADR-050 fase 2; `worker.py:288,520-521,543-548`). Er
  wordt **nooit** stilzwijgend op AI-transcriptie teruggevallen. De gebruiker betaalt dus nooit meer
  dan het getoonde bedrag.
- Omdat het bedrag alleen naar beneden kan bijstellen (skip + refund), is een vooraf-verificatie puur
  kostenpost zonder baat.

## Consequenties

- De optimistische "alles heeft captions"-aanname wordt per video gecorrigeerd op extractietijd; dat
  is by design, niet een bug.
- `check-playlist-availability` bestaat niet meer; toekomstige "de schatting klopt niet"-meldingen
  over die route zijn niet meer mogelijk.
- Reservering, afrekening en teruggave zijn **niet** aangeraakt.
- Als we ooit tóch een pre-check willen (bijv. om unavailable-video's per stuk te benoemen), is de
  afweging hier vastgelegd: het kost een tweede proxy-ronde en levert geen geldbescherming op die de
  skip-plus-refund niet al biedt. Heropen deze beslissing niet als "bug" zonder die afweging.

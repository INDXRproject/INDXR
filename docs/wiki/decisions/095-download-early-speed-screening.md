# Beslissing 095: Vroege snelheidsscreening bij YouTube-audio-download

**Status:** Geaccepteerd
**Datum:** 2026-08-09
**Gerelateerde code:** `backend/audio_utils.py` (`extract_youtube_audio`, `SlowExitScreened`), `backend/transcription_pipeline.py`, `backend/test_download_screening.py`, migratie `20260809150000_download_normal_throughput.sql`
**Volgt op:** ADR-092 (meetlaag). **Bewuste beperking:** geen hedging (zie onder — alleen overwogen/gerapporteerd).

## Context

De meetlaag (ADR-092) ving een download van 0,9 MB die **192 s** duurde (~0,038 Mbit/s) terwijl de
mediane doorvoer rond **2,3 Mbit/s** ligt. Oorzaak (vorig onderzoek): de kwaliteit van het gepinde
Decodo-exit-IP, niet het tegoed; er was geen doorvoerondergrens, dus een traag IP werd uitgezeten tot
de klokdeadline.

**Uitgangspunt (door Khidr):** het is géén vaste ondergrens op elk moment. De kosten van afbreken +
opnieuw beginnen zijn **evenredig met wat al gedownload is** — hervatten is onmogelijk, elke poging
haalt het volledige bestand opnieuw op. **Vroeg afbreken is bijna gratis, laat afbreken is duur.** De
drempel moet dus meebewegen met de voortgang. De getallen moeten **afgeleid** worden, niet gekozen.

## Beslissing

Een **vroege snelheidsscreening** in de download-progress-hook. Meet de doorvoer vanaf het eerste
gedownloade byte; zakt die onder een **progressie-afhankelijke vloer**, breek af en start met een
verse Decodo-sessie (vers exit-IP).

**Afgeleide vloer:**

$$v_{floor}(p) = v_{norm} \cdot \frac{1-p}{1+p}$$

met `p = gedownload/totaal` (voortgang), `v_norm` = verwachte doorvoer van een normale exit.

### Afleiding (niet gekozen — afgeleid)

Notatie: bestand `S` bytes, gedownload `d`, resterend `R = S(1−p)`, huidige doorvoer `v`, normale
doorvoer `v_norm`, Decodo-tarief `c` €/GB. Geen hervatten → een restart herdownloadt de volle `S` en
verspilt de `d` die al binnen was.

Forward-looking totale kosten (egress-geld + tijd), tijd gewaardeerd tegen de enige uit de gegeven
invoer afleidbare tijdswaarde `v_norm · c` €/s (een seconde download is de geldwaarde waard van de
bytes die een gezonde exit er in beweegt):

- **Doorgaan** tot klaar: `R·c` (egress) + `(R/v)·v_norm·c` (tijd) = `c·(R + R·v_norm/v)`.
- **Opnieuw** op een verse exit: `S·c` (egress) + `(S/v_norm)·v_norm·c` (tijd) = `2·S·c`.

Afbreken zodra doorgaan duurder is dan opnieuw: `R + R·v_norm/v > 2S` ⟹ `v < v_norm·R/(2S−R)`. Met
`R = S(1−p)`:

$$v_{floor}(p) = v_{norm}\cdot\frac{1-p}{1+p}$$

**Rol van het Decodo-tarief `c`:** het valt uit de gesloten vorm (de beslissing is *schaal-invariant*
in het tarief — beide opties betalen egress tegen hetzelfde `c`). Maar `c` is wél essentieel in de
afleiding: het toont dat egress-kosten **altijd** voor doorgaan pleiten (opnieuw verspilt `d·c`),
en dát is precies waarom de teller `(1−p)` en de noemer `(1+p)` de vloer naar 0 duwen naarmate `p`
stijgt — laat afbreken verspilt te veel. Dit is de wiskundige vorm van "vroeg bijna gratis, laat duur".

**Gedrag van de vloer:** `p→0` → `v_floor→v_norm` (afbreken is gratis, dus alles trager dan normaal
mag weg); `p=0.5` → `v_norm/3`; `p→1` → `0` (nooit afbreken vlak voor het einde). Het **omslagpunt**
waarop doorgaan aantoonbaar goedkoper is dan opnieuw beginnen is dus asymptotisch (`p→1`, vloer→0) —
er is geen aparte discrete uitschakelgrens nodig; de bewegende vloer dooft vanzelf uit.

### Waarden (afgeleid)

- `v_norm` = **287 500 B/s** (= 2,3 Mbit/s mediaan uit de meetlaag). In `cost_config.
  download_normal_bytes_per_sec` (tunbaar, her te leiden uit `transcription_jobs.download_ms/
  proxy_bytes` als de dataset groeit), fallback-constante in de pipeline zodat screening niet stil
  uitvalt.
- **Ruis-drempel** `SCREEN_MIN_SAMPLE_SECONDS = 10 s` — GEEN economische drempel maar een
  meet-stabiliteitsgarantie: pas screenen als er ≥10 s ná het eerste byte verstreken zijn (voorbij
  TCP-slow-start → stabiel gemiddelde; << de 120 s socket_timeout). Meet vanaf het eerste byte, niet
  vanaf metadata-extractie, zodat een snelle exit met trage metadata niet vals wordt afgekeurd.

### Regels

- **Screening retryt, faalt nooit.** Een afbreking wegens traagheid gaat als een gewone retryable
  uitkomst terug de lus in met een verse sessie (2 s/4 s backoff) — nooit een job-fout zolang er
  pogingen over zijn.
- **De laatste poging screent niet.** Dan is er geen verse sessie meer om op over te stappen;
  uitzitten (tot de deadline) is beter dan falen. Met `max_attempts=3` screenen alleen poging 1 & 2.
- **Anti-rondpompen** is intrinsiek: hooguit 2 screening-afbrekingen per job (poging 3 draait
  ongescreend), dus het kan niet oneindig rondpompen. De logging maakt de frequentie zichtbaar.
- **Logging:** elke afbreking is een eigen uitkomst in de meetlaag:
  `[YT-DLP-AUDIO-ATTEMPT] … outcome=screen_abort screen_throughput_mb_s=<x> screen_at_progress=<p>`
  — de doorvoer én het moment (voortgang) waarop hij vuurde.

## Consequenties

- Alleen de progress-hook wijzigt; format-keuze, aantal pogingen (3) en de deadline blijven gelijk.
- Egress: een vroege afbreking verspilt alleen het kleine begin (`d` bij lage `p`), veel minder dan
  een tot-de-deadline uitgezeten trage download. Netto egress-effect wordt zichtbaar via de meetlaag
  (`outcome=screen_abort` + `download_attempts`); herzie `v_norm` als de data schuift.
- `v_floor(p=0)=v_norm` betekent dat een exit onder de mediaan vroeg (goedkoop) wordt afgebroken. Dat
  is bedoeld (afbreken is dan bijna gratis), begrensd door max. 2 afbrekingen + logging.

## Hedging — overwogen, NIET gebouwd (ter beslissing)

Hedging = een tweede poging naast een lopende trage download starten en de snelste laten winnen.

- **Voordeel:** lost een download op die **halverwege instort** (na de screening-sample, wanneer de
  bewegende vloer al laag staat) zonder weg te gooien wat al binnen is — de screening hierboven meet
  gemiddeld vanaf het eerste byte en vangt vooral traag-vanaf-het-begin, niet een mid-download-collaps.
- **Nadeel:** kan de egress **verdubbelen** (twee volledige downloads tegelijk) — precies de kostenpost
  die we juist willen drukken.
- **Beslissing uitgesteld** tot we uit de meetlaag weten hoe vaak een mid-download-collaps optreedt
  (zichtbaar te maken via een venster-doorvoermeting; nu meten we gemiddeld-vanaf-start). Bouw pas als
  de frequentie het dubbel-egress-risico rechtvaardigt.

## Verificatie (2026-08-09)

**Deterministische unit-tests** (`test_download_screening.py`, nep-klok + gemockte yt_dlp/ffmpeg) —
bewijzen het mechanisme onafhankelijk van een echt traag IP:
- `v_floor(p)` daalt strikt monotoon; `v_floor(0)=v_norm`, `v_floor(1)=0`.
- traag exit-IP op poging 1 → `SlowExitScreened` → **retry** met verse sessie → poging 2 slaagt;
  gelogd als `outcome=screen_abort` met doorvoer + moment.
- **laatste poging screent niet:** dezelfde trage trajectorie op alle 3 pogingen → poging 1 & 2
  screenen, poging 3 draait ongescreend en de job **slaagt** (geen fout).
- De 11 bestaande audio-tests blijven groen (screening staat default uit → geen gedragswijziging).

**Drie echte transcripties van ondertitelloze video's** (Arabische spraak, 0 subs/auto-captions
geverifieerd; echte Decodo-proxy + AssemblyAI), met screening AAN:

| video | pogingen | egress | download_ms | doorvoer | screening | transcript | totale tijd |
|-------|----------|--------|-------------|----------|-----------|------------|-------------|
| i8C8XyIm7DU | 1 | 1,15 MB | 14 951 ms | 0,077 MB/s (0,62 Mbit/s) | **NIET gevuurd** | 15 seg, u3.5pro | 32,3 s |
| IiW99baMHJA | 1 | 1,01 MB | 26 894 ms | 0,038 MB/s (0,30 Mbit/s) | **NIET gevuurd** | 14 seg, u3.5pro | 47,2 s |
| UD3FXle-chQ | 1 | 0,80 MB | 10 251 ms | 0,078 MB/s (0,62 Mbit/s) | **NIET gevuurd** | 22 seg, u3.5pro | 34,3 s |

**Eerlijk: de screening vuurde in GEEN van de drie echte runs** — dus deze runs bewijzen NIET dat
screening in productie werkt; dat doet alleen de unit-test. Reden dat hij niet vuurde: het waren korte
bestanden (~1 MB) waarvan de byte-overdracht in 1–7 s klaar was — onder het 10 s-sample-venster — of
de doorvoer bleef vanaf het eerste byte boven de vloer. De lage `download_ms`-doorvoer (0,3–0,6
Mbit/s) weerspiegelt dat `download_ms` óók de verbindings-/metadata-opzet (10–20 s) bevat, terwijl de
byte-overdracht zelf sneller was (130–500 KiB/s in 1–7 s) — precies waarom de vanaf-eerste-byte-meting
correct niet ingreep. Screening richt zich op lange, traag-blijvende downloads (de dure gevallen); de
pathologische 192 s-run uit ADR-092 zou wél vroeg zijn afgebroken (bij ~5% voortgang, ~47 KB verspild
i.p.v. 0,9 MB + 192 s).

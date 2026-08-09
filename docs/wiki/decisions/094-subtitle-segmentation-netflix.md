# Beslissing 094: Ondertitel-hersegmentatie (SRT/VTT) volgens de Netflix Timed Text Style Guide

**Status:** Geaccepteerd
**Datum:** 2026-08-09
**Gerelateerde code:** `packages/shared/src/utils/formatTranscript.ts` (`buildSubtitleCues`, `wrapLines`, `toTimedWords`, `generateSrt`, `generateVtt`). Geverifieerd op transcript `e753e158` — "JRE MMA Show #32 with Firas Zahabi" (2424 segmenten, 2,6 u, 2 sprekers).

## Context

De oude SRT/VTT-export was onbruikbaar. `resegmentTranscript` sloot een cue **alleen op tijd** af (`blockDuration >= 7/4/3s`), nooit op tekstlengte; `wrapSubtitleText` zette regel 1 op ≤42 tekens en propte **alle** overloop ongebroken in regel 2 (geen cap) zonder die naar een nieuwe cue te sturen. Gemeten op het echte transcript (SRT): 32% van de regels boven 42 tekens (VTT 76%), langste regel 270, langste cue 308, 655 cues boven 7 s, mediane leessnelheid 23 CPS.

Deze fout stond **live** en werd niet gevonden door code te lezen maar door een geëxporteerd bestand te openen (zie `LESSONS.md`).

## Beslissing

Vervang de tijd-gebaseerde hersegmentatie + tweeregel-wrap door een woord-niveau cue-builder (`buildSubtitleCues`) met harde grenzen ontleend aan de **Netflix Timed Text Style Guide** — de meest geciteerde branchespecificatie:

| Grens | Netflix | INDXR | Bron |
|---|---|---|---|
| Tekens per regel | 42 | **42** | English (USA) TTSG |
| Regels per cue | 2 | **2** | English (USA) TTSG |
| Max cueduur | 7 s | **7 s** | General Requirements |
| Min cueduur | 5/6 s (~0,83 s) | **1 s (strenger)** | General Requirements |
| Leessnelheid (Engels, volwassen) | ≤ 20 CPS | plafond **21 CPS** (zie rationale) | English (USA) TTSG |

Verder:
- Een passage langer dan één cue wordt **over meerdere cues verdeeld**, bij voorkeur op een **zinsgrens**, anders op een **woordgrens**, **nooit midden in een woord**; cuetijden lopen evenredig met de tekst (woordtiming geïnterpoleerd uit segmentduur).
- **Leessnelheid als grens**: elke cue krijgt minstens zijn leesduur (naar het doel van 20 CPS, alleen in stiltes tussen cues → geen drift) én nooit onder de minimumduur; een hard plafond van 21 CPS mag de volgende cue licht vooruitduwen, wat bij de eerstvolgende pauze weer inloopt (gemeten eind-drift 0,0–0,2 s over 2,6 u).
- **Sprekernaam alleen op de eerste cue van een beurt**, met een **budget dat per formaat verschilt** (zie hieronder). Dit verfijnt de export-conventie uit [ADR-091](091-speaker-diarization.md).

### Sprekernaam-budget per formaat — SRT en VTT bewust niet identiek

- **SRT**: de naam is een **in-budget** prefix `Naam: ` op de eerste cue van een beurt. SRT kent geen sprekerveld, dus de cue-tekst is de enige plek; de naam telt dus mee in de 42/84-begroting. SRT-bestanden gaan ook vaker naar een editor of uploadformulier waar platte tekst de enige drager is.
- **VTT**: de naam is de native **`<v Naam>`** voice-tag op de eerste cue van een beurt, **buiten** het tekenbudget. De tag is nul-breed op het scherm, dus VTT houdt de volle 42 tekens over voor gesproken tekst; een speler die de tag negeert toont geen naam, wat bij video geen verlies is (de kijker ziet zelf wie praat).

Gevolg: de twee formaten segmenteren verschillend en zijn **bewust niet meer byte-identiek** — VTT past meer gesproken tekst per beurt-openingscue en levert daardoor iets **minder cues** op.

## Rationale

**Externe onderbouwing i.p.v. interne redenering.** Alle grenzen komen uit de Netflix TTSG (zie bronnen), niet uit eigen aanname.

**Waarom het plafond 21 CPS is en niet 20 (fundamentele productgrens).** Netflix' limiet voor Engels/volwassen is 20 CPS; 17 CPS geldt voor kinderprogramma's, niet voor Engels-volwassen. Professionele ondertitelaars hálen die 20 door de gesproken tekst **in te korten** — condenseren, stopwoorden schrappen, herschrijven. Wij transcriberen **woordelijk**. Bij snelle spraak kun je daarom niet tegelijk (a) alle woorden behouden, (b) onder 20 CPS blijven én (c) in sync blijven. Bewijs: een plafond van 20 CPS forceren gaf op dit transcript **247 s drift** (de ondertitels lopen minuten achter). Het plafond ligt daarom op **21 CPS — één boven de Netflix-limiet, niet vier** (een eerdere notitie noemde onterecht 17–20 als norm).

Onze export voldoet dus aan de Netflix-spec op **regellengte, regelaantal en cueduur**, maar bij snelle sprekers **niet op leessnelheid** — dat is een **keuze (woordelijk transcriberen), geen tekortkoming**. Wie een lagere CPS wil, moet de tekst inkorten, wat buiten de scope van een transcript valt.

**Kalibratie-caveat.** De 21 is geijkt op **één** transcript van snelle Engelse spraak. Langzamere of anderstalige opnamen hadden een lager plafond aangekund; het is nu **één vaste constante voor alles**. Een per-taal/per-tempo plafond is mogelijk toekomstig werk.

**VTT-tag boven prefix (gecorrigeerd t.o.v. de eerste implementatie).** Dat de `<v>`-tag niet meetelt in de zichtbare regelbreedte is juist het argument vóór de tag: VTT houdt zo de volle 42 tekens voor spraak i.p.v. er ~12 aan een naam kwijt te zijn. SRT mist een tag-veld en houdt daarom de `Naam:`-prefix.

## Consequenties

- **SRT ≠ VTT** (bewuste divergentie). Gemeten op het JRE-transcript (volledige export):

  | Metriek | SRT | VTT |
  |---|---|---|
  | Aantal cues | 3425 | **3326** (minder, zoals verwacht) |
  | Regels > 42 tekens | 0,0 % | 0,0 % |
  | Langste regel | 42 | 42 |
  | Langste cue | 84 | 84 |
  | Cues > 2 regels | 0 | 0 |
  | Cues > 7 s | 0 | 0 |
  | Mediane leessnelheid | 21,0 CPS | 21,0 CPS |
  | Tijdlijn-drift over 2,6 u | 0,0 s | 0,0 s |

  Baseline (kapotte code) ter vergelijking: 1700 cues, regels>42 32%/76%, langste regel 270/253, langste cue 308/310, 655 cues>7s, mediaan 22,9/23,5.

- **Bracket-conventie (gecontroleerd, niet gewijzigd).** Netflix schrijft voor sprekeraanduiding **`[Naam]`** voor wanneer de spreker niet in beeld is; wij gebruiken `Naam:` (SRT) / `<v Naam>` (VTT). Bevinding: dit leidt **niet** tot een parse-probleem bij platformen die onze SRT inlezen — SRT-cuetekst is ondoorzichtige platte tekst, spelers (YouTube, Vimeo, mediaspelers) tonen `Naam:` letterlijk zoals ze `[Naam]` letterlijk zouden tonen. `Naam:` heeft zelfs een klein voordeel: SDH-pijplijnen die haakjes-inhoud `[…]` strippen (geluidseffecten/sprekers verwijderen voor "standaard" ondertitels) laten `Naam:` staan. Enkel wanneer we ooit **Netflix-spec SDH-levering** zouden doen, moet het `[Naam]` worden. Nu niet gewijzigd.

- De export-conventie uit ADR-091 (SRT `Naam:`, VTT `<v Naam>`) blijft leidend; deze ADR voegt het per-formaat **budget-onderscheid** en de segmentatie-/leessnelheidsregels toe.

## Bronnen

- Netflix — English (USA) Timed Text Style Guide (42 tekens/regel, max 2 regels, 20 CPS volwassen / 17 CPS kinderen, `[ ]` voor off-screen sprekers): https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide
- Netflix — Timed Text Style Guide: General Requirements (min 5/6 s, max 7 s per cue): https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements

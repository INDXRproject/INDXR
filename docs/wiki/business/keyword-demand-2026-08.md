# Keyword-vraag — meting 2026-08-02 (Bing Webmaster Tools)

**Bron:** Bing WMT Keyword Research. Seeds `youtube transcript` / `video to text` / `subtitle download` / `srt download` / `transcribe playlist`; filters All/All/All; venster 3M resp. 24M. Export: 146 gerelateerde termen (133 na ruisfilter).

**Aard:** richtinggevende schatting vooraf, geen meetkundige waarheid. Punt-in-tijd. De definitieve intentiemeting in onze eigen markt is het **search terms report** zodra de betaalde campagne draait.

---

## Leesregel (niet overslaan)

- Een Bing-**"impressie"** = hoe vaak een term in een Bing-resultaat is gezien, **niet** maandelijks zoekvolume.
- Bing heeft ~3–4% marktaandeel. Vergelijk deze getallen **NOOIT** met Google Keyword Planner of Google Trends — **alleen onderling**.
- De export bevat aantoonbare ruis (`makeup` 59.812, `upcoming meteor showers`) → richtinggevend, niet exact.

---

## 1. Onze vijf keyword-clusters zijn hier niet meetbaar (meetgrens, geen afwezige vraag)

Van 133 kerntermen bevat er **nul** het woord *playlist, bulk, rag, srt, markdown, obsidian, csv, json* of *"wrong language"*. Losse long-tails gaven "not enough data".

Oorzaak: Bing's related-keyword-algoritme waaiert lexicaal uit vanaf de zaadterm en blijft in de kop hangen. **Onderbouwing voor deze clusters moet uit Google Keyword Planner komen en definitief uit ons eigen search terms report.** Deze meting zegt hier *niets* over — afwezigheid ≠ geen vraag.

## 2. 44% van de gemeten wereldvraag kan bij ons niet afrekenen

Geo-verdeling op `youtube transcript` (totaal 25.358):

| Land | Impressies | Kan afrekenen? |
|---|---|---|
| India | 9.400 | ❌ geblokkeerd (ADR-062) |
| VS | 8.700 | ✅ |
| Canada | 1.500 | ✅ |
| Duitsland | 1.400 | ✅ (EU/OSS) |
| VK | 1.300 | ❌ geblokkeerd (ADR-062, NETP €0-drempel) |
| Australië | 918 | ✅ |
| Frankrijk | 918 | ✅ (EU/OSS) |
| Turkije | 534 | ❌ geblokkeerd (ADR-062) |
| Spanje | 487 | ✅ (EU/OSS) |

De Stripe Radar-blocklist (ADR-062) = `('GB','CH','KR','TR','IN','BR','UY','OM','RS')`. Van de meetbare geo hierboven zijn **IN + GB + TR = 11.234 impressies (44,3%) structureel niet-converteerbaar**. India is tegelijk de grootste zoekmarkt én een land waar de charge geweigerd wordt.

**Gevolgen (vastgelegd):**
- Ads-geo = **US + CA + AU**, expliciet **zónder VK**. Zie [marketing.md → Betaalde zoekcampagne](marketing.md).
- Organisch verkeer uit IN/GB/TR is **ruis in elke conversieratio** → meenemen bij de Growth-metric-definities (F19, `roadmap/priorities.md`): een niet-geo-gefilterde funnel lijkt kapot terwijl de bezoeker simpelweg niet mág kopen.

## 3. Dit is een merkenmarkt (29% van de kernvraag = concurrentnamen)

Concurrentnamen = **92.597 impressies, 29% van alle kernvraag**:

| Merk | Impressies |
|---|---|
| notegpt | 58.948 |
| downsub (via subtitle-seed) | 26.700 |
| tactiq (alle varianten) | 24.982 |
| turboscribe | 2.577 |
| ytscribe / youtranscripts / transcript.io / kome ai | ~1.800 |
| youtubetranscript.com | 965 |
| youtubetotranscript.com | 928 |

Ter vergelijking: `youtube transcript generator` = 15.047. **NoteGPT alleen ≈ 4× de grootste generieke term.**

**Beslissing: niet bieden op concurrentmerken.** Legaal en gebruikelijk, maar het is iemand onderscheppen die expliciet om een ánder product vroeg — botst met de ihsaan-ondergrens én met [ADR-037](../decisions/037-no-comparison-pages.md) (comparison pages bewust geschrapt). **Merknamen gaan als NEGATIEF in de campagne.**

## 4. De kop van de markt is een gratis-markt

Alle tien URL's in Bing's top-10 voor `youtube transcript` hebben "Free" in de title (NoteGPT, Transcript.you, Tactiq, TubeTranscript, Recall, Transcript24, VideoTranscriber). Expliciete gratis-intentie: 5.296 impressies over 11 termen.

**Beslissing: niet bieden op de kop.** Gratis caption-extractie is onze funnel, maar die haal je **organisch** binnen — niet tegen ~€1,30/klik in een SERP waar tien concurrenten "gratis" roepen.

## 5. Niet-Engelse vraag is groot — en raakt onze differentiator

| Taal | Impressies | Voorbeeldtermen |
|---|---|---|
| Spaans | 17.263 | `desgrabador`, `transcribir video de youtube` |
| Indonesisch/Maleis | 6.756 | `transkrip`, `transkrip video youtube` |
| Japans/Chinees | 5.316 | `youtube 文字起こし`, `youtube字幕提取` |
| Portugees | 1.384 | `transcrever vídeo do youtube` |
| Frans | 1.119 | `transcription vidéo youtube` |

Spaans alleen ≈ `youtube transcript generator` + `youtube to transcript` samen. Dit is precies de doelgroep van de **native-anchored taalfix** ([marketing.md](marketing.md) differentiator): wie in het Spaans zoekt wil een Spaans transcript, niet YouTube's willekeurige community-vertaling.

**Maar:** de site is Engels-only, Spanje is slechts 487 — het gros komt uit Latijns-Amerika (BR geblokkeerd, betalingsbereidheid onbekend). **Kans, geen actie. Niet beslissen zonder omzetdata.**

## 6. `video to text` is onderbedeeld (groter dan de hele YT-transcript-staart)

Seed `video to text` = 19.300 impressies. Gerelateerd: `video to text converter` 12.400 · `transcribe video to text` 9.400 · `video to transcript` 6.800 · `video to transcript converter` 3.700 · `transcribe video to text free` 3.700 · `video to text converter free` 2.500 · `transcript video to text` 2.300 · `transcript video` 2.400 · `convert video to text` 2.000.

Dit is het terrein van [`/articles/audio-to-text`](../../..) (audio-upload → AI-transcriptie, betaald product). **Kandidaat voor prioriteit in de artikel-herschrijfronde** (zie content-audit).

## 7. `srt`/`subtitle` = klein én verkeerde buurt

`srt download` = **491** impressies totaal. De gerelateerde termen zijn de film-/serie-ondertitelmarkt, grotendeels piraterij: opensubtitles 67.900 · subscene 35.500 · downsub 26.700 · yify subtitles 9.800 · yts subtitles 4.500.

**Gevolgen:**
- `/articles/youtube-srt-download` mikt op een term zonder volume → **herbeoordelen in de content-audit** (niet schrappen zonder GSC-data).
- **Negatieven verplicht:** `subscene`, `opensubtitles`, `yify`, `yts`, `downsub`, `movie`, `series` — anders trekt phrase match ons die buurt in.

## 8. Overig

- `youtube transcript api` = 404 impressies. Wij hebben **geen publieke API** → `api` blijft negatief (zelfde grond als het schrappen van llms.txt, [ADR-039](../decisions/039-llms-txt-low-priority.md)).
- **Vraagvormen** (3.819 over 9 termen), gedomineerd door varianten van "how to get transcript of youtube video" (1.385 + 718 + 600 + 268 + 176). **Docs/FAQ-kans**; dit zijn ook letterlijk Copilot-prompts.

---

## Correctie op `writing-standard §B` (doorgevoerd)

De masterplan-claim "Bing = de index waar ChatGPT uit ophaalt" is **achterhaald**: OpenAI draait sinds eind 2024 **OAI-SearchBot**, een eigen zoekcrawler die de index voor ChatGPT Search bouwt. Bing voedt tegenwoordig vooral **Microsoft Copilot + Edge**. Bing WMT blijft nuttig (indexering + Copilot-zichtbaarheid), maar niet als "ChatGPT-index"-rechtvaardiging. `writing-standard §B` (regel 81 + de C12/B-verify-regel) is hierop bijgesteld.

## Volgende meting

1. **Google Keyword Planner** (ranges, maar dekt wél onze niche + top-of-page bids) — vult de meetgrens uit §1.
2. **Search terms report** zodra de campagne draait — de **enige** bron die werkelijke intentie in ónze markt meet. Alles hierboven is een schatting vooraf.

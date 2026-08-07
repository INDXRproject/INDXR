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

---

# Meting 2 — Google Keyword Planner (2026-08-07)

**Bron:** Google Ads Keyword Planner, "Get search volume and forecasts". All locations, All languages, Google (zonder search partners), venster juli 2025 – juni 2026. Drie runs: kernclusters (24 termen), longtail-clusters (31), verdieping (19). Export = `Plan historical metrics` CSV.

**Vult de meetgrens uit §1 van de Bing-meting.** Dit is de bron die de longtail-clusters wél kon meten.

## Leesregel

- Het account zit onder Google's spend-drempel → **volumes komen als bucket, niet als exact getal**. De CSV toont het bucket-midden: `50` = 10–100, `500` = 100–1K, `5.000` = 1K–10K, `50.000` = 10K–100K, `500.000` = 100K–1M, `5.000.000` = 1M–10M.
- Gevolg: **ordenen op grootteorde kan, twee termen binnen dezelfde bucket vergelijken niet.** Een geo-aftreksom (wereld min geblokkeerde landen) is met buckets onmogelijk — die methode is vervallen; geo moet per-land gedraaid worden.
- Google voegt close variants samen. Van 24 ingevoerde kerntermen kwamen er 21 terug (`download youtube transcript`, `video transcription`, `youtube subtitle downloader` samengevoegd). **Clusterrijen nooit optellen als "totaal".**
- Vergelijk deze getallen **niet** met de Bing-impressies hierboven — andere eenheid.
- `Competition (indexed value)` (0–100) is meegenomen als proxy voor commerciële waarde: het meet advertentie-concurrentie, niet organische moeilijkheid.

## Kernbevinding: er zijn twee markten

| Term | Volume | Comp. index | Top bid hoog |
|---|---|---|---|
| youtube transcript | 1M – 10M | **3** | €0,79 |
| youtube transcript generator | 100K – 1M | 6 | €1,09 |
| youtube video transcript | 100K – 1M | 9 | €0,80 |
| youtube transcript download | 10K – 100K | 7 | €0,80 |
| transcribe audio to text | 100K – 1M | **69** | €2,65 |
| convert audio to text | 10K – 100K | 63 | €1,38 |
| transcription software | 1K – 10K | 56 | **€7,65** |
| free transcript generator | 1K – 10K | 56 | €2,91 |
| audio to text | 100K – 1M | 53 | €0,97 |
| video transcript generator | 10K – 100K | 52 | €2,62 |
| transcribe video | 100K – 1M | 46 | €1,97 |
| video to text | 100K – 1M | 35 | €0,74 |

De YouTube-transcriptkant is enorm in volume en commercieel leeg (index 3–9) — dit bevestigt §4 van de Bing-meting ("de kop is een gratis-markt"). De audio/video-to-text-kant is kleiner maar commercieel: index 35–69, biedingen €2–€7,65. **Dat is het terrein van het betaalde product (AI-transcriptie van uploads).**

## Besluit omgedraaid: audio-to-text wordt NIET geretarget naar video-to-text

Clustersom (grof, bucket-middens):

- audio: 500K + 500K + 50K + 50K ≈ **1,1M**
- video: 500K + 500K + 50K + 50K + 50K + 5K ≈ **1,15M**

Gelijkspel over vier tot zes termen aan beide kanten. De aanname waarop de retarget rustte (audio mikt op een dode term, video heeft de vraag) komt uit de Bing-meting §6 en houdt in Google geen stand. **Twee aparte artikelen**, geen redirect. Een redirect is onomkeerbaarder dan een tweede artikel.

## Clusteruitkomsten (longtail, run 2 + 3)

**Nul meetbaar volume:** `transcript for llm`, `transcript rag`, `chunk transcript for rag`, `llamaindex youtube transcript`, `youtube transcript for chatgpt`, `youtube transcript json`, `youtube transcript notion`, `export transcript to txt`, `batch transcribe youtube`, `transcribe multiple videos`, `find quote in video`, `search video for keyword`, `transcript keyword search`, `summarize long video`.

→ **De RAG/LLM-hoek bestaat niet als zoekvraag.** Blijft een productdifferentiator, is geen organisch kanaal. Post-launch heronderzoeken op longform-varianten.

| Cluster | Termen | Volume |
|---|---|---|
| **Samenvatten** | youtube video summarizer · summarize youtube video · video summarizer · ai video summarizer | alle 10K–100K |
| | summarize video 1K–10K · youtube summary generator 100–1K | |
| **Developer/API** | youtube transcript api 1K–10K · api python 100–1K · langchain 10–100 | val: geen publieke API → blijft negatief |
| **Formaten** | convert srt to text · srt to text · srt to txt: alle 1K–10K | **verkeerde intentie** (consumeert SRT, wij produceren het) |
| | youtube transcript with timestamps 100–1K · youtube transcript srt 10–100 | |
| **Zoeken** | search youtube transcript · youtube transcript search: beide 1K–10K, index 1 | intentie = zoeken bínnen één transcript (bestaat al) |
| **Playlist/bulk** | youtube playlist transcript 100–1K (YoY +900%) · youtube channel transcript 100–1K · bulk youtube transcript 10–100 | klein, groeiend, nul concurrentie |
| **Notities** | transcript to notes 100–1K, bid **€4,69** (hoogste van de set) · youtube to obsidian 10–100 · youtube transcript obsidian 10–100 (YoY ∞, vanaf nul) | |
| **Vertalen** | translate youtube transcript · youtube transcript translate: beide 10–100 | dood |

Let op de trendkolom: `ai video summarizer` doet −90% (3-maands én YoY) terwijl de YouTube-specifieke varianten vlak zijn. → **anker het samenvat-artikel op YouTube, niet op generiek "AI video summarizer".**

## Beslisregel

**Volume bepaalt het ambitieniveau van een artikel, niet het bestaansrecht.** Schrappen alleen bij nul volume én geen funnelrol. 100–1K → strak, kort artikel. 10K–100K → pillar. Reden: KP meet volume, niet haalbaarheid of conversie; nummer 1 op een term van 500 met koopintentie verslaat nummer 40 op een term van 50K achter NoteGPT.

## Artikeloordeel — van 18 naar 8 actief + 4 nieuw

*(op /articles staan 18 kaarten geteld, niet 19)*

| Artikel | Anker + volume | Oordeel |
|---|---|---|
| Audio File Transcription | audio to text, 100K–1M, index 53 | **Houden → pillar.** Commercieel waardevolst. |
| Playlist Transcripts | youtube playlist transcript, 100–1K, +900% | **Houden, absorbeert Bulk.** |
| YouTube Transcript Not Available? | hangt onder de 5M-kop | **Houden, absorbeert Age-Restricted.** Beste funnel-artikel. |
| Non-English Transcripts | Spaans/Indonesisch groot (Bing §5) | **Houden, retargeten** naar de taalfix als product. |
| Obsidian Workflow | transcript to notes 100–1K, bid €4,69 | **Houden, retargeten** naar notitie-workflow; Obsidian als voorbeeld. |
| Bulk Transcript Extraction | bulk youtube transcript 10–100 | **Samenvoegen** met Playlist (kannibalisatie). |
| 6× Formats (TXT/Markdown/CSV/SRT/JSON/RAG JSON) | alle <100; srt-volume = verkeerde intentie | **Samenvoegen tot één** hub; /docs heeft de referentie al. |
| 3× AI & RAG (Chunking/Knowledge Base/Vector DBs) | nul op vijf RAG-termen | **Parkeren.** Blijven live, geen investering, post-launch heroverwegen. |
| Age-Restricted Videos | niet meetbaar | **Samenvoegen** in Transcript Not Available. |
| Members-Only Videos | niet meetbaar | **Schrappen.** Legt uit wat we níet kunnen. |
| Without Browser Extension | niet meetbaar | **Houden als positionering**, niet als SEO-doel (antwoord op Tactiq). Geen investering. |

**Nieuw, door de data gerechtvaardigd:**

1. `/articles/video-to-text` — 100K–1M, index 35. Grootste gat.
2. `/articles/youtube-video-summarizer` — 4 termen van 10K–100K, feature bestaat. **Geblokkeerd tot de samenvatting-herbouw af is** (huidige samenvatting is ~300–400 woorden ongeacht duur).
3. `/articles/how-to-get-a-youtube-transcript` — 1K–10K + de vraagvormen (Bing §8, 3.819 impressies). Vraag-en-antwoordvorm: dit is hoe men het aan Copilot/ChatGPT vraagt.
4. `/articles/search-youtube-transcript` — 1K–10K over twee termen, index 1. **Gescoped op zoeken bínnen één transcript** (bestaat, geverifieerd in de UI: zoekveld + highlighting + treffer-teller op de transcriptpagina). Bibliotheekbrede full-text search bestaat níet — niet beloven.

## Schrijfvolgorde (commerciële waarde)

1. Audio File Transcription (pillar) · 2. video-to-text (nieuw) · 3. Transcript Not Available · 4. how-to-get-a-youtube-transcript (nieuw) · 5. youtube-video-summarizer (na de samenvatting-herbouw) · 6. Playlist (+Bulk) · 7. Non-English · 8. Obsidian → notes · 9. Formats-hub · 10. search-youtube-transcript (nieuw)

**Structuur vóór inhoud:** de samenvoegingen + 308's + sitemap-regeneratie gaan vooraf aan de herschrijfronde. Geen pagina's herschrijven die daarna samengevoegd worden; en de sitemap is net (47 routes) ingediend, dus één consolidatie i.p.v. twee.

## Openstaand

- **Geo-verdieping**: per-land runs (US / IN / GB) op de overgebleven termen, om de blocklist-impact per cluster te wegen. Aftreksom kan niet met buckets.
- **Discover-run per nieuwe pillar** voor subkoppen en FAQ-vragen — gebundeld, niet per artikel.
- **Search terms report** blijft de enige echte intentiemeting zodra de campagne draait.

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
| **Notities** | transcript to notes 100–1K, bid **€3,43** (hoogste van de set; Meting 3-correctie — was €4,69, venster een maand opgeschoven, oordeel ongewijzigd) · youtube to obsidian 10–100 · youtube transcript obsidian 10–100 (YoY ∞, vanaf nul) | |
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
| Obsidian Workflow | transcript to notes 100–1K, bid €3,43 (gecorrigeerd, was €4,69) | **Houden, retargeten** naar notitie-workflow; Obsidian als voorbeeld. *(Meting 3: herankerd op `youtube to notes` — zie Meting 3.)* |
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

- **Geo-verdieping**: per-land runs (US / IN / GB) op de overgebleven termen, om de blocklist-impact per cluster te wegen. Aftreksom kan niet met buckets. → **gedaan in Meting 3.**
- **Discover-run per nieuwe pillar** voor subkoppen en FAQ-vragen — gebundeld, niet per artikel. → **gedaan in Meting 3.**
- **Search terms report** blijft de enige echte intentiemeting zodra de campagne draait.

---

# Meting 3 — Google Keyword Planner geo + Discover (2026-08-24)

**Bron:** Google Ads Keyword Planner, twee soorten runs:
- **Geo-forecast** — één plan, 13 locaties, 12 termen, forecast 1–30 sep 2026 bij het maximaal geaccepteerde bod (**€85,55**). Plantotaal: **1.046.781 impressies**, **€619.595 kosten**.
- **Discover (keyword ideas)** — vijf runs, All locations, Engels, venster aug 2025 – jul 2026.

**Bouwt voort op Meting 2** en sluit de twee openstaande punten daarvan: de geo-verdieping (de aftreksom kon niet met buckets — nu per-land uit de forecast) en de Discover-run per pillar.

## Leesregel (Meting 3)

- **Locatiesegmentatie geeft échte landverhoudingen; het plantotaal niet.** Het plantotaal is de som van bucketmiddens (zie Meting 2-leesregel) — bruikbaar voor grootteorde, niet voor onderlinge vergelijking binnen een bucket. De per-land-splitsing van de forecast omzeilt dat: het is één gemodelleerde run, verdeeld over de locaties.
- **De forecast draait bij het verzadigingspunt.** Google accepteert geen hoger bod dan ~€83–85 (hier €85,55); daarboven groeit het bereik niet meer. De tabel is dus het *maximale* bereik, geen verwachting bij een realistisch bod.
- **Reproduceerbaar.** De VS is twee keer los gemeten met **1,1%** verschil → de forecast is stabiel.
- **De historische export toont maximaal vijf locatierijen** — een limiet van dat exporttype. De 13-landen-tabel hieronder komt daarom uit de forecast, niet uit de historische export.

## Landtabel (run 5 — forecast, 13 locaties)

| Land | Impressies | Aandeel vraag | Waarde | Aandeel waarde | Gem. CPC |
|---|---|---|---|---|---|
| Verenigde Staten | 395.243 | 37,8% | €381.388 | 61,6% | €8,85 |
| India | 214.202 | 20,5% | €28.530 | 4,6% | €0,75 |
| Verenigd Koninkrijk | 97.582 | 9,3% | €51.173 | 8,3% | €5,38 |
| Brazilië | 63.724 | 6,1% | €12.755 | 2,1% | €1,28 |
| Canada | 57.011 | 5,4% | €38.463 | 6,2% | €6,08 |
| Australië | 49.882 | 4,8% | €36.797 | 5,9% | €5,95 |
| Duitsland | 43.110 | 4,1% | €18.619 | 3,0% | €3,79 |
| Nederland | 31.595 | 3,0% | €12.727 | 2,1% | €3,51 |
| Spanje | 26.737 | 2,6% | €10.303 | 1,7% | €2,66 |
| Frankrijk | 26.710 | 2,6% | €12.901 | 2,1% | €3,82 |
| Italië | 24.540 | 2,3% | €8.098 | 1,3% | €2,51 |
| Ierland | 8.526 | 0,8% | €3.998 | 0,6% | €4,11 |
| Nieuw-Zeeland | 7.919 | 0,8% | €3.844 | 0,6% | €4,13 |

**Leesregel bij "Waarde":** dit is wat adverteerders zouden uitgeven om dat verkeer te kopen — de beste beschikbare maat voor **commerciële waarde per markt**. Het is **nadrukkelijk geen omzetvoorspelling voor ons**.

## De blocklist kost 35,9% van de vraag, maar slechts 15,0% van de waarde

De Stripe Radar-blocklist ([ADR-062](../decisions/062-market-scope-and-country-guard.md)) raakt drie landen uit deze tabel: **India, VK, Brazilië**.

- Vraag geblokkeerd: 20,5% + 9,3% + 6,1% = **35,9%**.
- Waarde geblokkeerd: 4,6% + 8,3% + 2,1% = **15,0%**.

De blocklist snijdt dus vooral **laagwaardige** vraag weg: India is 20,5% van de vraag maar 4,6% van de waarde (CPC €0,75), Brazilië is klein op beide. Dat bevestigt de geo-keuze — de niet-converteerbare markten zijn grotendeels ook de commercieel dunne.

**Uitzondering: het VK.** 9,3% van de vraag maar **8,3% van de waarde** (CPC €5,38) — bijna even waardevol per impressie als de andere Engelstalige markten. Het VK is daarmee **het enige geblokkeerde stuk dat heroverweging verdient**; India en Brazilië niet. (Blokkade-grond blijft ADR-062: NETP €0-drempel — een handelsbeslissing, geen keyword-beslissing. Hier alleen vastgelegd dat de *waarde* die het VK kost niet verwaarloosbaar is.)

## Geschatte conversieratio — per plan, niet per land

Google's conversieschatting geldt **per run/plan**, over de hele locatieset — **niet** per land. Zo lezen:

| Run | Locaties | Geschatte conversieratio |
|---|---|---|
| Run 1 | Verenigde Staten | 2,11% |
| Run 2 | Canada, Australië, Nieuw-Zeeland, Ierland | 1,25% |
| Run 3 | Duitsland, Frankrijk, Spanje, Italië, Nederland | 0,99% |
| Run 4 | Verenigd Koninkrijk, India, Brazilië | 0,76% |
| Run 5 | alle 13 | 1,25% |
| Run 6 | nieuwe productfuncties, 10 landen | 1,23% |

De VS-only-run (2,11%) ligt ruim boven de rest; de Engelstalige tweede ring (CA/AU/NZ/IE, 1,25%) boven de niet-Engelse EU-set (0,99%). Richtinggevend, niet exact — het is Google's modelschatting, geen gemeten funnel.

## Besluit: niet-Engelse markten worden geparkeerd

De vijf niet-Engelse markten in de tabel (DE, NL, ES, FR, IT) zijn samen **10,1% van de waarde**, en **geen enkele komt boven 3%** (Duitsland is de grootste, op 3,0%).

Waarom parkeren dat rechtvaardigt:
- Klein per markt → een Engels-only site die deze bezoekers toch niet in hun taal bedient, laat weinig liggen.
- **Adaptive Pricing helpt hier niet:** het zet alleen de valuta om en legt er 2–4% op — het maakt de markt niet toegankelijk, want de site en de content blijven Engels.

**Voorwaarde die dit heropent:** Search Console-data die **niet-Engels verkeer laat zien dat al binnenkomt zonder dat we ervoor schrijven**. Pas dán is er bewijs dat de vraag ons organisch bereikt — en wordt content in die talen een gefundeerde keuze in plaats van een gok. Tot die data er is: **parkeren, niet schrappen**.

## Discover-uitkomsten per groep

Vijf Discover-runs (keyword ideas), All locations, Engels, venster aug 2025 – jul 2026.

### Groep 1 — Playlist (661 ideeën)

De playlistvraag is bevestigd **microscopisch**: elke variant met *playlist*, *channel* of *bulk* staat op 10–100, concurrentie-index 0–7, zonder biedingen (`download subtitles from youtube playlist`, `youtube playlist subtitle downloader`, `transcribe youtube playlist`). **Bevestigt het Meting 2-oordeel: kort, strak artikel — geen pillar.**

**Onverwachte vondst — de vraagvorm, niet de zelfstandignaamwoordvorm.** Een groot cluster over *hoe* je aan een transcript komt, vijf bijna identieke formuleringen op **10K–100K, index 51, bod €1,60**: `how to get a transcript of a youtube video` / `how to get transcript from youtube video` / `how to get the script of a youtube video` / `how to get a transcript from a youtube video` / `how to get script from youtube video`. Plus een tweede laag op 1K–10K (`how to download transcript from youtube` index 36, `how to copy transcript from youtube` index 28). Ter contrast: de kale term `youtube transcript` staat op index 3. **Adverteerders kopen de vraagvorm, niet de zelfstandignaamwoordvorm.** (Zie het open punt onderaan.)

Ook aanwezig: `savesubs` op 10K–100K (concurrentmerk in de kop) en het volledige `download youtube subtitles`-cluster op index 1 (gratis-funnel).

### Groep 3 — Notities (67 ideeën)

**Twee gescheiden markten.**

*Vergadernotulen — niet de onze:* `ai note taking` 10K–100K index 100 bod €8,85, `fireflies ai note taker` €32,74, `fireflies note taker` €47,16, `zoom ai notetaker`, `ai meeting note taker` index 96.

*YouTube-naar-notities — wél de onze:*

| Term | Volume | Index | Bod |
|---|---|---|---|
| youtube notes | 1K–10K | 2 | €1,49 |
| make notes from youtube video | 1K–10K | 26 | €1,81 |
| notes from youtube video | 1K–10K | 24 | €2,54 |
| youtube to notes | 1K–10K | 15 | €1,51 |
| youtube video to notes | 1K–10K | 18 | €1,41 |
| take notes from youtube videos | 100–1K | 40 | €2,25 |
| transcript to notes | 100–1K | 31 | €3,43 |

**Conclusie:** het Meting 2-anker (`transcript to notes`) is een **grootteorde kleiner** dan het cluster dat ernaast lag → herankeren op `youtube to notes` (zie artikeloordeel-bijwerking).

### Groep 4 — Formaten (148 ideeën)

Grootste cluster is de **omgekeerde richting**: `text to srt` en `convert txt file to srt` op 10K–100K, index 1, €2,09 — mensen die al tekst hebben en er een ondertitelbestand van willen maken. Daarnaast `srt to text` en `convert srt to text` op 1K–10K index 1–2, die juist SRT **consumeren**. **Beide niet ons product.**

Wel van ons: `create an srt file` 1K–10K index 15 €1,81, `transcript download` 1K–10K index 6, `download transcripts` 1K–10K index 13 (**+900% jaar op jaar**).

**Nieuwe ruisbron:** het Amerikaanse **belastingtranscript** (`download irs transcript`, `download tax transcript`, `get w2 transcript from irs`, `irs form 4506`) — daar betekent "transcript" een fiscaal document. → negatief (zie [marketing.md](marketing.md)).

**Conclusie:** de formats-hub blijft **referentie zonder investering** (klein).

### Groep 5 — Ondertiteling (1699 ideeën)

**Veel groter dan de veertien termen van run 6 lieten zien.** Bovenlaag op 10K–100K: `subtitle generator` index 28, `video subtitle generator` index 36, `auto captions` / `automatic captions` index 20, `captions for videos` index 11, `generate subtitles for video` index 36, `auto caption generator` index 20, `editing subtitles` index 14.

Onze eigen laag:

| Term | Volume | Index | Bod |
|---|---|---|---|
| srt generator | 1K–10K | 27 | €0,67 |
| create srt file | 1K–10K | 15 | €1,81 |
| srt file generator | 1K–10K | 21 | €0,66 |
| mp4 to srt | 1K–10K | 21 | €0,32 |
| generate srt file from video | 100–1K | 50 | €0,88 |
| create srt file from audio | 100–1K | 51 | €1,91 |
| ai srt generator | 100–1K | 32 | €3,58 |
| create vtt file | 100–1K | 17 | €3,99 |

**Verkeerde buurt, groot:** `add subtitles to video`, `add srt to mp4`, `embed srt in mp4`, `attach srt to mp4` (inbranden en koppelen), plus een zwaar merkencluster van video-editors — **Kapwing, VEED, CapCut, DaVinci Resolve, Premiere Pro** (Premiere alleen al zes termen op 5.000). → negatief (zie [marketing.md](marketing.md)). Deze eigen laag rechtvaardigt een **nieuw ondertitelartikel**, bewust weg van de inbrand-buurt (zie artikeloordeel-bijwerking).

## Artikeloordeel — bijwerking na Meting 3

Bouwt voort op het Meting 2-artikeloordeel; alleen de wijzigingen:

- **Nieuw: `/articles/srt-generator`** — een ondertitelbestand maken uit audio of video (**niet** ondertitels in beeld branden). Primair anker `srt generator` (1K–10K, index 27); secundaire ankers `create srt file`, `srt file generator`, `create srt file from audio`, `generate srt file from video`, `ai srt generator`, `create vtt file`. **Bewust NIET ankeren op** `subtitle generator` of `add subtitles to video` — groter, maar dat zijn video-editors die ondertitels in beeld branden (dat doen wij niet). **Dragend onderscheid:** segmentatie volgens de Netflix-specificatie ([ADR-094](../decisions/094-subtitle-segmentation-netflix.md)) tegenover generatoren die op tekenaantal knippen. **Negatieven:** `kapwing`, `veed`, `capcut`, `premiere`, `davinci`, `canva`, `embed`, `burn`, `mp4`. **Status: nieuw, nog niet geschreven.**
- **Herankering notitieartikel** (Meting 2 "Obsidian Workflow"): van `transcript to notes` → **`youtube to notes`** (1K–10K, index 15, bod €1,51). Reden: Discover groep 3 toont dat `transcript to notes` (100–1K) een grootteorde kleiner is dan het YouTube-naar-notities-cluster ernaast. Oordeel verder ongewijzigd (houden, retargeten naar notitie-workflow).
- **Playlist bevestigd klein** (Discover groep 1): kort, strak artikel, geen pillar. Absorbeert Bulk (ongewijzigd t.o.v. Meting 2).
- **Formats-hub bevestigd klein** (Discover groep 4): referentie zonder investering.

## Openstaand (Meting 3)

- **[~] `how-to-get-a-youtube-transcript` — heroverwegen als H2/FAQ, geen besluit.** Discover groep 1 laat zien dat dit geschrapte artikel commercieel aantrekkelijker is dan gedacht: de vraagvorm staat op **index 51, bod €1,60, vijf formuleringen van 10K–100K**. Maar de schrapgrond (concurrentie met Google's eigen documentatie) is **niet weggenomen**. **Voorstel ter beslissing bij Khidr:** het artikel *niet* terugbrengen, maar deze vraagvormen als H2 + FAQ opnemen in `youtube-transcript-not-available` en in de quickstart. Markeer als `[~]`, niet `[x]`.
- **Search terms report** blijft de enige echte intentiemeting zodra de campagne draait (ongewijzigd sinds Meting 1/2).

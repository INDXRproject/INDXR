# Google Ads-campagne — bestandsformaat-cluster (opzet 2026-08-31)

**Status:** Opgezet, nog niet live
**Datum:** 2026-08-31
**Beslissing:** [ADR-101](../decisions/101-optimise-on-activation-not-purchase.md) (stuurt op activatie, niet op aankoop) — dit is de uitwerking, geen nieuwe beslissing
**Bron voor de keyword-cijfers:** [keyword-demand-2026-08.md](keyword-demand-2026-08.md)
**Richtlijnen die dit concretiseert:** [marketing.md → Betaalde zoekcampagne](marketing.md#betaalde-zoekcampagne-ads--richtlijnen)

Deze pagina is bewust zelfstandig leesbaar: elke keuze, elk gemeten getal, elke advertentietekst
staat hier. De waarde zit erin dat niemand deze clusters of deze redenering over een jaar opnieuw hoeft
te reconstrueren.

---

## 1. Doel en aard — dit is een meetinstrument

De campagne is **geen groeikanaal**. Ze koopt geen klanten; ze koopt drie dingen die we nergens anders
gratis kunnen krijgen:

1. het **search terms report** — de werkelijke zoekopdrachten in ónze markt (de enige echte
   intentiemeting; alle keyword-metingen vooraf zijn schattingen — zie keyword-demand-2026-08.md);
2. de **werkelijke CPC per cluster** (niet de Keyword-Planner-schatting);
3. de werkelijke **klik → activatie → aankoop**-ratio's van onze eigen funnel.

**Budget.** De meet-intentie is circa **€20/dag over vier weken (~€560)** — genoeg om betekenisvolle
aantallen te kopen zonder te investeren in groei. De campagne staat feitelijk op **€25/dag** vanwege een
promotie (€400 uitgegeven vóór 1 oktober = €400 advertentiekrediet). **Het budget is een plafond, geen
doel** — de campagne mag onder het plafond blijven; het getal stuurt niets.

Waarom activatie en niet aankoop het optimalisatiedoel is (te weinig aankoopvolume voor Smart Bidding +
time-to-paid van 90–180 dagen valt buiten het attributievenster): volledig onderbouwd in
[ADR-101](../decisions/101-optimise-on-activation-not-purchase.md). Activatie = eerste voltooide
premium-actie (AI-transcriptie klaar / AI-samenvatting / playlist-video voorbij de gratis drie).

---

## 2. De keuze van de cluster — bestandsformaat-termen

**Gekozen cluster:** bestandsformaat-termen (audio- en videobestanden transcriberen).
Circa **9.100 zoekopdrachten/maand (VS)**, verwachte **CPC €1,21**, ~340 klikken/maand.

**De enige reden dat dit cluster werkt: er is geen gratis uitweg.** Een bestandsupload (voice memo,
M4A, WAV, MKV, …) *kan niet* via de gratis captionroute — die bestaat alleen voor YouTube-video's met
bestaande ondertitels. Elke klik op een bestandsformaat-term landt dus onvermijdelijk bij een **betaalde**
functie (AI-transcriptie van een upload, 1 credit/minuut). Dat is precies wat een meetinstrument nodig
heeft: geen gratis afvoerputje waarin de klik verdwijnt zonder dat we iets over betaalde intentie leren.

Landingspagina's: [`/articles/audio-to-text`](https://indxr.ai/articles/audio-to-text) (audio) en
[`/articles/video-to-text`](https://indxr.ai/articles/video-to-text) (video) — beide het betaalde
AI-transcriptieproduct. Dit is ook het cluster dat de keyword-meting als commercieel waardevolst
aanwees (`audio to text` 100K–1M, competition-index 53; `video to text` 100K–1M, index 35 — Meting 2).

---

## 3. Wat is afgewezen, en waarom — definitief afgesloten

Vijf probleem-/foutmeldingsclusters zijn gemeten (58 termen) en **definitief afgesloten**. De rode draad:
**foutmeldings- en probleemzoekopdrachten bestaan in deze markt niet als advertentiekanaal** — er is te
weinig volume, en waar er volume is, biedt niemand (competition-index bij nul) omdat er niets te verkopen
valt aan iemand met een probleem.

| Afgewezen cluster | Volume | Competition-index | Biedingen | Reden |
|---|---|---|---|---|
| Verkeerde taal | ~300/mnd | 0 | geen | Geen adverteerders → geen markt |
| Geen transcript beschikbaar | ~200/mnd | 0–7 | geen | Probleemzoekopdracht, geen koopintentie |
| Slechte transcriptkwaliteit | ~50/mnd | — | — | Te klein om te meten |
| Playlist en bulk | ~150/mnd | 0–5 | geen | Microscopisch + geen concurrentie (bevestigd Meting 3, Discover groep 1) |
| Lengte en limieten | ~100/mnd | — | €2,53–12,80 | Wél bids, maar peperduur voor een dunne, defensieve intentie |

**Conclusie over de 58 termen:** deze buurt levert geen betaalbaar, converterend verkeer. Niet opnieuw
onderzoeken zonder nieuwe data.

**Ook afgewezen: de generieke YouTube-transcript-cluster** (`youtube transcript`, `youtube transcript
generator`, …). Enorm volume (`youtube transcript` = 1M–10M) maar commercieel leeg (competition-index
3–9) en de hele top-10 is een gratis-markt. **Wij geven het product op die termen gratis weg** (caption-
extractie is onze organische funnel, niet iets om ~€1,30/klik voor te betalen in een SERP waar tien
concurrenten "Free" roepen). Zie keyword-demand-2026-08.md §4 (Bing) + Meting 2.

---

## 4. De campagne zelf

### 4.1 Instellingen

| Instelling | Waarde |
|---|---|
| Type | Search |
| Netwerk | **Alleen Google Search** — Search Partners uit, Display uit |
| Locatie | **Verenigde Staten**, instelling **Presence** (niet "presence or interest") |
| Taal | Engels |
| Budget | **€25/dag** (plafond, niet doel — zie §1) |
| Biedstrategie | **Manual CPC** bij start (zie §5) |
| Campagnedoel bij aanmaak | **"Begin checkout" aangevinkt** — anders telt de Activation-conversie niet mee |
| Auto-apply recommendations | **Uit** |
| Match types | **Alleen exact en phrase** — geen broad match |

> **Geo is bewust smaller dan de algemene richtlijn.** [marketing.md](marketing.md#betaalde-zoekcampagne-ads--richtlijnen)
> noemt US + CA + AU als toegestane geo. Deze eerste meting draait **US-only op Presence** — één markt,
> schoonst mogelijke aflezing (de VS-only conversieschatting lag met 2,11% ook ruim boven de tweede ring;
> Meting 3). CA/AU kunnen later toegevoegd worden; elke geo-wijziging reset de recalibratie (§6).

### 4.2 Advertentiegroepen

Vier groepen, allemaal binnen het bestandsformaat-cluster, gescheiden op formaat-familie zodat bod en
advertentietekst bij het zoekwoord passen. Alleen exact `[…]` en phrase `"…"` match.

| Groep | Bod | Landingspagina | Keywords |
|---|---|---|---|
| **AG1 — Voice memo** | €1,80 | `/articles/audio-to-text` | `[transcribe voice memo]` `[voice memo to text]` `[transcribe voice memo to text]` `[iphone voice memo to text]` · `"transcribe voice memo"` `"voice memo transcription"` `"voice recording to text"` |
| **AG2 — M4A en WAV** | €1,80 | `/articles/audio-to-text` | `[transcribe m4a file]` `[m4a to text]` `[transcribe wav file to text]` `[wav to text]` · `"transcribe m4a"` `"m4a file to text"` `"transcribe wav file"` `"wav file to text"` |
| **AG3 — Open formaten** | €1,00 | `/articles/audio-to-text` | `[ogg to text]` `[transcribe ogg audio]` `[transcribe opus file]` `[transcribe flac to text]` `[flac to text]` `[transcribe whatsapp voice note]` · `"whatsapp voice message to text"` `"transcribe opus"` `"ogg audio to text"` |
| **AG4 — Videocontainers** | €1,20 | `/articles/video-to-text` | `[transcribe mkv file]` `[transcribe webm to text]` `[transcribe mov file]` `[transcribe avi file]` · `"mkv to text"` `"webm to text"` `"transcribe video file to text"` |

Bod-logica: voice memo en M4A/WAV zijn de sterkste koopintenties (€1,80); open formaten (OGG/OPUS/FLAC/
WhatsApp) zijn dunner en goedkoper (€1,00); videocontainers zitten ertussenin (€1,20). De bods liggen
rond de geschatte cluster-CPC van €1,21 — het search terms report corrigeert ze straks naar de echte CPC.

### 4.3 Negatievenlijst (campagneniveau)

Deze lijst staat **bovenop** de vaste negatieven in
[marketing.md](marketing.md#betaalde-zoekcampagne-ads--richtlijnen) (merken, ondertitel-piraterij,
`api`, IRS-belastingtranscript, diploma-vertaling, fonetiek, video-editors/inbranden). Specifiek voor
dit bestandsformaat-cluster:

```
free, gratis, "open source", github, crack, apk, torrent, api, python,
ffmpeg, "chrome extension", plugin, offline, "self hosted", "text to speech",
tts, "text to audio", "voice generator", "voice over", meeting, zoom, teams,
"google meet", webinar, "call recording", "medical transcription",
"legal transcription", deposition, hipaa, "live transcription", dictation,
"real time", translate, dubbing, jobs, salary, career, transcriptionist,
upwork, otter, rev.com, sonix, descript, "happy scribe", turboscribe, notta,
trint, temi, lyrics, "sheet music", karaoke
```

De blokken dekken: gratis-zoekers (`free`, `github`, `crack`), verkeerde tools (`text to speech`, TTS,
`voice generator`), verkeerde markt (vergadering/`zoom`/`webinar`/`call recording`, medisch/juridisch/
`deposition`/`hipaa`, live/dictaat/realtime), verkeerde intentie (`translate`, `dubbing`, `lyrics`,
`sheet music`, `karaoke`), banenmarkt (`jobs`, `transcriptionist`, `upwork`) en concurrentmerken
(`otter`, `rev.com`, `sonix`, `descript`, `happy scribe`, `turboscribe`, `notta`, `trint`, `temi`).

### 4.4 Advertentieteksten

15 koppen (max 30 tekens) en 4 beschrijvingen (max 90 tekens) per groep. **Geen pinning** — Google mag
vrij combineren.

**AG1 — Voice memo**

*Koppen:* Voice Memo to Text · Transcribe Voice Memos · Voice Memo Transcription · iPhone Voice Memo to Text · Upload, Get Text Back · M4A Files Upload Directly · No Converting Needed · No Subscription Required · Credits Never Expire · Timestamps Included · Speaker Labels Included · 50 Free Credits to Start · Files Up to 500 MB · Transcribed in the EU · Export TXT, SRT and JSON

*Beschrijvingen:*
- Upload a voice memo and get the full text back, punctuated and timestamped.
- iPhone voice memos work as they are. No converting, no format juggling first.
- Pay per minute of audio. Credits never expire and there is no subscription.
- A free account includes 50 credits, enough for 50 minutes of transcription.

**AG2 — M4A en WAV**

*Koppen:* Transcribe M4A and WAV · M4A File to Text · WAV to Text Converter · Transcribe M4A Files · WAV File Transcription · Upload, Get Text Back · Fifteen Formats Supported · Files Up to 500 MB · Up to Ten Hours per File · No Subscription Required · Credits Never Expire · Speaker Labels Included · Export SRT, VTT and TXT · 50 Free Credits to Start · Transcribed in the EU

*Beschrijvingen:*
- Upload an M4A or WAV file and get a clean, timestamped transcript back.
- Fifteen formats, files up to 500 MB and ten hours. No converting beforehand.
- Speakers are separated automatically, and you rename them once for the whole file.
- A free account includes 50 credits. No subscription, and credits never expire.

**AG3 — Open formaten**

*Koppen:* OGG, OPUS and FLAC to Text · Transcribe OPUS Files · WhatsApp Voice to Text · OGG to Text Converter · FLAC File Transcription · Straight From WhatsApp · Upload the File As It Is · No Converting Needed · No Subscription Required · Credits Never Expire · Files Up to 500 MB · Timestamps Included · 50 Free Credits to Start · Fifteen Formats Supported · Transcribed in the EU

*Beschrijvingen:*
- OGG, OPUS and FLAC upload directly, with no converting step beforehand.
- WhatsApp exports voice messages as OPUS. Upload the file exactly as it comes.
- Get the text back punctuated, split by speaker and timestamped throughout.
- Pay per minute with credits that never expire. No monthly plan to cancel.

**AG4 — Videocontainers**

*Koppen:* Transcribe MKV and WEBM · Video File to Text · MOV, AVI and MKV to Text · Transcribe Any Video File · Audio Track Taken Out · Upload, Get Text Back · Export SRT and VTT · Fifteen Formats Supported · Files Up to 500 MB · Up to Ten Hours per File · No Subscription Required · Credits Never Expire · Speaker Labels Included · 50 Free Credits to Start · Transcribed in the EU

*Beschrijvingen:*
- Upload a video file and get the text back. The audio track is extracted for you.
- MKV, WEBM, MOV, AVI and MP4 all work without converting the file first.
- Export as SRT or VTT for subtitles, or TXT, Markdown, CSV and JSON.
- A free account includes 50 credits. No subscription, credits never expire.

### 4.5 Assets (campagneniveau)

- **Sitelinks:** Pricing → `/pricing` · Supported formats → `/docs/guides/uploads` · How it works → `/docs` · Free YouTube transcripts → `/transcribe`
- **Callouts:** No subscription · Credits never expire · Processed in the EU · Files up to 500 MB · Fifteen formats
- **Structured snippet (Types):** TXT, Markdown, SRT, VTT, CSV, JSON

---

## 5. Biedstrategie en wanneer die verandert

**Start: Manual CPC.** Twee redenen:

1. De vier groepen vragen **uiteenlopende bods** (€1,00–€1,80) — Manual CPC laat elk bod bij de
   koopintentie van de groep passen;
2. er is **geen conversiehistorie** — een geautomatiseerde strategie heeft niets om op te leren.

**Overgang naar Maximize Conversion Value** zodra er **30+ activaties per 30 dagen** binnenkomen. Dat is
de drempel waarop Google's Smart Bidding genoeg signaal heeft (zie ADR-101 §Rationale). Vóór die drempel
zou automatisch bieden gokken op ruis.

> **Manual CPC is geen uitgefaseerde optie.** Manual CPC is in 2026 volledig beschikbaar en staat sinds
> januari 2026 **direct in de campagne-setup** (niet meer verstopt achter "Portfolio-strategieën"). We
> gebruiken dus geen legacy-knop — dit is de aanbevolen startstrategie voor een campagne zonder
> conversiehistorie.

---

## 6. Evaluatiecriteria — vooraf vastgelegd

Deze criteria staan **vóór** de start vast; dat is het hele punt van een meetinstrument. Ze worden niet
gaandeweg bijgesteld naar wat de data toevallig laat zien.

**Beslispunt:** na **28 dagen óf 500 klikken, wat eerder komt.**

**Per advertentiegroep gemeten:** gerealiseerde CPC · klik → activatie · activatie → aankoop · **kosten
per activatie**.

| Uitkomst per groep | Actie |
|---|---|
| **< €25** kosten per aankoop | **Opschalen** binnen die groep |
| **€25–€60** met **dalende** trend | **Vier weken verlengen**, budget verschuiven van de zwakste naar de sterkste groep |
| **> €60**, óf **nul activaties in alle groepen** | **Stoppen** — niet harder bieden |

> **Harder bieden bij tegenvallende resultaten is géén optie.** Dit is de fout die deze pagina moet
> voorkomen. Als een groep boven €60 kosten per aankoop zit of niets activeert, is het antwoord *stoppen*,
> niet *meer betalen om het goed te praten*. Een duurdere klik maakt een intentie die niet converteert
> niet plotseling waardevol; het verhoogt alleen het verlies.

---

## 7. Beheer

**Wekelijks, en niet meer dan dat:**

- **Search terms report lezen** en de **negatievenlijst aanvullen** met wat er aan ruis binnenkwam.

**Verder niets aanraken.** Elke wijziging van **bod, budget of target reset de recalibratie** — Google
begint het leerproces (en de meting) opnieuw. Wie tussentijds aan de knoppen draait, gooit de meting weg
die de campagne juist moest opleveren.

---

## Cross-referenties

- [ADR-101 — stuurt op activatie, niet op aankoop](../decisions/101-optimise-on-activation-not-purchase.md) — de beslissing waarvan dit de uitwerking is
- [ADR-062 — markt-scope + country-guard](../decisions/062-market-scope-and-country-guard.md) — waarom de VS wél en veel andere markten niet kunnen afrekenen
- [keyword-demand-2026-08.md](keyword-demand-2026-08.md) — Meting 1/2/3: de cijfers achter cluster-keuze en afwijzingen
- [marketing.md → Betaalde zoekcampagne](marketing.md#betaalde-zoekcampagne-ads--richtlijnen) — de algemene Ads-richtlijnen + vaste negatievenlijst
- [ADR-087 — Google Ads-meetlaag + consentmodel](../decisions/087-google-ads-measurement-and-consent.md) — hoe conversies gemeten worden (Consent Mode v2, klik-ID's)

# Google Ads-campagne — bestandsformaat-cluster (gepubliceerd 2026-08-31)

**Status:** **Gepubliceerd 2026-08-31** — deze pagina beschrijft de **werkelijk gepubliceerde opzet**, niet het oorspronkelijke plan
**Datum:** 2026-08-31
**Beslissing:** [ADR-101](../decisions/101-optimise-on-activation-not-purchase.md) (stuurt op activatie, niet op aankoop) — dit is de uitwerking, geen nieuwe beslissing
**Bron voor de keyword-cijfers:** [keyword-demand-2026-08.md](keyword-demand-2026-08.md)
**Richtlijnen die dit concretiseert:** [marketing.md → Betaalde zoekcampagne](marketing.md#betaalde-zoekcampagne-ads--richtlijnen)

Deze pagina is bewust zelfstandig leesbaar: elke keuze, elk gemeten getal, elke advertentietekst
staat hier. De waarde zit erin dat niemand deze clusters of deze redenering over een jaar opnieuw hoeft
te reconstrueren.

> **Let op — gepubliceerde staat, niet het plan.** Een paar dingen wijken af van de oorspronkelijke
> opzet doordat de huidige Google Ads-interface het plan niet één-op-één toestond. De grootste: de
> biedstrategie is **niet** Manual CPC met bods per advertentiegroep geworden, maar **Maximize clicks met
> één campagnebrede maximum-CPC (€1,80)** — bods per groep bestaan onder die strategie niet (zie §4.1 en
> §5). Waar deze pagina en het plan uiteenlopen, wint wat er feitelijk draait.

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

### 4.1 Instellingen (zoals gepubliceerd)

| Instelling | Waarde |
|---|---|
| Type | Search |
| Netwerk | **Alleen Google Search Network** — Search Partners uit, Display uit |
| Locatie | **Verenigde Staten**, instelling **Presence** (niet "presence or interest"); **Nederland expliciet uitgesloten** |
| Taal | Engels |
| Budget | **€25/dag** (plafond, niet doel — zie §1) |
| Biedstrategie | **Maximize clicks** met **campagnebrede maximum-CPC-limiet €1,80** (zie §5) |
| Conversiedoelen | **Begin checkout** én **Purchases** |
| AI Max | **Uit** — inclusief **asset optimization** en **Final URL expansion** |
| Broad match keywords | **Uit** |
| Automatically created assets | **Uit** |
| Ad rotation | **Rotate indefinitely** (geen auto-optimalisatie naar "beste" ad) |
| Match types | **Alleen exact en phrase** — geen broad match |

> **Waarom Nederland is uitgesloten.** De campagne draait US-only op Presence. Nederland (onze eigen
> locatie) wordt apart uitgesloten zodat eigen bezoeken en die van bekenden de meting niet vervuilen —
> Presence-op-VS zou een NL-klik strikt al buitensluiten, maar de expliciete exclusie is de zekere
> ondergrens.

> **Geo is bewust smaller dan de algemene richtlijn.** [marketing.md](marketing.md#betaalde-zoekcampagne-ads--richtlijnen)
> noemt US + CA + AU als toegestane geo. Deze eerste meting draait **US-only op Presence** — één markt,
> schoonst mogelijke aflezing (de VS-only conversieschatting lag met 2,11% ook ruim boven de tweede ring;
> Meting 3). CA/AU kunnen later toegevoegd worden; elke geo-wijziging reset de leerfase (§7).

### 4.2 Advertentiegroepen

Vier groepen, allemaal binnen het bestandsformaat-cluster, gescheiden op formaat-familie zodat de
advertentietekst bij het zoekwoord past. **31 keywords totaal** (7 / 8 / 9 / 7), alleen exact `[…]` en
phrase `"…"` match — geen broad match.

| Groep | # keywords | Landingspagina | Keywords |
|---|---|---|---|
| **Ad group 1 — Voice Memos** | 7 | `/articles/audio-to-text` | `[transcribe voice memo]` `[voice memo to text]` `[transcribe voice memo to text]` `[iphone voice memo to text]` · `"transcribe voice memo"` `"voice memo transcription"` `"voice recording to text"` |
| **Ad group 2 — M4A and WAV** | 8 | `/articles/audio-to-text` | `[transcribe m4a file]` `[m4a to text]` `[transcribe wav file to text]` `[wav to text]` · `"transcribe m4a"` `"m4a file to text"` `"transcribe wav file"` `"wav file to text"` |
| **Ad group 3 — Open formats** | 9 | `/articles/audio-to-text` | `[ogg to text]` `[transcribe ogg audio]` `[transcribe opus file]` `[transcribe flac to text]` `[flac to text]` `[transcribe whatsapp voice note]` · `"whatsapp voice message to text"` `"transcribe opus"` `"ogg audio to text"` |
| **Ad group 4 — Video containers** | 7 | `/articles/video-to-text` | `[transcribe mkv file]` `[transcribe webm to text]` `[transcribe mov file]` `[transcribe avi file]` · `"mkv to text"` `"webm to text"` `"transcribe video file to text"` |

**Geen bods per advertentiegroep.** Onder de gekozen strategie (Maximize clicks, §5) deelt élke groep
dezelfde campagnebrede maximum-CPC (€1,80); een bod-veld per groep bestaat niet en is niet bewerkbaar.
Sturen op groepniveau kan daardoor **alleen via pauzeren of het aanpassen van keywords**, niet via bods.
De €1,80-limiet ligt boven de geschatte cluster-CPC van €1,21 — het search terms report toont straks de
werkelijke CPC.

### 4.3 Negatievenlijst — 51 negatieven, alle op campagneniveau

**51 negatieven, allemaal op campagneniveau** (niet per advertentiegroep). Ze overlappen bewust met de
vaste negatieven in [marketing.md](marketing.md#betaalde-zoekcampagne-ads--richtlijnen) (merken,
ondertitel-piraterij, `api`, IRS-belastingtranscript, diploma-vertaling, fonetiek,
video-editors/inbranden) en zijn toegespitst op dit bestandsformaat-cluster. De volledige lijst zoals
gepubliceerd:

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

### 4.5 Assets

**Op campagneniveau, niet per advertentiegroep** — 4 sitelinks en 5 callouts, gedeeld door alle vier de
groepen.

- **Sitelinks (4):** Pricing → `/pricing` · Supported formats → `/docs/guides/uploads` · How it works → `/docs` · Free YouTube transcripts → `/transcribe`
- **Callouts (5):** No subscription · Credits never expire · Processed in the EU · Files up to 500 MB · Fifteen formats
- **Structured snippet (Types):** TXT, Markdown, SRT, VTT, CSV, JSON

---

## 5. Biedstrategie en wanneer die verandert

**Zoals gepubliceerd: Maximize clicks met één campagnebrede maximum-CPC van €1,80.** Er is **geen
conversiehistorie** — een conversie-gestuurde strategie heeft nog niets om op te leren; Maximize clicks
koopt zoveel mogelijk verkeer binnen de CPC-limiet, wat voor de meetfase precies is wat we willen (zoveel
mogelijk search terms + funnel-aflezingen).

**Wat dit betekent voor sturing:**

- **Alle vier de advertentiegroepen delen hetzelfde plafond** (€1,80). Onder Maximize clicks bestaat er
  **geen bod-veld per groep** — dat veld is in de huidige interface niet bewerkbaar. De oorspronkelijk
  geplande bods per groep (€1,80 / €1,80 / €1,00 / €1,20) zijn dus **niet** actief.
- **Bijsturen op groepniveau kan alleen via pauzeren of keywords aanpassen, niet via bods.** Wie één
  groep zwakker wil laten meewegen, pauzeert hem of snoeit zijn keywords; harder/zachter bieden per groep
  is geen beschikbare knop.

**Overgang naar een conversie-gestuurde strategie** (Maximize Conversion Value) zodra er **30+ activaties
per 30 dagen** binnenkomen. Dat is de drempel waarop Google's Smart Bidding genoeg signaal heeft (zie
[ADR-101](../decisions/101-optimise-on-activation-not-purchase.md) §Rationale). Vóór die drempel zou
conversie-gestuurd bieden op ruis gokken — daarom nu Maximize clicks. **Let op:** die overgang is een
strategiewijziging en reset de leerfase (§7).

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
| **€25–€60** met **dalende** trend | **Vier weken verlengen**; verkeer verschuiven naar de sterkste groep — onder Maximize clicks kan dat **alleen via pauzeren van de zwakste of het snoeien/uitbreiden van keywords**, niet via bods per groep (§5) |
| **> €60**, óf **nul activaties in alle groepen** | **Stoppen** — niet harder bieden |

> **Harder bieden bij tegenvallende resultaten is géén optie.** Dit is de fout die deze pagina moet
> voorkomen. Als een groep boven €60 kosten per aankoop zit of niets activeert, is het antwoord *stoppen*,
> niet *meer betalen om het goed te praten*. Een duurdere klik maakt een intentie die niet converteert
> niet plotseling waardevol; het verhoogt alleen het verlies.

---

## 7. De eerste twee weken — niet aan de knoppen

Deze sectie staat hier om te voorkomen dat iemand — **inclusief ikzelf** — over een week gaat zitten
sleutelen. Staande praktijk voor een verse campagne in de leerfase:

- **Dagelijkse schommelingen zijn betekenisloos.** Klik- en kostencijfers stuiteren per dag; er zit geen
  signaal in één dag. Niet reageren op een slechte (of goede) dag.
- **Bod-, budget- en structuurwijzigingen resetten de leerfase.** Elke aanpassing aan biedstrategie,
  CPC-limiet, budget, keywords of advertenties zet Google's leerproces terug naar nul — en daarmee de
  meting. Wie in week 1 "even optimaliseert", gooit de data weg die de campagne juist moest opleveren.
- **Negatieven zijn de enige veilige ingreep** — ze sturen alleen wélk verkeer binnenkomt, niet hoe er
  geboden wordt, dus ze resetten de leerfase niet. Maar **gebatcht in twee of drie momenten, niet
  dagelijks**: verzamel de ruis uit het search terms report en voeg 'm in een paar rondes toe.
- **Het eerste beslispunt ligt op dag 8 tot 14** — niet eerder. Pas dan is er genoeg data om iets te
  zeggen (het formele beslispunt uit §6 — 28 dagen of 500 klikken — komt daarna).

---

## 8. Beheer

**Wekelijks, en niet meer dan dat:**

- **Search terms report lezen** en de **negatievenlijst aanvullen** met wat er aan ruis binnenkwam
  (gebatcht — zie §7).

**Verder niets aanraken.** Elke wijziging van **biedstrategie, CPC-limiet, budget, keywords of
advertenties reset de leerfase** — Google begint het leerproces (en de meting) opnieuw. Wie tussentijds
aan de knoppen draait, gooit de meting weg die de campagne juist moest opleveren.

---

## 9. Open verificatiepunt — activatieconversie nog niet met echt verkeer getest

**De gtag-activatieconversie is nooit met echt verkeer geverifieerd.** De verificatie in commit `ea2ee77`
(de gtag-activatieconversie + klik-ID-opslag) gebruikte een **gemockte `window.gtag`**; het rapport
noteert onder *ECHTE CALL* expliciet dat een **volledige browser-e2e van het netwerkverzoek niet is
gedraaid**. De mock bewijst dat de code vuurt tegen een nep-gtag, niet dat de echte Google Ads-conversie
binnenkomt.

**Actie zodra de eerste echte activatie binnenkomt:** controleer in Google Ads onder **Goals →
Conversions** dat de actie **"Activation"** van **"Unverified"** naar een geregistreerde conversie
overgaat. Gebeurt dat niet, dan **vuurt de gtag niet** en is de **hele campagnemeting blind** — dan meten
we klikken en kosten, maar niet het enige getal waar de campagne op stuurt (kosten per activatie). Dit is
een blokkerende check, geen nice-to-have: zonder werkende activatieconversie kan geen enkel beslispunt uit
§6 betrouwbaar worden afgelezen.

---

## Cross-referenties

- [ADR-101 — stuurt op activatie, niet op aankoop](../decisions/101-optimise-on-activation-not-purchase.md) — de beslissing waarvan dit de uitwerking is
- [ADR-062 — markt-scope + country-guard](../decisions/062-market-scope-and-country-guard.md) — waarom de VS wél en veel andere markten niet kunnen afrekenen
- [keyword-demand-2026-08.md](keyword-demand-2026-08.md) — Meting 1/2/3: de cijfers achter cluster-keuze en afwijzingen
- [marketing.md → Betaalde zoekcampagne](marketing.md#betaalde-zoekcampagne-ads--richtlijnen) — de algemene Ads-richtlijnen + vaste negatievenlijst
- [ADR-087 — Google Ads-meetlaag + consentmodel](../decisions/087-google-ads-measurement-and-consent.md) — hoe conversies gemeten worden (Consent Mode v2, klik-ID's)

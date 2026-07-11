# Positionering

## Wat INDXR doet

INDXR.AI extraheert transcripten van YouTube-video's en maakt ze doorzoekbaar, exporteerbaar, en samenvatbaar met AI.

**Core use cases:**
- Onderzoekers die video-content willen citeren of verwerken
- Content creators die hun eigen video's willen hergebruiken
- Studenten die lange lectures willen samenvatten
- Marketeers die YouTube-content willen analyseren

---

## Doelgroep

**Primair:**
- Kenniswerkers die YouTube-video's als informatiebron gebruiken
- Onderzoekers, journalisten, content creators
- Nederlandstalige markt (UI was deels Dutch → vertaald naar English in Phase D)

**Secundair:**
- Agencies die meerdere kanalen monitoren (playlist-feature, Power pakket)
- Developers die transcripten willen exporteren (JSON/CSV/SRT export)

---

## Onderscheid

**vs. YouTube's eigen CC:**
- INDXR exporteert in meerdere formaten (TXT, JSON, CSV, SRT, VTT)
- AI samenvatting + action points
- Opslag in bibliotheek (doorzoekbaar, herbruikbaar)
- Playlist-batch extractie

**vs. generieke transcript-sites (downsub, youtubetranscript.com):**
- Geen spam/advertenties
- Bibliotheekbeheer (collections, zoeken)
- AI-samenvatting
- Rich-text bewerking (Tiptap)

**vs. Whisper/Descript/andere AI-tools:**
- Specifiek voor YouTube (geen upload nodig)
- Captions-first (seconden, niet minuten)
- Betaalbaar credit-model (geen dure abonnementen)

---

## Prijspositie

INDXR is bewust **niet gratis** voor betaalde features: welcome credits + gratis caption-extractie testen de bereidheid om te betalen. Caption-extractie is altijd gratis; AI-transcriptie/RAG/playlist kosten credits.

### Concurrentie-analyse AI-transcriptie (2026-07, per minuut)

INDXR's AI-transcriptie kost **€0,035/min (Try) → €0,016/min (Power)** — 1 credit/min, dus per-minuut = prijs-per-credit per tier.

| Aanbieder | Prijs/min | Type |
|-----------|-----------|------|
| **INDXR** | **€0,035 → €0,016** | GUI + RAG + playlist + gratis captions |
| Rev / Temi | ~$0,25/min | UI-transcriptie |
| Happy Scribe | ~€0,20/min | UI-transcriptie |
| Algemene AI-transcriptiemarkt | $0,10–0,50/min | UI |
| Deepgram (kale API) | ~$0,0043/min | API, geen GUI |
| VexaScribe e.d. (bulk/self-host) | < INDXR | API/self-host, geen GUI |

**Conclusie (concurrentie-analyse bevestigt):**
- INDXR zit **fors ónder de UI-concurrenten** (Rev/Temi/Happy Scribe, 5–15×) én onder de algemene AI-transcriptiemarkt.
- INDXR is **duurder dan kale API's/self-hosted** (Deepgram, VexaScribe-bulk) — maar die missen GUI, RAG-export, playlist-batch, gratis caption-extractie en de bibliotheekfunctie. Dat is de bewuste waarde-premie.
- **Prijs niet verlagen.** De prijs is goed/onder de markt. Het openstaande punt is puur **presentatie**: de per-minuut/per-uur-weergave beter framen met deze concurrentie-context — dat is **redesign-werk** (zie [roadmap/backlog.md → Redesign](../roadmap/backlog.md)), geen prijswijziging.

Vs. ChatGPT/handmatig: omslachtig, geen bibliotheek, geen playlist/RAG.

---

## SEO Strategie (Phase I)

URL-structuur ontworpen voor long-tail SEO:
- `/youtube-transcript-extractor`
- `/youtube-to-text`
- `/youtube-captions-download`
- etc. (meerdere `/youtube-*` routes zichtbaar in `src/app/`)

Elk route target een specifiek zoekterm-cluster. Content wordt aangevuld met semantisch relevante FAQ's en voorbeelden.

Zie ook: `marketing.md`

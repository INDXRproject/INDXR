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

INDXR is bewust **niet gratis**: de 5 gratis credits testen de bereidheid om te betalen. Gebruikers die waarde zien kopen een pakket.

De target CPE (cost per extraction) voor de gebruiker:
- Gratis (captions): €0
- Basic pakket: ~€0.077/credit ≈ €0.077 per 10-minuten video
- Vs. ChatGPT transcriptie: handmatig, omslachtig, geen bibliotheekfunctie

---

## SEO Strategie (Phase I)

URL-structuur ontworpen voor long-tail SEO:
- `/youtube-transcript-extractor`
- `/youtube-to-text`
- `/youtube-captions-download`
- etc. (meerdere `/youtube-*` routes zichtbaar in `src/app/`)

Elk route target een specifiek zoekterm-cluster. Content wordt aangevuld met semantisch relevante FAQ's en voorbeelden.

Zie ook: `marketing.md`

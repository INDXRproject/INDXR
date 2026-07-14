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

INDXR's AI-transcriptie kost **€0,050/min (Try) → €0,020/min (Power)** — 1 credit/min bij ronde prijzen ([ADR-058](../decisions/058-round-prices-card-layout-rag.md)), dus per-minuut = prijs-per-credit per tier.

| Aanbieder | Prijs/min | Model | Type |
|-----------|-----------|-------|------|
| **INDXR** | **€0,050 → €0,020** | Pay-per-use, credits verlopen nooit | GUI + RAG + playlist + gratis captions |
| Rev / Temi | ~$0,25/min | Pay-per-use | UI-transcriptie |
| Sonix (pay-as-you-go) | ~$10/uur ≈ $0,167/min | PAYG | UI-transcriptie |
| Sonix (abonnement) | ~$5/uur ≈ $0,083/min | Maandcommitment | UI-transcriptie |
| Happy Scribe | ~€0,20/min | Pay-per-use / sub | UI-transcriptie |
| Descript / Otter / Notta | maandabonnement (uren vervallen) | Maandcommitment | UI-transcriptie |
| Deepgram (kale API) | ~$0,0043/min | PAYG | API, geen GUI |

**Conclusie (herzien 2026-07-14 — vervangt "prijs niet verlagen, presentatie-vraag"):**

INDXR positioneert als **de flexibele, eerlijke tussenweg**:

- **Goedkoper dan de GUI-concurrenten.** Zelfs de goedkoopste tier — **Power, €0,020/min** — blijft **~6,6× onder Sonix** (PAYG) en **~10× onder Rev**. Tegen Rev/Temi/Happy Scribe zit INDXR structureel 5–15× lager, mét GUI, RAG-export, playlist-batch, gratis caption-extractie en bibliotheek.
- **Flexibeler dan de abonnementen** (Otter/Notta/Descript): **niets vervalt** en er is **geen maandcommitment**. Je koopt credits eenmalig en gebruikt ze wanneer je wil.

**Never-expire + pay-per-use = premie-rechtvaardiging, geen korting.** Flexibiliteit wordt in de markt *apart beprijsd*: **Sonix rekent zelf een 2× premie voor pay-as-you-go** ($10/uur PAYG vs. $5/uur op abonnement). Dat is marktbewijs dat "gebruik wanneer je wil, geen commitment" een betaalbare eigenschap is — geen weggevertje. INDXR levert díe flexibiliteit (nooit-verval + geen maandkosten) én blijft ver onder de GUI-concurrenten. De nooit-verval-belofte is dus een **waarde-premie die we mogen claimen**, niet iets waarvoor we moeten afprijzen.

- INDXR is duurder dan kale API's/self-hosted (Deepgram) — die missen GUI, RAG-export, playlist-batch, gratis captions en bibliotheek. Bewuste waarde-premie.

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

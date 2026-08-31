# Positionering

## Wat INDXR doet

INDXR.AI maakt van audio, video en YouTube-links **accurate, van sprekerlabels voorziene transcripten** die je kunt bewerken, doorzoeken, samenvatten en exporteren. Je uploadt een opname of plakt een link; INDXR levert een schoon transcript in je bibliotheek.

Het **betaalde AI-transcriptieproduct** (uploads en AI-transcriptie, 1 credit/minuut) draagt de positionering. Gratis caption-extractie uit YouTube-video's die al ondertitels hebben blijft bestaan, maar is een **funnel/instap, geen kernbelofte** — die markt is een gratis-markt (keyword-meting: `youtube transcript` competition-index 3–9, top-10 vol "Free"). Zie [ADR-102](../decisions/102-transcription-first-homepage-positioning.md).

**Core use cases:**
- Onderzoekers die interviews en bronmateriaal transcriberen en citeren (sprekerlabels + tijdstempels)
- Mensen met eigen opnames (voice memo's, M4A/WAV, videobestanden) die accurate tekst willen
- Studenten die lange lectures willen lezen en samenvatten
- Content creators die ondertitels (SRT/VTT) of herbruikbare tekst uit hun video's willen

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

## SEO Strategie — long-tail, niet merkpositionering

De `youtube-*`-artikelen (live onder `/articles/youtube-*`: `youtube-transcript-not-available`, `youtube-playlist-transcript`, `youtube-to-notes`, `youtube-video-summarizer`, `youtube-transcript-non-english`, e.a.) bedienen elk een **specifieke long-tail-zoekintentie**. Ze zijn een acquisitiekanaal, geen identiteit.

**Belangrijk (ADR-102):** deze routes **dragen niet de merkpositionering**. De generieke YouTube-transcript-kop (`youtube transcript`, `youtube transcript extractor`) is een gratis-markt (competition-index 3–9, top-10 vol "Free") en botst met de live betaalde Ads-campagne, die op audio/video-upload-termen biedt. De **homepage draagt het betaalde transcriptieproduct** (audio + video + YouTube); de `/youtube-*`-artikelen blijven bestaan als long-tail-funnel maar bepalen niet wat het merk *is*. De oude framing (site = "YouTube Transcript Extractor") is achterhaald — dat was ook de SERP-/AI-Overview-misbranding die ADR-102 corrigeert.

Content per route wordt aangevuld met semantisch relevante FAQ's en voorbeelden. Bron voor de marktcijfers: [keyword-demand-2026-08.md](keyword-demand-2026-08.md).

Zie ook: `marketing.md`, [ADR-102](../decisions/102-transcription-first-homepage-positioning.md)

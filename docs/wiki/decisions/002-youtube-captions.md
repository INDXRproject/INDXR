# Beslissing 002: YouTube Captions-First, Whisper als Fallback

**Status:** Geaccepteerd  
**Datum:** 2025-03  
**Gerelateerde code:** `backend/main.py`, `backend/youtube_client.py`, `backend/audio_utils.py`

---

## Context

Om een YouTube-transcript te leveren zijn er twee fundamentele aanpakken:

1. **YouTube's eigen captions ophalen** — de ondertitels die YouTube al heeft (automatisch of handmatig)
2. **Audio downloaden en transcriberen** — zelf Whisper/AssemblyAI aanroepen op de ruwe audio

De keuze heeft grote impact op snelheid, kosten, accuratesse en het credit-model.

---

## Beslissing

**Captions-first:** Probeer altijd eerst YouTube's ingebouwde captions op te halen via yt-dlp.

Alleen als er geen captions beschikbaar zijn, valt het systeem terug op audio-transcriptie via AssemblyAI.

Volgorde van captions voorkeur:
1. Handmatige captions in de aangevraagde taal
2. Auto-generated captions in de aangevraagde taal
3. Handmatige captions in het Engels als fallback
4. Auto-generated captions in het Engels als fallback

---

## Rationale

**Waarom captions-first?**

| Factor | Captions | Whisper/AssemblyAI |
|--------|----------|--------------------|
| Snelheid | ~1-3 seconden | 30s–5 minuten |
| Kosten | Gratis | €0.0001–0.002/min |
| Accuratesse | Hoog (handmatig) of redelijk (auto) | Hoog, maar hallucinaties mogelijk |
| Timestamps | Altijd aanwezig | Afhankelijk van model |
| Taalondersteuning | Wat YouTube heeft | Breed (Whisper: 99+ talen) |

Voor 90%+ van populaire YouTube-video's zijn er captions beschikbaar. Captions zijn sneller, goedkoper, en hebben betere timestamps.

**Waarom niet altijd Whisper?**
- AssemblyAI kost credits (geld); captions zijn gratis voor ons
- Verwerktijd van 3 minuten vs. 1 seconde is een dealbreaker voor UX
- Creators hebben al transcript-energie gestoken in hun captions; die respecteren we

**VTT overlap-deduplicatie:**
YouTube VTT captions hebben een bekende quirk: opeenvolgende segmenten overlappen elkaar. De backend heeft een custom LCS (Longest Common Substring) algoritme om dubbele tekst te verwijderen (`backend/main.py:212-261`). Dit is geen bug in yt-dlp maar in het VTT-formaat zelf.

---

## Consequenties

**Voordelen:**
- Gratis en razendsnelle extractie voor de meeste video's
- Credits worden alleen verbruikt voor audio-transcriptie (niet voor caption-extractie)
- Betere UX: meeste extractions klaar binnen seconden

**Trade-offs:**
- Video's zonder captions vereisen audio-transcriptie (trage fallback)
- Auto-generated captions kunnen fouten bevatten bij complexe terminologie
- Members-only video's geven geen captions terug → `MembersOnlyVideoError` (`backend/audio_utils.py`)

**Niet-voor-de-hand-liggend:**
- Caption-extractie kost geen credits; audio-transcriptie kost wel credits (1 per 10 minuten)
- Captions worden opgeslagen als JSONB met `{text, offset, duration}` per segment

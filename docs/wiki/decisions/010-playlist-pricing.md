# Beslissing 010: Playlist Pricing — Per-Video, Eerste 3 Gratis, Geen Dubbele Rekening

**Status:** Geaccepteerd (pending implementatie)
**Datum:** 2026-04-14
**Gerelateerde code:** `backend/main.py` (playlist job), `src/app/(dashboard)/dashboard/components/PlaylistTab.tsx`

---

## Context

Playlist-extractie is INDXR.AI's primaire premium differentiator. Het prijsmodel moest concurrerend, begrijpelijk, en fair zijn. Drie beslissingen zijn hieronder samengevoegd.

---

## Beslissing 1: 1 credit per playlist-video (captions)

Playlist auto-captions kosten **1 credit per video**, ongeacht videoduur.

**Concurrent benchmark:**
| Tool | Model |
|------|-------|
| TubeText | 1 credit/video |
| DownloadYouTubeTranscripts | 1 credit/video |
| YouTube-Transcript.io | 1 token/video |

**Waarom per video (niet per minuut voor captions):**
- Gebruikers denken in video's ("ik heb 47 video's"), niet in minuten
- Caption-extractie kost vrijwel hetzelfde ongeacht videoduur (één API-call)
- Per-minuut pricing voor captions zou verwarrend zijn naast de per-minuut pricing voor AI-transcriptie ("waarom kost een caption hetzelfde als AI-transcriptie?")
- Afgewezen alternatief: captions ook gratis in playlists → afgewezen omdat dit de primaire conversiedriver wegneemt

---

## Beslissing 2: Eerste 3 playlist-video's altijd gratis

De eerste 3 video's van elke playlist-extractie zijn gratis (auto-captions, automatisch geselecteerd, gelabeld "FREE" in UI).

**Rationale:**
- Demonstreert de playlist-feature vóórdat de gebruiker credits uitgeeft
- "Process first, gate the rest" — pattern dat 15–25% conversie genereert bij batch-operaties
- 3 is genoeg om te bewijzen dat de tool werkt, te weinig om de use case te vervullen

**Abuse-preventie:** De 3-gratis-per-playlist-extractie is per playlist-URL (niet per sessie of account lifetime). Een gebruiker kan niet dezelfde playlist opnieuw starten om steeds 3 gratis video's te krijgen.

---

## Beslissing 3: Geen dubbele rekening bij AI-transcriptie in playlists

Als een playlist-video geen captions heeft en AI-transcriptie nodig heeft, betaalt de gebruiker **alleen het AI-transcriptie tarief** (1 credit/minuut). De "1 credit per video voor captions" geldt niet bovenop — er zijn immers geen captions om te extraheren.

**Voorbeeld — gemengde playlist (20 video's, 15 captions + 5 AI, gem. 12 min):**
- 3 video's: GRATIS (eerste 3 altijd gratis)
- 12 caption-video's: 12 × 1 = 12 credits
- 5 AI-transcriptie video's: 5 × 12 = 60 credits
- **Totaal: 72 credits**

---

## Consequenties

**Implementatie vereist:**
- [ ] Backend: credit-deductie per playlist-video na de eerste 3 vrije video's
- [ ] Frontend: "FREE" label op eerste 3 video's in playlist UI
- [ ] Credit-kosten-preview: toon totale kosten vóór extractie start
- [ ] Logica: verifieer dat AI-transcriptie-video's niet dubbel worden afgetrokken
- [ ] Anonieme gebruikers: playlist metadata zien maar niet kunnen extraheren — zie ADR-017

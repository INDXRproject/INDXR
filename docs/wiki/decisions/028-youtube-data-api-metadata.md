# Beslissing 028: YouTube Data API voor metadata-aanvulling cascade stap 1

**Status:** Geaccepteerd  
**Datum:** 2026-04-28  
**Gerelateerde code:** `backend/youtube_client.py`, `backend/main.py`, `backend/worker.py`

---

## Context

Cascade stap 1 (`extract_via_youtube_transcript_api` in `youtube_utils.py`) retourneert alleen `{transcript, language, model}`. De youtube-transcript-api biedt geen video-metadata (titel, kanaal, duur, uploaddatum).

Vóór deze fix bouwde `main.py /api/extract/youtube` de `ExtractResponse` direct met `result['title']` en `result['video_url']` na een stap 1 succes — dit gaf een `KeyError: 'title'` in productie. Zelfde probleem in `worker.py _process_caption_video()`, stiller: viel terug op `video_id` als titel.

Drie oplossingen overwogen:

| Optie | Beschrijving | Afgewezen omdat |
|-------|-------------|-----------------|
| A | `.get()` met lege defaults | Slechte UX: lege titels in de app |
| B | Extra yt-dlp metadata-call na stap 1 | Ondermijnt het lichte karakter van stap 1 (hele yt-dlp stack laden voor alleen metadata) |
| C | YouTube Data API `videos.list` call | Licht (1 quota-unit), retourneert volledige metadata, client bestond al |

Optie C gekozen.

---

## Beslissing

Na een succesvolle cascade stap 1 wordt `youtube_client.get_video_details(video_id)` aangeroepen (bestaande `YouTubeClient` klasse in `youtube_client.py`). Dit vult het result-dict aan met `title`, `video_url`, `duration`, `channel`, en `upload_date`.

Bij elke failure van de metadata-fetch (quota, netwerk, video niet gevonden):
- Log `WARNING` met prefix `[YT-DATA-API quota exceeded]` bij HTTP 403/quotaExceeded
- Log `WARNING` met prefix `[YT-DATA-API metadata fetch failed]` bij overige fouten
- Gooi stap 1 weg en val door naar stap 2 (yt-dlp) — geen partiële response

Stap 2 (yt-dlp) bevat metadata van nature en wordt niet aangeraakt door deze wijziging.

De `title_str = extract_result.get('title') or video_id` fallback in `worker.py` wordt behouden als laatste vangnet (defense-in-depth; wordt in de praktijk niet bereikt wanneer stap 2 draait).

---

## Quota-bewustzijn

- **10.000 units/dag** default per Google Cloud project (gratis)
- `videos.list` = **1 unit per call**
- `get_playlist_items()` (bestaande code in `youtube_client.py`) batcheert al: 1 call per 50 video IDs via `id=",".join(video_ids)`. Dit is de huidige implementatie voor de playlist-flow — geen toekomstige optimalisatie.
- Voor single-video extractie (deze fix): 1 call per extractie
- Monitoring-thresholds: bij >5.000 units/dag → quota-verhoging aanvragen; bij >8.000 → aanvraag urgent
- Quota-verhoging is gratis aan te vragen bij Google (doorlooptijd 1–6 weken)

---

## Verboden paden

Multi-project quota-sharding is een ToS-violation. Letterlijk uit de [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies-guide):

> "Services using the API must not attempt to circumvent YouTube's restrictions, violate content policies, or abuse API quota through methods like sharding, or by using multiple Google Cloud projects for the same service."

Risico: account-termination van het Google-account gekoppeld aan Contact@indxr.ai.

Wél toegestaan (zelfde bron):

> "An application's developer team is allowed to have separate API keys for test, dev, and prod environments."

Conclusie: aparte API-keys per omgeving (dev/staging/prod) zijn toegestaan zolang het dezelfde service betreft. Aparte projecten voor het opknippen van quota zijn dat niet.

---

## Consequenties

- Bug opgelost: geen `KeyError: 'title'` meer bij cascade stap 1 succes
- Bij quota-uitputting: stap 1 wordt volledig weggegooid → stap 2 (yt-dlp) draait → zelfde UX, langzamere extractie
- Fallback-gedrag monitoren via `[YT-DATA-API quota exceeded]` in Railway logs / Sentry
- Bij structurele quota-uitputting (>5k extracties/dag): quota-verhoging aanvragen bij Google

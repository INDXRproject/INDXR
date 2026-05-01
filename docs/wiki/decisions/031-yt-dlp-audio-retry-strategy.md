# Beslissing 031: yt-dlp audio retry-strategie met session-rotatie

**Status:** Geaccepteerd  
**Datum:** 2026-05-01  
**Gerelateerde code:** `backend/audio_utils.py` (`extract_youtube_audio`), `backend/transcription_pipeline.py` (`do_assemblyai_transcription`, `_classify_download_error`)

---

## Context

Op productie faalt een merkbaar percentage van AI-transcripties van lange video's (>60 min) met:

```
Failed to extract audio from YouTube: ERROR: [download] Got error:
8386313 bytes read, 2025336 more expected
```

Concreet reproductiegeval: Joe Rogan podcast (Rxmw9eizOAo), 166 minuten, ~150 MB Opus audio via Decodo residentieel.

### Oorzaak-analyse

**Root cause 1 — keyword-mismatch:** `audio_utils.extract_youtube_audio` had een 3-attempt retry-loop, maar die triggerde alleen op `timeout`/`ssl` keywords. De string `"bytes read, ... more expected"` matcht op geen van beide → `else: break` → faal na 1 poging.

**Root cause 2 — geen session-rotatie:** Zelfs als de retry getriggerd had, zou hij hetzelfde Decodo sticky session-ID hergebruiken. Dat pinned naar hetzelfde residentiële exit-IP dat al offline is gegaan. yt-dlp's interne `continuedl` (range request `bytes=N-`) faalt op dat IP: YouTube CDN-URLs zijn IP-locked. Zelfde dood IP → zelfde failure.

### yt-dlp interne retries helpen niet

yt-dlp's `RetryManager` probeert tot `retries=10` keer te hervatten. Met een dood proxy-IP zijn dit 10 identieke failures (elke poging dezelfde ~30s timeout). De Python-exception `"N bytes read, M more expected"` wordt pas geraised **nadat** alle interne retries zijn uitgeput.

**Bronnen:** yt-dlp/yt-dlp Issue #12396 (traceback-analyse), Ubuntu/Arch yt-dlp manpages.

### fragment_retries niet van toepassing

`fragment_retries` triggert alleen voor gesegmenteerde formats (HLS, DASH, ISM). Opus audio (`format=bestaudio/best`) is een single HTTP stream — fragment_retries is niet relevant voor dit faaltype.

**Bron:** yt-dlp/yt-dlp Issue #12396; DeepWiki fragment-downloader documentatie.

---

## Beslissing

Twee gelijktijdige fixes in `extract_youtube_audio`:

### Fix A — Keyword-uitbreiding

`'bytes read'`, `'more expected'`, `'incomplete read'`, `'content-length'` toegevoegd aan de retry-condition naast de bestaande `timeout`/`ssl` keywords. De partial-write error triggert nu de outer retry-loop.

### Fix B — Session-rotatie per attempt

De caller (`transcription_pipeline.py`) bouwt een lijst van proxy-URLs met unieke session-IDs per attempt:

```python
proxy_urls = [
    get_proxy_url(session_id=f"{proxy_session_id}-r{i}")
    for i in range(1, 4)
]
```

`extract_youtube_audio` accepteert `proxy_urls: list | None` en pikt `proxy_urls[attempt-1]` op voor elke attempt. Dit geeft attempt 2 een ander residentieel exit-IP dan attempt 1 (`{base}-r1` vs `{base}-r2` → ander Decodo-IP).

Partial files worden al vóór elke attempt opgeruimd → yt-dlp probeert niet via `continuedl` te hervatten met een dood IP.

### Fix C — yt-dlp `retries=3`

Teruggebracht van de default 10 naar 3. Op een dood proxy-IP zijn 10 interne retries pure tijdverspilling (~5 minuten). 3 is voldoende voor echte transient packet-loss. Dit laat de outer retry sneller vuren met een vers IP.

---

## Rationale

| Optie | Beoordeling |
|-------|-------------|
| Alleen keyword fix | Onvoldoende — retry met zelfde dood IP faalt opnieuw |
| Alleen session-rotatie | Onvoldoende — zonder keyword match triggert retry nooit |
| `fragment_retries` verhogen | Niet van toepassing — geen gesegmenteerde stream |
| `continuedl=False` instellen | Overbodig — cleanup van partial files geeft zelfde effect |
| Beide fixes gecombineerd | ✅ Correct — retry triggert én gebruikt vers IP |

### Worst-case tijdsduur

3 attempts × (yt-dlp internal retries 3× ~10s + 2^attempt delay) ≈ 3 × (30s + 4s) ≈ 2 minuten worst-case voor een 150MB download die altijd faalt. Acceptabel voor de use case. Frontend toont "AI transcription in progress" en pollt elke 3s — user ziet geen timeout.

---

## Consequenties

**Voordelen:**
- Partial-write fouten op lange video's worden automatisch hersteld via een vers residentieel IP
- Backward-compat: bestaande callers met `proxy_url=url` blijven werken (proxy_urls=None)
- `partial_write` als nieuw error-type in `_classify_download_error` geeft betere observability als alle retries falen

**Risico's:**
- Proxy-kosten bij retry: een 150MB download die op 18% faalt kost ~27MB extra per retry. Bij 3 attempts en consistent failure: ~81MB extra proxy-traffic. Acceptabel gegeven de alternatieve refund-kosten.
- Als Decodo zelf problemen heeft (geen beschikbare IPs voor nieuwe sessies), falen alle 3 attempts.

**Niet gewijzigd:**
- `fragment_retries` — niet relevant
- Frontend — geen UI-wijzigingen
- Heartbeat-interval — heartbeat loopt door tijdens retries

# Investigatie: yt-dlp partial-write fouten op lange audio downloads

**Datum:** 2026-05-01  
**Video:** Joe Rogan podcast (Rxmw9eizOAo), 166 min, ~150 MB Opus audio  
**Error:** `Failed to extract audio from YouTube: ERROR: [download] Got error: 8386313 bytes read, 2025336 more expected`

---

## Stap 1 — Root cause

### Waar het misgaat in de code

`audio_utils.py:186–194`:

```python
is_timeout = any(kw in error_str for kw in ('timed out', 'timeout', 'read timeout', 'connectionpool'))
is_ssl_error = any(kw in error_str for kw in ('ssl', 'unexpected_eof', 'eof', 'connectionreset', 'remotedisconnected'))
if (is_timeout or is_ssl_error) and attempt < max_attempts:
    ...
else:
    break  # ← geraak hier direct, na 1 poging
```

De error string `"8386313 bytes read, 2025336 more expected"` bevat **geen** van de keywords. Dus: `is_timeout=False`, `is_ssl_error=False` → `else: break` → faal na poging 1. De 3-attempt retry-loop bestaat al maar triggert nooit voor dit faaltype.

### Wat yt-dlp intern doet

yt-dlp's `FileDownloader` (in `http.py`) heeft een interne `RetryManager` met `retries=10` (default). Voor content-length mismatches probeert yt-dlp tot 10x te hervatten via `continuedl` (range request vanaf laatste byte). De Python-exception `"N bytes read, M more expected"` wordt pas geraised **nadat alle 10 interne retries zijn uitgeput**.

**Bron:** yt-dlp/yt-dlp Issue #12396 (traceback-analyse); Ubuntu manpage (`--retries` default=10, `--extractor-retries` default=3)

### Waarom yt-dlp's interne retries niet helpen

Alle 10 interne retries gebruiken **hetzelfde proxy exit-IP** (sticky session `video_id[-8:]`). Als dat residentiële IP offline gaat halverwege de download, mislukken alle 10 resume-pogingen met hetzelfde netwerkprobleem. yt-dlp's `continuedl` stuurt range-request `bytes=N-` naar de CDN-URL, maar YouTube CDN-URLs zijn IP-locked — een range request van een ander IP geeft 403.

**Bron:** Oxylabs YouTube/yt-dlp proxy guide; Medium yt-dlp proxy scaling guide

### Waarom de bestaande outer retry ook niet zou werken

Zelfs als het keyword wél matchte: de huidige retry gebruikt `proxy_url` — een vaste URL met hetzelfde session-ID. Zelfde dode Decodo residentieel IP → zelfde failure.

---

## Stap 2 — Beslissing

**Gekozen: Pad 1 + Pad 3 combinatie** (conform verwachting spec, onderbouwd):

### Fix A — Keyword-uitbreiding (noodzakelijk)

`'bytes read'` en `'more expected'` toevoegen aan retry-condition. Zonder dit triggert de outer retry nooit voor partial-write fouten.

### Fix B — Session-rotatie per attempt (noodzakelijk)

Per retry-poging een vers Decodo session-ID gebruiken (`{base_sid}-r{attempt}`). Dit geeft een ander residentieel exit-IP. Het nieuwe IP is niet IP-locked door de vorige download, dus de download start schoon opnieuw.

De cleanup van partial files vóór elke attempt (al aanwezig in code) zorgt dat yt-dlp **niet** via `continuedl` probeert te hervatten (geen `.part` file aanwezig → fresh start).

### Fix C — yt-dlp `retries=3` (efficiëntie)

Default is `retries=10`. Op een dood proxy-IP zijn 10 interne retries pure tijdverspilling (elk duurt ~30s timeout). Terugbrengen naar 3 laat de outer retry sneller vuren met een vers IP.

### Verworpen alternatieven

- **`nocontinue=True`** in ydl_opts: onnodig — file cleanup vóór elke attempt verwijdert al eventuele `.part` files, yt-dlp vindt niets om te hervatten.
- **`fragment_retries`**: niet van toepassing — Opus audio is een single HTTP stream (geen HLS/DASH), `fragment_retries` triggert alleen voor gesegmenteerde formats. **Bron:** yt-dlp/yt-dlp Issue #12396; DeepWiki fragment-downloader documentatie.
- **`continuedl` met zelfde proxy**: werkt niet (CDN IP-lock, zie boven).
- **Geen session-rotatie**: ineffectief — retrying op zelfde dood IP is zinloos.

---

## Stap 3 — Implementatie

Zie:
- `backend/audio_utils.py` — `extract_youtube_audio()`: keyword-fix + `proxy_urls` param + `retries=3`
- `backend/transcription_pipeline.py` — bouwt `proxy_urls` lijst + roept `extract_youtube_audio(proxy_urls=...)` aan
- `backend/transcription_pipeline.py` — `_classify_download_error()`: voegt `partial_write` classificatie toe

**Backward compat:** bestaande callers die `proxy_url=url` doorgeven blijven werken; `proxy_urls=None` is default.

---

*Verwijder dit document na merge van de fix.*

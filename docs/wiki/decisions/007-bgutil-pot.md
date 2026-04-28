# Beslissing 007: bgutil-pot Rust Binary voor YouTube PO Tokens

> **Superseded by [ADR-027](027-bgutil-deprioritization.md) — 2026-04-28.** bgutil-pot verwijderd uit de codebase. Zie ADR-027 voor de reden en de architectuurles.

**Status:** Geaccepteerd (gesuperseded)  
**Datum:** 2025-03 (geïntroduceerd als fix voor YouTube 403 errors)  
**Gerelateerde code:** `backend/main.py:69-94`, `backend/bin/bgutil-pot-linux-x86_64`, `backend/Dockerfile`

---

## Context

YouTube heeft in 2024 een nieuw bot-protection mechanisme geïntroduceerd: **Proof of Origin (PO) tokens**. Zonder een geldig PO token weigert YouTube audio/video downloads met 403-fouten. Dit brak de yt-dlp extractie-pipeline.

yt-dlp heeft een ingebouwde oplossing via `yt-dlp-get-pot` met een JavaScript/Deno-gebaseerde plugin. Dit had nadelen.

---

## Beslissing

Een **voorgecompileerde Rust binary** (`bgutil-pot`) draaien als lokale HTTP server op poort `127.0.0.1:4416`. yt-dlp communiceert met deze server om PO tokens te genereren zonder Deno/Node runtime.

De binary wordt:
- Gebundeld in de Docker image via `backend/Dockerfile`
- Geïnstalleerd als `/usr/local/bin/bgutil-pot`
- Gestart als subprocess bij FastAPI startup (`main.py:69-94`)
- Bewaakt via socket-probe zodat slechts één uvicorn worker de server start

Start-logica:
```python
def _start_bgutil_server() -> None:
    try:
        with _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM) as _s:
            _s.bind(('127.0.0.1', 4416))  # bind lukt alleen als poort vrij is
    except OSError:
        return  # al gestart door andere worker
    _subprocess.Popen(
        ['/usr/local/bin/bgutil-pot', 'server', '--host', '127.0.0.1', '--port', '4416'],
        stdout=_subprocess.DEVNULL,
        stderr=_subprocess.DEVNULL,
    )
```

---

## Rationale

**Waarom niet de Deno-gebaseerde yt-dlp plugin?**

| Factor | Deno plugin | bgutil-pot Rust |
|--------|-------------|-----------------|
| Runtime | Deno (Node-achtig) vereist | Geen runtime nodig |
| Startup tijd | Traag (Deno cold start) | Instant |
| Docker grootte | +Deno install (~100MB) | Kleine binary (~5MB) |
| Betrouwbaarheid | Soms instabiel in productie | Stabiel |
| Onderhoud | yt-dlp plugin updates | Binary updates |

De Rust binary is sneller, kleiner, en stabieler dan de JavaScript alternatief. In een Docker container is het vermijden van een extra runtime (Deno/Node naast de bestaande Node voor npm tools) een significante vereenvoudiging.

**Waarom poort 4416?**
Conventie van het bgutil-pot project zelf; geen speciale reden.

**Waarom socket-probe voor multi-worker guard?**
uvicorn start meerdere worker-processen. Zonder guard zou elke worker proberen bgutil-pot te starten, wat port-conflicts geeft. De socket-probe (probeer te binden aan 127.0.0.1:4416) slaagt alleen voor de eerste worker.

---

## Consequenties

**Voordelen:**
- YouTube 403 errors opgelost
- Geen extra runtime vereist
- Snelle startup, stabiel in productie

**Trade-offs:**
- Binaire blob in de repository (`backend/bin/`) — niet transparant
- Binary is Linux x86_64 specifiek (werkt niet op macOS/ARM voor local dev zonder aanpassing)
- Update van de binary vereist handmatige download + Docker rebuild
- yt-dlp plugin zip (`bgutil-ytdlp-pot-provider-rs.zip`) ook gebundeld in Dockerfile

**Lokale development:**
Op macOS werkt de Linux binary niet. Voor lokale dev kun je:
1. yt-dlp zonder PO-token gebruiken (werkt voor de meeste video's)
2. Of een macOS variant van bgutil-pot apart installeren
Zie `DEVELOPMENT.md` voor troubleshooting.

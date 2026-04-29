# Beslissing 027: bgutil-pot verwijderd — yt-dlp client-rotatie vervangt PO-token aanpak

**Status:** Geaccepteerd — supersedet [ADR-007](007-bgutil-pot.md)
**Datum:** 2026-04-28
**Gerelateerde code:** `backend/audio_utils.py`, `backend/main.py`, `backend/worker.py`, `backend/Dockerfile`

---

## Context

ADR-007 (2025-03) introduceerde bgutil-pot als oplossing voor YouTube PO token vereisten. Dit was correct gegeven de toenmalige architectuur: een enkele container draaide zowel de FastAPI API als de yt-dlp extractie-logica. bgutil-pot startte als subprocess op de API-container, en yt-dlp in diezelfde container kon het bereiken op `127.0.0.1:4416`.

**De architectuur veranderde daarna ingrijpend.**

ADR-019 (ARQ queue) en ADR-025 (per-video decompositie) splitsten de backend in twee aparte Railway-services: een API-service (`uvicorn main:app`) en een worker-service (`python -m arq worker.WorkerSettings`). Alle zware yt-dlp extractie — het werk waarvoor bgutil ooit bedoeld was — verhuisde naar de worker-container.

bgutil-pot bleef staan op de API-container. Het werd nooit meegenomen naar de worker.

Niemand verifieerde of bgutil correct meeverhuisde naar de nieuwe context. Dit is een klassiek "code rot door externe verandering" patroon: een component functioneert correct in de originele architectuur, maar vervalt tot dead code na een architectuurwijziging die de component niet expliciet aanraakte.

**Empirisch bewijs — 2026-04-28:**

De bgutil health check (geïntroduceerd in commit `8f15892` als `WorkerSettings.on_startup`) toonde direct bij de eerste worker-startup:

```
bgutil-pot health check: NOT reachable on 127.0.0.1:4416 — PO-token fallback unavailable
```

Tegelijkertijd draaide de API-service wél `bgutil-pot server started on 127.0.0.1:4416` — op de verkeerde container.

De Fase 3b.3 productietest (22-video playlist, 18/22 succesvol) voltooide volledig via de iOS yt-dlp client, zonder dat bgutil ooit werd aangeraakt.

---

## Beslissing

bgutil-pot volledig verwijderen uit de codebase, Docker image, en runtime.

**Verwijderd:**
- `backend/bin/bgutil-pot-linux-x86_64` (Rust binary)
- `backend/bin/bgutil-ytdlp-pot-provider-rs.zip` (yt-dlp plugin)
- `_start_bgutil_server()` functie in `backend/main.py`
- `plugin_dirs` en `youtubepot-bgutilhttp` extractor_args in `backend/audio_utils.py`
- Dockerfile COPY- en mkdir-regels voor bgutil
- `DENO_PATH` env var (gerelateerde dode infra — Deno was nooit geïnstalleerd in het Docker image)

**Cascade-stap 3** (uit ADR-007/taak 1.6 planning) wordt opnieuw gedefinieerd als yt-dlp client-rotatie (`tv`, `android`) in plaats van PO-token generatie via bgutil. Geïmplementeerd 2026-04-29: `extract_with_ytdlp(..., clients=['tv', 'android'])`, log-prefix `[YT-DLP-ROT]`, triggered alleen bij stap 2 extraction error.

---

## Rationale

**1. Empirisch: iOS client werkt zonder PO tokens**

De iOS yt-dlp player client bypasses PO token vereisten volledig. Productie draait al maanden stabiel zonder dat bgutil ooit werd bereikt. Er is geen aantoonbare toename in bot-detection failures die aan het ontbreken van PO tokens te wijten is.

**2. Architectuur: split-container maakt bgutil coördinatie onpraktisch**

bgutil correct implementeren in de huidige architectuur vereist een van:
- bgutil op de worker-container starten (tweede subprocess, tweede socket-probe)
- bgutil als aparte Railway-service (inter-container HTTP calls, extra deployment complexity)

Beide opties introduceren significant meer complexiteit voor een mechanisme dat empirisch niet nodig is gebleken.

**3. Lange termijn: minder externe afhankelijkheden**

yt-dlp's ingebouwde client-rotatie (`ios`, `web_embedded`, `tv`, `android`) wordt actief onderhouden door de yt-dlp maintainers en adapteert automatisch aan YouTube-wijzigingen. bgutil is een externe Rust binary die handmatig bijgewerkt moet worden.

---

## Consequenties

**Voordelen:**
- Simpelere Docker image (geen binary blob)
- Geen inter-container coördinatie voor PO tokens
- Minder externe afhankelijkheden
- Kleinere image-size → snellere Railway deploys

**Trade-offs:**
- Als YouTube alle non-PO yt-dlp clients tegelijk blokkeert, is cascade-stap 4 (audio→AssemblyAI) de enige structurele fallback. Dit scenario is historisch zeldzaam.

**Open deur:**
Als productie-data in de toekomst aantoont dat PO tokens noodzakelijk zijn, kan bgutil worden herintroduceerd — maar dan bewust en correct: geïnstalleerd op de worker-container (waar yt-dlp draait), niet de API-container. De architectuurles van deze ADR is leidend.

**Algemene les:**
Bij elke architectuurwijziging die containers splitst, migreert, of herverdeelt, moeten alle bestaande infra-componenten expliciet geverifieerd worden in de nieuwe context. Componenten die niet aangeraakt worden door een architectuurwijziging zijn de meest risicovolle — ze lijken te werken, maar kunnen ongemerkt dead code zijn geworden.

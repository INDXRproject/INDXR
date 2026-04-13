# Beslissing 008: Polling i.p.v. WebSockets voor Async Jobs

**Status:** Geaccepteerd  
**Datum:** 2025-03 (Phase M/N — vervangt SSE architectuur)  
**Gerelateerde code:** `backend/main.py:1249-1507`, `src/app/api/jobs/[job_id]/route.ts`, `src/app/api/playlist/jobs/[jobId]/route.ts`

---

## Context

Twee operaties in INDXR.AI zijn langlopend en asynchroon:
1. **Whisper audio-transcriptie** — kan 2–10 minuten duren
2. **Playlist-extractie** — meerdere video's parallel, kan lang duren

De frontend moet de voortgang tonen terwijl de backend werkt. Er zijn drie architecturale opties:
- **Polling** — frontend vraagt elke X seconden naar de status
- **Server-Sent Events (SSE)** — server pusht updates naar de client
- **WebSockets** — bidirectionele verbinding

Phase M/N in de roadmap documenteert expliciet de overgang van SSE naar "Whisper Background Job Architecture".

---

## Beslissing

**Polling** gebruiken voor job-status updates.

De backend slaat job-status op in Supabase (`playlist_extraction_jobs` tabel). De frontend pollt:
- `GET /api/jobs/{job_id}` voor transcriptie jobs
- `GET /api/playlist/jobs/{jobId}` voor playlist jobs

Polling interval: ~2 seconden (geïmplementeerd in frontend componenten).

Job-status waarden: `pending` → `processing` → `completed` / `failed`

---

## Rationale

**Waarom polling en niet WebSockets of SSE?**

| Factor | Polling | SSE | WebSockets |
|--------|---------|-----|------------|
| Implementatiecomplexiteit | Laag | Middel | Hoog |
| Railway-compatibiliteit | Uitstekend | Matig (timeout issues) | Vereist ws-support |
| Vercel-compatibiliteit | Uitstekend | Beperkt (30s limit) | Niet ondersteund |
| Job recovery bij browser-refresh | Automatisch (via Supabase) | Verloren | Verloren |
| Schaalbaarheid | Stateless backend | Stateful verbinding | Stateful verbinding |

**Specifieke reden voor de switch van SSE:**
SSE (Server-Sent Events) via Vercel heeft een hard 30-seconden timeout op serverless functions. Audio-transcriptie duurt langer dan 30 seconden, dus SSE brak af voor de job klaar was.

**Job persistence als sleutelvoordeel van polling:**
Bij polling hoeft de frontend alleen het `job_id` te onthouden (opgeslagen in `sessionStorage`). Bij browser-refresh of paginawisseling laadt de frontend opnieuw de job-status op uit Supabase. Dit is onmogelijk met SSE/WebSockets zonder extra persistentielaag.

**Polling is voldoende voor deze use case:**
Gebruikers wachten actief op een transcript; 2-seconden latency op status-updates is acceptabel. Real-time is geen vereiste.

---

## Consequenties

**Voordelen:**
- Eenvoudige implementatie en debugging
- Werkt feilloos op Vercel + Railway (stateless)
- Job recovery na browser-refresh out-of-the-box
- Backend heeft geen open verbindingen te managen

**Trade-offs:**
- Polling genereert meer HTTP requests dan nodig (ook wanneer status niet veranderd)
- 2-seconden latency op status-updates
- Iets hogere database load door polling queries

**Alternatief voor de toekomst:**
Supabase Realtime (PostgreSQL LISTEN/NOTIFY) kan polling vervangen zonder WebSocket complexiteit op de backend. Nog niet geïmplementeerd.

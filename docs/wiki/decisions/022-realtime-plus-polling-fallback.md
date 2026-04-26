# Beslissing 022: Realtime als Primair, Smart Polling als Fallback

**Status:** Geaccepteerd — supersedet ADR-008
**Datum:** 2026-04-26
**Gerelateerde code:** Bestaande polling-endpoints (`src/app/api/jobs/[job_id]/route.ts`, `src/app/api/playlist/jobs/[jobId]/route.ts`) blijven bestaan. Nieuwe Realtime-subscription-laag in frontend (waarschijnlijk `src/hooks/useJobStatus.ts` als nieuwe shared hook).

---

## Context

ADR-008 (maart 2025) koos voor **polling-only** voor async job-status updates. De rationale was correct voor die fase: polling is simpel, Vercel/Railway-vriendelijk, en survives browser-refresh via sessionStorage + Supabase state-fetch. Polling lost ook de Vercel 30-seconden-functietimeout op die SSE onbruikbaar maakte.

Twaalf maanden later zijn er drie nieuwe overwegingen:

1. **Schaalbaarheid.** Elke gepolde request raakt Supabase. Bij vaste 2-3 seconden polling en 100 concurrent users = 33–50 req/sec. Bij 300 concurrent users = 100–150 req/sec — dat raakt Supabase Pro's connection-pool-limieten.
2. **UX-kwaliteit.** Realtime-updates voelen instant (sub-seconde) vergeleken met polling's 1–3 seconden vertraging. Bij een betaald product is dit waarneembaar — vooral voor caption-extractie die in seconden klaar is.
3. **Supabase Realtime is volwassener geworden.** Het Postgres-changes-mechanisme werkt nu betrouwbaar voor tabel-updates, ondersteunt RLS-filtering (gebruikers zien alleen hun eigen jobs), en heeft auto-reconnect logica.

Tegelijk blijft polling waardevol als **fallback voor users achter corporate firewalls** die WebSockets blokkeren (~5–10% van enterprise-users) en voor browser-refresh-recovery.

---

## Beslissing

**Hybride architectuur:**

- **Primair: Supabase Realtime** subscription op `playlist_extraction_jobs` en `transcription_jobs` tabellen
- **Fallback: Smart polling** met backoff-strategie wanneer WebSocket-verbinding faalt of niet beschikbaar is

**Smart polling backoff-curve** (vervangt de vaste 2-seconden interval uit ADR-008):

- 0–30 seconden vanaf jobstart: poll elke **1 seconde** (snel feedback voor caption-extracties die binnen 5–15s klaar zijn)
- 30 seconden – 5 minuten: poll elke **5 seconden** (AssemblyAI-jobs van gemiddelde lengte, user is nog actief in tab)
- > 5 minuten: poll elke **15 seconden** (lange playlist-jobs en 4+ uur videos waar tab vaak op achtergrond is)

Smart polling alleen al levert een 5–10x reductie in requests vs vaste 2s.

**Auto-disconnect Realtime na 5 minuten idle** om Supabase concurrent-connections-limiet te beheren.

---

## Rationale

### Waarom niet Realtime-only

Drie redenen:

1. **Firewall-doorgang:** sommige corporate netwerken blokkeren WebSockets. Polling is gewoon HTTP en passeert overal.
2. **Browser-refresh recovery:** polling herlaadt automatisch via `sessionStorage` + Supabase state-fetch (gedocumenteerd in `architecture/playlist-engine.md`). Realtime alleen vereist extra reconnect-logica.
3. **Defense-in-depth:** als Supabase Realtime een incident heeft, valt UX terug op polling in plaats van te breken. Realtime is jonger en heeft meer outage-historie dan plain HTTP polling.

### Waarom niet polling-only blijven

Twee redenen:

1. **UX-kwaliteit.** Instant updates voor playlist-progress en transcriptie-status zijn merkbaar premium. Voor caption-extractie (vaak <10s totaal) is een 1-seconden poll echt het verschil tussen "snappy" en "trage app".
2. **Kosten-schaalbaarheid.** Bij 1.000+ concurrent users bespaart Realtime significant op Supabase-querycount. Polling is goedkoop per request maar lineair in users — Realtime push is constanter.

### Waarom de specifieke 1-5-15 backoff curve

Empirisch onderbouwd op verwachte job-duur in INDXR.AI:

- **1s in eerste 30s:** caption-extracties zijn vaak binnen 5–15s klaar; we willen dat moment niet missen.
- **5s tussen 30s en 5min:** AssemblyAI-jobs voor 5–60 minuten video's lopen typisch 1–4 minuten end-to-end; users zijn nog actief in de tab.
- **15s na 5min:** lange playlist-jobs (tientallen video's) en 4+ uur video transcripties; users hebben de tab vaak op de achtergrond, ze checken periodiek.

### Waarom smart polling sowieso bouwen, ook met Realtime

Smart polling is **permanent onderdeel van de architectuur**, niet tijdelijk:

- Fallback voor WebSocket-firewall-issues
- Recovery na browser-refresh (Realtime moet opnieuw subscriben, polling pakt direct op)
- Robuust in geval van Supabase Realtime incidents
- Werk dat ooit verricht wordt, blijft waardevol

---

## Architectuur

```
Frontend (React component voor playlist/transcription status):

1. Bij component mount:
   a. Subscribeer op Supabase Realtime: postgres_changes
      filter on (id = job_id) op playlist_extraction_jobs
      of transcription_jobs (afhankelijk van type)
   b. Start parallel smart polling als fallback
2. Realtime event ontvangen → update UI direct, polling wacht volgende interval
3. WebSocket failure of timeout → polling neemt over volledig
4. Component unmount of job complete → unsubscribe Realtime + stop polling
5. Tab-idle > 5 min → unsubscribe Realtime, polling continueert (om Supabase
   connection-budget te sparen). Bij tab-focus terug: re-subscribe.

Backend (FastAPI + ARQ worker — zie ADR-019):

- Worker schrijft naar playlist_extraction_jobs / transcription_jobs tabellen
- Supabase Realtime publiceert automatisch postgres_changes event
- Geen extra backend-werk vereist (Realtime is native in Supabase)
```

---

## Consequenties

**Voordelen:**
- Instant UX bij Realtime-pad
- Robuust met polling-fallback voor edge cases
- Schaalvriendelijk: significant minder Supabase queries bij 100+ concurrent users
- Geen extra backend-infrastructuur — Supabase Realtime is native

**Trade-offs:**
- Frontend-complexiteit: twee parallelle data-paden orchestreren in één hook
- Supabase Realtime free tier: 200 concurrent connections; Pro 500. Boven dat $10 per 1000 — relevant bij schaal maar niet bij launch.
- Auto-disconnect na 5 min idle vereist UX-bewustzijn (reconnect-flow als user terugkomt naar tab)

**Migratie van ADR-008:**
Bestaande polling-endpoints (`GET /api/jobs/{job_id}`, `GET /api/playlist/jobs/{jobId}`) blijven bestaan — Realtime is **toegevoegd**, polling-frequentie wordt aangepast naar smart backoff. Geen breaking change voor de polling-API.

---

## Vervangt

Dit ADR vervangt **ADR-008** ("Polling i.p.v. WebSockets voor Async Jobs"). De rationale van ADR-008 (job persistence via Supabase, Vercel/Railway-vriendelijk, browser-refresh recovery) blijft volledig geldig — Realtime is alleen toegevoegd als primaire methode bovenop polling. ADR-008 blijft historisch leesbaar voor context.
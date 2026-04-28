# Beslissing 025: Per-video decompositie voor playlist-extractie

**Status:** Geaccepteerd
**Datum:** 2026-04-28
**Gerelateerde code:** `backend/main.py` (`run_playlist_job`), `backend/worker.py`, `playlist_extraction_jobs` tabel

---

## Context

De huidige `run_playlist_job` in `backend/main.py` is één monolithische Python-lus die alle video's in een playlist sequentieel verwerkt binnen één asyncio-taak (of straks één ARQ-job). Typische playlist-grootte is 8–40 video's; uitzonderlijk tot ~100.

Dit heeft drie concrete problemen:

1. **Geen partial-completion-recovery.** Bij een crash bij video 25 van 40 is alle context weg. De gebruiker moet de hele playlist opnieuw starten.
2. **Eén failure-point.** Een yt-dlp ban of netwerkfout bij één video stopt de hele batch — ook als de overige 39 video's normaal verwerkt hadden kunnen worden.
3. **Geen clean events voor Realtime.** Een monolithische job produceert weinig tussentijdse state-updates, wat de frontend-ervaring verslechtert (lange periodes zonder feedback).

Dit probleem is library-onafhankelijk. Het doet zich voor of we ARQ, Taskiq, Procrastinate of welke queue-library dan ook gebruiken.

---

## Beslissing

**Playlist-extractie wordt N onafhankelijke video-jobs in een zelf-orchestrerende keten.**

`Supabase.playlist_extraction_jobs` is single source of truth voor alle playlist-state. Elke video-job leest zijn input uit Supabase, verwerkt één video, schrijft het resultaat atomair terug via een Supabase RPC, en enqueued de volgende video-job — totdat de keten klaar is.

De keten wordt opgestart door `POST /api/playlist/extract`:
1. Maakt een `playlist_extraction_jobs` rij aan in Supabase met `status='running'`, `total_videos=N`, `completed_count=0`, `video_results=[]`
2. Enqueued de eerste video-job met deterministisch `_job_id = f"{playlist_id}:0"`
3. Retourneert `job_id` direct aan de frontend

---

## Architectuur

```
POST /api/playlist/extract
    → INSERT playlist_extraction_jobs (status='running', total_videos=N)
    → enqueue process_playlist_video(playlist_id, video_index=0)
       _job_id = "{playlist_id}:0"
    → return {job_id}

process_playlist_video(playlist_id, video_index):
    1. SELECT * FROM playlist_extraction_jobs WHERE id = playlist_id
    2. video_url = job.videos[video_index]
    3. Verwerk video (yt-dlp cascade → captions of Whisper)
    4. RPC: update_playlist_video_result(playlist_id, video_index, result)
       (atomic: JSONB append + increment completed_count)
    5. IF video_index < total_videos - 1:
           enqueue process_playlist_video(playlist_id, video_index + 1)
              _job_id = "{playlist_id}:{video_index + 1}"
       ELSE:
           UPDATE playlist_extraction_jobs SET status='completed'
```

**Sequentialiteit:** video's worden één voor één verwerkt (niet parallel). Dit respecteert YouTube rate-limits en is conform de huidige aanpak. De queue beheert orchestratie en recovery, niet parallellisme.

---

## Rationale

### Per-video isolatie

Max 1 video verloren bij een worker-crash of Railway-restart. De overige N-1 video's zijn al persisteret in Supabase en gaan niet verloren.

### Restart-safe

Bij een Railway SIGTERM midden in video 12: video 12 moet opnieuw (na Fase 4 met `ack_late=True` automatisch; in Fase 2–3 handmatig hervat via re-enqueue). Video's 0–11 zijn safe in Supabase. Na restart gaat de keten verder bij video 12.

### Library-onafhankelijk

De per-video architectuur werkt identiek op ARQ, Taskiq, Procrastinate of Celery. De `enqueue()`-call en `_job_id`-parameter zijn de enige library-specifieke onderdelen. Bij een toekomstige library-swap (zie ADR-019 sectie "Migratie-pad") verandert de architectuur niet.

### Aansluiting op ADR-022 Realtime

Elke video-update produceert een `UPDATE` op `playlist_extraction_jobs` (via de RPC). Dit zijn clean `postgres_changes` events die Supabase Realtime kan publiceren naar de frontend. De gebruiker ziet de playlist live bijwerken per video, zonder polling-verbeteringen te hoeven bouwen.

---

## Trade-offs

### Enqueue van volgende video is zelf een failure-point

De `enqueue()` call aan het einde van stap 5 kan falen (Redis tijdelijk niet bereikbaar, netwerk-fout). Dit is het enige point-of-failure in de keten dat buiten Supabase ligt.

**Mitigatie:** korte retry op de `enqueue()` call (3 pogingen, exponential backoff). Als alle retries mislukken: mark de playlist als `failed` in Supabase met error context (`failed_at_video_index`, `error_message`). De gebruiker kan de playlist hervatten — de frontend toont hoeveel video's al verwerkt zijn.

### Deterministische job IDs beperken parallellisme

`_job_id = "{playlist_id}:{video_index}"` garandeert dat dezelfde video niet twee keer tegelijk in de queue staat. Dit is gewenst gedrag voor correctheid, maar betekent ook dat parallelle verwerking van één playlist niet mogelijk is via deze aanpak. Voor onze use case (sequentieel verwerken is vereist) is dit geen beperking.

---

## Verhouding tot ADR-019

ADR-025 beschrijft de **architectuur** (hoe playlist-state wordt gedecomponeerd en orchestreerd). ADR-019 beschrijft het **transport** (ARQ als queue-mechanisme). Beide ADR's zijn nodig: de architectuur is library-onafhankelijk, de transport-keuze is op dit moment ARQ.

Als ARQ in de toekomst wordt vervangen (zie ADR-019 sectie "Post-launch heroverweging"), verandert ADR-025 niet.

## Verhouding tot ADR-022

Per-video decompositie maakt elk video-resultaat een atomaire Supabase-UPDATE. Dit sluit direct aan op ADR-022 (Realtime + smart polling fallback): elke UPDATE produceert een `postgres_changes` event dat Realtime kan doorzetten naar de frontend. De gebruiker ziet de playlist progressie live bijwerken per video, zonder dat de frontend speciale logica nodig heeft.

# Redis/Upstash Usage Audit — Mei 2026

**Datum:** 2026-05-18  
**Scope:** apps/app, apps/marketing, packages/shared, backend/  
**Doel:** Inventarisatie van alle Redis-aanroepen per locatie: wat doet het, hoeveel commands, graceful degradation bij Redis-uitval.

---

## Overzicht env vars

| Var | Gebruikt voor | Aanwezig op |
|-----|---------------|-------------|
| `UPSTASH_REDIS_REST_URL` | REST-client (ratelimit + caption cache) | Vercel (app + marketing), Railway (API) |
| `UPSTASH_REDIS_REST_TOKEN` | REST-client (ratelimit + caption cache) | Vercel (app + marketing), Railway (API) |
| `UPSTASH_REDIS_URL` | TCP-client via ARQ (`redis://` DSN) | Railway (API + worker) |

De REST-vars en de TCP-var verwijzen naar dezelfde Upstash-instantie maar via verschillende protocols.  
Als `UPSTASH_REDIS_REST_URL` / `_TOKEN` ontbreken op Vercel → noopLimiter actief (rate limiting uitgeschakeld).  
Als `UPSTASH_REDIS_URL` ontbreekt op Railway → ARQ pool niet geïnitialiseerd, fallback naar `asyncio.create_task()`.

---

## 1. `packages/shared/src/lib/ratelimit.ts`

**Host:** Vercel marketing + Vercel app (geïmporteerd in beide)

### Initialisatie (regels 7–37)

```
UPSTASH_ENABLED = !!UPSTASH_REDIS_REST_URL && !!UPSTASH_REDIS_REST_TOKEN
```

- **Als `UPSTASH_ENABLED = false`:** `makeLimiter()` retourneert `noopLimiter` — een object dat altijd `{ success: true, limit: 9999, remaining: 9999, reset: 0 }` teruggeeft. **Nul Redis-commands.**
- **Als `UPSTASH_ENABLED = true`:** Per limiter wordt een `Redis` REST-client + `Ratelimit` sliding-window instantie aangemaakt (module-level, bij cold start).

### Limiters

| Naam | Max | Window | Prefix |
|------|-----|--------|--------|
| `anonymous` | 10 req | 24 h | `@upstash/ratelimit:anon` |
| `free` | 50 req | 1 h | `@upstash/ratelimit:free` |
| `login` | 10 req | 15 m | `@upstash/ratelimit:login` |
| `signup` | 5 req | 1 h | `@upstash/ratelimit:signup` |

### `checkRateLimit()` (regels 56–92)

- Premium users: vroeg return, **0 Redis-commands**
- Authenticated free users: `limiters.free.limit(userId)` → **1 EVAL** (sliding window Lua script) + analytics-overhead (`analytics: true`) → **~2–4 commands**
- Anonymous: `limiters.anonymous.limit(ip)` → zelfde

**Bij Redis-fout:** Geen expliciete `try/catch` in deze functie. Exception propagateert naar aanroeper (route handler). Alle route handlers vangen dit op en retourneren 429 of een error-response (zie sectie 3).

---

## 2. `packages/shared/src/actions/auth-actions.ts`

**Host:** Vercel marketing

| Regel | Functie | Actie | Commands | Bij fout |
|-------|---------|-------|----------|---------|
| ~22 | `loginAction()` | `limiters.login.limit(ip)` | ~2–4 | Outer `try/catch` → retourneert `{ error: 'Too many login attempts...' }` |
| ~90 | `signupAction()` | `limiters.signup.limit(ip)` | ~2–4 | Outer `try/catch` → retourneert `{ error: 'Too many signup attempts...' }` |
| ~134 | `loginWithGoogleAction()` | `limiters.login.limit(ip)` | ~2–4 | Outer `try/catch` → redirect met error query param |
| ~213 | `resetPasswordAction()` | `limiters.login.limit(ip)` | ~2–4 | Outer `try/catch` → retourneert error object |

**Opmerking:** `noopLimiter` retourneert altijd `{ success: true }` — bij uitgeschakelde Redis bereiken alle requests de Supabase-calls.

---

## 3. Rate limit checks in API routes

Alle routes importeren `checkRateLimit` uit `packages/shared/src/lib/ratelimit.ts`.

| Bestand | Regel | Host | Commands | Bij Redis-fout |
|---------|-------|------|----------|----------------|
| `apps/marketing/src/app/api/extract/route.ts` | ~47 | Vercel marketing | ~2–4 | Outer `try/catch` → 500 Internal Server Error |
| `apps/app/src/app/api/extract/route.ts` | ~47 | Vercel app | ~2–4 | Outer `try/catch` → 500 Internal Server Error |
| `apps/app/src/app/api/transcribe/preflight/route.ts` | ~49 | Vercel app | ~2–4 | Outer `try/catch` → 500 Internal Server Error |
| `apps/app/src/app/api/transcribe/whisper/route.ts` | ~44 | Vercel app | ~2–4 | Outer `try/catch` → 500 Internal Server Error |
| `apps/app/src/app/api/playlist/extract/route.ts` | ~50 | Vercel app | ~2–4 | Outer `try/catch` → 500 Internal Server Error |

**Aandachtspunt:** Bij een echte Redis-uitval (niet enkel `UPSTASH_ENABLED=false`) retourneren alle bovenstaande routes een **500** in plaats van de extract/transcribe-functionaliteit door te laten. Er is geen fallback naar noopLimiter bij runtime-fouten — alleen bij ontbrekende env vars.

---

## 4. `backend/main.py` — Caption cache (Railway API)

### Lazy init (regels 54–66)

```python
_caption_redis: Optional[UpstashRedis] = None

def get_caption_redis() -> Optional[UpstashRedis]:
    if _caption_redis is None:
        url = os.getenv("UPSTASH_REDIS_REST_URL")
        token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
        if url and token:
            _caption_redis = UpstashRedis(url=url, token=token)
    return _caption_redis  # Returns None if env vars absent
```

`get_caption_redis()` retourneert `None` als de env vars ontbreken → alle cache-operaties worden overgeslagen. Graceful degradation.

### Cache-operations in `/api/extract/youtube` (regels 256–450)

| Actie | Regel | Redis-command | TTL | Commands | Try/catch | Bij fout |
|-------|-------|---------------|-----|----------|-----------|---------|
| Cache read | ~268 | `GET caption:{video_id}` | — | 1 | Ja (regels 267–299) | Warning log → treat as miss, doorval naar cascade |
| Cache evict (malformed) | ~274 | `DEL caption:{video_id}` | — | 1 | Ja (zelfde block) | Warning log → doorval naar cascade |
| Backfill write (master_transcripts hit) | ~345 | `SET caption:{video_id} <json> EX 2592000` | 30d | 1 | Ja (regels 336–347) | `pass` — silent ignore |
| Cache write (cascade succes) | ~423 | `SET caption:{video_id} <json> EX 2592000` | 30d | 1 | Ja (regels 422–427) | Warning log + PostHog event → retourneert toch succes |

**Cache key patroon:** `caption:{video_id}` (taal-agnostisch; taal zit in de waarde).  
**Maximale commands per request:**
- Cache HIT: 1 GET (+ eventueel 1 DEL bij malformed) = **1–2**
- Cache MISS: 1 GET + 1 SET = **2**

### ARQ pool init (regels 119–131)

```python
redis_url = os.getenv("UPSTASH_REDIS_URL")
if redis_url:
    app.state.arq_pool = await create_pool(ArqRedisSettings.from_dsn(redis_url))
else:
    app.state.arq_pool = None
    logger.warning("UPSTASH_REDIS_URL not set — YouTube Whisper falls back to asyncio.create_task")
```

- Bij startup: ARQ doet intern een `PING` + `DEL arq:health:{worker_id}` voor health check — **~2 commands** bij init
- Bij `UPSTASH_REDIS_URL` afwezig: pool = None, geen Redis-contact
- Bij pool-init fout: pool = None (niet gecatcht als exception, maar ARQ `create_pool` kan zelf exception raisen → startup failure)

**Aandachtspunt:** Als `UPSTASH_REDIS_URL` wél aanwezig is maar Redis onbereikbaar → `create_pool()` raiset exception → FastAPI start niet op.

### Whisper job enqueue (regels ~749–765)

```python
arq_pool = request.app.state.arq_pool
if arq_pool:
    await arq_pool.enqueue_job('run_whisper_job', job_id=job_id, ...)
    # Commands: ZADD arq:queued + HSET arq:job:{job_id} = ~2–3 commands
else:
    asyncio.create_task(do_assemblyai_transcription(...))  # Geen Redis
```

- Met pool: **~2–3 commands**
- Zonder pool: **0 commands**, fallback naar AssemblyAI via asyncio.create_task

### Playlist job enqueue (regels ~1035–1045)

```python
arq_pool = http_request.app.state.arq_pool
if arq_pool:
    await arq_pool.enqueue_job('process_playlist_video', ...)  # ~2–3 commands
else:
    raise HTTPException(503, "Queue not available")  # Hard error, geen fallback
```

**Aandachtspunt:** Playlist enqueue heeft géén fallback — bij ontbrekende of uitgevallen ARQ-pool retourneert het **503**. Dit is by design (playlists zijn ARQ-only), maar het verschilt van het Whisper-gedrag dat wél een asyncio-fallback heeft.

---

## 5. `backend/worker.py` — ARQ Worker (Railway worker)

**Host:** Railway worker process

### WorkerSettings (regels 992–1019)

```python
redis_settings = RedisSettings.from_dsn(
    os.getenv("UPSTASH_REDIS_URL") or "redis://localhost:6379"
)
```

Fallback naar `redis://localhost:6379` als `UPSTASH_REDIS_URL` ontbreekt → **worker crasht bij startup** als er geen lokale Redis draait. ARQ vereist Redis voor zijn interne health check (`pool.delete(self.health_check_key)`) bij elke worker-start.

### `watchdog_interrupted_jobs` (regels 745–984, cron elke 2 min)

**Pass 1a — transcription_jobs re-enqueue (regels 773–824):**

| Actie | Regel | Redis-command | Commands | Try/catch |
|-------|-------|---------------|----------|-----------|
| Stale ARQ-keys verwijderen | ~793 | `DEL arq:job:{job_id} arq:in-progress:{job_id}` | 2 per job | Ja — log + sentry, volgende job |
| Job opnieuw enqueuen | ~801 | `ZADD arq:queued + HSET arq:job:{job_id}` | ~2–3 per job | Zelfde try/catch |

**Pass 1b — playlist_extraction_jobs re-enqueue (regels 826–927):**

| Actie | Regel | Commands | Try/catch |
|-------|-------|----------|-----------|
| Stale ARQ-keys verwijderen | ~856 | 2 per job | Ja |
| Job opnieuw enqueuen | ~863/905 | ~2–3 per job | Zelfde block |

**Pass 2 — Auto-refund (regels 929–984):**  
Geen Redis-calls — alleen Supabase RPC `add_credits`.

**Totaal bij watchdog run (N interrupted jobs):** `N × (2 + 3) = ~5N` commands. Bij nul interrupted jobs: **0 commands** (queries retourneren lege arrays).

### `process_playlist_video` + `process_playlist_retries`

Maken gebruik van `ctx['redis'].enqueue_job(...)` voor sub-task chaining.  
**~2–3 commands per enqueue.** Wrapped in ARQ's eigen error-handling.

---

## 6. `backend/scripts/flush_caption_cache.py` (admin CLI)

**Host:** Lokaal of Railway one-off command

- `SCAN 0 MATCH caption:* COUNT 100` — per SCAN-iteratie **1 command**
- `DEL caption:key1 caption:key2 ...` — bulk delete, **1 command** per batch
- **Geen try/catch.** Script crasht bij Redis-fout of ontbrekende env vars.
- Niet productie-kritisch (admin tool).

---

## Samenvatting per host

### Vercel (marketing + app)

| Aanroep | Commands/req | Bij Redis-fout |
|---------|-------------|----------------|
| Rate limit check (authenticated) | ~2–4 | 500 (exception propagated) |
| Rate limit check (anonymous) | ~2–4 | 500 (exception propagated) |
| Rate limit check (premium) | 0 | N.v.t. |
| Upstash env vars afwezig | 0 | noopLimiter (altijd success) |

### Railway API (main.py)

| Aanroep | Commands/req | Bij Redis-fout |
|---------|-------------|----------------|
| Caption cache GET (hit) | 1–2 | Graceful → cascade |
| Caption cache SET (write) | 1 | Graceful → log + door |
| ARQ Whisper enqueue | ~2–3 | asyncio.create_task() fallback |
| ARQ Playlist enqueue | ~2–3 | 503 (geen fallback) |
| ARQ pool init bij startup | ~2 | Startup crash als URL aanwezig maar Redis down |

### Railway Worker (worker.py)

| Aanroep | Commands/run | Bij Redis-fout |
|---------|-------------|----------------|
| Watchdog per job (DEL + enqueue) | ~5 | Log + sentry, volgende job |
| ARQ startup health check | ~2 | Worker crasht |
| process_playlist_video enqueue | ~2–3 | ARQ eigen error-handling |

---

## Bevindingen en aandachtspunten

### B1 — Runtime Redis-fout ≠ noopLimiter
`noopLimiter` activeert alleen bij **ontbrekende env vars** (module-load time). Als de env vars aanwezig zijn maar Upstash tijdelijk onbereikbaar is (netwerk, quota, downtime), raisen de rate-limit calls een exception → alle 5 extract/transcribe-endpoints retourneren **500**. Er is geen runtime graceful degradation.

### B2 — Playlist enqueue heeft geen asyncio-fallback
Whisper-enqueue valt terug op `asyncio.create_task()` bij geen ARQ pool. Playlist-enqueue geeft **503** — by design, maar het verschil is ongedocumenteerd en kan verrassend zijn bij debug.

### B3 — `analytics: true` verhoogt command-count onzichtbaar
`Ratelimit` is aangemaakt met `analytics: true` (ratelimit.ts:26). Dit laat Upstash per check extra analytics-writes doen. Exacte overhead afhankelijk van Upstash SDK-versie, maar typisch **+1–2 commands** per check. Relevant voor quota-bewaking.

### B4 — Worker-startup vereist altijd Redis
ARQ's interne `pool.delete(self.health_check_key)` bij worker-start maakt Redis verplicht voor de worker. Bij Upstash-uitval of quota-overschrijding **crasht de worker bij (her)start**. Gedocumenteerd in LESSONS.md [2026-05-17].

### B5 — flush_caption_cache.py zonder error-handling
Admin-script, niet productie-kritisch. Maar bij gebruik tijdens quota-incident geeft het cryptische Redis-exceptions in plaats van een duidelijke boodschap.

### B6 — Upstash command-budget raming per uur (normaal gebruik)

| Bron | Frequentie | Commands/invocatie | Schatting/uur |
|------|-----------|-------------------|---------------|
| Rate limit checks (app + marketing) | ~100 req/uur | ~3 | ~300 |
| Caption cache GET | ~50 req/uur | 1 | ~50 |
| Caption cache SET | ~30 req/uur | 1 | ~30 |
| ARQ Whisper enqueue | ~10 jobs/uur | 3 | ~30 |
| ARQ Playlist enqueue | ~5 jobs/uur | 3 | ~15 |
| Watchdog (2-min cron, 0 interrupted) | 30×/uur | 0 | 0 |
| ARQ interne heartbeat/polling | continu | ~1/30s | ~120 |
| **Totaal** | | | **~545/uur** |

Bij 500K commands/dag incident (zie LESSONS.md [2026-05-05]): oorzaak was middleware `getUser()` → refresh-loop → ~140 requests/seconde → opgelost door `getClaims()`. Huidige code heeft dit niet meer.

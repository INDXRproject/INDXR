# Beslissing 048: Redis-splitsing — Upstash voor frontend, Railway-Redis voor worker

**Status:** Geïmplementeerd en geverifieerd  
**Datum:** 2026-06-04 — volledig operationeel 2026-06-06  
**Gerelateerde code:** `backend/worker.py`, `backend/main.py`, `packages/shared/src/lib/ratelimit.ts`

---

## Context

### Incident: ARQ worker platgelegd door Upstash quota

Vanaf 2026-05-06 crashte de ARQ worker (Railway-service `fortunate-mindfulness`) bij elke herstart met:

```
ResponseError: max requests limit exceeded
```

ARQ roept bij startup `pool.delete(health_check_key)` aan op Redis. Upstash weigerde dit omdat het Free Tier quota (500.000 commando's/maand) uitgeput was. De worker kon niet meer verbinden en belandde in een oneindige deploy-loop.

**Waarom was het quota uitgeput?** Dat werd pas op 2026-06-04 volledig gediagnosticeerd (zie hieronder). De worker lag al plat, dus het quota-probleem was tijdelijk onzichtbaar: geen pollende worker → geen nieuwe commando's → quota verstreek rustig.

Toen het Free Tier quota op 2026-06-01 resette, kon de worker tijdelijk weer verbinden — en direct was de werkelijke oorzaak zichtbaar: **6.000 reads vs 348 writes in enkele minuten**, puur van een idle worker zonder actieve jobs.

### Diagnose: polling-inherente kosten (2026-06-04)

Analyse van `backend/worker.py` (WorkerSettings, regels 992–1019):

- `poll_delay`: **niet gezet** → ARQ-default **0.5 seconden**
- `health_check_interval`: **niet gezet** → ARQ-default **1 seconde**

**Resulterende idle-kosten (nul actieve jobs):**

| Bron | Mechanisme | Commando's/uur |
|---|---|---|
| Queue-polling | BLPOP elke 0.5s | 7.200 reads |
| Health-check | EXISTS + SET elke 1s | ~3.600 reads + ~3.600 writes |
| Cron-locking (watchdog) | ARQ-intern SETNX/HSET | ~60–120 |
| **Totaal idle** | | **~10.860–10.920/uur** |

**Maandelijkse projectie (idle, geen jobs):**

```
10.890 commando's/uur × 24 uur × 30 dagen = ~7.840.800 commando's/maand
```

De Upstash Free Tier is 500.000/maand. **Een draaiende ARQ worker op Upstash Free Tier is wiskundig onmogelijk** — de worker verbruikt 15,7× het Free Tier quota zonder ook maar één job te verwerken.

Dit is **geen bug** in de worker of configuratie. Het is inherent aan het ARQ-polling-model: een pollende worker vereist een constante Redis-verbinding met frequente reads.

### Het fundamentele architectuur-mismatch

Upstash rekent **per commando** af (REST/HTTP model, geoptimaliseerd voor sporadische serverless calls). ARQ polls **continu** via een TCP-verbinding (geoptimaliseerd voor lage latency, niet voor kosten per commando).

Deze twee modellen zijn structureel incompatibel voor een productie ARQ-worker.

**Huidige Upstash-gebruikers buiten de worker:**

1. **Vercel rate-limiter** (`packages/shared/src/lib/ratelimit.ts`): sporadische HTTP-calls bij inkomende requests — REST/HTTPS via `UPSTASH_REDIS_REST_URL` + `_TOKEN`.
2. **Caption-cache** (`backend/main.py`, Python): ook sporadisch, per extractie-request — eveneens REST/HTTPS via `UPSTASH_REDIS_REST_URL` + `_TOKEN`. Er bestaat geen `caption-cache.ts` — de cache leeft uitsluitend in Python.

Beide passen ruim binnen het Free Tier (geschat 10.000–50.000 commando's/maand, afhankelijk van traffic).

---

## Beslissing

**Upstash en de ARQ worker worden gescheiden in twee onafhankelijke Redis-instanties.**

### Upstash (bestaand) — blijft voor frontend-calls

- **Gebruik:** Vercel rate-limiter + caption-cache
- **Interface:** REST/HTTPS (Upstash SDK)
- **Kosten:** binnen Free Tier (500K/maand) zodra worker er niet meer op zit
- **Geen wijziging** aan `ratelimit.ts` of `caption-cache.ts` nodig

### Railway Redis (nieuw) — eigen instantie voor de ARQ worker

- **Gebruik:** uitsluitend ARQ job queue + health-check + cron-tracking
- **Interface:** TCP Redis protocol (native ARQ via `aioredis`)
- **Verbinding:** Railway private netwerk (`redis.railway.internal`), niet publiek internet
- **Kosten:** Railway container-resources (~$1–3/maand, binnen Hobby-plan spend-limit)
- **Egress:** private-netwerk-verkeer binnen hetzelfde Railway-project is gratis

---

## Rationale

### Waarom niet Upstash upgraden naar Pay-as-you-go?

Upstash Pay-as-you-go kost $0.20 per 100.000 commando's.

```
7.840.800 idle commando's/maand × $0.20/100K = ~$15,68/maand
```

Dit is puur de idle-kosten, zonder actieve jobs. Bij actieve jobs (playlist-extractie, Whisper) komen daar de job-gerelateerde Redis-commando's bij. Het structurele mismatch-probleem lost niet op — de kosten blijven onvoorspelbaar en schalen slecht.

### Waarom Railway Redis?

Railway rekent geen kosten per commando — alleen voor container-CPU en geheugen. Een Redis-container op Railway idle-t vrijwel gratis. De 7,8 miljoen polling-commando's per maand worden ~$0 extra bovenop de container-uptime.

Bovendien:
- **Private netwerk**: worker en Redis zitten in hetzelfde Railway-project → verbinding via `redis.railway.internal`, geen publiek internet, geen latency overhead
- **Geen TLS-complexiteit**: private netwerk is encrypted op infra-niveau; geen client-side TLS config nodig (geen VPN-blokkade zoals bij Upstash TCP poort 6379, zie known-issues)
- **Zelfde Railway project**: eenvoudig beheer, één spend-limit dekt alles

### Waarom niet poll_delay verhogen als tussenoplossing?

`poll_delay = 5s` zou de polls reduceren van 7.200 naar 720/uur, maar:
- Health-check (3.600/uur) blijft ongewijzigd
- Totaal daalt naar ~4.400/uur = ~3.200.000/maand → nog steeds 6,4× Free Tier
- Hogere poll_delay introduceert 5-seconden-vertraging bij job-pickup (merkbaar bij Whisper-jobs)
- Het mismatch-probleem is structureel, niet configureerbaar weg

---

## Consequenties

### Wat verandert

- Railway-service `fortunate-mindfulness` krijgt nieuwe env var `ARQ_REDIS_URL` (of `WORKER_REDIS_URL`) die wijst naar de interne Railway Redis instantie
- `WorkerSettings.redis_settings` in `backend/worker.py` leest de nieuwe var in plaats van `UPSTASH_REDIS_URL`
- De Upstash env vars (`UPSTASH_REDIS_URL`) in de worker-service worden verwijderd om verwarring te voorkomen
- Upstash env vars in Vercel (`UPSTASH_REDIS_REST_URL` + `_TOKEN`) blijven ongewijzigd

### Wat niet verandert

- `ratelimit.ts` en `caption-cache.ts`: geen codewijziging
- ARQ worker-logica: geen codewijziging, alleen env var en naam
- Upstash database zelf: blijft bestaan, krijgt gewoon minder load

**Correctie t.o.v. originele ADR (vastgesteld 2026-06-05):** De ARQ-queue heeft twee producers/consumers die dezelfde Redis-verbinding nodig hebben:
- `backend/worker.py` — consument + interne producent (playlist-chaining via `ctx['redis']`, watchdog re-enqueue)
- `backend/main.py` — externe producent (`app.state.arq_pool`); enqueued `run_whisper_job` (r.752) en `process_playlist_video` (r.1037)

Beide lezen dezelfde env var (`UPSTASH_REDIS_URL`, hernoemd naar `ARQ_REDIS_URL`) en moeten naar dezelfde Railway Redis wijzen. Als alleen de worker wordt omgezet maar de API niet, worden jobs geënqueued naar Upstash terwijl de worker op Railway Redis luistert — stille queue-mismatch.

**Correctie 2 — root-oorzaak connectiefouten (vastgesteld 2026-06-06):** De `Name or service not known`-fout bij het verbinden met `redis.railway.internal` had een infrastructurele oorzaak: de Redis, de API (`agile-creation`) en de worker (`fortunate-mindfulness`) stonden aanvankelijk in **drie aparte Railway-projecten**. Railway's private networking werkt uitsluitend binnen één project — cross-project private hostnames resolven nooit. De `redis.railway.internal` hostname was dus structureel onbereikbaar, ongeacht client-configuratie.

**Tussenstap (2026-06-05, teruggedraaid):** Een monkey-patch op `redis.asyncio.connection.Connection._connection_arguments` om `family=socket.AF_UNSPEC` mee te geven (dual-stack DNS-lookup) was gebaseerd op de veronderstelling dat het een IPv6-resolutieprobleem was. De patch loste niets op — de werkelijke oorzaak was de cross-project isolatie. De patch is verwijderd in commit na 2026-06-06 (geen dode code).

**Oplossing:** Alle drie services geconsolideerd in één Railway-project (`agile-creation`): API, worker en Redis als drie services op één canvas. Private networking werkt nu correct. Zie Fase 3 hieronder.

### Risico's

- **Railway Redis restarts**: bij Railway container-restart verliest Redis zijn data. Voor ARQ is dit acceptabel: de watchdog (`watchdog_interrupted_jobs`) is gebouwd om precies dit scenario af te handelen — interrupted jobs worden gedetecteerd en opnieuw geënqueued via Supabase state, niet via Redis-persistentie.
- **Geen persistentie**: ARQ-jobs die in-flight zijn bij een Railway Redis restart gaan verloren. Dit is het bestaande gedrag al (ARQ ack_late bestaat niet, zie LESSONS.md 2026-05-04) — geen regressie.
- **Maandelijkse kosten**: Railway Redis ~$1–3/maand extra op het Hobby-plan. Binnen de ingestelde spend-limit.

### Fase 2 — implementatie (voltooid 2026-06-05)

- [x] `backend/main.py` r.121: `UPSTASH_REDIS_URL` → `ARQ_REDIS_URL`
- [x] `backend/worker.py` r.1005: `UPSTASH_REDIS_URL` → `ARQ_REDIS_URL`
- [x] `backend/.env.example`: `ARQ_REDIS_URL` gedocumenteerd met uitleg

### Fase 3 — infrastructuurconsolidatie en verificatie (voltooid 2026-06-06)

- [x] **[Khidr]** Railway Redis-service aangemaakt in project `agile-creation` (zelfde canvas als API)
- [x] **[Khidr]** Worker-service (`fortunate-mindfulness`) verplaatst naar project `agile-creation`
- [x] **[Khidr]** `ARQ_REDIS_URL` ingesteld op API + worker met Railway-internal connection string (`redis://default:...@redis.railway.internal:6379`)
- [x] **[Khidr]** Beide services herstart en geverifieerd: worker-logs tonen `redis_version=8.2.1 clients_connected=1`, geen verbindingsfouten
- [x] **[Khidr]** `UPSTASH_REDIS_URL` verwijderd uit beide Railway-services
- [x] End-to-end verificatie: playlist van 4 video's succesvol verwerkt — worker pakte alle jobs op, transcripts weggeschreven ✅
- [x] Monkey-patch (`family=AF_UNSPEC`) verwijderd uit `backend/worker.py` en `backend/main.py` — was overbodig na consolidatie

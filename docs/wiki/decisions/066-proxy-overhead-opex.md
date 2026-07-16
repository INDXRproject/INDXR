# Beslissing 066: Proxy overhead als OPEX-regel (F18)

**Status:** Geaccepteerd
**Datum:** 2026-07-16
**Gerelateerde code:** `supabase/migrations/20260716160000_f18_proxy_overhead.sql`, `backend/credit_manager.py` (`record_proxy_bytes`), `backend/main.py` (playlist-info + metadata), `backend/youtube_utils.py` (`extract_with_ytdlp`, `extract_via_youtube_transcript_api`), `apps/app/src/app/admin/finance/{financeTypes.ts,FinanceView.tsx}`

## Context

Decodo-proxy-egress werd alleen gemeten op **geslaagde** levering: `transcription_jobs.proxy_bytes` (COR telt enkel `status='complete'`) en `usage_logs.proxy_bytes` (geslaagde captions). Al het overige proxy-verkeer verbruikte bytes en telde **nul**:

- jobs die falen/geblokkeerd worden (`status<>'complete'`) — bytes stonden al in de kolom maar vielen buiten COR;
- caption-cascade-pogingen die niets vinden — de `extract_info`-egress (~1–2 MB) ging verloren bij de `{}`-return;
- `/api/playlist/info`- en `/api/video/metadata`-fallbacks (yt-dlp `download=False`) — volledig ongemeten (plain `YoutubeDL`).

**bgutil** bestaat niet meer (ADR-027) en er is **geen** proxy-health-check — die categorieën uit de F18-vraag zijn bij ons leeg. De proxy-COR was daardoor structureel een **ondergrens**, geen kost.

## Beslissing

Nieuw kostenkanaal **"Proxy overhead"** als **OPEX**-regel (niet COR), `bytes × decodo_eur_per_gb`, driver zichtbaar (F15-stijl):

- **Meting (forward-only, geen backfill):** nieuwe tabel `proxy_usage_log(occurred_at, category, bytes)`, best-effort geschreven door `record_proxy_bytes(category, n)` vanuit de tot nu toe ongemeten paden (`playlist_info`, `metadata`, `caption_failed`). De mislukte-job-bytes worden **niet** opnieuw vastgelegd — ze staan al in `transcription_jobs.proxy_bytes` (error-rijen) en worden per SQL opgeteld.
- **Samenstelling per scope:** overhead = `Σ transcription_jobs.proxy_bytes WHERE status<>'complete'` (per scope via de `users`-array) **+** `Σ proxy_usage_log.bytes` (globaal, **alleen external** — niet user-toewijsbaar, net als `funnel_anon`).
- **Landt in:** `admin_finance_summary` → `measured_opex.proxy_overhead` (+ `measured_opex.total` + `net_profit`) en `snapshot_finance_day` → `opex_proxy_overhead` + `net_profit_measured` (forward-only, nieuwe kolom).

## Rationale

**Waarom OPEX en niet COR?** COR = kost van een **geleverde** omzet-eenheid. Dit verkeer levert géén betaalde eenheid: playlist-info/metadata-scrapes gaan vóór elke aankoop, mislukte/geblokkeerde extracties leveren niets, error-jobs worden gerefund. Het money-model boekt bestaande proxy-egress-zonder-levering (de free-caption-funnel, logged-in + anon) al als **OPEX** — proxy overhead is dezelfde soort, dus OPEX voor consistentie. Succesvolle levering blijft in COR (`transcription_jobs` complete + betaalde caption). Health-checks (bestaan niet) zouden sowieso "bij niets" horen → OPEX is het juiste huis.

**Geen dubbeltelling (bewezen):** COR gebruikt `status='complete'`; overhead gebruikt `status<>'complete'` → disjunct per status (elke rij zit in precies één bak; `complete + non_complete − total = 0`, geverifieerd all-time). `proxy_usage_log` is een fysiek aparte tabel die **alleen** wordt geschreven door paden die nooit `proxy_bytes` naar `transcription_jobs`/`usage_logs` schrijven; een mislukte caption logt `usage_logs` mét `proxy_bytes=0`, dus die bytes leven enkel in `proxy_usage_log`. Totaal nieuwe teller = bestaand totaal + nieuw deel, nooit twee keer dezelfde bytes.

## Consequenties

- **`net_profit` daalt** met de gemeten overhead — dat is de correctie, niet een regressie (de kost was er altijd, telde alleen niet mee). Op het meetmoment was de overhead €0 (geen error-job-bytes, log leeg), dus de live cijfers wijzigden niet; de teller vult vanaf nu.
- **Forward-only:** wat vóór de teller ligt blijft onbekend (aanvaarde staat). De **bovengrens** blijft het Decodo-dashboard/statistics-API (verbruikte GB per periode) — nog niet gewired; reconciliatie-follow-up (buiten F18-scope).
- Meting synchroon + best-effort in de backend: een gefaalde log breekt nooit de extractie (`record_proxy_bytes` vangt alles).
- CLAUDE.md's bgutil-secties zijn **stale** (bgutil is weg sinds ADR-027) — gerapporteerd, niet gefixt (buiten scope).

# Beslissing 020: Cloudflare R2 voor Audio en Transcript Storage

**Status:** Geaccepteerd
**Datum:** 2026-04-26
**Gerelateerde code:** Nieuwe `backend/storage.py` (R2 client wrapper), aanpassingen in audio-pipeline (`backend/audio_utils.py`) en transcript-write logica

---

## Context

Audio-bestanden voor AssemblyAI-transcriptie worden momenteel tijdelijk op de Railway container-schijf opgeslagen. De flow:

1. yt-dlp downloadt audio van YouTube via Decodo proxy
2. ffmpeg comprimeert naar 12kbps Opus/OGG (zie ADR-003)
3. AssemblyAI fetcht het bestand via een upload-call vanuit de Railway-backend
4. Na transcriptie wordt het tijdelijke bestand verwijderd

Drie problemen met deze huidige opzet:

1. **Container-schijven zijn klein en duur.** Railway rekent voor opslagruimte als deel van de service-prijs. Een crash met halfvolle schijf is realistisch.
2. **Container-restarts wissen tijdelijke files.** Een audio-file die net klaar is voor upload kan verdwijnen bij een Railway-deploy of OOM-kill — gedocumenteerd onder `operations/known-issues.md`.
3. **Egress-kosten lopen op bij schaal.** Railway rekent ~$0,05/GB. Bij 10.000 audio-jobs per maand met gemiddeld 30MB per file = 300GB egress = ~$15/maand alleen aan "file naar AssemblyAI sturen".

Daarnaast komt er een nieuwe opslagcategorie bij: **transcript JSON-content voor de master_transcripts cache** (zie ADR-021). Bij 100k–1M cached transcripts wordt dit substantieel — en hoort niet in Postgres thuis.

---

## Beslissing

**Cloudflare R2** als object-storage met twee buckets:

- **`indxr-audio`** — tijdelijke audio-files met TTL 24u (auto-delete via lifecycle rule na transcriptie)
- **`indxr-transcripts`** — persistente transcript JSON-content voor master_transcripts cache (zie ADR-021)

Library: **boto3** (S3-compatible API; R2 spreekt het S3-protocol volledig).

---

## Rationale

### Waarom R2 en niet AWS S3 of Google Cloud Storage?

Het kernverschil zit in **egress-kosten**:

| Provider | Storage / GB / mnd | Egress / GB |
|---|---|---|
| AWS S3 | ~$0,023 | ~$0,09 |
| Google Cloud Storage | ~$0,020 | ~$0,12 |
| **Cloudflare R2** | $0,015 | **$0 (gratis)** |

**Rekenvoorbeeld voor INDXR.AI bij 10.000 audio-jobs/maand met gemiddeld 30MB per file:**

- Storage (gemiddeld 50GB tijdelijk in opslag): ~$0,75/maand
- Egress (AssemblyAI fetcht elke file + transcript-downloads door users, geschat ~600GB): **$0**
- **Totaal R2: ~$0,75/maand**

Vergelijkbare workload op AWS S3: ~$55/maand. Een ratio van bijna 70x.

### Waarom S3-compatible API (en niet R2's eigen API)

`boto3` is de Python-standaard voor S3. R2 ondersteunt het S3-protocol volledig. Dit betekent:

- **Geen vendor lock-in op R2.** Switch naar S3, MinIO, of self-hosted alternatief = config-change, geen code-change.
- **Bestaande Python-libraries werken direct** (boto3, smart_open, aioboto3).
- **Bij latere VPS-migratie** is MinIO self-hosted een drop-in replacement.

### Waarom twee aparte buckets

- **`indxr-audio`** heeft korte TTL (24u) en lifecycle-rule voor auto-delete. Privacy-eis: audio-files mogen niet langer dan nodig bewaard worden — sluit aan bij GDPR-basis (priorities.md taak 1.18).
- **`indxr-transcripts`** is persistent en publiek-cacheable (alleen voor publieke YouTube-video's, zie ADR-021).

Aparte buckets maken het mogelijk om verschillende lifecycle-rules en access-policies toe te passen per categorie.

### Waarom niet Supabase Storage (zit al in stack)

Supabase Storage is gebaseerd op S3 onder de motorkap maar:
- Egress-kosten gelden bovenop het Supabase Pro plan (~$0,09/GB boven free tier)
- 100GB free tier raakt op bij ~3.300 audio-jobs van 30MB
- Bij 10k jobs/maand betaal je ~$45/maand alleen voor Supabase Storage egress

R2 is ~60x goedkoper bij dezelfde workload. Supabase Storage blijft beschikbaar voor andere use cases (avatars, user-uploaded files indien ooit relevant), maar audio en transcript-content horen niet daar thuis.

---

## Architectuur

**Audio-flow (tijdelijk bestand):**

```
1. yt-dlp downloadt audio naar /tmp/audio_{job_id}.opus
2. ffmpeg comprimeert (12kbps Opus, zie ADR-003)
3. boto3 upload naar R2 indxr-audio bucket op key audio/{job_id}.opus
4. Genereer pre-signed URL (60 min geldig)
5. Geef pre-signed URL aan AssemblyAI → AssemblyAI fetcht direct van R2
6. Lifecycle rule op indxr-audio: auto-delete na 24u
```

**Transcript-flow (persistent):**

```
1. Na succesvolle transcriptie → bouw JSON-content (Tiptap formaat)
2. Schrijf naar indxr-transcripts op key
   transcripts/{video_id}__{language}__{model}.json
3. Sla r2_key referentie op in master_transcripts tabel (Supabase)
4. Bij latere cache-hit: fetch JSON van R2 via pre-signed URL of direct via API
```

---

## Lifecycle rules

```
indxr-audio:
  - Delete objects older than 24 hours

indxr-transcripts:
  - No automatic deletion (persistent cache)
  - Manual cleanup pas overwegen bij > 500GB storage
```

---

## Toegang en security

- **API tokens:** scoped per bucket (audio token kan alleen audio bucket lezen/schrijven, transcript token alleen transcripts)
- **Pre-signed URLs** voor AssemblyAI fetch: TTL 60 minuten, single-use
- **Geen publieke bucket-listing**: alleen via pre-signed URL of authenticated API call
- **CORS-config:** alleen indxr.ai domein voor browser-side fetches indien ooit nodig

---

## Consequenties

**Voordelen:**
- ~70x goedkoper dan S3 voor egress-zware workloads
- Container-restart-safe: files leven niet op Railway
- Voorbereiding op VPS-migratie (audio en transcripts blijven bij Cloudflare bij eventuele Hetzner-overgang)
- AssemblyAI fetcht direct van R2 — backend hoeft files niet meer "door te streamen"
- S3-compatible: geen vendor lock-in op R2 zelf

**Trade-offs:**
- Extra service om te beheren (Cloudflare-account, API-tokens, lifecycle-rules)
- Pre-signed URL-management vereist (TTL, regeneratie bij verlooptijd)
- Cloudflare kan beleid wijzigen — R2's gratis-egress is een commercieel besluit, geen wet (mitigatie: S3-compatible API maakt switch triviaal)

**Privacy-implicatie:**
Audio-files in R2 zijn pre-signed-URL-protected, niet publiek. Lifecycle 24u + auto-delete is GDPR-vriendelijk. Transcripts worden alleen gecached voor publieke YouTube-video's (zie ADR-021); private/unlisted blijft alleen in `user_transcripts`.

---

## Implementatie-volgorde (priorities.md taak 1.8)

1. Cloudflare-account + 2 buckets aanmaken
2. API-tokens met scoped permissions
3. boto3-wrapper in `backend/storage.py` (upload, download, generate_presigned_url)
4. Audio-flow refactoren (upload naar R2 vóór AssemblyAI-call)
5. Lifecycle-rule op indxr-audio: auto-delete na 24u
6. Master-transcripts write-flow gebruikt R2 vanaf start (priorities.md taak 1.9)
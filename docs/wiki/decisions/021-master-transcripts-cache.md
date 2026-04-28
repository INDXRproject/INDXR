# Beslissing 021: master_transcripts Cache (metadata in Supabase, content in R2)

**Status:** Geaccepteerd
**Datum:** 2026-04-26
**Gerelateerde code:** Nieuwe migratie `master_transcripts` tabel, aanpassingen in `backend/main.py` extractie-pipeline, integratie met `backend/storage.py` (zie ADR-020)

---

## Context

Iedere transcriptie-aanvraag in INDXR.AI triggert nu een volledige round-trip:

1. yt-dlp call (caption-extractie) of audio-download
2. Bij audio: AssemblyAI-call (betaalde minuten)
3. Tiptap-conversie en opslag in `transcripts` tabel (per user, RLS-protected)

Twee structurele inefficiënties:

- **Populaire YouTube-content wordt door meerdere users aangevraagd.** Dezelfde Lex Fridman-podcast, dezelfde MIT-lezing, dezelfde Joe Rogan-aflevering wordt 5x of 50x getranscribeerd. Elke keer betalen wij AssemblyAI én belasten yt-dlp/Decodo proxy.
- **Bij yt-dlp bot-detection updates** verliezen we toegang tot videos die we eerder al transcribeerden — geen recovery mogelijk omdat het transcript alleen in de aanvragende user's `transcripts` rij staat.

De oplossing is een centrale cache: een `master_transcripts` tabel die unieke transcripten bewaart, gedeeld over alle users.

---

## Beslissing

**Master-transcripts cache met split storage:**

- **Metadata in Supabase Postgres** (klein, query-baar): `video_id`, `language`, `transcription_model`, `quality_score`, `duration_seconds`, `created_at`, `is_public`, `r2_key`
- **Transcript JSON-content in Cloudflare R2** (groot, blob-achtig) op key `transcripts/{video_id}__{language}__{model}.json` in de `indxr-transcripts` bucket

**Cache-strategie:**

- Cachen **alleen publieke YouTube-video's** (`is_public = true`). Private/unlisted videos worden niet gecached.
- Aparte cache-entries per `(video_id, language, transcription_model)` — een AssemblyAI Universal-3 transcript en een Universal-4 transcript van dezelfde video zijn aparte entries.
- Cache-hit flow: kopieer naar `transcripts` (user-tabel, bestaand), trek credits af zoals normaal, lever direct.
- **Gebruikers betalen ALTIJD voor AI-transcriptie**, ook bij cache-hit.
- Metadata (`duration_seconds`, taal) voor `master_transcripts`-entries die via cascade **stap 1** (youtube-transcript-api) zijn aangemaakt, komen uit de YouTube Data API `videos.list` call (zie [ADR-028](028-youtube-data-api-metadata.md)). Bij stap 2 (yt-dlp) levert yt-dlp de metadata direct mee.

---

## Rationale

### Waarom split storage (Postgres + R2) en niet alles in Postgres

| Optie | Bij 100k transcripts | Bij 1M transcripts |
|---|---|---|
| Alles in Postgres (JSONB in `transcripts`-stijl tabel) | ~50GB Postgres = ~$6/maand extra | ~500GB = ~$63/maand extra, trage backups |
| Metadata in Postgres + JSON in R2 | 0,5GB Postgres + 50GB R2 = ~$0,75/maand | 5GB Postgres + 500GB R2 = ~$7,50/maand |

Bij 1M transcripts is split storage ongeveer 10x goedkoper dan alles-in-Postgres, en houdt het Postgres-backups en queries snel. JSONB-rijen van 500KB maken zelfs JSONB-indexen traag — Postgres is niet ontworpen als blob-storage.

Cloudflare R2 is sowieso al in de stack voor audio (zie ADR-020), dus geen extra infrastructuur.

### Waarom geen Redis cache-laag erbovenop

Een Redis-laag bovenop R2 (cache-hits leveren in <20ms) is een mogelijke Fase 3-optimalisatie. Voor nu: R2 levert ~250ms response, en dat ervaart de gebruiker als "instant" vergeleken met de minuten van een verse AssemblyAI-call. Premature optimalisatie vermijden.

### Waarom user altijd betaalt bij cache-hit

Drie redenen:

1. **Eerlijkheid tegenover de eerste user die "het werk financierde".** Zij betaalden voor de oorspronkelijke AssemblyAI-call. Latere users gratis laten betalen zou inconsistent zijn met hoe credits werken op de rest van het platform.
2. **Voorkomt abuse-pattern:** users delen video-URLs en wisselen accounts om gratis transcripten te halen. Met "iedereen betaalt zoals normaal" verdwijnt die incentive.
3. **Cache-revenue financiert de infrastructuur.** R2-storage en Postgres-rijen kosten geld bij schaal. De marge op cache-hits dekt dat ruim.

De waarde voor de user zit in **snelheid** (sub-seconde levering vs minuten voor verse AssemblyAI-call) en **stabiliteit** (werkt ook als YouTube yt-dlp tijdelijk blokkeert) — niet in prijs.

### Waarom transcription_model in de key — en hoe lookup werkt

AssemblyAI brengt nieuwe modellen uit (Universal-2, Universal-3, Universal-4 in toekomst) met betere kwaliteit. Cache-entries worden per `(video_id, language, transcription_model)` opgeslagen waarbij `transcription_model` waarden heeft als:

- `youtube_captions` (caption-extractie via yt-dlp, geen AssemblyAI)
- `assemblyai_universal_2`
- `assemblyai_universal_3`
- `assemblyai_universal_4` (toekomstig)

**Cache-lookup is transparant voor de user.** Backend kiest automatisch de hoogst-beschikbare kwaliteit binnen de gekozen tier (caption vs AI) — de gebruiker hoeft nooit handmatig "welke versie wil je" te kiezen.

Concreet:

- User kiest **"YouTube captions"** → backend zoekt `transcription_model = 'youtube_captions'` voor `(video_id, language)`. Hit → leveren. Miss → yt-dlp draaien, cachen, leveren.
- User kiest **"Generate with AI"** → backend zoekt de **hoogst-genummerde AssemblyAI-versie** in cache voor `(video_id, language)` (assemblyai_universal_4 > universal_3 > universal_2). Hit → die versie leveren. Miss → AssemblyAI draaien op nieuwste model, cachen onder dat model, leveren.

**Geen UX-prompt over modelversies.** De user merkt niets van het cache-mechanisme — alleen dat het soms snel is (cache-hit) of normaal duurt (cache-miss). De model-versie is een implementatie-detail, niet een keuze.

Bij upgrade naar een nieuwer model: oude entries blijven in de cache liggen (geen forced invalidation). Nieuwe extracties produceren entries onder het nieuwe model. Als een user een nieuwe AI-extractie aanvraagt na een model-upgrade krijgt hij automatisch het nieuwste model — niet de oude cache-versie. Oude entries blijven nuttig als migratie-pad of als cost-fallback voor users die expliciet "goedkopere oude versie" zouden mogen kiezen (toekomstige feature, niet nu).

### Privacy-grens: alleen publieke videos

`is_public` wordt bepaald via yt-dlp metadata-fetch — de YouTube-API geeft `availability: 'public'` terug voor publiek vrijgegeven videos. Private/unlisted videos worden niet in de master cache opgeslagen — die transcripten leven alleen in de bestaande `transcripts` tabel van de aanvragende user (RLS-protected).

---

## Schema

```sql
CREATE TABLE master_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL,
  language TEXT NOT NULL,
  transcription_model TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  quality_score FLOAT,
  duration_seconds INTEGER,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (video_id, language, transcription_model)
);

CREATE INDEX idx_master_transcripts_lookup
  ON master_transcripts (video_id, language, transcription_model)
  WHERE is_public = true;
```

**Verhouding tot bestaande `transcripts` tabel:**

- `master_transcripts` = read-only ground-truth, gedeeld over alle users
- `transcripts` (bestaand) = per-user kopie inclusief eventuele Tiptap-bewerkingen (`edited_content` JSONB)
- Bij cache-hit: nieuwe rij in `transcripts` voor de aanvragende user, JSON-content gekopieerd uit R2

Geen wijziging aan de bestaande `transcripts` tabel — die blijft de user-facing opslag met RLS, edits, AI-summaries, collection-koppeling.

---

## Cache flow

```
Aanvraag binnen voor (video_id, language, model='assemblyai_universal_3'):

1. Check master_transcripts WHERE
     video_id = X AND language = Y AND transcription_model = Z
     AND is_public = true
2. Hit:
   a. Fetch JSON van R2 via r2_key
   b. INSERT INTO transcripts (kopie naar user, bestaande tabel)
   c. Trek credits af zoals normaal (deduct_credits_atomic)
   d. Return naar user
3. Miss:
   a. Normale flow: yt-dlp cascade (zie priorities.md taak 1.6) → AssemblyAI → JSON
   b. Bij is_public = true: INSERT INTO master_transcripts + upload JSON naar R2
   c. INSERT INTO transcripts (user-tabel, zoals nu)
   d. Trek credits af, return naar user
```

## Verhouding tot frontend duplicate-check (VideoTab)

INDXR.AI heeft al een **per-user duplicate-check** in `src/components/free-tool/VideoTab.tsx`: voordat een extractie naar Python wordt gestuurd, queryt de frontend Supabase `transcripts` op `(user_id, video_id, processing_method)`. Bij hit toont hij de "extract anyway?" UI in plaats van direct te extracteren.

Dit is een **UX-laag** (voorkomt onbedoelde dubbele credits-uitgave) en blijft volledig intact bij invoering van master_transcripts.

**Verschil tussen de twee lagen:**

| Laag | Scope | Doel | Wanneer triggert |
|------|-------|------|------------------|
| Frontend duplicate-check | Per-user | UX: "weet je het zeker?" | User A extract video X die al in User A's library staat |
| master_transcripts | Cross-user | Kostenbesparing + snelheid | User B extract video X die User A ooit transcribeerde |

**Flow bij invoering van master_transcripts:**

1. User klikt Extract → frontend duplicate-check draait
2. Geen hit op user-eigen library → request gaat naar Python backend
3. Python backend doet master_transcripts lookup (cross-user)
4. Hit → kopieer naar `transcripts` (user-tabel), trek credits af, lever direct
5. Miss → normale extractie-flow → resultaat opslaan in master_transcripts + transcripts

Bij user-eigen library hit (stap 2): user klikt "extract anyway" → vanaf dat punt is het gewoon stap 3-5. master_transcripts werkt onafhankelijk van de frontend-keuze.

De user merkt nooit iets van master_transcripts — geen UI-prompt, geen "er bestaat al een versie" melding. Alleen: sommige extracties zijn snel (cache-hit) en sommige normaal (cache-miss), maar dat is niet zichtbaar als feature.

---

**Voordelen:**
- Significante kostenbesparing op herhaalde populaire videos
- Sub-seconde levering bij cache-hit (vs minuten voor verse transcriptie)
- Defensief tegen yt-dlp bot-detection: gecachete videos blijven beschikbaar zelfs als YouTube de extractie tijdelijk blokkeert
- Wordt **sterker over tijd**: hoe meer users INDXR gebruiken, hoe groter de cache, hoe hoger de hit-rate. Dit is een echte moat — concurrenten die later starten beginnen vanaf nul.

**Trade-offs:**
- Extra schema-complexiteit (master vs user transcripts)
- R2 storage groeit lineair met unique videos (~50GB per 100k transcripts)
- Cache-invalidatie bij model-upgrades vereist coördinatie
- Privacy-bewustheid: nooit private video-content in master cache (codepath moet `is_public` strikt checken)

**Implementatie-volgorde:**
- **Fase 1.9** (priorities.md): schema + write-only logic — de cache vult zich tijdens testing en vroege launch zonder gebruikers te raken ✅ 2026-04-28
- **Fase 1.11** (priorities.md): read-logic activeren — cache-hits beginnen geleverd te worden zodra er voldoende entries zijn

Deze splitsing zorgt dat we eerst data verzamelen en dan pas serveren, in plaats van vanaf dag één een lege cache te hebben.

---

## Schema-uitbreidingen 2026-04-28

Het definitief geïmplementeerde schema wijkt op een aantal punten af van de originele schets in ADR-021. Zie `supabase/migrations/20260428_master_transcripts_cache.sql` voor de exacte SQL.

### Kolommen toegevoegd

| Kolom | Type | Reden |
|-------|------|-------|
| `source_method` | TEXT DEFAULT 'caption_extraction' | Onderscheid per request-type: `'caption_extraction'` (yt-dlp / youtube-transcript-api) vs. `'audio_transcription'` (AssemblyAI). Maakt toekomstige cache-lookup per use-case mogelijk. |
| `model_quality_rank` | INTEGER | Handmatig beheerde ranking zodat cache-lookup (taak 1.11) kan vergelijken of een gecachete versie goed genoeg is. Zie `MODEL_QUALITY_RANK` dict in `backend/master_cache.py`. |
| `character_count` | INTEGER | Snelle metadata beschikbaar zonder R2-fetch. Berekend in `master_transcripts_write()`. |
| `word_count` | INTEGER | Idem — nuttiger dan character_count voor kosten-schatting per transcript. |
| `fetched_from_provider_at` | TIMESTAMPTZ | Wanneer het transcript opgehaald werd bij YouTube of AssemblyAI. Basis voor `CAPTION_REFRESH_DAYS = 90` expiry-logica in taak 1.11. |
| `deprecated_at` | TIMESTAMPTZ | NULL = actief entry. Gezet bij model-upgrade of privacy-verwijdering. Vervangt de `WHERE is_public = true` filter uit de originele ADR. |

### Kolommen verwijderd

| Kolom | Reden |
|-------|-------|
| `is_public` | Master cache is per definitie voor YouTube-publieke content. Audio uploads (user-specifiek) gaan nooit in master cache. De filter is dus impliciet — de kolom voegt geen informatiewaarde toe. De partial index filtert nu op `WHERE deprecated_at IS NULL`. |

### Module-level constanten in `backend/master_cache.py`

```python
CAPTION_REFRESH_DAYS = 90
# Gebruikt bij taak 1.11 cache-lookup: caption-entries ouder dan 90 dagen
# worden behandeld als miss (YouTube ASR wordt periodiek verbeterd).

MODEL_QUALITY_RANK = {
    "youtube_transcript_api": 30,
    "youtube_captions": 30,
    "assemblyai_universal_2": 50,
    "assemblyai_universal_3": 70,
}
# Bij upgrade naar nieuw model: voeg entry toe met hogere rank (bijv. 90 voor universal_4).
# Cache-lookup vergelijkt rank van cached entry met rank van CURRENT_PRODUCTION_AI_MODEL.

CURRENT_PRODUCTION_AI_MODEL = "assemblyai_universal_3"
# Wijzig hier bij productie-upgrade — één plek, geen andere code-wijzigingen nodig.
```
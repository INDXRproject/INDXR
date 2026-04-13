# Beslissing 003: AssemblyAI als Fallback Transcriptiedienst

**Status:** Geaccepteerd (vervangt OpenAI Whisper, zie rationale)  
**Datum:** 2025-03 (Phase O in roadmap)  
**Gerelateerde code:** `backend/assemblyai_client.py`, `backend/main.py`

---

## Context

Voor video's zonder YouTube captions moet INDXR.AI de audio zelf transcriberen. De eerste implementatie gebruikte OpenAI Whisper (Phase E). In Phase O is dit vervangen door AssemblyAI.

De audioverwerking pipeline:
1. yt-dlp downloadt audio van YouTube
2. ffmpeg converteert naar 12kbps Opus/OGG (minimale bestandsgrootte)
3. AssemblyAI transcribeert het audiobestand
4. Resultaat opgeslagen als JSONB in Supabase

---

## Beslissing

**AssemblyAI** gebruiken als managed transcriptiedienst voor de audio-fallback pipeline.

De backend importeert `assemblyai_client.py` en roept `transcribe_with_assemblyai()` aan wanneer YouTube captions ontbreken.

---

## Rationale

**Waarom vervangen we OpenAI Whisper?**

| Factor | OpenAI Whisper (self-hosted) | AssemblyAI |
|--------|------------------------------|------------|
| Infrastructuur | GPU vereist voor praktische snelheid | Managed, geen infra |
| Kosten | Hoog (GPU op Railway) | Per minuut audio |
| Onderhoud | Model updates, CUDA dependencies | Nul |
| Betrouwbaarheid | Afhankelijk van Railway instance | SLA van AssemblyAI |
| API kwaliteit | Lokaal HTTP call | Goed gedocumenteerde SDK |

Self-hosted Whisper op Railway vereist een GPU-tier, wat aanzienlijk duurder is dan de basis Railway plan. Voor een early-stage SaaS weegt de operationele vereenvoudiging zwaarder dan de kostenbesparing van self-hosting.

**Waarom niet OpenAI's hosted Whisper API?**
- Prijs vergelijkbaar met AssemblyAI
- AssemblyAI heeft betere async job API (webhook-based) die past bij de polling architectuur
- AssemblyAI biedt betere accuracy voor auto-punctuation en speaker detection (toekomstige features)

**Audio compressie naar 12kbps Opus:**
Bewuste keuze om bandbreedte- en verwerkingskosten te minimaliseren. Spraak is goed verstaanbaar tot ~8kbps Opus; 12kbps biedt marge. `backend/audio_utils.py:compress_audio_if_needed()` handelt dit af.

---

## Consequenties

**Voordelen:**
- Geen GPU-infra nodig op Railway
- Lagere operationele complexiteit
- AssemblyAI SDK is goed onderhouden

**Trade-offs:**
- Externe afhankelijkheid (AssemblyAI kan down gaan of prijzen verhogen)
- Per-minuut kosten schalen met gebruik
- `ASSEMBLYAI_API_KEY` vereist in Railway environment

**Openstaand:**
- Zie `known-issues.md`: AssemblyAI client is geïmporteerd maar de primaire flow gebruikt YouTube captions. Bij video's zonder captions is het de vraag of AssemblyAI daadwerkelijk actief is in productie.

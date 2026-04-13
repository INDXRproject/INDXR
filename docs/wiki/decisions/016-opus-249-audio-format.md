# Beslissing 016: yt-dlp Audio Format — Opus 249 in Plaats van 251

**Status:** Geaccepteerd (pending validatie + implementatie)
**Datum:** 2026-04-14
**Gerelateerde code:** `backend/audio_utils.py` (`ydl_opts` format selector, ~regel 113)

---

## Context

Het huidige `ydl_opts` gebruikt `bestaudio/best` als format selector, wat YouTube's Opus 251 selecteert (~128–160 kbps, ~1.0 MB/min). De backend comprimeert dit daarna toch naar 12 kbps Opus/OGG vóór het naar AssemblyAI stuurt — de hoge-kwaliteit download is dus verspilde bandbreedte.

IPRoyal proxies kosten ~$2.50/GB (schaalprijs). Bij het huidige format kost een 10-minuten download ~$0.025 in proxy-bandbreedte (10 MB × $2.50/GB). Met Opus 249 (~50 kbps, ~0.37 MB/min): ~$0.009 per 10 minuten (~63% reductie).

---

## Beslissing

Verander de format selector in `backend/audio_utils.py` naar:
```
249/250/251/bestaudio/best
```

Dit prefereert Opus 249 (~50 kbps), met fallback naar 250, 251, en uiteindelijk `bestaudio/best`.

**Impact op COGS:**
- Voor: ~€0.061 per 10 min AI-transcriptie (default audio)
- Na: ~€0.045 per 10 min AI-transcriptie (geoptimaliseerd audio)
- Besparing: 26% op COGS, relevant voor Power-tier margebehoud

---

## Rationale

- AssemblyAI transcribeert spraak nauwkeurig bij lage bitrates (wordt routinematig gebruikt voor telefoongesprekken op 8 kbps)
- De 12 kbps hercompressie vóór AssemblyAI upload maakt de hogere-kwaliteit download irrelevant
- Niet alle YouTube-video's bieden format 249 — de fallback chain is verplicht

---

## Risico

Niet alle video's bieden format 249. Het fallback-gedrag van yt-dlp is dat het de eerste beschikbare optie in de reeks neemt — dit is standaard yt-dlp-gedrag en veilig.

**Vereiste validatie vóór productie-deploy:**
- [ ] Test AssemblyAI transcriptie-kwaliteit met Opus 249 op 50 diverse video's (variatie in accenten, achtergrondgeluid, muziek, snelheid)
- [ ] Monitor proxy-bandbreedte usage voor/na wijziging in Railway logs
- [ ] Verifieer fallback chain werkt correct als format 249 niet beschikbaar is

---

## Consequenties

- [ ] `backend/audio_utils.py`: format selector aanpassen
- [ ] Validatietest uitvoeren vóór deploy naar productie
- [ ] COGS-documenten bijwerken na validatie (margin tabel in ADR-012)

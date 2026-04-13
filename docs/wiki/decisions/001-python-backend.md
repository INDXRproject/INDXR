# Beslissing 001: Aparte Python FastAPI Backend

**Status:** Geaccepteerd  
**Datum:** 2025-01 (initieel), verfijnd 2025-03  
**Gerelateerde code:** `backend/main.py`, `backend/Dockerfile`

---

## Context

INDXR.AI moet YouTube-video's verwerken: audio downloaden, comprimeren, en transcriberen. Dit vereist zware native tools (yt-dlp, ffmpeg) en langlopende operaties die slecht passen in een serverless Node.js omgeving.

De standaardkeuze voor een Next.js project zou zijn: alles in Next.js API routes afhandelen. Dat werkte niet voor deze use case.

---

## Beslissing

Een aparte **FastAPI (Python 3.12)** service draaien als zelfstandig proces, gedeployd op Railway via Docker.

De Next.js frontend communiceert met de backend via REST (`PYTHON_BACKEND_URL` env var). De Python backend heeft exclusief toegang tot:
- yt-dlp (YouTube downloader)
- ffmpeg (audio conversie)
- AssemblyAI SDK
- bgutil-pot (Rust binary, YouTube PO tokens)
- DeepSeek API aanroepen

---

## Rationale

**Waarom niet alles in Next.js?**

1. **yt-dlp vereist Python.** Er is geen stabiele Node.js equivalent. De JavaScript ports zijn incomplete wrappers.
2. **ffmpeg** kan in Node.js via `fluent-ffmpeg`, maar audio-extractie van YouTube vereist een gecombineerde yt-dlp + ffmpeg pipeline die in Python aanzienlijk volwassener is.
3. **Vercel heeft een 60s timeout** op API routes. Audio-transcriptie kan 5–10 minuten duren. Railway heeft geen timeout-limiet op langlopende processen.
4. **Vercel's serverless heeft geen persistent filesystem.** yt-dlp schrijft tijdelijke audiobestanden weg; dat vereist een echte `/tmp`-directory, wat beperkt beschikbaar is in serverless.
5. **Python's async/await** in FastAPI + uvicorn met `uvloop` is efficiënt voor I/O-heavy workloads zoals API calls en subprocessen.

**Alternatieven overwogen:**
- `child_process.spawn` vanuit Node.js → fragiel, moeilijk te debuggen, geen goede error handling voor yt-dlp
- Cloudflare Workers → geen filesystem, geen Python, no-go
- Aparte Node.js backend → heeft dezelfde yt-dlp problemen

---

## Consequenties

**Voordelen:**
- Volledige controle over de Python ecosysteem tools
- Railway-deployment is simpel: Dockerfile + `uvicorn main:app`
- Kan langlopende jobs verwerken zonder timeout

**Trade-offs:**
- Twee deployments te managen (Vercel + Railway)
- Extra env var (`PYTHON_BACKEND_URL`) in frontend
- CORS-configuratie vereist (frontend origins hardcoded in `main.py:98-108`)
- `BACKEND_API_SECRET` nodig voor auth tussen Next.js en Python

**Risico's:**
- Als Railway down is, valt de gehele extractie weg (frontend toont error)
- Python package updates vereisen nieuwe Docker build + push

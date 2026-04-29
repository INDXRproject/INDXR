# Beslissing 029: Caption extraction en AI transcription als aparte producten

**Status:** Geaccepteerd  
**Datum:** 2026-04-29  
**Gerelateerd:** ADR-027 (cascade-strategie), error-taxonomy.md, taak 1.6, taak 1.19b

---

## Context

De oorspronkelijke roadmap (taak 1.6) beschreef een vijf-staps cascade:
youtube-transcript-api → yt-dlp ios/web_embedded → yt-dlp tv/android →
AssemblyAI → needs_manual_review.

Tijdens implementatie 2026-04-29 werd het conceptuele probleem helder:
stappen 4 en 5 zijn fundamenteel anders dan stappen 1-3.

---

## Het onderscheid

INDXR.AI biedt twee verschillende producten:

**Product 1 — Caption extraction (gratis)**
YouTube heeft de captions al. Wij halen ze op via meest betrouwbare route.
Stappen 1-3 zijn een technische strategie binnen dit product om YouTube's
anti-bot maatregelen te omzeilen. User klikt één keer, krijgt resultaat,
betaalt niets.

**Product 2 — AI transcription (betaald, 1 credit/minuut)**
Wij genereren een transcript via AssemblyAI omdat YouTube er geen heeft of
omdat de gebruiker een hogere kwaliteit wil. Dit kost echte AssemblyAI
API-kosten, dus betaalt de user credits. User kiest dit expliciet via
"Generate with AI" knop.

---

## Beslissing

"Stap 4 (audio→AssemblyAI)" en "Stap 5 (needs_manual_review)" zoals beschreven
in de originele roadmap-tekst worden **niet** gebouwd als automatische
cascade-stappen.

**Redenen:**
1. **Credit-model** — user mag niet onverwachts gerekend worden
2. **User-controle** — kostenbeslissingen zijn user-keuzes, geen backend-keuzes
3. **Premium-positionering** — geen verrassingen, transparante kosten
4. **Onmogelijke pre-flight check** — we kunnen vooraf niet weten of audio
   spraak bevat (zou pas duidelijk worden na betaalde AssemblyAI call)

**In plaats daarvan:**
- Cascade Product 1 eindigt na stap 3 met een helder `error_type`
- Frontend toont AI-transcription suggestie alleen bij `error_type`s waar
  het zinvol is: `no_captions`, `bot_detection`, `extraction_error`
- User klikt expliciet "Generate with AI" → bestaande Whisper-flow →
  AssemblyAI met expliciete credit-deductie
- Bij no_speech-detectie tijdens AssemblyAI: automatische refund (bestaand gedrag)

`needs_manual_review` als concept vervalt — vervangen door duidelijke
`error_type`-gebaseerde messaging (taak 1.19b).

---

## Consequenties

**Voordelen:**
- Geen onverwachte kosten voor users
- Heldere conceptuele scheiding tussen gratis en betaald product
- Premium-positionering versterkt
- Geen complexe pre-flight detection-logica

**Trade-offs:**
- User moet één extra klik doen voor AI transcription (acceptabel —
  expliciete consent voor kostentransactie)
- Cascade voelt "korter" dan oorspronkelijk gepland (verwarring voorkomen
  we via deze ADR)

**Algemene les:**
Bij toekomstige features die een gratis-product koppelen aan een betaald-product:
altijd expliciete user-consent vereisen voor de overgang. Geen automatische
trigger naar betaalde flows.

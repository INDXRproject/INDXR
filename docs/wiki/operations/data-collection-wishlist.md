# Data Collection Wishlist

Verzamelplaats voor "data die we willen verzamelen voor toekomstige 
dashboards en optimalisaties". Geen ADR (geen beslissing), geen taak 
(te vroeg), wel vindbaar bij implementatie van taak 2.5 (Sentry alerts 
+ cost-report) en 2.6 (volledige admin-dashboard).

Bijgewerkt bij elk inzicht tijdens het bouwen.

---

## Cascade-pad tracking (per extractie)

**Vastgesteld:** 2026-04-28

Bij elke succesvolle transcript-extractie willen we weten via welke 
cascade-stap het is gelukt. Data is nu nog niet zichtbaar buiten 
Railway logs (die verlopen na 7 dagen).

**Voorgesteld PostHog event:**

extraction_success {
  video_id, language, model_used, source_method,
  cascade_step,        // 1=youtube-transcript-api, 2=yt-dlp ios, 
                       // 3=yt-dlp tv/android, 4=audio→AssemblyAI
  duration_seconds,
  latency_ms,
  proxy_session_id,
  was_cached
}

Plus cascade_step_failure events voor elke gefaalde stap zodat we 
zien hoe vaak elke stap faalt op weg naar de uiteindelijk succesvolle.

**Aggregatie-mogelijkheden:**
- "X% van extractions slaagde via stap 1 deze week"
- "Stap 2 latency mediaan vs stap 1"
- "Audio-fallback rate per maand" (kostenindicator)

**Wanneer:** bij taak 2.5 of als sub-deliverable bij afronding van 
cascade stappen 2-5 in taak 1.6.

---

## Master cache hit/miss attribution

**Vastgesteld:** 2026-04-28

master_transcripts is sinds vandaag write-only. Bij read-logic 
(taak 1.11) willen we tracken:

master_cache_event {
  video_id, language, transcription_model,
  outcome,             // "hit" | "miss" | "stale" | "deprecated"
  age_days,
  saved_credits,       // bij audio-cache hit
  saved_extraction_seconds
}

**Aggregatie-mogelijkheden:**
- Master cache hit rate per week (moat-groei zichtbaar)
- Total saved-credits per maand

---

## Cost-tracking per extractie

**Vastgesteld:** 2026-04-28

Voor cost-rapportage willen we per extractie ruwe kosten schatten:

extraction_cost {
  video_id, cascade_step,
  proxy_mb_used,
  assemblyai_minutes,
  estimated_cogs_eur,
  user_paid_credits
}

**Wanneer:** bij 2.5 (Sentry alerts + cost-report).

---

## Algemene regel

Bij elk nieuw inzicht tijdens implementatie: voeg een sub-sectie toe 
aan dit bestand. Niet vergeten — dit is precies het soort idee dat 
tijdens bouw-stress vluchtig is.

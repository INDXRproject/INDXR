# Beslissing 070: Per-model AssemblyAI STT-COR + model-chain met Universal-3.5 Pro

**Status:** Geaccepteerd
**Datum:** 2026-07-22
**Gerelateerde code:** `backend/assemblyai_client.py`, `supabase/migrations/20260722101609_per_model_stt_cor.sql` (`cost_config` per-model kolommen + `public.assemblyai_stt_eur_per_min()` + `_geld_scope`)

## Context

De transcriptie-COR gebruikte **één statisch tarief** (`cost_config.assemblyai_eur_per_min` = $0,21/uur) terwijl er in de praktijk **drie modellen met twee prijspunten** draaien. `speech_models` is bovendien een **taal-router**, geen error-fallback: AssemblyAI kiest het beste gevraagde model dat de gedetecteerde taal native dekt, en legt dat effectieve model vast in `transcription_jobs.assemblyai_model`.

Geverifieerde feiten (Claude-research + eigen empirische test 2026-07-22):
- Universal-2 = **$0,15/uur**; Universal-3 Pro = **$0,21/uur**; Universal-3.5 Pro = **$0,21/uur**.
- **Geen EU-premie op speech-to-text** (EU-tarief = US-tarief) — anders dan de AssemblyAI **LLM Gateway** (gemini-2.5-flash), die wél 10% in-region-premie heeft.
- Universal-3 Pro dekt native maar **6 talen** (EN/ES/PT/FR/DE/IT); andere talen routen naar Universal-2 (99 talen). Dit verklaart waarom onze Arabische playlist volledig op Universal-2 draaide.
- Model-ids gebruiken **streepjes**: `universal-3-5-pro` (NIET `universal-3.5-pro` — dat geeft een API-fout `"speech_models" must be a non-empty list containing one or more of: "universal-3-pro", "universal-2", "universal-3-5-pro"`).

**Open empirische vraag (DEEL 1):** dekt `universal-3-5-pro` méér talen native dan die 6? Getest met twee echte calls tegen de EU-endpoint (Railway-key), `speech_models=["universal-3-5-pro","universal-2"]`, effectief model uit `speech_model_used`:

| Fragment | `language_code` | Effectief model |
|----------|-----------------|-----------------|
| Engels (wildfires.mp3) | `en` | **`universal-3-5-pro`** |
| Arabisch (Al-Fatiha, ~52s) | `ar` | **`universal-3-5-pro`** |

→ **Universal-3.5 Pro transcribeert Arabisch native** (routet NIET naar Universal-2). Het dekt dus méér talen dan de 6 van Universal-3 Pro, tegen hetzelfde $0,21/uur.

## Beslissing

1. **Model-chain (`backend/assemblyai_client.py`):** `speech_models = ["universal-3-5-pro", "universal-3-pro", "universal-2"]`. Base_url blijft de EU-endpoint. Zo draait elke door 3.5 Pro gedekte taal op het beste model, dan 3 Pro, dan Universal-2 als brede taal-router. Geverifieerd: nieuwe chain → Engels effectief `universal-3-5-pro`.

2. **Per-model COR (`cost_config` + `_geld_scope`):**
   - Nieuwe USD/uur-kolommen in `cost_config` (USD opgeslagen, `usd_eur_rate` bij query — zelfde patroon als de LLM-gateway- en R2-tarieven): `assemblyai_stt_usd_per_hour_universal2` (0.15), `_universal3pro` (0.21), `_universal35pro` (0.21), `_fallback` (0.21). **Geen EU-premie-kolom** — die bestaat niet voor STT.
   - Rate-helper `public.assemblyai_stt_eur_per_min(model)` (STABLE, SECURITY DEFINER, `REVOKE`'d van anon/authenticated, `GRANT` service_role) = één bron voor de model→tarief-mapping.
   - `_geld_scope` berekent de STT-audio-COR **per run** op basis van `transcription_jobs.assemblyai_model` (`Σ_run duur/60 × rate(model)`), op beide COR-plekken (scope-totaal + per-user against-revenue), nooit scope-gemiddeld.
   - Legacy runs zonder model (`assemblyai_model IS NULL`, van vóór de capture-kolom) → **gedocumenteerde fallback = het incumbent $0,21/uur**, zodat hun COR niet retroactief verschuift.

## Rationale

- Een **statisch provider-tarief is fout zodra de provider meerdere modellen met eigen prijzen draait.** Universal-2-runs werden **te duur** geboekt ($0,21 i.p.v. $0,15). Per-run boeken op het effectieve model herstelt de marge.
- USD-opslag + FX-bij-query houdt de tarieven wijzigbaar zonder deploy en reconstrueerbaar (provenance), consistent met de bestaande AssemblyAI-LLM/Decodo/R2-rates.
- Fallback = incumbent rate ⇒ geen retroactieve herwaardering van 104 uur niet-toewijsbare legacy-runs (dekkingsgraad-issue expliciet i.p.v. stil nul/gemiddelde).

## Consequenties

- **COR-delta (live herberekening, all-time, geverifieerd):** AI-transcriptie-COR **€30,2940 → €28,9977** (−€1,2962). De hele delta zit in de **Universal-2-bucket = de Arabische playlist** (23,48 uur): audio-COR **€4,5369 → €3,2406** (−€1,2962, −28,6%). Richting bevestigd: het statische tarief **overboekte** Universal-2.
- **Onafhankelijke cross-check** (som over ruwe rijen) = €28,9977, exact gelijk aan de functie-output.
- **Reconciliatie intact:** `(cor_against_revenue − recognized_fee) + granted_delivery_cost = Σ methode-COR` blijft **exact** kloppen (29,0101 = 29,0101) — de against/goodwill-splitsing blijft consistent met de volle COR (zelfde bugklasse als ADR-063).
- **Dekkingsgraad `assemblyai_model`:** gevuld sinds 2026-07-11. Van de complete non-cache jobs: `universal-2` 29 jobs/23,48u, `universal-3-pro` 7 jobs/3,11u, **NULL (legacy) 182 jobs/104,10u** → fallback. Forward-only; **geen snapshot-backfill** (bestaande `finance_daily_snapshot`-rijen blijven bevroren, conform ADR-064 — nieuwe snapshots gebruiken automatisch de per-model-COR via `_geld_scope`).
- **Kwaliteit/kosten forward:** omdat 3.5 Pro nu ook talen als Arabisch native dekt, draaien die runs voortaan op $0,21/uur i.p.v. $0,15 (hogere kwaliteit, iets hogere COR) — bewuste tradeoff, geen bug.
- `cost_config.assemblyai_eur_per_min` blijft bestaan (nog getoond in het `rates`-driverblok van `admin_finance_summary`/`admin_geld_summary`) maar wordt **niet meer voor COR gebruikt**. Die display-regels vervangen door de per-model-tarieven kan mee in de Finance-UI-redesign (F24).
- Alleen COR geraakt: `_sale_vat()`, `vat_by_country` en de omzet-/BTW-recognitie zijn **niet** aangeraakt.

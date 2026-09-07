# Privacy claims — verification log

Doel: elke privacy-/dataverwerkingsclaim op publieke pagina's (met name de commerciële comparison-pagina
`/alternatives/otter-ai`, ADR-105) is hier gekoppeld aan de **bron van verificatie** en de **datum**.
Verifieer tegen de **werkelijke configuratie** (code, endpoints, provider-dashboard/API), **niet** tegen
deze wiki of andere docs. Als een dienst migreert, hercontroleer de betreffende regel en werk datum +
bevinding bij. Regel: schrijf op de pagina alleen wat hier als **VERIFIED** staat.

Laatste volledige controle: **2026-09-07**.

---

## VERIFIED — mag op de pagina staan

| Claim | Bron van verificatie | Datum | Bevinding |
|-------|----------------------|-------|-----------|
| Geen bot; gebruiker levert zelf de opname | Productontwerp — er is geen meeting-bot-integratie; upload/YouTube-invoer in `backend/main.py` (`/api/transcribe/whisper`, `source_type` `upload`/YouTube) | 2026-09-07 | Correct. Geen Zoom/Teams/Meet-bot in de codebase. |
| Audio wordt niet opgeslagen; alleen een tijdelijk bestand tijdens de job, daarna verwijderd | `backend/main.py:957` (upload → `tempfile.NamedTemporaryFile(prefix="indxr_upload_")`), pipeline-`finally` `backend/transcription_pipeline.py:1078-1081` (`os.remove`), startup-sweep `backend/main.py:139-151` (verwijdert wees-`indxr_upload_*` na herstart) | 2026-09-07 | Correct. Audio wordt **nooit** naar R2 geschreven (grep op `transcription_pipeline.py` = 0 R2/put_object). |
| Alleen transcript-**tekst** wordt bewaard | R2 gebruikt uitsluitend bucket `indxr-transcripts` voor JSON (`backend/master_cache.py:64,173`); geen audio-bucket bestaat in code | 2026-09-07 | Correct. |
| Transcriptie op AssemblyAI **EU-endpoint** | `backend/assemblyai_client.py:9` → `aai.settings.base_url = "https://api.eu.assemblyai.com"` | 2026-09-07 | Correct (code-literal). |
| AI-samenvattingen op AssemblyAI **EU LLM-gateway** | `backend/summary_pipeline.py:47` → `LLM_GATEWAY_URL = "https://llm-gateway.eu.assemblyai.com/v1/chat/completions"` | 2026-09-07 | Correct (code-literal). |
| Database (transcripts + accountdata) in de **EU, Ierland** | Supabase Management API (`list_projects`): project `uivlvwcplcaixkzuiwsv` `region: "eu-west-1"`, `ACTIVE_HEALTHY` | 2026-09-07 | Correct. `eu-west-1` = Ierland. |
| Product-analytics op **EU-instance, cookieless** | `apps/marketing/next.config.ts` + `apps/app/next.config.ts` (PostHog project 298689 EU, ingest-proxy naar EU-host, `eu-assets.i.posthog.com`; comment: prod-ingest landt in EU-project, geverifieerd 2026-09-02); `/privacy` stelt reeds "cookieless and EU-hosted" | 2026-09-07 | Correct. Op de pagina bewust "an EU instance" (niet "PostHog") — feit blijft juist. |
| Toestemming van opgenomen personen ligt bij de gebruiker | Juridisch/feitelijk: de gebruiker levert de opname; wij nemen niets op | 2026-09-07 | Correct; expliciet op de pagina benoemd (ADR-105-eis). |

---

## NIET geverifieerd — NIET op de pagina zetten

| Claim (bewust weggelaten) | Waarom niet | Wat wél waar is |
|---------------------------|-------------|-----------------|
| "24-uurs lifecycle op de audio-bucket" | **Er is geen audio-bucket.** Audio gaat naar een lokaal temp-bestand en wordt na de job verwijderd; het komt nooit in R2. De aanname in de opdracht komt niet overeen met de architectuur. | Sterker + juist: audio wordt **nooit** in object-storage bewaard (zie VERIFIED-regel over het temp-bestand). |
| AssemblyAI "opted out of model training" + "retention 1 dag" | Dat zijn **account-dashboard-instellingen** van AssemblyAI; niet te verifiëren vanuit de repo. Een code-comment noemt "TTL = 1 dag" maar dat is een aanname in resume-logica, geen bewijs van de accountinstelling. `/articles/audio-to-text` claimt dit wél (redactioneel); op de concurrent-pagina bewust niet herhaald. | Alleen het **EU-endpoint** is code-geverifieerd en staat op de pagina. |
| "Alles wordt in de EU verwerkt" (blanket) | **Railway** (backend die het temp-audiobestand verwerkt) en **Vercel** (frontend) hun regio is niet vanuit de repo te verifiëren; `vercel.json` heeft geen `regions`. | De pagina noemt per component alleen wat bevestigd EU is (AssemblyAI STT, summary-gateway, DB, analytics). Geen blanket-EU-zin. |
| E-mail (Resend) EU | Resend (`smtp.resend.com`, sender `no-reply@send.indxr.ai`) regio niet vanuit repo te verifiëren; bovendien transactionele auth-mail, geen opname-data. | Weggelaten uit de privacy-sectie (niet relevant voor opname-verwerking). |

---

## Herbruik

Bij een nieuwe comparison-pagina of een privacy-tekst: kopieer alleen VERIFIED-regels, en hercontroleer
elke regel als de betreffende dienst mogelijk is gemigreerd (Supabase-regio via Management API,
AssemblyAI/gateway/R2 via de code-literals hierboven, PostHog via `next.config.ts`). Railway/Vercel-regio
blijven onbevestigd tot iemand ze in het dashboard verifieert en hier toevoegt.

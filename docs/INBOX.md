# INBOX — Binnenkomende taken voor Claude Code

---

=== SESSIE 2026-04-27 — Sentry, smart polling, caption cache ===

VOLTOOID:
- Taak 1.1 — Sentry frontend + backend (cross-project geverifieerd)
- Taak 1.2 — Sentry User Feedback widget op /dashboard/account
- Taak 1.3 — Smart polling backoff 1s/5s/15s (3 polling-locaties)
- Taak 1.4 — Caption cache in Redis (cross-user HIT geverifieerd)

INFRASTRUCTUUR-FIX (los van takenlijst):
- logger.setLevel(INFO) toegevoegd in backend/main.py — uvicorn 
  basicConfig gotcha, alle backend INFO-logs werkten voorheen niet
- Gedocumenteerd in wiki/operations/monitoring.md

ARCHITECTUUR-INZICHT (toegevoegd aan ADR-021):
- master_transcripts cache-lookup is best-available match, niet 
  exact-model match
- Model-keuze is backend-only, transparant voor user (geen UX-prompt)
- Verhouding tussen frontend duplicate-check en master_transcripts 
  expliciet gedocumenteerd

OPGERUIMD:
- /account dode reliek-pagina verwijderd
- /sentry-test routes (frontend + backend + API proxy) verwijderd
- 3 tijdelijke diagnostische cache-logs verwijderd

VOLGENDE: Taak 1.5 — ARQ via Upstash Redis (durable job queue)
- Grootste architecturale taak in Fase 1, 2-3 dagen
- Khidr heeft een prompt klaarliggen die CC vraagt eerst de codebase 
  te onderzoeken en een gefaseerd plan voor te stellen
- Geen implementatie tot Khidr het plan goedkeurt

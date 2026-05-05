# Cleanup-001 verslag

**Sessie:** 2026-05-05  
**Doel:** Pre-migratie cleanup — cross-host links, env vars, CORS, dode code  
**Restore-checkpoint:** commit 1fc0589

---

## Uitgevoerd

- [x] **A1** `TranscriptCard.tsx:428` — `<a href="/dashboard/billing">` → `<a href={appHref('/dashboard/billing')}>` + import toegevoegd
- [x] **A2** `contact/page.tsx:161` — `<a href="/dashboard/messages">` → `<a href={appHref('/dashboard/messages')}>` + import toegevoegd
- [x] **A3** `PlaylistManager.tsx:474,675,686` — `window.location.href = '/dashboard/library'` en twee `href="/dashboard/library/${id}"` → appHref() + import toegevoegd
- [x] **A4** free-tool/* link audit — **4 extra hits gefixed** in `AudioTab.tsx:673` en `VideoTab.tsx:1160,1328,1345`. Eén extra gemiste hit gevonden tijdens re-grep (`VideoTab.tsx:1160`) en direct gefixed. `library/TranscriptList.tsx:262` en `library/TranscriptViewer.tsx:726,763` zijn app-only bevestigd — terecht `<Link>` gelaten.
- [x] **B1** `auth/actions.ts` NEXT_PUBLIC_SITE_URL → APP/MARKETING_URL split:
  - Regel 113 (signUp emailRedirectTo) → `NEXT_PUBLIC_MARKETING_URL`
  - Regel 146 (OAuth redirectTo) → `NEXT_PUBLIC_MARKETING_URL`
  - Regel 222 (resetPasswordForEmail /dashboard/settings) → `NEXT_PUBLIC_APP_URL`
  - Regel 243 (resend emailRedirectTo) → `NEXT_PUBLIC_MARKETING_URL`
- [x] **B2** Codebase-wide grep `NEXT_PUBLIC_SITE_URL` → **0 hits** in src/ + backend/
- [x] **B3** `.env.example` — geen `NEXT_PUBLIC_SITE_URL` aanwezig, skip
- [~] **C1** AudioTab directe backend-aanroep — **onderzoek only, geen wijziging** (zie Onderzoeksrapport hieronder)
- [x] **D1** `backend/main.py` CORS — `"https://app.indxr.ai"` toegevoegd na `"https://www.indxr.ai"`
- [x] **E1** `src/components/HeroImage.tsx` — geen importers → deleted
- [x] **E2** `src/components/AuthModal.tsx` — geen importers → deleted
- [x] **E3** `src/components/CreditBalance.tsx` — geen importers → deleted (actieve versie is `src/components/ui/credit-balance.tsx`)
- [x] **E4** `src/components/FeatureCard.tsx` — geen importers → deleted
- [x] **F** LESSONS.md — 3 regels toegevoegd (cross-host patronen, env-var naamgeving, Vercel body limit)

---

## Onderzoeksrapport DEEL C — AudioTab directe backend-aanroep

**Endpoint:** `POST /api/transcribe/whisper` op Railway

**Reden voor directe call:**  
`AudioTab.tsx:343` heeft een expliciete code-comment: _"POST file directly to Railway (bypasses Vercel 4.5MB body limit)"_. De call gebruikt XHR (niet fetch) om upload-progress events te krijgen. Dit is een bewuste architectuurkeuze.

**Huidige variabele:** `process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL` — dit is de generieke backend-URL die ook voor andere doeleinden bestaat.

**Advies voor Khidr:** De directe call is gerechtvaardigd (4.5MB limiet is een harde Vercel-constraint voor request bodies). Na de migratie naar twee Vercel-projecten blijft dit probleem bestaan op `app.indxr.ai`. Aanbeveling: hernaam de env-var naar `NEXT_PUBLIC_AUDIO_UPLOAD_URL` in `apps/app/` zodat de intent helder is en niet vermengd raakt met server-side Railway calls. Maar dit is een migratie-sessie keuze, geen blocker voor de cleanup.

**Geen wijziging uitgevoerd in AudioTab.tsx.**

---

## Verificatie-output

**npm run build:** PASS  
Alle 86 pagina's gegenereerd, geen TypeScript-errors, geen build-fouten.

**Cross-host link grep (na fixes):**
```
src/components/library/TranscriptList.tsx:262   ← app-only, terecht <Link>
src/components/library/TranscriptViewer.tsx:726 ← app-only, terecht <Link>
src/components/library/TranscriptViewer.tsx:763 ← app-only, terecht <Link>
```
0 lekkende cross-host links buiten (app)/ voor free-tool/components.

**NEXT_PUBLIC_SITE_URL grep:** 0 hits in src/ + backend/

**Python CORS grep:**
```
allow_origins=[
    "http://localhost:3000",
    "http://localhost:3001",
    "https://indxr.ai",
    "https://www.indxr.ai",
    "https://app.indxr.ai",   ← nieuw
    "https://indxr.vercel.app",
],
```

---

## Gewijzigde files

| File | Wijziging |
|------|-----------|
| `src/components/TranscriptCard.tsx` | A1: appHref import + link fix |
| `src/app/contact/page.tsx` | A2: appHref import + link fix |
| `src/components/PlaylistManager.tsx` | A3: appHref import + 3× link fix |
| `src/components/free-tool/AudioTab.tsx` | A4: appHref import uitgebreid + link fix |
| `src/components/free-tool/VideoTab.tsx` | A4: appHref import uitgebreid + 4× link fix |
| `src/app/auth/actions.ts` | B1: 4× NEXT_PUBLIC_SITE_URL vervangen |
| `backend/main.py` | D1: app.indxr.ai aan CORS toegevoegd |
| `src/components/HeroImage.tsx` | E1: deleted |
| `src/components/AuthModal.tsx` | E2: deleted |
| `src/components/CreditBalance.tsx` | E3: deleted |
| `src/components/FeatureCard.tsx` | E4: deleted |
| `docs/LESSONS.md` | F: 3 nieuwe lessen toegevoegd |

---

## Vragen voor Khidr

1. **AudioTab directe backend-call (Deel C):** Wil je `NEXT_PUBLIC_PYTHON_BACKEND_URL` hernoemd hebben naar `NEXT_PUBLIC_AUDIO_UPLOAD_URL` in de monorepo-setup, of gebruik je dezelfde var in `apps/app/` voor alle Railway-calls?

2. **`.env.example` updaten:** `NEXT_PUBLIC_APP_URL` en `NEXT_PUBLIC_MARKETING_URL` staan al in de codebase maar zijn niet gedocumenteerd in `.env.example`. Wil je dat ik dit toevoeg in de volgende sessie, of wacht je tot de migratie compleet is?

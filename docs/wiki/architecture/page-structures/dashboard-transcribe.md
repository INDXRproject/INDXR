# Page-structure: `/dashboard/transcribe` (app)

**Bron van waarheid voor de app-variant van de Transcribe-tool.**
**Aangemaakt:** 2026-07-26 (ADR-079)
**Code:** `apps/app/src/app/dashboard/transcribe/page.tsx`

De marketing-variant (`/transcribe`) staat in [free-tool.md](free-tool.md). Beide renderen dezelfde
gedeelde **`TranscribeWorkbench`**; alleen de page-wrapper verschilt.

---

## Verschil met de marketing-variant

| | App (`/dashboard/transcribe`) | Marketing (`/transcribe`) |
|---|---|---|
| Shell | DashboardShell (topbar + sidebar/bottom-tab-bar) | MarketingShell (Header/Footer) |
| Kop | H1 "Transcribe" + subregel (geen eyebrow) | SEO-H1 "Free YouTube Transcript Generator" |
| Auth | altijd ingelogd (`isAuthenticated={true}`) | auth-aware + `FrictionConversionCard`-gating |
| Save | volledige retry/duplicate/placeholder-logica (`handleTranscriptLoaded`, `processVideo`) + `SaveErrorModal` | minimale insert |
| Below-fold | geen (focus-pagina) | PricingTeaser + FAQ + ClosingCTA |
| Hexagon | **uit** (per-pagina opt-in, ADR-079) | n.v.t. |

---

## Structuur (van boven naar beneden)

1. **Kop** — H1 "Transcribe" + één subregel ("Extract captions from videos, playlists, or audio files."). Geen "DASHBOARD"-eyebrow.
2. **`ActiveJobsIndicator`** — link naar `?mode=playlist` als er een playlist-job loopt.
3. **Storage-full banner** — conditioneel (library vol → caption-save geblokkeerd; ADR-078).
4. **`TranscribeWorkbench`** (`max-w-[640px]`, gecentreerd) — mode-strip · body · footer; `?mode=`-state; zie [free-tool.md → Anatomie](free-tool.md).
   - `renderVideo` → `VideoTab` (`onBusyChange`, `onPlaylistDetected`/`onSwitchToAudio` via `switchMode`)
   - `renderPlaylist` → `PlaylistTab` (`onPlaylistComplete` schrijft `playlist_jobs`, `onExtractingChange`, `onBusyChange`)
   - `renderAudio` → `AudioTab` (`onBusyChange`)
5. **Idle (onder de kaart)** — `RecentTranscripts` (laatste 3, verborgen zodra `busy`). Uitgelogd bestaat niet hier (altijd authed).
6. **Stille docs-link** — "Learn how transcription works →" (cross-host naar `/docs`).
7. **`SaveErrorModal`** — bij mislukte auto-save.

---

## Beslissingen

- **Geen fork van de tab-bodies** — `VideoTab`/`PlaylistTab`/`AudioTab` zijn gedeeld; deze page levert alleen wiring via render-prop-slots (ADR-079).
- **`onBusyChange`** aggregeert naar één `busy`-state die de idle-`RecentTranscripts` verbergt; inactieve tabs zijn (Radix) unmounted en melden `false` bij unmount, dus `busy` weerspiegelt de actieve modus.
- **Job-state onaangeroerd** — progress/result-**render** loopt via de gedeelde `JobProgressCard`/`ResultCardShell`, maar job/SSE/resume/dedup-**state** blijft binnen de tab-componenten (resume-op-mount ongewijzigd). Het uit de monolieten tillen = POST-LAUNCH (`priorities.md`).
- **Hexagon uit** — werkoppervlak; per-pagina opt-in via `DashboardBackdrop`, hier niet gerenderd (system.md §5).

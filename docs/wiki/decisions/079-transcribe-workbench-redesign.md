# Beslissing 079: Transcribe-werkbank herontwerp — gedeelde workbench, ?mode= via History API, bronkeuze, hexagon per-pagina opt-in

**Status:** Geaccepteerd
**Datum:** 2026-07-26
**Gerelateerde code:**
- `packages/shared/src/components/transcribe/` — `TranscribeWorkbench`, `ModeStrip`, `SourceChoice`, `ResultCardShell`, `JobProgressCard`, `TranscriptResultCard`, `RecentTranscripts`
- `packages/shared/src/components/icons/TranscribeModeIcons.tsx` — custom hexagon mode-iconen
- `packages/shared/src/components/DashboardBackdrop.tsx` — per-pagina hexagon opt-in
- `packages/shared/src/components/{FrictionConversionCard,MicroTrustRow}.tsx` — gepromoveerd uit marketing
- `packages/shared/src/components/free-tool/{VideoTab,AudioTab,PlaylistTab}.tsx`, `PlaylistManager.tsx`, `ui/CompletionReceipt.tsx`
- `apps/marketing/src/app/transcribe/page.tsx`, `apps/app/src/app/dashboard/transcribe/page.tsx`
- `apps/app/src/app/dashboard/layout.tsx`, `.../library/page.tsx`, `.../messages/MessagesClient.tsx`
- `packages/shared/src/components/Header.tsx`, `apps/app/src/components/AvatarDropdown.tsx`

## Context

De Transcribe-tool bestond uit drie losse layouts onder één kop (video-toggle, playlist-prijsparagraaf van drie regels, audio-dropzone met losse creditregel). Inactieve tabbladen vielen weg (wit-op-crème zonder rand), de actieve tab was massief amber waardoor de Extract-knop disabled oogde, en tabwissels veranderden de URL niet. De pagina wordt gefilmd voor de homepage (Remotion), dus rust, vaste breedte en geen dode ruimte zijn functionele eisen.

Bevinding vooraf: `VideoTab`/`PlaylistTab`/`AudioTab` waren al gedeeld in `packages/shared/src/components/free-tool/` en werden door beide apps identiek geïmporteerd. Er was **geen fork**; unificatie van de shell in één pass was veilig. Het verschil zat uitsluitend in de dunne page-wrappers (kop, save-handlers, auth/friction).

## Beslissing

1. **Eén gedeelde `TranscribeWorkbench`** (kaart-shell, `max-w-[640px]`, gecentreerd, dichte `--surface`) met vaste anatomie: header (mode-strip) · body (actieve tab: invoer + actieknop) · footer (bron-/kostenregel binnen de tab-body). Beide apps renderen dit via een render-prop-API (`renderVideo/renderPlaylist/renderAudio`, elk met `switchMode`); verschil in gedrag via de slots (auth-aware friction op marketing, always-authed in de app), niet via een fork.

2. **`?mode=video|playlist|audio` via de History API.** Lezen met `useSearchParams`, schrijven met `window.history.replaceState` — **niet** `router.replace`. `router.replace` rerendert het route-segment (ook met `scroll:false`); dat segment houdt de live job-state van de tabs, en een tabwissel mid-job zou die kunnen weggooien, plus 200–500ms hapering zichtbaar op de Remotion-opname. `replaceState` is de shallow-route in de App Router en `useSearchParams` pikt de wijziging op. Default en onbekende waarde ⇒ `video`, geen redirect. Op marketing blijft `alternates.canonical` de kale URL (ADR-077).

3. **Bronkeuze i.p.v. toggle.** De "Generate with AI"-toggle (incl. sparkle-icoon) vervalt; vervangen door een 2-cels `SourceChoice` in de video-footer ("Auto-captions" + Free-badge / "AI transcription" + "1 credit/min"), gebonden aan de bestaande `useWhisper`/`useWhisperRef` — **geen state-lift**. Getallen uit `pricing.ts`. Uitgelogd: de AI-cel blijft zichtbaar maar is gated via een nieuwe `onAiRequiresAuth`-prop op `VideoTab` ⇒ `FrictionConversionCard` (opties zichtbaar houden is de vastgelegde keuze in `free-tool.md`).

4. **Dashed empty-state box weg.** De "Transcript results will appear here"-box is verwijderd. Idle-states op paginaniveau: ingelogd ⇒ `RecentTranscripts` (laatste 3 uit de bestaande transcripts-query, nul ⇒ render niets); uitgelogd ⇒ `MicroTrustRow`. Idle verdwijnt zodra een job start via een observationele `onBusyChange`-callback op de drie tabs (raakt géén job-state). Geen toasts, in geen enkele state.

5. **Gedeelde resultaat-chrome zonder state te verplaatsen.** `ResultCardShell` is de chrome-primitive; `JobProgressCard` (determinate, §4-stages + live elapsed) rendert erin en vervangt de losse `TranscriptionProgress`-render in alle drie de modi; `CompletionReceipt`'s buitenchrome loopt nu ook via `ResultCardShell`, en de playlist-batchafronding rendert binnen `ResultCardShell`. Zo delen progress én resultaat exact dezelfde chrome. Job-/SSE-/resume-/dedup-**state** blijft ongemoeid binnen de tab-componenten — het uit de monolieten tillen is uitgesteld (zie `priorities.md`).

6. **Custom hexagon mode-iconen** (`TranscribeModeIcons.tsx`), gebouwd op het pointy-top house-hexagon-motief (dezelfde geometrie als `HexagonEmptyState`/`HexagonPattern`), niet Lucide. 24×24, fill none, stroke currentColor 1.75, round — die weight matcht Lucide bewust (§4) zodat ze naast de nav-iconen staan zonder stijlbreuk. Actieve cel kleurt via currentColor naar `--accent`. Dit zijn de enige custom iconen in de product-UI naast `HexagonCreditIcon`; geen bredere icoon-migratie.

7. **Hexagon per-pagina opt-in.** De `HexagonPattern` is uit `dashboard/layout.tsx` gehaald (lag layout-breed over élke dashboardpagina, terwijl §5 het patroon alleen toestaat op empty states / marketing / auth / 404 / footer). Nu per pagina opt-in via `DashboardBackdrop`, zonder pathname-conditie in de layout: transcribe/Home uit, Messages alleen empty-state, Library aan (vastgelegde uitzondering, LESSONS 2026-07-03).

8. **Mobiele navigatie.** App: Account/Settings/Sign out van het avatar-`DropdownMenu` naar een rechts-in-schuivende `Sheet`; bottom tab bar blijft primair (geen sidebar-trigger <md). Marketing: hamburger-dropdown → full-screen `Sheet` met 44px-rijen (Pricing/Docs/Articles · scheiding · Log in · Sign up full-width · theme-toggle).

## Rationale

- **Geen fork** was al de realiteit voor de tab-bodies; de shell verenigen is dus geen valse abstractie maar het wegwerken van gedupliceerde page-wrappers.
- **History API i.p.v. router.replace** beschermt live job-state en Remotion-rust (bewezen redenering + Next.js discussions #49540/#60080; issue #64064 noteert dat `useParams`-consumers alsnog rerenderen — de workbench-boom gebruikt `useParams` niet).
- **Bronkeuze in-place** levert de nieuwe UX zonder de 1400-regel-`VideoTab` te herstructureren; het #1-risico (job-state) blijft onaangeroerd.
- **`ResultCardShell` als enige chrome-primitive** geeft identiek uiterlijk in alle modi zonder de credit-logica in `CompletionReceipt` te dupliceren (dat zou de valse abstractie zijn die de opdracht verbiedt).
- **Hexagon per-pagina** herstelt §5: het patroon hoort niet op werkoppervlakken; de layout-brede wash was de afwijking. Een pathname-conditie in de layout zou bij de volgende pagina stilzwijgend weer fout gaan.

## Consequenties

- `FrictionConversionCard` + `MicroTrustRow` leven nu in `packages/shared/src/components/` (beide apps importeerbaar); de marketing-kopieën zijn verwijderd.
- `TranscriptResultCard` is gebouwd als brief-genoemde primitive op `ResultCardShell`; de live resultaat-render gebruikt `CompletionReceipt` (credit-aware, nu op dezelfde shell). Beide delen `ResultCardShell` → identieke chrome.
- `ActiveJobsIndicator` linkt nu naar `?mode=playlist` (was `?tab=playlist`).
- `min-h-full` op beide `DashboardBackdrop`-lagen houdt de volledige-hoogte-keten zodat Library's textuur byte-identiek reikt.
- **Uitgesteld (POST-LAUNCH):** job/progress-state uit de drie tab-monolieten naar één gedeeld slot — raakt live job-/SSE-/resume-/dedup-logica en vereist verificatie met echte jobs.
- **Niet in dit environment verifieerbaar:** de echte-job-test (tabwissel + refresh mid-job met credit-verbruik) en browser-checks (WCAG-contrast, 390px, dark mode) — gemarkeerd `[~]` in het taakrapport.

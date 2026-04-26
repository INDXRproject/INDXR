# Codebase Audit Report — 2026-04-26
status: processed  
generated-by: Claude Code (knip + vulture + ruff + depcheck + handmatige checks)  
supersedes: docs/CODEBASE_AUDIT.md (2026-04-14, verouderd)

---

## Knip — ongebruikte exports, bestanden, dependencies

### Ongebruikte bestanden (6)
```
src/components/ConditionalHeader.tsx
src/components/HeroUIPreview.tsx
src/components/library/CollectionPanel.tsx
src/components/library/LibraryTranscriptCard.tsx
src/components/library/StorageMeter.tsx
src/components/PlaylistAvailabilityModal.tsx
```

### Ongebruikte npm dependencies (10)
```
@hookform/resolvers        package.json:15
@radix-ui/react-avatar     package.json:16
@radix-ui/react-slider     package.json:24
@stripe/stripe-js          package.json:29
@tiptap/extension-highlight package.json:32
cmdk                       package.json:39
date-fns                   package.json:40
openai                     package.json:46
react-hook-form            package.json:53
tailwindcss-animate        package.json:58
```

### Ongebruikte devDependencies (1)
```
tw-animate-css             package.json:71
```

### Unlisted dependencies (3)
```
postcss           postcss.config.mjs
@tiptap/core      src/components/library/TranscriptViewer.tsx:28
@tiptap/pm/state  src/components/library/TranscriptViewer.tsx:29
```
Opmerking: @tiptap/core en @tiptap/pm zijn in gebruik maar niet in package.json — transient dep via @tiptap/extension-*. Toevoegen als directe dep aanbevolen.

### Ongebruikte exports (7)
```
AuthProvider               src/hooks/useAuth.ts:2:19
resegmentTranscript        src/utils/formatTranscript.ts:92:17   (intern gebruikt, export overbodig)
wrapSubtitleText           src/utils/formatTranscript.ts:151:17  (intern gebruikt, export overbodig)
buildRagChunks             src/utils/formatTranscript.ts:266:17  (intern gebruikt, export overbodig)
validateEmail              src/utils/validation.ts:19:17
extractVideoId             src/utils/youtube.ts:51:17
extractPlaylistId          src/utils/youtube.ts:60:17
```

### Ongebruikte exported types (12)
```
SearchOptions              src/components/library/TranscriptViewer.tsx:85
JsonLdProps                src/components/seo/JsonLd.tsx:1
UserCredits (interface)    src/contexts/AuthContext.tsx:8
UserProfile                src/contexts/AuthContext.tsx:15
AuthContextType            src/contexts/AuthContext.tsx:23
UserCredits (type)         src/hooks/useAuth.ts:2
UseAuthReturn              src/hooks/useAuth.ts:2
SubtitleBlock              src/utils/formatTranscript.ts:86
RagChunk                   src/utils/formatTranscript.ts:242
RagJsonContext             src/utils/formatTranscript.ts:417
PasswordValidationResult   src/utils/validation.ts:5
ValidationResult           src/utils/youtube.ts:13
```

---

## TypeScript — ongebruikte locals/parameters (--noUnusedLocals --noUnusedParameters)

Alleen app-code (src/); test-bestanden apart gegroepeerd.

### src/ — applicatiecode
```
src/app/account/page.tsx(11)                           'toast' nooit gebruikt
src/app/api/check-playlist-availability/route.ts(148)  'getVideoMetadata' gedeclareerd maar nooit gebruikt
src/app/api/jobs/[job_id]/route.ts(9)                  'request' param ongebruikt
src/app/api/video/metadata/[videoId]/route.ts(6)       'request' param ongebruikt
src/app/auth/actions.ts(9,57)                          'prevState' (2×) nooit gebruikt
src/app/auth/actions.ts(12)                            'redirectTo' nooit gebruikt
src/app/dashboard/billing/success/page.tsx(3)          'useState' import ongebruikt
src/app/dashboard/transcribe/page.tsx(19)              'isExtracting' nooit gebruikt
src/app/dashboard/transcribe/page.tsx(195)             'processVideo' gedeclareerd maar nooit gebruikt
src/app/signup/page.tsx(5,7,10)                        'PasswordInput', 'CardContent', 'validatePassword' ongebruikt
src/components/PlaylistAvailabilitySummary.tsx(56)     'duplicateAction', 'setDuplicateAction' ongebruikt
src/components/TranscriptCard.tsx(69)                  'videoUrl' prop nooit gebruikt in JSX
src/components/TranscriptCard.tsx(101,110)             'formatSrtTimestamp', 'formatVttTimestamp' — dode lokale functies (zie Handmatige bevindingen)
src/components/app-sidebar.tsx(28)                     'UserAvatar' import ongebruikt
src/components/dashboard/WelcomeCreditCard.tsx(5,11)   'Zap' en 'CheckResult' ongebruikt
src/components/dashboard/settings/ProfileSettingsCard.tsx(6)  'CardFooter' import ongebruikt
src/components/dashboard/settings/SecuritySettingsCard.tsx(4,7) 'Input', 'CardFooter' imports ongebruikt
src/components/free-tool/AudioTab.tsx(27)              'onTranscriptLoaded' param ongebruikt
src/components/free-tool/VideoTab.tsx(348)             'estimatedCredits' nooit gebruikt
src/components/library/AiSummaryView.tsx(3)            'React' import ongebruikt
src/components/ui/logo.tsx(1)                          'React' import ongebruikt
src/utils/supabase/middleware.ts(20)                   'options' param ongebruikt
```

### tests/ — playwright specs
```
tests/playwright/helpers/auth.ts(1)          'expect' ongebruikt
tests/playwright/specs/01-*.spec.ts(8)       'extractVideo' ongebruikt
tests/playwright/specs/02-*.spec.ts(8,11)    'SEL', 'PLAYLIST_SEL' ongebruikt
tests/playwright/specs/03-*.spec.ts(10,11,276) 'path', 'fs', 'originalContent' ongebruikt
scripts/verify-phase-0.ts(20)               'testRateLimit' ongebruikt
```

---

## Python vulture/ruff — dode code backend

### ruff (F401, F811, F841)
```
backend/main.py:4    F401  `import json` geïmporteerd maar nooit gebruikt
backend/main.py:212  F811  `extract_video_id` gedefinieerd op regel 212 — opnieuw gedefinieerd op regel 594 zonder de eerste te verwijderen
backend/main.py:957  F841  `video_url` toegewezen maar nooit gebruikt (dead assignment)
```

### vulture (--min-confidence 80)
Geen bevindingen — alle functies/klassen in de 4 backend-bestanden worden gebruikt.

---

## depcheck — ongebruikte npm packages

### Ongebruikte runtime deps
```
@hookform/resolvers
@stripe/stripe-js
@tiptap/extension-highlight
openai
tailwindcss-animate
```

### Ongebruikte devDeps
```
@tailwindcss/postcss
tw-animate-css
```

### False positives (depcheck fouten — niet echt ongebruikt)
```
@tiptap/core, @tiptap/pm   — in gebruik in TranscriptViewer.tsx; niet in package.json (zie unlisted)
youtube-transcript          — scripts/check-return-value.js (util-script, geen productie)
obsidian, @codemirror/*    — docs/.obsidian/plugins/ (Obsidian dataview plugin, geen app code)
meriyah, astring           — backend/venv/ yt-dlp vendor (geen node dep)
```

---

## Handmatige bevindingen

### WhisperFallbackModal.tsx — status
**BESTAND BESTAAT NIET.** `src/components/free-tool/WhisperFallbackModal.tsx` is verwijderd (of is nooit aangemaakt). Geen imports gevonden die ernaar verwijzen — geen actie nodig.

### rag-export.ts — exports en gebruik
Bestand: `src/app/actions/rag-export.ts`  
Twee geëxporteerde server actions:
- `saveRagChunkSizeAction` — geïmporteerd in `src/components/dashboard/settings/DeveloperExportsCard.tsx` ✓
- `deductRagExportCreditsAction` — geïmporteerd in `src/components/TranscriptCard.tsx` en `src/components/library/TranscriptViewer.tsx` ✓

Beide exports zijn actief in gebruik. Geen dode code.

### Export-duplicatie (TranscriptCard vs formatTranscript) — per format

| Format | TranscriptCard.tsx | formatTranscript.ts | Situatie |
|--------|-------------------|---------------------|----------|
| TXT (plain) | `createParagraphMode()` — delegeert | `generateTxt()` geëxporteerd | **DUPLICATIE**: TC importeert `createParagraphMode` direct; `generateTxt` bestaat maar wordt nergens gebruikt |
| TXT (timestamps) | Inline logica | `generateTxt(ts=true)` geëxporteerd | **DUPLICATIE**: zelfde resultaat, twee codepaden |
| SRT | `generateSrt()` — delegeert ✓ | `generateSrt()` geëxporteerd | Correct gecentraliseerd |
| VTT | `generateVtt()` — delegeert ✓ | `generateVtt()` geëxporteerd | Correct gecentraliseerd |
| CSV | **Inline logica** (regels 282–316) | `generateCsv()` geëxporteerd | **DUPLICATIE**: beide produceren hetzelfde formaat; TC-versie heeft meer metadatavelden (published, duration_seconds, language); `generateCsv` in formatTranscript nooit geïmporteerd |
| JSON | **Inline logica** (regels 252–280) | geen equivalent | Alleen in TC |
| Markdown | **Inline logica** met YAML frontmatter (regels 193–249) | `generateMarkdown()` geëxporteerd | **DUPLICATIE**: TC-versie heeft YAML frontmatter + timestamp-links; `generateMarkdown` nooit geïmporteerd |
| RAG JSON | `buildRagJson()` — delegeert ✓ | `buildRagJson()` geëxporteerd | Correct gecentraliseerd |

**Bijzonder geval — dode lokale functies in TranscriptCard.tsx:**  
`formatSrtTimestamp` (regel 101) en `formatVttTimestamp` (regel 110) zijn gedeclareerd als lokale functies inside de component. Ze worden nergens aangeroepen — TC gebruikt `generateSrt`/`generateVtt` van formatTranscript (die intern hun eigen formatter hebben). Dit zijn volledig dode functies; TypeScript rapporteert ze ook als unused. Zie ADR-018 voor consolidatiestrategie.

### assemblyai versie in requirements.txt
`backend/requirements.txt:1` — `assemblyai` heeft **geen versienummer**.  
Alle andere packages in het bestand hebben een pinned versie (bijv. `lingua-language-detector==2.2.0`).  
**Risico:** Een breaking change in de assemblyai SDK wordt automatisch opgehaald bij de volgende `pip install -r requirements.txt` of Docker build, zonder dat er een review plaatsvindt.  
**Aanbeveling:** Pin versie na `pip show assemblyai` → bijv. `assemblyai==0.x.x`.

### audio_utils.py findings
- Geen ongebruikte imports — `Dict`, `Optional`, `os`, `subprocess`, `logging`, `time`, `AudioSegment`, `yt_dlp` worden alle gebruikt.
- Constanten `SUPPORTED_FORMATS`, `MAX_FILE_SIZE_MB`, `MAX_FILE_SIZE_BYTES`, `MEMBERS_ONLY_KEYWORDS` zijn correct gedefinieerd — geen hardcoded magic strings in de logica.
- `'12k'` bitrate-string verschijnt twee keer (`extract_youtube_audio` en `compress_audio_if_needed`) — de waarde is identiek en de context is duidelijk gecommentarieerd; geen actie vereist.
- Bestand is schoon.

---

## Processing method consistentie

Alle voorkomens van `'youtube_captions'`, `'assemblyai'`, `'whisper_ai'` in src/ en backend/:

### `'youtube_captions'`
```
backend/main.py:1462      'processing_method': 'youtube_captions'  — playlist captions insert
backend/main.py:1571      'processing_method': 'youtube_captions'  — playlist captions insert (2e pad)
src/app/dashboard/transcribe/page.tsx:76   processing_method: 'youtube_captions'  — dashboard insert
src/app/dashboard/transcribe/page.tsx:115  processing_method: 'youtube_captions'  — dashboard insert
src/app/dashboard/transcribe/page.tsx:203  effectiveMethod = 'youtube_captions'    — upsell pad
src/app/youtube-transcript-generator/page.tsx:61  'youtube_captions'               — landingspagina voorbeeld
src/app/youtube-transcript-json/page.tsx:117      "extraction_method": "youtube_captions"  — code snippet
src/components/free-tool/VideoTab.tsx:266–499    sessie-keys + DB inserts
src/components/library/TranscriptList.tsx:93     display-logica
src/components/PlaylistManager.tsx:185,305,594   playlist lookups
src/types/transcript.ts:11   union type definitie
```

### `'assemblyai'`
```
backend/main.py:964       'processing_method': 'assemblyai'  — backend Whisper job insert ✓
src/app/actions/rag-export.ts:53    .eq('processing_method', 'assemblyai')  — RAG fallback query ✓
src/components/free-tool/AudioTab.tsx:589  extractionMethod="assemblyai"     — AudioTab prop ✓
src/components/free-tool/VideoTab.tsx:273,307,312,318,578,690  — DB reads (query assemblyai) + state set
src/components/PlaylistAvailabilitySummary.tsx:42,207,268      — lookup (whisper_ai || assemblyai) ✓
src/components/PlaylistManager.tsx:595       — lookup (whisper_ai || assemblyai) ✓
src/utils/formatTranscript.ts:98,279,434    — logica (assemblyai || whisper_ai) ✓
src/components/TranscriptCard.tsx:181,296   — display (assemblyai || whisper_ai) ✓
```

### `'whisper_ai'`
```
src/app/admin/page.tsx:80   .eq("processing_method", "whisper_ai")  ⚠️ PROBLEEM: mist 'assemblyai' rijen
src/components/free-tool/VideoTab.tsx:156   state type: 'youtube_captions' | 'whisper_ai'  ⚠️ mist 'assemblyai'
src/components/free-tool/VideoTab.tsx:267,577,689  sessie-keys (sessionStorage, niet DB) — OK
src/components/free-tool/VideoTab.tsx:695   processing_method: 'whisper_ai'  ⚠️ PROBLEEM: frontend schrijft 'whisper_ai' naar DB (playlist-pad Pad A)
src/components/free-tool/VideoTab.tsx:823   processing_method: 'whisper_ai'  ⚠️ PROBLEEM: frontend schrijft 'whisper_ai' naar DB (playlist-pad Pad B)
src/components/library/TranscriptList.tsx:95   whisper_ai || assemblyai — afhandelt beide ✓
src/components/PlaylistAvailabilitySummary.tsx:42,207,268   whisper_ai || assemblyai ✓
src/components/PlaylistManager.tsx:595   whisper_ai || assemblyai ✓
src/types/transcript.ts:11  union type: 'youtube_captions' | 'whisper_ai'  ⚠️ mist 'assemblyai'
```

**Samenvatting inconsistentie:**
- Backend schrijft altijd `'assemblyai'` (correct).
- Frontend-playlist-pad (VideoTab.tsx:695,823) schrijft nog `'whisper_ai'` naar DB → dubbele waarden in de `processing_method` kolom.
- `src/types/transcript.ts` union type mist `'assemblyai'` → type-onveiligheid.
- `src/app/admin/page.tsx` Whisper-telquery filtert alleen op `'whisper_ai'` → telt nieuwere transcripts (backend-geschreven) **niet mee** → admin teller incorrect.

---

## Actielijst

### Dode code verwijderen
- [ ] **6 ongebruikte component-bestanden verwijderen** — `ConditionalHeader.tsx`, `HeroUIPreview.tsx`, `CollectionPanel.tsx`, `LibraryTranscriptCard.tsx`, `StorageMeter.tsx`, `PlaylistAvailabilityModal.tsx` | effort: laag
- [ ] **`formatSrtTimestamp` + `formatVttTimestamp` in `TranscriptCard.tsx` verwijderen** (regels 101–116) — dode lokale functies, TC gebruikt generateSrt/generateVtt | effort: laag
- [ ] **`import json` verwijderen uit `backend/main.py:4`** — ruff F401 | effort: laag
- [ ] **Tweede `extract_video_id` def verwijderen uit `backend/main.py:594`** — F811, eerste def op regel 212 blijft | effort: laag
- [ ] **`video_url` toewijzing verwijderen uit `backend/main.py:957`** — F841 | effort: laag
- [ ] **Ongebruikte npm packages verwijderen** — @hookform/resolvers, @radix-ui/react-avatar, @radix-ui/react-slider, @stripe/stripe-js, @tiptap/extension-highlight, cmdk, date-fns, openai, react-hook-form, tailwindcss-animate, tw-animate-css | effort: laag (mits testen)

### Inconsistenties oplossen
- [ ] **`processing_method` schrijfpad normaliseren in VideoTab.tsx** — regels 695 en 823 schrijven `'whisper_ai'`; moet `'assemblyai'` zijn conform backend | effort: laag
- [ ] **`src/types/transcript.ts:11` union type uitbreiden** — `'youtube_captions' | 'whisper_ai'` → `'youtube_captions' | 'whisper_ai' | 'assemblyai'` | effort: laag
- [ ] **Admin Whisper count query fixen** — `src/app/admin/page.tsx:80` filtert alleen op `'whisper_ai'`; uitbreiden met `OR processing_method = 'assemblyai'` | effort: laag
- [ ] **Export-logica consolideren** — zie ADR-018; `generateCsv`, `generateMarkdown`, `generateTxt` in formatTranscript zijn duplicaten van inline logica in TranscriptCard | effort: medium

### Security / robustness
- [ ] **`assemblyai` pinnen in `requirements.txt`** — bepaal versie via `pip show assemblyai`, voeg toe als `assemblyai==x.y.z` | effort: laag
- [ ] **`@tiptap/core` en `@tiptap/pm` toevoegen als directe deps** in package.json (nu unlisted, transient via @tiptap-extensies) | effort: laag

### Quick wins
- [ ] **Ongebruikte TypeScript imports opruimen** — ~20 unused locals in app-code (toast, CardFooter, React, etc.) — `tsc --noUnusedLocals` toont volledige lijst | effort: laag
- [x] **Ongebruikte exports internal maken** — `resegmentTranscript`, `wrapSubtitleText`, `buildRagChunks` in formatTranscript zijn intern; `export` verwijderen | **gedaan 2026-04-26**

---

## Implementatiestatus
- [x] Bug 1: processing_method inconsistentie — 2026-04-26
- [x] ADR-018: export consolidatie (Optie A) — 2026-04-26
- [x] Fase 3: dode code verwijderd (6 bestanden, 3 Python-issues, 6 npm-packages) — 2026-04-26
- [x] Fase 4: assemblyai==0.63.0 gepind in requirements.txt — 2026-04-26

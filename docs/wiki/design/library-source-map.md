# Library source map — de kaart

**Rol:** dit document speelt voor de Library dezelfde rol die
[`architecture/finance-map.md`](../architecture/finance-map.md) speelt voor Finance. Het is
read-only geïnventariseerd tegen de **broncode**: waar dit document en een andere wiki-pagina
botsen, is dit nagerekend tegen de code en wint de code.

**Scope:** `/dashboard/library` (lijst) + `/dashboard/library/[id]` (detail).

**Wie dit leest zonder de codebase te kunnen openen, kan hieruit beantwoorden:** welke velden per
transcript-rij beschikbaar zijn, waar elk zichtbaar UI-element vandaan komt, welke state waar leeft
en wat een refresh overleeft, en welke tokens/testids de badges, tabs en exports dragen.

---

## 0. Samenvatting in één alinea

De **lijst** (`/dashboard/library`) is een client-component (`"use client"`) die vanuit de browser
`supabase.from("transcripts_list").select(...)` doet — een lichte Postgres-**view** (`security_invoker`)
die alleen de kolommen bevat die de lijst rendert plus vier `has_*`-presence-booleans, zodat de zware
`transcript`-jsonb nooit mee wordt opgehaald. Filters, zoeken, sortering en paginatie draaien
**server-side** over de hele set en leven in de **URL** (`?q=`, `?status=`, `?source=`, `?has=`,
`?dur=`, `?added=`, `?sort=`, `?dir=`, `?collection=`, `?page=`). De **detailpagina** (`[id]`) is een
**server-component** die de volledige rij één keer ophaalt (`select("*")` op de basistabel), de
conditionele tabs server-side berekent en de rij aan client-view-componenten doorgeeft. De volledige
transcripttekst leeft in Postgres (`transcripts.transcript`, jsonb) — niet in R2 — dus het lees-pad
doet geen R2-fetch. De collecties-sidebar is desktop-only en leeft in de dashboard-shell
(`app-sidebar.tsx`), niet in de Library-route.

---

## 1. Render-boom

### 1.1 `/dashboard/library` (lijst)

```
DashboardBackdrop                         (shared) honeycomb-achtergrond + content-wrapper
└─ LibraryContent  (page.tsx, Client)     hele route: header, toolbar, chips, lijst, paginatie
   ├─ <h1> "Library" (of collectie-naam)  + teller "· N of TOTAL transcripts" (of "TOTAL")
   ├─ LibraryControls                      zoekveld + Filter/Sort/Density (desktop) + mobiele triggers/sheets
   │   ├─ Search-Input                     data-testid="library-search"
   │   ├─ Filter-DropdownMenu (desktop)    data-testid="library-filter" → FilterPanel
   │   ├─ Sort-DropdownMenu (desktop)      data-testid="library-sort"   → SortPanel
   │   ├─ DensityToggle (desktop)          Rows3 = default, Rows2 = compact
   │   ├─ mobiele "Filters & sort"-knop    → Sheet met FilterPanel + SortPanel + DensityToggle
   │   └─ mobiele collecties-knop          → Sheet met "All Transcripts" + collecties (radio)
   ├─ actieve filter-chips-rij             collectie-chip + één chip per actieve filter + "Clear all"
   ├─ listError-banner                     (alleen bij fetch-fout)
   ├─ TranscriptList  (Client)             de lijst zelf — zie 1.2
   └─ paginatie-nav                        alleen als filteredCount > pageSize
```

- **`DashboardBackdrop`**, `HexagonPattern`, `HexagonEmptyState` en alle `ui/`-primitives zitten in
  `packages/shared` → **elke visuele wijziging daaraan raakt ook de marketing-app**. De lijst-,
  toolbar- en badge-logica is lokaal in `apps/app` en veilig los te herontwerpen.
- De **collecties-sidebar** (desktop) leeft in `apps/app/src/components/app-sidebar.tsx`, in de
  dashboard-shell (`dashboard/layout.tsx`), **niet** in deze route. Een lijstrij is `draggable`; hij
  wordt op een collectie in die sidebar gedropt om te verplaatsen.

### 1.2 `TranscriptList.tsx` — de lijst zelf

```
TranscriptList
├─ download error/warning-banners
├─ mobiele "Select / Done"-balk           (sm:hidden) → selectionMode
├─ omkaderde lijst-container
│   ├─ desktop header-rij                  TriBox (select-all) · "Title" · Duration · Words · Added
│   └─ per transcript één rij:
│       ├─ Checkbox                        desktop hover/selected; mobiel alleen in selectionMode
│       ├─ titel als <Link> → /dashboard/library/[id]   (dubbelklik-vrij; rename via rij-menu)
│       │   └─ unread-dot (bg-warning) vóór de titel als de rij ongelezen is
│       ├─ badges-rij                      transcriptBadges(t) → CC|AI · SUM? · RAG?  + CollectionBadge
│       │   (compact-density: badges inline achter de titel; default: op regel 2)
│       ├─ mobiele metadata-regel          duration · words · datum   (sm:hidden)
│       ├─ desktop metadata-kolommen       w-16 Duration · w-24 Words · w-24 Added (tabular-nums)
│       ├─ desktop hover-acties            Export-DropdownMenu (Download-icoon) + ⋯ rowMenu
│       └─ mobiele ⋯-knop                  → rowSheet (bottom-sheet)
├─ desktop floating bulk-bar              data-testid="bulk-bar-desktop"  (bij selectie > 0)
├─ mobiele bulk-bar                       data-testid="bulk-bar-mobile"
├─ Sheets: bulk-export, bulk-move, rij-acties
├─ RAG-export-Dialog (single + bulk, kostenoverzicht + credits)
└─ delete-AlertDialog ("This can't be undone.")
```

- **Twee lege staten** (bij `transcripts.length === 0`), gestuurd door de `narrowed`-prop:
  - `narrowed` (filter/zoekterm actief): "No transcripts match" + "Clear all filters"-knop.
  - anders (bibliotheek echt leeg): "Library is empty" + "Transcribe a video"-CTA.
- **Rij-menu (`rowMenu`, desktop ⋯):** Open transcript · Watch on YouTube · Mark as read (indien
  ongelezen) · Export (submenu) · Move to collection (submenu, `MoveToCollectionMenu`) · Rename ·
  Copy plain text · Delete.
- **Select-all is tri-state** (`TriBox`): leeg / indeterminate (`someSelected`) / vol (`allSelected`),
  scope = **de huidige pagina** (`transcripts` = alleen de geladen rijen).
- **Density** (`default` | `compact`) verandert alleen de rij-layout, niet de data.

### 1.3 `/dashboard/library/[id]` (detail) — zie §5.

---

## 2. De data

### 2.1 De lijst-view: `public.transcripts_list`

De lijst leest **niet** de basistabel maar de view `transcripts_list`
(`supabase/migrations/20260731160000_transcripts_list_view.sql`). De view is
`WITH (security_invoker = true)` — de RLS van de basistabel (`auth.uid() = user_id`) wordt als de
bevragende user afgedwongen, dus de query filtert **niet zelf** op `user_id`. `SELECT` is alleen
gegrant aan `authenticated` (niet aan `anon`).

**De 14 kolommen die de view (en dus een lijstrij) blootstelt** — dit is de volledige waarheid over
wat per rij beschikbaar is in de lijst:

| Kolom | Type | Herkomst / betekenis |
|-------|------|----------------------|
| `id` | uuid | primaire sleutel (key, links naar detail) |
| `title` | text \| null | titel; null → UI toont `Video {video_id}` |
| `video_id` | text \| null | YouTube-id. **null bij geüploade audio** → geen YouTube-link/thumbnail |
| `created_at` | timestamptz | sort `date`, getoonde datum |
| `duration` | integer \| null | seconden; sort `duration`, duration-kolom, duration-filter |
| `character_count` | integer \| null | woorden-heuristiek = `round(cc / 5)` |
| `processing_method` | text \| null | bron-badge + source-filter (`youtube_captions` = CC, anders AI) |
| `collection_id` | uuid \| null | collectie-filter + `CollectionBadge` |
| `viewed_at` | timestamptz \| null | `null` → unread (NEW-dot); status-filter "Unread only" |
| `channel` | text \| null | meegezocht (title/channel/video_id); niet als eigen kolom getoond |
| `has_summary` | boolean | `ai_summary IS NOT NULL` → SUM-badge + `has:summary`-filter |
| `has_summary_edit` | boolean | `ai_summary ->> 'edited_html' IS NOT NULL` → SUM-badge in edited-variant |
| `has_edit` | boolean | `edited_content IS NOT NULL` → potlood op de bron-badge + `has:edited`-filter |
| `has_rag` | boolean | niet-lege `rag_exports`-array → RAG-badge + `has:rag`-filter |

De `has_*`-booleans zijn in de view berekend uit de zware jsonb-kolommen (`ai_summary`,
`edited_content`, `rag_exports`) van de basistabel; de lijst krijgt zo de aanwezigheid **zonder** de
inhoud te fetchen.

### 2.2 De lijst-query (verbatim, `page.tsx`)

```ts
// LIST_COLUMNS = "id, title, video_id, created_at, duration, character_count,
//                 processing_method, collection_id, viewed_at, channel,
//                 has_summary, has_summary_edit, has_edit, has_rag"
let query = supabase.from("transcripts_list").select(LIST_COLUMNS, { count: "exact" });
if (selectedCollectionId) query = query.eq("collection_id", selectedCollectionId);
query = applyLibraryFilters(query, filters, new Date());   // zoeken + status/source/has/dur/added
query = applyLibrarySort(query, filters);                  // sort + dir
const from = (page - 1) * pageSize;
query = query.range(from, from + pageSize - 1);            // server-side paginatie
```

Alle filter-/sort-/search-logica zit in **`filters.ts`** (`applyLibraryFilters`, `applyLibrarySort`,
`parseFilters`, `filterChips`), de single source voor hoe een filter mapt naar URL → query → chip:

- **Zoeken** (`?q=`): tot 6 whitespace-tokens, elk ge-`AND`-t, elk token matcht
  `title` OF `channel` OF `video_id` via `ilike`. `%,()` worden gestript.
- **Status** (`?status=unread`): `viewed_at IS NULL`.
- **Source** (`?source=captions|ai`): `processing_method = 'youtube_captions'` resp. `= 'assemblyai'`.
- **Has** (`?has=summary,edited,rag`, multi): `has_summary` / `has_edit` / `has_rag` = true.
- **Duration** (`?dur=lt10|10to30|30to60|gt60`): seconden-buckets `[0,600) / [600,1800) /
  [1800,3600) / [3600,∞)` op `duration`.
- **Added** (`?added=today|7d|30d`): `created_at >= cutoff` (today = middernacht lokaal, anders
  now − 7/30 dagen).
- **Sort** (`?sort=date|duration|title`, `?dir=asc|desc`): default `date desc`; `duration` met
  `nullsFirst:false`. De 6 UI-presets (Newest/Oldest/Longest/Shortest/Title A–Z/Z–A) mappen op
  `{sort,dir}`-paren; een default-waarde laat de param weg uit de URL.
- **Collectie** (`?collection=<id>`): `collection_id = <id>` (los van de filter-params).
- **Paginatie** (`?page=N`): `.range()` server-side; `page=1` = param afwezig. `pageSize` default 50,
  of `profiles.library_page_size` (eenmalig geladen).

Naast de gepagineerde fetch draait een tweede **head-count** (`count:"exact", head:true`, zonder
filters, wel collectie-scoped) voor de "N of TOTAL"-teller in de header.

### 2.3 Basistabel & detail-query

De **detailpagina** en de zware acties (download, copy, RAG-export) lezen wél de **basistabel**
`public.transcripts` (o.a. de `transcript`-jsonb). De detail-server-page doet:

```ts
supabase.from("transcripts").select("*").eq("id", id).eq("user_id", user.id).single()
```

(dubbele zekerheid: expliciete `user_id`-eq bovenop RLS; `notFound()` bij leeg/fout.) Extra velden die
alleen op de basistabel leven en die de detail gebruikt bovenop de 14 view-kolommen:

- `transcript` (jsonb, NOT NULL) — array van segmenten `{ text, offset, duration }` (`TranscriptItem`),
  de complete tekst. Geen R2-fetch in het lees-pad.
- `edited_content` (jsonb) — opgeslagen Tiptap-doc van de Edited-tab.
- `edited_content_updated_at` (timestamptz) — wanneer `edited_content` laatst geschreven is; voedt de
  stale-summary-melding.
- `ai_summary` (jsonb) — `{ text, action_points[], generated_at, edited, html?, edited_html? }`.
- `rag_exports` (jsonb array) — `{ chunk_size, exported_at, credits_spent }` per betaalde export.
- `language` (text, nullable) — meegegeven aan de viewer + RAG-export; niet in de lijst.
- `thumbnail_url` (text, nullable).

### 2.4 Collections-query

```ts
supabase.from("collections").select("id, name").eq("user_id", user.id)   // page.tsx (picker + chip-naam)
```

`public.collections` = `id`, `user_id`, `name`, `created_at`. De desktop-sidebar (`app-sidebar.tsx`)
leest collecties apart en leidt tellingen client-side af.

---

## 3. Verbatim: tokens, labels, formats, testids

### 3.1 Badges — `badges.tsx`

`transcriptBadges(t)` bouwt korte **mono-pillen**: exact één bron-badge (**`CC`** als
`processing_method === "youtube_captions"`, anders **`AI`**), dan optioneel **`SUM`** (bij
`has_summary`), dan optioneel **`RAG`** (bij `has_rag`). De "edited"-staat draagt zowel de `-soft`-tint
als een potlood-glyph (de tint alleen is op een 18px-pil niet leesbaar).

```ts
export const BADGE_CLASSES = {
  auto:            "bg-sky-subtle text-sky",
  "auto-edit":     "bg-sky-soft-subtle text-sky-soft",
  ai:              "bg-indigo-subtle text-indigo",
  "ai-edit":       "bg-indigo-soft-subtle text-indigo-soft",
  summary:         "bg-violet-subtle text-violet",
  "summary-edit":  "bg-violet-soft-subtle text-violet-soft",
  rag:             "bg-teal-subtle text-teal",
} as const;
```

| Pil | Variant | Wanneer | Potlood? |
|-----|---------|---------|----------|
| `CC` | `auto` / `auto-edit` | captions-bron | `has_edit` |
| `AI` | `ai` / `ai-edit` | AI-bron | `has_edit` |
| `SUM` | `summary` / `summary-edit` | `has_summary` | `has_summary_edit` |
| `RAG` | `rag` | `has_rag` | — |

`Badge` = `inline-flex … rounded-[3px] px-2 py-0.5 text-[10px] font-mono font-medium tracking-tight`.
`CollectionBadge` = omkaderde pil met `Folder`-icoon + collectie-naam (`dir="auto"`, `max-w-[10rem]`).
Dezelfde `transcriptBadges` + `Badge` worden op de **detailpagina** hergebruikt (`TranscriptHeader`).

### 3.2 Export-formats (`FORMAT_GROUPS`, `TranscriptList.tsx`)

8 file-formats in 3 groepen, plus RAG apart:

- **Text:** `txt` "Plain text (.txt)" · `txt-ts` "Text + timestamps (.txt)" · `md` "Markdown (.md)" ·
  `md-ts` "Markdown + timestamps (.md)"
- **Data:** `json` "JSON (.json)" · `csv` "CSV (.csv)"
- **Subtitles:** `srt` "SRT (.srt)" · `vtt` "VTT (.vtt)"
- **Developer:** "RAG JSON" — badge `PAID` (nog nooit geëxporteerd) of `PURCHASED` (`has_rag`).

Één id ⇒ los bestand; meerdere ⇒ ZIP. De detail-viewer (`TranscriptViewer`) heeft dezelfde lijst,
plus een "Edited version"-sectie (Edited .txt / Edited .md) wanneer er opgeslagen edits zijn.

### 3.3 Data-testids

| testid | Element |
|--------|---------|
| `library-search` | zoek-Input (lijst-toolbar) |
| `library-filter` | Filter-dropdown-trigger (desktop) |
| `library-sort` | Sort-dropdown-trigger (desktop) |
| `bulk-bar-desktop` | desktop floating bulk-actiebalk |
| `bulk-bar-mobile` | mobiele bulk-actiebalk |
| `transcript-tab-{id}` | detail-tab-link (`id` ∈ original/edited/summary/summary_edited/developer) |
| `transcript-view-selector` | mobiele view-selector-knop (detail) |

---

## 4. State & persistentie (lijst)

| State | Waar het leeft | Overleeft refresh? |
|-------|----------------|--------------------|
| Zoekterm | lokale `searchValue` (300 ms debounce) → `?q=` | **Ja** (via URL) |
| Alle content-filters | **URL** (`?status/source/has/dur/added=`) via `parseFilters` | **Ja** |
| Sortering + richting | **URL** (`?sort=`, `?dir=`) | **Ja** |
| Collectie-selectie | **URL** (`?collection=<id>`) | **Ja** |
| Paginatie | **URL** (`?page=N`; page=1 = afwezig) | **Ja** |
| Density (default/compact) | `localStorage["library-density"]` | **Ja** |
| Page-size | server — `profiles.library_page_size` (fallback 50) | **Ja** (per user in DB) |
| Selectie (bulk) | `useState(selectedIds: Set)` in `TranscriptList` | **Nee** |
| Selection-mode (mobiel) | `useState(selectionMode)` | **Nee** |
| Mark-as-read overlay | `useState(readIds)` + `useOptimistic`; canoniek in DB `viewed_at` | overlay nee, DB ja |
| Inline rename | `useState(editingId/editingTitle)` | **Nee** |
| Sidebar collapsed | `localStorage["sidebar-collapsed"]` (`app-sidebar.tsx`) | **Ja** |

Elke filter-/sort-/search-mutatie **reset naar page 1** (`updateParams` verwijdert `page`). Cross-component
sync loopt via het window-event **`transcripts-updated`** (dispatched na move/rename/delete/create; de
lijst en sidebar luisteren en re-fetchen). **Waar edits persisteren:** `title`, `viewed_at`,
`collection_id` en `edited_content`(+`edited_content_updated_at`) worden per rij teruggeschreven naar
`public.transcripts`; `ai_summary` (incl. `edited_html`) idem; `rag_exports` groeit per betaalde export.

---

## 5. Detailpagina — `/dashboard/library/[id]`

### 5.1 Render-boom

```
TranscriptPage  ([id]/page.tsx, Server)   auth-guard, rij-fetch (select("*")), tab-berekening
├─ TranscriptHeader  (Client)             breadcrumb → bewerkbare titel → één feitenregel
│   ├─ breadcrumb                          "‹ Library" (+ "/ {collectie}" als in collectie)
│   ├─ <h1> titel                          inline bewerkbaar (klik → input; Enter/Escape); schrijft title
│   └─ feitenregel                         badges + CollectionBadge · ⏱ duur · 📄 woorden · 📅 datum
├─ TranscriptTabs  (Client)               desktop-strip (role=tablist) / mobiele view-selector-sheet
└─ één van de view-componenten o.b.v. activeTab:
    ├─ original|edited → TranscriptViewer  (leescanvas, toolbar, video, Tiptap-editor)
    ├─ summary|summary_edited → AiSummaryView
    └─ developer → RagExportView
```

Geen `DashboardBackdrop` → **geen honeycomb** hier (bewust; dit is een werkoppervlak). De page is
`max-w-7xl mx-auto`.

### 5.2 Tab-resolutie (server-side, `?tab=`)

Tabs verschijnen **alleen als hun content bestaat**; een `?tab=` waarvan de content weg is valt terug
op `original` (nooit een dood tabblad). `?tab=` ∈ `{original, edited, summary, summary_edited,
developer}`, default `original`.

| Tab-id | Label | Verschijnt wanneer | DB-veld |
|--------|-------|--------------------|---------|
| `original` | **Transcript** | altijd | `transcript` |
| `edited` | **Edited** | `edited_content` bestaat **of** `?tab=edited` (verse edit-start) | `edited_content` |
| `summary` | **Summary** | `ai_summary` bestaat | `ai_summary` |
| `summary_edited` | **Edited summary** | `ai_summary.edited_html` bestaat | `ai_summary.edited_html` |
| `developer` | **Developer** | niet-lege `rag_exports`-array | `rag_exports` |

`activeTab` = de gevraagde tab als die in de zichtbare set zit, anders `original`. Tab-state = **URL**
(`<Link href="…?tab=…">`), overleeft refresh. De breadcrumb-collectienaam komt uit een aparte
`collections`-lookup wanneer `collection_id` gezet is.

### 5.3 `TranscriptViewer` (Original + Edited tabs)

Eén **68ch-leeskolom** (`max-w-3xl`, `[&_.ProseMirror]:max-w-[68ch]`). Structuur:

- **Toolbar** (sticky, rechts-uitgelijnd, `flex-wrap` zodat niets van het scherm valt):
  - **Find** — toggelt een zoekbalk (niet permanent zichtbaar); zoekt in-transcript via een custom
    ProseMirror `SearchExtension` (highlight + prev/next teller "n / N").
  - **Display** — dropdown met **Timestamps**-switch + **Text size** (Small / Default / Large).
  - **Copy** — eigen knop (kopieert de editor-tekst).
  - **Export** — dropdown met de 8 formats (Text/Data/Subtitles) + RAG JSON; plus "Edited version"
    (Edited .txt / .md) bovenaan als er opgeslagen edits zijn.
  - **Edit** (original-mode) → routeert naar `?tab=edited` (bewerkt nooit het origineel in-place).
    **Save** (edited-mode) → schrijft `edited_content` + `edited_content_updated_at`.
  - **⋯ overflow** — Watch on YouTube (alleen met `video_id`) · Summarise/Regenerate (3 credits) ·
    Revert to original (edited-mode) · Delete transcript.
- **Video** — **0px dicht**. "Watch video"-knop opent een sticky, in-app **nocookie** speler
  (`NocookieYouTubePlayer`): lazy `youtube-nocookie.com` IFrame-Player; geen YouTube-load/cookie tot de
  user hem opent. **Alleen bij een YouTube-bron** (`video_id` niet leeg); geüploade audio heeft geen
  video. Klik op een tijdstempel in de tekst **seekt** deze in-app speler (opent hem zo nodig).
- **Reader** — Tiptap-editor (`immediatelyRender: false`, `setEditable` via `useEffect`), geseed uit
  **`buildReadingParagraphs`**: segmenten worden tot leesbare alinea's samengevoegd met één
  leidend tijdstempel per alinea (i.p.v. één segment per regel). Bij `video_id` is het tijdstempel een
  `.ts-link`; bij geüploade audio een inerte `.ts-static`-marker. Timestamps zichtbaar/verborgen via de
  Display-switch (`hide-timestamps`-class).
- **Edit-mode** toont een formatting-toolbar (Bold/Italic/Underline/Bullet/Numbered).
- **Client-state:** `showTimestamps`, `showVideo`, `textSize` (s/m/l), `showSearch` + `searchQuery`,
  `isDirty`/`isSaving`/`hasSavedEdits`, RAG-modal-state. Bij mount: `viewed_at` gestampt als nog leeg
  (+ `transcripts-updated`-event zodat de NEW-badge in de lijst verdwijnt).

### 5.4 `AiSummaryView` (Summary + Edited summary tabs)

Tweede Tiptap-editor (`immediatelyRender: false`) over `ai_summary`. Toont `html`/`edited_html` (of een
default uit `text` + `action_points`). Copy · Export .txt · Edit → schrijft `ai_summary.edited_html`
(+ `edited: true`); een eerste edit vanuit `summary` routeert door naar `?tab=summary_edited`.
**Stale-melding:** als `ai_summary.generated_at` ouder is dan `edited_content_updated_at`, verschijnt
"This summary was written before you last edited the transcript" met een Regenerate-link.

### 5.5 `RagExportView` (Developer tab)

Her-download van eerder betaalde RAG-exports. Toont een **Export History**-tabel (Preset · Date ·
Credits · Re-download) uit `rag_exports`, plus een "Export New Preset"-blok waar elke chunk-preset
(30/60/90/120s) **gratis** opnieuw te downloaden is (`buildRagJson`). Render-guard: bij lege
`rag_exports` een lock-staat i.p.v. de tabel (kan nooit als gratis bypass dienen).

### 5.6 Gedeeld met de lijst

- **Componenten:** `badges.tsx` (`transcriptBadges`, `Badge`, `CollectionBadge`) — hergebruikt in
  `TranscriptHeader`. De view-componenten zelf zijn detail-only.
- **Utils/primitives (shared → marketing-impact):** `utils/formatTranscript`
  (`generateTxt/Csv/Srt/Vtt/Markdown`, `buildRagJson`, `buildReadingParagraphs`, `TranscriptItem`),
  `actions/rag-export`, `hooks/useAuth`, en de `ui/`-primitives.

---

## Cross-references

- Badge-/methodekleuren: ADR-080, `design/system.md`, tokens.css "Badge families".
- Library-lijst herontwerp (view + URL-filters + badges): ADR-083.
- Detail-herontwerp (header/tabs, 68ch-reader, nocookie-speler, stale-summary): ADR-085 +
  migratie `20260801120000_edited_content_updated_at`.
- Honeycomb-uitzondering (werkoppervlak): ADR-079, `LESSONS.md` [2026-07-03].
- Optimistische mark-as-read: `LESSONS.md` [2026-07-04].
- Tiptap `immediatelyRender: false`: `LESSONS.md` [2026-05-04].
- Opslaglimiet (echte cap): ADR-078.
</content>
</invoke>

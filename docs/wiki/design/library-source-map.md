# Library source map — de kaart voor het herontwerp

**Rol:** dit document speelt voor het Library-herontwerp dezelfde rol die
[`architecture/finance-map.md`](../architecture/finance-map.md) speelt voor Finance. Het is
read-only geïnventariseerd tegen de **broncode** en de **live productie-DB**
(`information_schema` / `pg_indexes`, project `uivlvwcplcaixkzuiwsv`), niet tegen een eerdere
wiki-versie. Waar dit document en een andere wiki-pagina botsen: **dit is nagerekend tegen de code**,
de code wint.

> ⚠️ **Deels achterhaald sinds ADR-083 (2026-07-31, Library-lijst herontwerp Fase 1).** De **lijst**
> (`page.tsx` + `TranscriptList.tsx`) is herbouwd: grid-view + thumbnails weg; twee-regelige rij met
> `dir="auto"`; badges = mono-pillen `CC`/`AI`/`SUM`/`RAG`; echte server-side filters (Status/Source/Has/
> Duration/Added) + chips; sort+dir+zoek in de URL; tri-state select-all (huidige pagina); rij- en
> bulk-menu gescheiden; Move-to-collection-semantiek; twee lege staten; mobiele bottom-sheets. De
> **data-read** gaat nu via de nieuwe view `transcripts_list` (`security_invoker=true`) i.p.v.
> `select("*")` op de basistabel. Nieuwe componenten: `LibraryControls.tsx`, `filters.ts`, `badges.tsx`,
> `MoveToCollectionMenu.tsx`, `components/icons/Beehive.tsx`. De **render-boom (§1)**, **de query (§2.1)**
> en **§6 (wat er niet is)** hieronder beschrijven de PRE-redesign staat; de **detailpagina (§8)** is nog
> onaangeroerd. §2.3 (kolominventaris), §5, §7 blijven geldig.

**Scope:** `/dashboard/library` (lijst) + `/dashboard/library/[id]` (detail). Alle regelnummers zijn
de stand bij het schrijven (2026-07-31, vóór ADR-083 tenzij anders vermeld).

**Wie dit leest zonder de codebase te kunnen openen, kan hieruit beantwoorden:** welke velden per
transcript-rij beschikbaar zijn, waar elk zichtbaar UI-element vandaan komt, wat gedeeld is met
marketing, en of zoeken-op-volledige-tekst + een taalfilter mogelijk zijn.

---

## 0. Samenvatting in één alinea

De Library is een **volledig client-side** pagina (`"use client"`) die rechtstreeks vanuit de browser
`supabase.from("transcripts").select("*")` doet met server-side filter/sort/paginatie. Er is **geen**
Next.js API-route en **geen** server-component voor de lijst. De detailpagina (`[id]`) is wél een
**server-component** die de rij één keer ophaalt en aan client-editors doorgeeft. De volledige
transcripttekst leeft **in Postgres** (`transcripts.transcript`, `jsonb`, NOT NULL, 951/951 rijen) —
niet in R2 — dus full-text zoeken is een **query/UI-taak, geen migratie-taak**. Een `language`-kolom
bestaat op de rij maar is **maar op 19% van de rijen gevuld** (180/951). De collecties-sidebar is
**desktop-only** en leeft in de dashboard-shell (`app-sidebar.tsx`), niet in de Library-route.

---

## 1. Render-boom

### `/dashboard/library` (lijst)

| # | Bestand | Rendert | S/C | Locatie |
|---|---------|---------|-----|---------|
| 1 | `apps/app/src/app/dashboard/layout.tsx` | Dashboard-shell: `<AppTopbar>`, `<AppSidebar>` (desktop), `<main>`, `<MobileTabBar>`, footer-links | **Server** | lokaal (app) |
| 2 | `apps/app/src/app/dashboard/library/page.tsx` | De hele Library-route: `<Suspense>` → `LibraryContent` (toolbar, zoekveld, view-toggle, display-menu, mobiele collectie-picker, filter-context-bar, paginatie) | **Client** | lokaal (app) |
| 3 | `apps/app/src/components/library/TranscriptList.tsx` | Lijst-/grid-weergave, per-rij badges, checkbox-selectie, floating bulk-actiebalk, bulk-download + bulk-RAG-dialogs, delete-confirm | **Client** | lokaal (app) |
| 4 | `packages/shared/src/components/DashboardBackdrop.tsx` | Honeycomb-achtergrondlaag + content-wrapper | Server-safe (geen `"use client"`) | **shared** ⚠ |
| 5 | `packages/shared/src/components/icons/HexagonPattern.tsx` | De SVG honeycomb-tessellatie zelf | shared | **shared** ⚠ |
| 6 | `packages/shared/src/components/icons/HexagonEmptyState.tsx` | Illustratie in de lege-staat-kaart | shared | **shared** ⚠ |
| — | `apps/app/src/components/app-sidebar.tsx` | **Collecties-sidebar** (desktop) — leeft in de shell (#1), niet in de route | **Client** | lokaal (app) |

Shared UI-primitives die de lijst gebruikt (allemaal `packages/shared/src/components/ui/`, dus
**elke wijziging raakt ook marketing**): `input`, `button`, `dropdown-menu`, `checkbox`, `tooltip`,
`dialog`, `alert-dialog`. Utils uit shared: `utils/supabase/client`, `lib/utils` (`cn`),
`utils/formatTranscript`, `actions/rag-export`, `hooks/useAuth`.

> ⚠ **Shared = marketing-impact.** #4/#5/#6 en alle `ui/`-primitives zitten in `packages/shared`. Een
> visuele wijziging daaraan verandert ook de marketing-app. De rij-/toolbar-/sidebar-logica (#2/#3 +
> `app-sidebar.tsx`) is **lokaal in `apps/app`** en veilig te herontwerpen zonder marketing te raken.

### `/dashboard/library/[id]` (detail) — zie §8.

---

## 2. De data (het belangrijkste deel)

### 2.1 De lijst-query (verbatim, `page.tsx:102-142`)

```ts
let query = supabase.from("transcripts").select("*", { count: "exact" });

if (selectedCollectionId) query = query.eq("collection_id", selectedCollectionId);

// Multi-word search: split into tokens and AND them, each token matching title, channel or video_id.
const q = debouncedSearch.trim().replace(/[%,()]/g, " ").trim();
if (q) {
  const tokens = q.split(/\s+/).filter(Boolean).slice(0, 6);
  for (const tok of tokens) {
    query = query.or(`title.ilike.%${tok}%,channel.ilike.%${tok}%,video_id.ilike.%${tok}%`);
  }
}

if (sortBy === "duration")      query = query.order("duration", { ascending: false, nullsFirst: false });
else if (sortBy === "title")    query = query.order("title", { ascending: true });
else                            query = query.order("created_at", { ascending: false });

const from = (page - 1) * pageSize;
query = query.range(from, from + pageSize - 1);
```

- **Filter:** `collection_id` (exact) + zoekterm (tot 6 tokens, elk ge-`AND`-t, elk token matcht
  `title` OF `channel` OF `video_id` via `ilike`). RLS (`user_id = auth.uid()`) scoping komt van de
  policy op de tabel — de query filtert **niet zelf** op `user_id`.
- **Sorteren:** `date` (`created_at DESC`, default), `duration` (`DESC`, nulls laatst), `title` (`ASC`).
- **Paginatie:** `.range()` server-side, `pageSize` default 50 (of `profiles.library_page_size`).
- **`count:"exact"`** levert `totalCount` voor de paginatie-teller.

> **`select("*")` haalt élke kolom op — inclusief de volledige `transcript` jsonb** (de complete tekst,
> NOT NULL) voor alle 50 rijen op een pagina, terwijl de lijst alleen titel/duur/badges/datum toont.
> Zie **Aangetroffen rommel #1**.

### 2.2 Het type van een rij

De lijst declareert een **subset** in TypeScript (`TranscriptList.tsx:98-116`), maar `select("*")`
retourneert alle kolommen; de niet-gedeclareerde velden zijn op de rij aanwezig maar niet getypeerd.

```ts
export interface Transcript {
  id: string;
  title: string;
  video_id: string;
  video_url?: string;          // ⚠ bestaat NIET als kolom in de DB — nergens gevuld
  created_at: string;
  updated_at?: string;
  thumbnail_url?: string;
  duration?: number;
  character_count?: number;
  processing_method?: string | null;
  edited_content?: object | null;
  ai_summary?: { edited_html?: string } | null;
  rag_exports?: object[] | null;
  collection_id?: string | null;
  playlist_id?: string | null; // ⚠ bestaat NIET als kolom in de DB (zie 2.3)
  viewed_at?: string | null;
}
```

### 2.3 Werkelijke kolommen op `public.transcripts` (geverifieerd, `information_schema.columns`)

Dit is de **volledige waarheid** over wat per transcript beschikbaar is — de basis voor waarop
gefilterd/gesorteerd **kan** worden:

| Kolom | Type | Null? | Default | Gebruikt in Library-lijst? |
|-------|------|-------|---------|----------------------------|
| `id` | uuid | nee | `gen_random_uuid()` | ja (key, links) |
| `user_id` | uuid | nee | — | via RLS (niet in query) |
| `video_id` | text | ja | — | ja (titel-fallback, zoek, YouTube-link) |
| `transcript` | **jsonb** | **nee** | — | **opgehaald via `*`, niet getoond in lijst** — array van `{text, offset, duration}` (zie §5a) |
| `created_at` | timestamptz | nee | `utc now()` | ja (sort `date`, datumkolom) |
| `title` | text | ja | — | ja (titel, sort `title`, zoek, rename) |
| `thumbnail_url` | text | ja | — | ja (alleen als thumbnails-toggle aan) |
| `duration` | integer | ja | — | ja (durationkolom, sort `duration`) |
| `character_count` | integer | ja | `0` | ja → "words" = `round(cc/5)` (heuristiek) |
| `is_favorite` | boolean | ja | `false` | **nee — dode kolom, geen UI leest/schrijft dit** |
| `source_type` | text | ja | `'youtube'` | nee (wel geïndexeerd; sidebar toont het niet) |
| `filename` | text | ja | — | nee |
| `credits_used` | integer | ja | — | nee |
| `processing_method` | text | ja | — | ja → bepaalt bron-badge (auto-captions vs AI) |
| `edited_content` | jsonb | ja | — | ja → "Edited"-badge + detail-tab |
| `ai_summary` | jsonb | ja | — | ja → "AI Summary"(+Edited)-badge + detail-tab |
| `collection_id` | uuid | ja | — | ja (collectie-filter + collectie-badge) |
| `viewed_at` | timestamptz | ja | — | ja → NEW-badge (`!viewed_at`) |
| `updated_at` | timestamptz | ja | `now()` | ja → getoonde datum als > `created_at` |
| `rag_exports` | jsonb | ja | `'[]'` | ja → "RAG ✦"-badge + detail-tab |
| `channel` | text | ja | — | ja (zoek), getoond op **detailpagina**, niet in de lijstrij |
| `language` | text | ja | — | **niet in de lijst**; getoond/gebruikt op de detailpagina (zie §5b) |

**Kolommen die op de rij bestaan maar NIET in de lijst geselecteerd/getoond worden als eigen veld:**
`is_favorite`, `source_type`, `filename`, `credits_used`, `channel` (wel meegezocht, niet als
kolom getoond), `language`, `user_id`. Ze komen wél binnen via `select("*")` maar worden genegeerd.

**Twee door de UI verzonnen velden bestaan NIET in de DB:** `video_url` en `playlist_id` staan in de
TS-`interface` maar niet in `information_schema` → altijd `undefined`. Zie **Aangetroffen rommel #4**.

### 2.4 Collections-query (verbatim)

Twee losse plekken lezen collections:

```ts
// page.tsx:157 — voor de mobiele picker + filter-context-naam
supabase.from("collections").select("id, name").eq("user_id", user.id)

// app-sidebar.tsx:135 — voor de desktop-sidebar (met tellingen)
supabase.from("collections").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
```

`public.collections` = `id uuid`, `user_id uuid`, `name text`, `created_at timestamptz`. Tellingen
per collectie worden **client-side** afgeleid in de sidebar uit een aparte
`transcripts.select("id, collection_id, character_count")`-fetch (`app-sidebar.tsx:134`), niet via
een DB-aggregatie.

---

## 3. Verbatim bron

Voor de **volledige** verbatim broncode van de vier gevraagde blokken, zie de bestanden zelf — ze zijn
te lang om hier te dupliceren zonder drift te riskeren. De relevante ankers en de kernfragmenten:

### 3.1 Toolbar + display-options-menu (`page.tsx:211-273`, verbatim)

```tsx
<div className="flex items-center gap-2">
  {/* Search */}
  <div className="relative w-56">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
    <Input placeholder="Search…" className="pl-8 h-9 rounded-lg border-border bg-surface …"
      value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
  </div>

  {/* View toggle (list | grid) */}
  <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5 bg-surface">
    <Button … onClick={() => setViewMode("list")} aria-label="List view"><ListIcon/></Button>
    <Button … onClick={() => setViewMode("grid")} aria-label="Grid view"><LayoutGrid/></Button>
  </div>

  {/* Display options — the ONLY options menu (geen chip-filters) */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button … aria-label="Display options"><SlidersHorizontal/></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-52">
      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={sortBy} onValueChange={…}>
        <DropdownMenuRadioItem value="date">Date</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="duration">Duration</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem checked={showThumbnails} onCheckedChange={setShowThumbnails}>
        Show thumbnails
      </DropdownMenuCheckboxItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

Het display-options-menu bevat dus **alleen**: sort (date/duration/title) + één thumbnails-toggle.
Geen Source/Status/Collection/Date-range chip-filters (zie §6).

### 3.2 Lijst-/rijcomponent — zie `TranscriptList.tsx:635-767` (list) en `:768-857` (grid)

Kernstructuur van een **list-rij** (`:659-763`), samengevat met de exacte klassen die er toe doen:

- Wrapper: `group flex items-start gap-3 px-4 py-3 … cursor-grab`, `draggable`, `onDragStart` zet
  `transcriptId` in `dataTransfer` (voor drop op een collectie in de sidebar).
- Checkbox (`:669`): op mobiel altijd zichtbaar, op desktop hover/selected (`sm:opacity-0 sm:group-hover:opacity-100`).
- Thumbnail (`:678`): **`hidden sm:block h-[36px] w-16`** — alleen desktop, alleen als
  `showThumbnails && t.thumbnail_url`. **Dit is de exacte regel achter §5c.**
- Titel (`:702`): `<Link href={/dashboard/library/${t.id}}>` met `line-clamp-2`; dubbelklik = rename.
- Badges (`:721`): `NewBadge` (indien ongelezen) + `transcriptBadges(t)` + `CollectionBadge`.
- Rechts (desktop, `:736`): parallelle kolommen `w-14`/`w-28`/`w-40` voor Duration/Words/Added,
  `tabular-nums text-fg-muted`, rechts uitgelijnd.
- Mobiele metadata (`:728`): `sm:hidden` compacte regel `duration · words · datum`.
- Rij-acties (`:743`): `hidden sm:flex opacity-0 group-hover:opacity-100` — Eye (View),
  ExternalLink (YouTube), Trash2 (delete-confirm). **Losse hover-icons, geen `MoreHorizontal`-menu.**

De badge-logica (`transcriptBadges`, `:144-171`) en de `BADGE_CLASSES`-map (`:123-131`) zijn de
canonieke bron voor de methodekleuren (ADR-080): `auto` = sky, `ai` = indigo, `summary` = violet,
`rag` = teal, met `-soft`-varianten voor "Edited".

### 3.3 Collecties-sidebar (desktop) — `app-sidebar.tsx:367-606`

De sidebar zit in de **dashboard-shell**, niet in de Library-route. Structuur:

- "Library"-rij + chevron die de sub-sectie in/uitklapt (`libraryOpen`, `:368-410`).
- "All Transcripts" drop-target (`:437-453`) met totaal-telling.
- Per collectie een rij (`:456-566`): navigatie (`?collection=<id>`), inline rename (Enter/Escape,
  max 150 tekens), inline delete-confirm (verplaatst transcripts naar "All Transcripts"), drop-target
  (`onDrop` → `transcripts.update({collection_id})`), telling.
- "+ New Collection" onderaan (`:571-603`), inline create.
- Drag-and-drop: een rij uit de lijst (`draggable`) wordt hier gedropt om te verplaatsen.

### 3.4 Mobiele varianten

- **Collecties op mobiel** (`page.tsx:276-303`): de sidebar is `hidden` < md, dus een aparte
  `DropdownMenu` bovenaan de Library-body toont "All Transcripts" + de collecties als radio-items.
  Alleen zichtbaar als er ≥1 collectie is.
- **Rijen op mobiel** (`TranscriptList.tsx`): geen thumbnail (§5c), geen hover-acties, metadata op
  één compacte `sm:hidden`-regel; checkbox altijd zichtbaar.
- **Navigatie op mobiel**: geen sidebar; `MobileTabBar` onderaan (Home/Transcribe/Library/Messages),
  `apps/app/src/components/dashboard/MobileTabBar.tsx`.
- **Floating bulk-actiebalk** (`:562`): op mobiel opgetild boven de tab-bar
  (`bottom-[calc(3.5rem+1rem+env(safe-area-inset-bottom))]`), labels collapsen naar icon-only.

---

## 4. State en persistentie

| State | Waar het leeft | Overleeft refresh? |
|-------|----------------|--------------------|
| **Zoekterm** | React `useState` (`searchQuery`) + gedebouncede `debouncedSearch` (300 ms) | **Nee** — niet in URL, niet opgeslagen |
| **Sortering** | React `useState` (`sortBy`, default `"date"`) | **Nee** |
| **View-mode (list/grid)** | React `useState` (`viewMode`, default `"list"`) | **Nee** |
| **Thumbnails-toggle** | React `useState` (`showThumbnails`, default `false`) | **Nee** |
| **Paginatie (`?page=N`)** | **URL search-param** (`page.tsx:69`) | **Ja** — shareable, Back werkt; `page=1` = param afwezig |
| **Collectie-selectie (`?collection=<id>`)** | **URL search-param** (`page.tsx:54`) | **Ja** |
| **Page-size** | **Server** — `profiles.library_page_size` (eenmalig geladen, `page.tsx:158`), fallback 50 | **Ja** (per user in DB) |
| **Selectie (bulk)** | React `useState` (`selectedIds: Set`) in `TranscriptList` | **Nee** — leeg na refresh/paginawissel |
| **Mark-as-read overlay** | `useState(readIds)` + `useOptimistic` (`TranscriptList.tsx:228`); canoniek in DB `viewed_at` | overlay nee, DB-waarde ja |
| **Sidebar collapsed** | `localStorage["sidebar-collapsed"]` (`app-sidebar.tsx:70`) | **Ja** (localStorage) |
| **Library sub-sectie open/dicht** | `useState(libraryOpen)` in sidebar | Nee (auto-opent op library-pagina) |

**Samengevat:** alleen **paginatie**, **collectie-selectie** (beide URL) en **page-size** +
**sidebar-collapsed** (server/localStorage) overleven een refresh. **Zoekterm, sortering, view-mode
en de thumbnails-toggle zijn puur React-state en resetten bij elke refresh** — een herontwerp dat deze
in de URL of localStorage wil bewaren, moet dat expliciet toevoegen.

Cross-component sync verloopt via twee window-events: `transcripts-updated` en
`indxr-library-refresh` (dispatched na move/rename/delete; de lijst en sidebar luisteren en re-fetchen).

---

## 5. Drie concrete vragen — met bewijs beantwoord

### 5a. Staat transcripttekst doorzoekbaar in Postgres, of alleen in R2?

**In Postgres. Full-text zoeken is een UI/query-taak, geen migratie-taak — de tekst is er al.**

Bewijs:
- Kolom `transcripts.transcript` is **`jsonb`, NOT NULL**, en gevuld op **951/951 rijen**
  (`transcript_null = 0`).
- Vorm (live sample): een **array** van segmenten `{"text": "...", "offset": 0.24, "duration": 5.92}`.
  Het `TranscriptItem`-type (`packages/shared/src/utils/formatTranscript.ts:3`) bevestigt
  `{ text, duration, offset }`.
- De detailpagina geeft `transcript.transcript` rechtstreeks aan de client-viewer door
  (`[id]/page.tsx:117`) — er is **geen R2-fetch** in het lees-pad. R2 (ADR-020/021) wordt door dit
  Library-pad **niet** aangeroepen; de `master_transcripts`-cache is een aparte backend-optimalisatie.

**Maar:** de huidige zoekfunctie zoekt **alleen** in `title`/`channel`/`video_id` (`page.tsx:121`),
**niet** in de tekst. Om op volledige tekst te zoeken zijn er twee routes:
1. **Zonder migratie:** query op de jsonb (bv. `transcript::text ilike '%…%'`, of
   `jsonb_path_exists`) — werkt, maar zonder index → sequential scan over jsonb (traag op schaal).
2. **Met migratie (aan te raden bij echte full-text):** een gegenereerde `tsvector`-kolom + GIN-index,
   of een aparte platgeslagen tekstkolom. Er is **nu geen** full-text index — zie 5a-index hieronder.

**Indexen op `transcripts` (geverifieerd `pg_indexes`):** pk (`id`), `user_id`, `video_id`,
`created_at DESC`, `(user_id, created_at DESC)`, `title`, `source_type`, `(user_id, source_type)`,
`collection_id`, `viewed_at`, `updated_at DESC`. **Geen tsvector/GIN-index, geen index op de
`transcript`-jsonb.** Full-text-zoeken op schaal vraagt dus wél een nieuwe index (maar geen
data-migratie — de tekst staat er al).

### 5b. Bestaat er een taalveld op een transcript-rij? Coverage?

**Ja — kolom `transcripts.language` (`text`, nullable). Maar de dekking is laag: legacy-data draagt
het grotendeels niet.**

Live telling (geverifieerd):

| language | rijen |
|----------|-------|
| `NULL`   | **771** |
| `en`     | 143 |
| `ar`     | 33 |
| `en-GB`  | 2 |
| `id`     | 1 |
| `ro`     | 1 |

Totaal 951 rijen; **180 gevuld (18,9%), 771 NULL (81,1%)**, 5 distinct waarden. Het veld staat **niet**
in het `Transcript`-lijsttype en wordt in de lijst niet gebruikt; het wordt wél doorgegeven aan de
detail-viewer (`[id]/page.tsx:122`) en meegegeven aan de RAG-export (`TranscriptViewer.tsx:538`).

**Consequentie voor een taalfilter:** technisch mogelijk (kolom bestaat), maar een filter zou op 81%
van de bibliotheek "onbekend" tonen. De codes zijn bovendien **niet genormaliseerd** (`en` naast
`en-GB`). Een bruikbaar taalfilter vereist een backfill/normalisatie-slag op bestaande rijen.

### 5c. Waarom renderen thumbnails wél in desktop-rijweergave en niet op mobiel?

**Oorzaak, exacte regel — `TranscriptList.tsx:679`:**

```tsx
{showThumbnails && t.thumbnail_url && (
  <div className="hidden sm:block h-[36px] w-16 shrink-0 overflow-hidden rounded-md bg-bg-subtle">
```

De thumbnail-wrapper in de **list-view-rij** draagt **`hidden sm:block`**: verborgen onder de
Tailwind `sm`-breakpoint (640 px), zichtbaar daarboven. Dat is de hele oorzaak — geen vermoeden.

Twee nuances:
- Thumbnails zijn sowieso **opt-in** (`showThumbnails` default `false`) én vereisen een
  `thumbnail_url`.
- In **grid-view** heeft de thumbnail **geen** `hidden sm:block` (`:794-795`,
  `aspect-video w-full`), dus daar verschijnt hij óók op mobiel. De mobiel-verberging geldt dus
  specifiek voor de **list-rij**, bewust, zodat de titel op smalle schermen de volle breedte krijgt.

---

## 6. Wat er niet is (toets van `design/system.md` §Library Patterns)

`system.md:506` beschrijft het al zelf; hier per stuk geverifieerd tegen de **code**:

| Claim in system.md §Library Patterns | Bestaat in code? | Bewijs |
|--------------------------------------|------------------|--------|
| **Chip-filters** (Source / Status / Collection / Date range) | **Nee** | Enige filtercontrole is het display-options-`DropdownMenu` (sort + thumbnails, `page.tsx:254-272`) + collectie via URL. Geen chip-UI. |
| **`MoreHorizontal`-contextmenu** per rij | **Nee** | Per-rij acties zijn losse hover-icons Eye/ExternalLink/Trash2 (`TranscriptList.tsx:743-762`). Rename via dubbelklik/potlood. Geen `MoreHorizontal`. |
| **Floating bulk-actiebalk** | **Ja, bestaat** | `TranscriptList.tsx:561-618` — verschijnt bij `selectedIds.size > 0`: "N selected", Download-menu, (Mark as read), Delete, clear. |

**Aparte lege staat voor "filter levert 0 resultaten" (los van "bibliotheek is leeg")?**
**Nee.** `TranscriptList.tsx:541` rendert één en dezelfde lege staat (`HexagonEmptyState` +
"Library is empty" + "Transcribe a video"-knop) zodra `transcripts.length === 0`, **ongeacht** of dat
komt door een lege bibliotheek of door een zoekterm/collectie zonder resultaten. Een zoekopdracht die
niets vindt toont dus de misleidende tekst "Library is empty" + de "Transcribe a video"-CTA. Een
herontwerp dat een echte "geen resultaten"-staat wil, moet die toevoegen (de code kent het
onderscheid al: `debouncedSearch`/`selectedCollectionId` zijn beschikbaar in `page.tsx`).

---

## 7. Honeycomb — feitelijke implementatie

De honeycomb op de Library-body komt van **`DashboardBackdrop`** (shared), die de Library-page
omhult (`page.tsx:207` `<DashboardBackdrop>` … `</DashboardBackdrop>`, `:396`).

**`packages/shared/src/components/DashboardBackdrop.tsx` (verbatim kern):**

```tsx
export function DashboardBackdrop({ children, className }) {
  return (
    <div className={`relative min-h-full ${className ?? ""}`}>
      <HexagonPattern className="opacity-[0.03] dark:opacity-[0.045]" />
      <div className="relative min-h-full">{children}</div>
    </div>
  );
}
```

**Feitelijke waarden (uit de code, niet uit de wiki):**

| Aspect | Waarde |
|--------|--------|
| Component | `HexagonPattern` (`packages/shared/src/components/icons/HexagonPattern.tsx`) |
| Aanroep | binnen `DashboardBackdrop`, die om de hele Library-body zit |
| **Opacity light** | **`opacity-[0.03]`** |
| **Opacity dark** | **`dark:opacity-[0.045]`** |
| Positionering | `pointer-events-none absolute inset-0 h-full w-full` (achter de content, die `relative` staat) |
| Vorm | flat-top honeycomb, `size=20` user-units, `stroke-fg strokeWidth="1"`, `fill-none`, naadloze `<pattern>`-tegel |

> **Let op — drie tegenstrijdige opacity-waarden in de docs.** De code = **0.03 / 0.045**. Maar
> `LESSONS.md` [2026-07-03] noemt `0.035 / 0.05` en `system.md` §5-tabel noemt voor "Empty state
> Library" `0.04 / 0.06`. De **code is de waarheid**; de twee wiki-getallen zijn gedrift. Zie
> **Aangetroffen rommel #2**.

De uitzondering zelf (honeycomb op een werkoppervlak, tegen system.md §5.4) is bewust en vastgelegd in
`LESSONS.md` [2026-07-03] + ADR-079. Het dashboard-layout schildert **geen** blanket-wash meer; elke
pagina kiest zelf door `DashboardBackdrop` te renderen (`layout.tsx:59-62`).

---

## 8. Detailpagina — `/dashboard/library/[id]`

### 8.1 Render-boom

| # | Bestand | Rendert | S/C | Locatie |
|---|---------|---------|-----|---------|
| 1 | `apps/app/src/app/dashboard/library/[id]/page.tsx` | Server-component: auth-guard, rij-fetch, tab-navigatie (Original / Edited / Developer / AI Summary / Edited Summary), routeert naar de juiste view-component o.b.v. `?tab=` | **Server** | lokaal (app) |
| 2 | `apps/app/src/components/library/TranscriptViewer.tsx` | Original+Edited tabs: Tiptap-editor, zoek-in-transcript, video-sidebar (iframe), export-menu, summarize-knop, RAG-modal, delete/rename | **Client** | lokaal (app) |
| 3 | `apps/app/src/components/library/AiSummaryView.tsx` | AI-Summary + Edited-Summary tabs: Tiptap-editor over `ai_summary` | **Client** | lokaal (app) |
| 4 | `apps/app/src/components/library/RagExportView.tsx` | Developer-tab: her-download van eerder betaalde RAG-exports | **Client** | lokaal (app) |

Geen `DashboardBackdrop` op de detailpagina → **geen honeycomb** hier (bewust; dit is een werkoppervlak).

### 8.2 Query (verbatim, `[id]/page.tsx:34-37`)

```ts
const [{ data: transcript, error }, { data: profileData }] = await Promise.all([
  supabase.from("transcripts").select("*").eq("id", id).eq("user_id", user.id).single(),
  supabase.from("profiles").select("rag_chunk_size").eq("id", user.id).single(),
]);
```

Server-side, één rij, expliciet `eq("user_id", user.id)` (dubbele zekerheid bovenop RLS). `notFound()`
bij error/leeg. `profiles.rag_chunk_size` levert de default chunk-preset voor RAG-export.

### 8.3 Tab-routing

`?tab=` ∈ `{original, edited, summary, summary_edited, developer}`, default `original`
(`[id]/page.tsx:19-22`). Tabs verschijnen **conditioneel**: "Edited" alleen bij `edited_content`,
"Developer ✦" alleen bij een niet-lege `rag_exports`-array, "AI Summary"/"Edited Summary" alleen bij
`ai_summary`(`.edited_html`). Tab-state = **URL** (`<Link href="…?tab=…">`), overleeft refresh.

### 8.4 Gedeeld met de lijst

- **Componenten:** geen. De vier detail-view-componenten zijn lokaal en worden niet door de lijst
  gebruikt; de lijst gebruikt geen viewer-componenten.
- **Wel gedeeld (utils/primitives):** `utils/formatTranscript` (`generateTxt/Csv/Srt/Vtt/Markdown/buildRagJson`,
  `TranscriptItem`-type), `actions/rag-export`, `hooks/useAuth`, en de shared `ui/`-primitives — dus
  identieke marketing-impact-regel als §1.
- **Zelfde tabel + kolommen:** beide lezen `transcripts`; de detail leest bovendien `channel` en
  `language` die de lijst wel binnenkrijgt (`*`) maar niet toont.

### 8.5 Waar Tiptap wordt opgetuigd

Twee editors, beide met de verplichte `immediatelyRender: false` (LESSONS-regel, geverifieerd):

- **`TranscriptViewer.tsx:374-398`** — `useEditor({ editable: isEditedMode || isEditingOriginal,
  immediatelyRender: false, extensions: [StarterKit, SearchExtension] })`. Content komt van
  `transcriptToJSON(transcript, videoId)` (array → Tiptap-doc met per-segment timestamp-link) of
  `editedContent`. Een custom **`SearchExtension`** (ProseMirror-decorations, `:96-194`) doet de
  in-transcript-zoekfunctie (highlight + prev/next). `setEditable` wordt via `useEffect` gesynct
  (`:401-405`).
- **`AiSummaryView.tsx:51-...`** — een tweede `useEditor({ immediatelyRender: false })` over de
  `ai_summary`-html/-content.

Opslaan schrijft terug naar dezelfde rij: `edited_content` (`TranscriptViewer.tsx:438`), `title`
(`:415`), `viewed_at` bij mount (`:353`).

---

## Aangetroffen rommel

Read-only geconstateerd, **niet gefixt** (per opdracht):

1. **`select("*")` haalt de volledige transcripttekst op voor de lijst.** `page.tsx:109` fetcht élke
   kolom — inclusief de complete `transcript` jsonb (NOT NULL, kan tienduizenden segmenten zijn) — voor
   alle 50 rijen per pagina, terwijl de lijst alleen titel/duur/badges/datum toont. Onnodige egress +
   geheugen. Een expliciete kolom-select (zonder `transcript`) zou dit wegnemen.
2. **Honeycomb-opacity: één echte drift (gecorrigeerd 2026-07-31).** Code = `0.03/0.045`
   (`DashboardBackdrop.tsx:28`). `LESSONS.md` zei `0.035/0.05` → **echte drift, nu gefixt** naar de
   code-waarde. De eerder aangehaalde `system.md §5 0.04/0.06` blijkt de tabelrij **"Empty state Library"**
   (een andere surface dan de Library-body) — geen drift; system.md §5 vermeldt nu expliciet de
   body-waarde `0.03/0.045` bij de Library-uitzondering.
3. **Sidebar-opslag: dode berekening, geen zichtbare meter (gecorrigeerd 2026-07-31).** De eerdere versie
   van deze bevinding beschreef een "sidebar-opslagmeter" — maar de **zichtbare meter is er niet (meer)**.
   `app-sidebar.tsx:162-166` berekent nog wél `totalCharacters`/`usedKB`/`usedMB`/`MAX_MB = 500`/
   `storagePercentage`, maar **`storagePercentage` wordt nergens gerenderd** (geen enkele referentie in de
   JSX). Het is dus **dode code**, geen kloppende-of-niet meter. De correcte, gerenderde meter is
   `StorageMeterCard` (op `/dashboard` + `/dashboard/account`), die wél de echte cap
   `library_bytes_cap`+`_bonus` (basis **100 MiB**, ADR-078) uit de DB leest. Actie: dode berekening is
   pre-existing dead code → gemeld (niet stil verwijderd, CLAUDE.md); een expliciete opruimronde kan hem
   weghalen. **Les:** deze bevinding dreef omdat ze een berekening als "meter" framede — herverifieer de
   overige rommel-items tegen live JSX vóór je erop bouwt (items 1/2/4/5 hieronder zijn geverifieerd nog
   geldig per 2026-07-31).
4. **Twee TS-velden zonder DB-kolom.** `Transcript.video_url` en `Transcript.playlist_id`
   (`TranscriptList.tsx:102,114`) bestaan niet in `information_schema` → altijd `undefined`. Dode
   type-velden.
5. **Geen "0 resultaten"-staat.** Een zoekopdracht zonder treffers toont "Library is empty" + een
   "Transcribe a video"-CTA (§6). Misleidend maar functioneel onschadelijk.
6. **`is_favorite`-kolom is dood.** `DEFAULT false`, geen enkele Library-UI leest of schrijft hem.
   (Idem ongebruikt in de lijst: `source_type`, `filename`, `credits_used`.)
7. **Dubbele `w-full` classname** op `[id]/page.tsx:134` (`… relative z-10 w-full mt-2` bevat `w-full`
   tweemaal). Cosmetisch.

---

## Cross-references

- Badge-/methodekleuren: `LESSONS.md` [2026-07-03] + [2026-07-04], ADR-080, `system.md:113-115`.
- Honeycomb-uitzondering: `LESSONS.md` [2026-07-03] design-hexagon-bg-uitzondering, ADR-079.
- Optimistische mark-as-read: `LESSONS.md` [2026-07-04] library-optimistic-mutaties.
- Opslaglimiet (echte cap): ADR-078.
- Tiptap `immediatelyRender: false`: `LESSONS.md` [2026-05-04] tiptap.
</content>
</invoke>

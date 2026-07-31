# Beslissing 083: Library-lijst herontwerp (Fase 1)

**Status:** Geaccepteerd
**Datum:** 2026-07-31
**Gerelateerde code:** `apps/app/src/app/dashboard/library/page.tsx`, `apps/app/src/components/library/` (`TranscriptList.tsx`, `LibraryControls.tsx`, `filters.ts`, `badges.tsx`, `MoveToCollectionMenu.tsx`), `apps/app/src/components/app-sidebar.tsx`, `apps/app/src/components/dashboard/MobileTabBar.tsx`, `apps/app/src/components/icons/Beehive.tsx`, migratie `20260731160000_transcripts_list_view.sql`

## Context

De Library-lijst was functioneel maar gedateerd: alleen een display-menu (sort + thumbnails-toggle),
geen echte filters, een grid-view die niets toevoegde, thumbnails die op AI-transcripties ontbraken en
op mobiel nooit renderden, en één lege staat ("Library is empty") die ook bij een zoekopdracht zonder
treffers verscheen. Sorteervolgorde leefde in React-state terwijl `?page` in de URL stond (een gedeelde
link toonde een andere volgorde). RTL-titels renderden fout. `select("*")` haalde de volledige
transcript-jsonb op voor 50 rijen om alleen titel/duur te tonen.

## Beslissing

Een dichte, filterbare, deelbare, RTL-correcte werklijst met server-side filters en gescheiden rij-/
bulk-menu's. Concreet:

1. **Data via een view.** Nieuwe `transcripts_list` (`security_invoker = true`) met alleen de lichte
   lijst-kolommen + drie goedkope presence-booleans (`has_summary`/`has_summary_edit`/`has_edit`/
   `has_rag`). De lijst leest die view en nooit meer de zware `transcript`-jsonb. Detail + alle mutaties
   blijven op de basistabel `transcripts`.
2. **Grid + thumbnails verwijderd.** AI-transcripties hebben geen thumbnail (rafelige lijst); op mobiel
   renderden ze nooit; 50 remote images per pagina = layout-shift + bandbreedte zonder identificerende
   waarde bij een tekstproduct. De view-toggle en `showThumbnails` verdwijnen mee.
3. **Twee-regelige rij + dichtheid.** Regel 1 = titel (1 regel, ellipsis, `dir="auto"`), regel 2 =
   badges + collectie; rechts Duration/Words/Added rechts-uitgelijnd in `tabular-nums`. Dichtheid
   **Default** (twee regels) / **Compact** (één regel), persistent in localStorage.
4. **Badges = korte mono-pillen `CC`/`AI`/`SUM`/`RAG`** (exact `BADGE_CLASSES`). Precies één bron, dan
   optioneel SUM en RAG (max 3), dan collectie. **Edited-staat draagt BEIDE signalen**: de `-soft`-tint
   (behoudt de kleurlogica van het badge-systeem) én een potlood-glyph (het verschil is op 18px niet via
   tint alleen waarneembaar). Geen `-soft`-token blijft daardoor ongebruikt.
5. **Ongelezen = amberen stip + gewicht 500** op de titel (de NEW-badge als badge is weg — minder ruis,
   zelfde `viewed_at`-logica).
6. **Echte server-side filters** in de bestaande query: Status (unread), Source (YouTube captions / AI —
   geverifieerd 2 enum-waarden, geen NULLs), Has (AI summary / Edited / RAG), Duration-buckets,
   Added-vensters. Actieve filters als verwijderbare chips + "Clear all"; kop-teller "N of TOTAL".
7. **Sort krijgt richting en verhuist naar de URL** (`?sort` + `?dir`) naast `?page`; ook `?q` (zoek) in
   de URL. Dichtheid = localStorage (UI-voorkeur, niet deelbaar).
8. **Selectie & bulk.** Tri-state kop-checkbox (leeg/half/vol). **Select all = alleen de huidige pagina**
   — géén cross-page "select all N", géén gefilterde-set-modus; bulkacties werken uitsluitend op de
   geselecteerde `id`s. Context-afhankelijke bulk-balk ("Mark as read" alleen bij ongelezen in de
   selectie; "Remove from collection" alleen als er iets te verwijderen valt).
9. **Rij-acties gescheiden van bulk.** Titel = link (oogje weg); rechts een export-icoon + `⋯`. Het
   rij-menu (Open / Watch on YouTube / Mark as read / Export ▸ / Move to collection ▸ / Rename / Copy /
   Delete) en het bulk-menu **delen niets** op de action-laag; alleen de Move-to-collection-sub-UI wordt
   hergebruikt op een expliciete id-set.
10. **Move (niet Add).** `collection_id` is één nullable uuid → de actie vervangt altijd. Het menu toont
    de waarheid ("All N are in 'X'" met vinkje+disabled / "spread over K collections, M in none" / `some`-
    label / Remove-with-count / New collection…).
11. **Twee lege staten** (echt leeg vs filter/zoek zonder resultaat met "Clear all filters").
12. **Mobiel:** filters/sort/collecties/bulk in dep-vrije bottom `sheet`s; selectiemodus via een knop;
    de floating bulk-balk is volledig verborgen zonder selectie (bedekt de tabbar nooit).
13. **Sidebar:** filterveld boven de collectielijst + mono-counts. **Nav-iconen:** Home = custom
    beehive-SVG (merkmotief één keer), Messages `Inbox`→`MessageSquare`.

## Rationale

- Een view met `security_invoker` houdt de basistabel + RLS onaangeroerd, vermijdt een backfill, en
  levert de presence-booleans zonder de zware jsonb per lijstrij (was de grootste rommel-post).
- Geen nieuwe UI-deps: filter/sort via bestaande `dropdown-menu`, mobiele sheets via bestaande `sheet`,
  tri-state checkbox lokaal → geen `pnpm-lock`-churn en geen marketing-impact.
- Rij- vs bulk-scheiding voorkomt onzin-acties ("Rename 15 bestanden"); vastgelegd in `LESSONS.md`.
- Cross-page select-all is een zeldzame, risicovolle actie met een compleet tweede codepad (945 items in
  één ZIP/delete) → bewust niet gebouwd; select-all = huidige pagina.

## Consequenties

- `Transcript` (lijst-type) is nu de view-vorm; dode TS-velden `video_url`/`playlist_id` (geen DB-kolom)
  verwijderd.
- De lijst-read gaat naar `transcripts_list`; wie de view-kolommen wijzigt moet de migratie + `page.tsx`
  `LIST_COLUMNS` bijwerken.
- Playwright-contract behouden (rij-link `a[href*="/dashboard/library/"]` + `placeholder="Search…"`);
  nieuwe controls kregen `data-testid`.
- `library-source-map.md` is deels achterhaald voor de lijst (bijgewerkt met een redesign-banner).
- Fase 2 (voortvloeiende schermen: RAG-kostenkaart, storage-full, delete/rename) en Fase 3
  (`/dashboard/billing`→`/dashboard/credits`) volgen apart.

## Verificatie

Migratie `20260731160000` toegepast (schema_migrations +1). View-booleans byte-exact vs basistabel
(has_summary 7=7, has_rag 15=15, has_edit 2, has_summary_edit 2 over 952 rijen). End-to-end via de
authenticated anon-client als `test1`: door de view precies de 3 eigen (geseede) rijen — niet de 952 in
de tabel → `security_invoker`-RLS bewezen (één profiel volstaat: 3-van-952 onderscheidt "RLS filtert" van
"geeft alles"). Alle filters teruggerekend (captions 2 / ai 1 / unread 1 / has_summary 1 / has_edit 1 /
has_rag 1 / >60min 1 / zoek 1), Arabische titel round-tript. Seed opgeruimd. `pnpm build:app` groen.

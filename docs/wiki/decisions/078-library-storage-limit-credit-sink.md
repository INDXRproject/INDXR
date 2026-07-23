# Beslissing 078: Library-opslaglimiet echt maken + ruimte-bijkopen als credit-sink

**Status:** Geaccepteerd
**Datum:** 2026-07-23
**Gerelateerde code:** migratie `20260723140000_library_storage_limit.sql` (`user_credits.library_bytes_cap`/`library_bytes_bonus`, `purchase_library_space`, `library_storage_is_full`); `backend/main.py` + `backend/credit_manager.py` (`is_library_full`, pre-reserve checks); `apps/app/src/app/actions/storage.ts`; `apps/app/src/components/dashboard/account/StorageMeterCard.tsx`; `packages/shared/src/lib/storage.ts`

## Context

De account-pagina toonde een opslagmeter tegen 100 MB met eronder "nothing is blocked if you go over
it" — een limiet die geen limiet was (een gebruiker stond op 195 MB van 100 MB). De DB had een echte
byte-teller (`user_credits.library_bytes`, trigger-onderhouden) en een onafgedwongen cap
(`library_bytes_cap`, default 5 GiB). We willen de 100 MB echt maken én overschrijding omzetten in een
credit-sink, zonder de financiële reserverings-/afrekeningsroute te raken.

## Beslissing

- **Basislimiet = 100 MiB per gebruiker**, opgeslagen in `user_credits.library_bytes_cap` (nieuwe
  default; bestaande rijen op 100 MiB gezet). De **effectieve** limiet = `library_bytes_cap` +
  `library_bytes_bonus` (gekochte ruimte). De limiet komt dus **uit de DB, per gebruiker**, niet uit
  een frontend-constante.
- **Handhaving vóór de reservering.** `library_storage_is_full(user_id)` wordt in de backend
  aangeroepen **vóór** `reserve_credits` op alle betaalde paden (losse AI-transcriptie, upload,
  playlist). Vol → **413 `storage_full`**, géén reservering — een geweigerde job kost nooit credits
  (LESSONS 2026-07-22). Grandfather-safe: alleen **nieuwe** transcripten worden geblokkeerd;
  bestaande blijven staan.
- **Ruimte bijkopen (credit-sink):** **1 blok = +100 MiB voor 100 credits (1 credit = 1 MB)**,
  permanent. `purchase_library_space(user_id, blocks)` trekt de credits atomair af (zelfde
  FOR-UPDATE-lock-patroon als `deduct_credits_atomic`) en verhoogt `library_bytes_bonus` in één
  transactie. Service-role-only RPC, aangeroepen via een server-action met de server-geverifieerde
  user-id (een client kan geen andere user-id spoofen).

## Rationale — de verhouding

- **Rond en simpel:** 1 credit = 1 MB, gekocht in blokken van 100 MB (= 100 credits). Makkelijk te
  onthouden en uit te leggen.
- **Eerlijk geprijsd:** €2,50 per 100 MB op het Plus-anker (€0,025/credit). Opslag is bij ons
  goedkope tekst (geen media), dus dit is een **zachte nudge om je library te beheren**, geen
  winstcentrum. 100 MB **verdubbelt** de gratis basis.
- **Geen financiële route:** dit is credit-consumptie zoals elke andere spend (AI, RAG, summary) —
  de reserverings-/settlement-/refund-machinerie blijft onaangeroerd. `product_type` blijft NULL
  (geen COR: opslag kost ons verwaarloosbaar), het label zit in `credit_transactions.reason`.

## Consequenties

- Bestaande gebruikers boven 100 MB kunnen geen **nieuwe** transcripten meer maken tot ze er
  verwijderen of ruimte bijkopen; hun bestaande transcripten blijven onaangeroerd.
- De limiet verschilt per gebruiker (basis + bonus) en leeft in de DB.
- De vrije caption-save wordt geblokkeerd op het **save-choke-point** (`handleTranscriptLoaded` in
  beide `/transcribe`-pagina's): vóór de client-side INSERT roept het `library_storage_is_full` aan
  en slaat bij vol niet op — het transcript blijft zichtbaar (kopiëren/exporteren kan), met een
  inline kaart (geen toast). Alléén een **nieuwe** insert wordt geblokkeerd; het bewerken/vervangen
  van een bestaand transcript niet. De harde server-side handhaving zit op de betaalde paden (waar
  het geldrisico zit) vóór de reservering. **Bewust geen blokkerende INSERT-trigger**: die zou een
  al-gereserveerde betaalde insert kunnen laten falen bij een race tussen check en insert →
  credit-verlies (LESSONS 2026-07-22). Een client die de UI omzeilt kan alleen zijn **eigen** library
  vullen (RLS) — geen geldrisico.
- **Correctie 2026-07-23:** in de eerste versie was de caption-save (gratis pad) NIET geblokkeerd —
  alleen de betaalde paden. Een gebruiker die al over de limiet zat kon gewoon captions blijven
  opslaan. Gefixt door de check op het save-choke-point (hierboven).
- Prod-getest: op 100 MiB is de zwaarste bestaande gebruiker (204 MB) correct "full"; kopen van een
  blok deed 250→150 credits, +100 MiB bonus, cap 100→200 MiB, en zette "full" op false; onvoldoende
  saldo werd atomair geweigerd zonder mutatie.

## Aanvulling 2026-07-24 — harde bovengrens 500 MB + fysieke opslag

- **Maximum:** basis 100 MB + elke upgrade +100 MB, met een **harde bovengrens van 500 MB** —
  dus **maximaal 4 upgrades** (400 MB gekochte bonus). Afgedwongen in `purchase_library_space`
  (migratie `20260724013956`): de RPC weigert een aankoop die `library_bytes_bonus + blok` boven
  400 MiB zou tillen met `error='Storage limit reached'` — **vóór** de credit-aftrek, dus geen
  stille mislukking en geen afboeking die niets oplevert. De UI (`StorageMeterCard`) disablet de
  knop op de grens met dezelfde uitleg; de RPC blijft gezaghebbend. Constanten in lockstep:
  `LIBRARY_STORAGE_MAX_MB=500` / `STORAGE_MAX_UPGRADES=4` (`packages/shared/src/lib/storage.ts`)
  ↔ `v_max_bonus=419430400` in de RPC.
- **Waar transcripten fysiek staan:** als **tekst in Postgres (Supabase)** — de JSONB-kolommen
  `transcripts.transcript`, `.edited_content`, `.ai_summary` en `.rag_exports`. De footprint-teller
  `user_credits.library_bytes` is de trigger-onderhouden `octet_length`-som van precies die kolommen
  (migratie `20260711100400`). Transcripten staan **niet** in R2 — R2 (ADR-020) is voor het
  tijdelijke audiobestand, dat ná transcriptie wordt verwijderd. Financiële betekenis: 500 MB/gebruiker
  is 500 MB Postgres-**tekst** (comprimeert goed, ~$0,125/GB-maand DB-storage bij Supabase) — per
  gebruiker verwaarloosbaar, maar "permanent" is wél een reële staande verplichting die met het
  aantal betalende power-users meeschaalt. De 500 MB-grens houdt die verplichting begrensd.
- **Gedeeld component:** `StorageMeterCard` is nu het **enige** opslag-aankoopoppervlak, gerenderd op
  zowel `/dashboard/account` als `/dashboard` (Home geeft `headless` mee zodat het SectionLabel de
  kop levert). Eén bevestigingsstap, één afboekpad (`purchaseStorageAction → purchase_library_space`).
  Geen tweede implementatie van een credit-afboekende actie.

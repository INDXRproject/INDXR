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
- De vrije caption-save (client-side) wordt via de UI geblokkeerd bij vol; de harde server-side
  handhaving zit op de betaalde paden (waar het geldrisico zit). Een client die de UI omzeilt kan
  alleen zijn **eigen** library vullen (RLS) — geen geldrisico.
- Prod-getest: op 100 MiB is de zwaarste bestaande gebruiker (204 MB) correct "full"; kopen van een
  blok deed 250→150 credits, +100 MiB bonus, cap 100→200 MiB, en zette "full" op false; onvoldoende
  saldo werd atomair geweigerd zonder mutatie.

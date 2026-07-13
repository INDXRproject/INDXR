# Beslissing 055: Money-model & GELD-blok (admin control center, etappe 1)

**Status:** Geaccepteerd
**Datum:** 2026-07-13
**Gerelateerde code:** `supabase/migrations/20260713131349_geld_product_type_stamp.sql`, `20260713131613_geld_is_internal_flag.sql`, `20260713131621_geld_opex_expenses.sql`, `20260713132947_geld_summary_rpc.sql`, `apps/app/src/app/admin/GeldBlock.tsx`, `apps/app/src/app/admin/page.tsx`, `backend/credit_manager.py`

## Context

Het admin-dashboard telde interne test-aankopen/-grants mee als echte omzet (het "99% granted"-artefact) en had geen COR-per-producttype, geen omzet-recognitie en geen OPEX-basis. Voor een eerlijk financieel beeld (en de CAC-fundering in etappe 2) waren vier beslissingen nodig. Financieel-kritiek: elk cijfer moet herleidbaar zijn tot echte DB-waarden.

## Beslissing

1. **PRODUCT_TYPE-stempel** op `credit_transactions`. Leaf-types die credits consumeren: `ai_transcription / ai_summary / rag / caption`. **`playlist` is bewust GEEN leaf** — een playlist is een composiet (`playlist_id IS NOT NULL`) over caption- + ai_transcription-videos; COR-per-type leest de leaf-stempel, de playlist-view is afgeleid. Stempel gebeurt zonder signature-wijziging op de hot RPC's: `settle_credits`→`'ai_transcription'`, `update_playlist_video_progress`→`'caption'`, `deduct_credits_atomic`→`p_metadata->>'product_type'` (caller stempelt).

2. **`is_internal`-vlag** op `profiles`. Interne/test-accounts (Khidr + CC) worden uit **élk** dashboardcijfer gefilterd. Uitbreidbaar: `UPDATE profiles SET is_internal=true WHERE id=…`.

3. **Revenue = purchased-only, granted-first toewijzing.** Alleen aangekochte (Stripe) credits dragen omzet. Verbruik van *granted* credits = acquisitie-/funnelkost (OPEX), geen omzet. Bij gepoolde credits (geen lot-tracking): verbruikt-purchased = `LEAST(purchased, GREATEST(0, consumed − granted))` (granted eerst verbruikt = conservatief). **Recognized** = verbruikt-purchased × €/credit; **Deferred** = resterend-purchased × €/credit. Voor echte users met kleine welkomst-grant ≈ purchased-first; voor test-accounts met enorme grants blijft omzet €0 tot grants op zijn.

4. **`opex_expenses`-tabel** (period, category, channel, eur) los van `cost_config` (tarieven blijven daar). OPEX-keten = infra (cost_config) + ads (opex_expenses) + gratis-caption-funnel (dagteller × Decodo) + granted-delivery.

Alle logica leeft in één auditeerbare RPC `admin_geld_summary()` (SECURITY DEFINER, service_role-only) die beide scopes (external/internal) + tarieven + OPEX teruggeeft.

## Rationale

- Eén SQL-bron (geen verspreide JS-sommen) = herleidbaar en testbaar, vereist door financieel-kritiek.
- Geen signature-wijziging op de gelockte financiële RPC's ⇒ geen DROP/re-GRANT-risico.
- Granted-first is de conservatieve, verdedigbare recognitie (nooit over-erkennen).
- COR-op-deferred + caption-COR zijn **geschat** (playlist-egress niet per-video gemeten) en visueel als "geschat" gelabeld — projectie leest nooit als hard cijfer.

## Consequenties

- **Bevinding bij oplevering:** ná filter is de echte externe economie €0 (pre-revenue) — alle gemeten activiteit stond op interne accounts. De filter maakt dit eerlijk zichtbaar.
- Nieuwe consumptie draagt voortaan een schone `product_type`; historische rijen zijn eenmalig gebackfilld via reason-mapping (reserveringen/refunds bewust NULL).
- Caption-COR + funnel zijn schattingen tot playlist-egress per-video gemeten wordt (mogelijke etappe-2-verfijning).
- `opex_expenses` is leeg tot Khidr ads/marketing invoert; dat activeert de ads-lijn + CAC (etappe 2).

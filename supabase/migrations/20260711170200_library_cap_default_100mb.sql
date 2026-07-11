-- Blok F: verlaag de placeholder-gratis-tier library-cap van 5 GiB → 100 MB.
-- Blijft NIET-gehandhaafd (meter-only). Bestaande rijen worden mee-verlaagd naar 100 MB voor een
-- uniforme placeholder; accounts al boven 100 MB breken NIET (er is geen enforcement).
--
-- ⚠️ TOEKOMSTTAAK (benoemd, geen footnote): storage-monetisatie is een aparte post-launch-taak die een
-- PRIJSBESLISSING vereist. Bij het inschakelen van enforcement MOET grandfather-logica mee (pre-launch
-- heavy accounts, bv. ~191 MB, mogen niet retroactief geblokkeerd worden) + een credit-sink-UI
-- ("X credits voor +MB"). Zie database-schema.md / ADR-054 "Storage-toekomsttaak".

ALTER TABLE public.user_credits ALTER COLUMN library_bytes_cap SET DEFAULT 104857600; -- 100 MiB

-- Alleen rijen die nog op de oude 5 GiB-default staan (geen handmatig gezette caps bestaan nog).
UPDATE public.user_credits SET library_bytes_cap = 104857600 WHERE library_bytes_cap = 5368709120;

COMMENT ON COLUMN public.user_credits.library_bytes_cap IS
    'Per-user library storage cap (bytes). Meter/foundation only — NOT enforced. Placeholder free tier 100 MiB. Enforcement + grandfather-logica + credit-sink-UI = benoemde post-launch storage-monetisatietaak (vereist prijsbeslissing).';

-- Make the library-storage limit real (night-run follow-up): a hard 100 MiB base cap that new
-- transcripts are checked against, plus a credit-sink to buy permanent extra space.
--
-- Model:
--   effective cap = user_credits.library_bytes_cap (base) + user_credits.library_bytes_bonus (bought)
--   library_bytes (existing) is the trigger-maintained real footprint.
--   "full" = library_bytes >= effective cap. Enforcement lives in the app BEFORE any credit
--   reservation (LESSONS 2026-07-22); this migration only provides the DB primitives.
--
-- Grandfather-safe: we only lower the BASE cap to 100 MiB and add a bonus column. Existing
-- transcripts are never touched — a user already over the base simply can't add NEW work until
-- they delete some or buy space. Nothing in finance reads library_bytes_cap (usage COR reads
-- library_bytes), so lowering the cap is finance-neutral. Reservation/settlement untouched.
--
-- Credit-sink ratio (ADR-078): 1 block = +100 MiB for 100 credits (1 credit = 1 MB), permanent.

-- 1) Base cap → 100 MiB; add the bonus column for purchased space.
ALTER TABLE public.user_credits
    ALTER COLUMN library_bytes_cap SET DEFAULT 104857600, -- 100 MiB
    ADD COLUMN IF NOT EXISTS library_bytes_bonus bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_credits.library_bytes_cap IS
    'Base per-user library storage cap (bytes). Default 100 MiB. Effective limit = library_bytes_cap + library_bytes_bonus.';
COMMENT ON COLUMN public.user_credits.library_bytes_bonus IS
    'Extra library storage the user has bought (bytes), permanent. Added to library_bytes_cap for the effective limit. Set only by purchase_library_space.';

-- Bring existing rows to the 100 MiB base (they were 5 GiB, unenforced). Grandfather-safe:
-- enforcement blocks only NEW work; existing transcripts stay.
UPDATE public.user_credits SET library_bytes_cap = 104857600 WHERE library_bytes_cap <> 104857600;

-- 2) Is-the-library-full helper (used by the backend before reserving credits, and by the UI).
CREATE OR REPLACE FUNCTION public.library_storage_is_full(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT COALESCE(uc.library_bytes, 0)
             >= COALESCE(uc.library_bytes_cap, 0) + COALESCE(uc.library_bytes_bonus, 0)
    FROM public.user_credits uc
    WHERE uc.user_id = p_user_id;
$function$;

-- 3) Buy permanent extra space: deduct credits (atomic, like deduct_credits_atomic) and grow the
--    bonus, in one locked transaction. Credit-sink only — no reservation/settlement involved.
CREATE OR REPLACE FUNCTION public.purchase_library_space(p_user_id uuid, p_blocks integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_block_bytes  bigint  := 104857600;  -- 100 MiB per block
    v_block_cost   integer := 100;        -- 100 credits per block (1 credit = 1 MB)
    v_cost         integer;
    v_bytes        bigint;
    v_balance      integer;
    v_new_balance  integer;
    v_new_cap      bigint;
BEGIN
    IF p_blocks IS NULL OR p_blocks < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
    END IF;
    v_cost  := p_blocks * v_block_cost;
    v_bytes := p_blocks::bigint * v_block_bytes;

    SELECT credits INTO v_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No account');
    END IF;

    IF v_balance < v_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits',
                                  'required', v_cost, 'available', v_balance);
    END IF;

    v_new_balance := v_balance - v_cost;

    UPDATE public.user_credits
    SET credits = v_new_balance,
        library_bytes_bonus = library_bytes_bonus + v_bytes,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING library_bytes_cap + library_bytes_bonus INTO v_new_cap;

    -- product_type left NULL (like other debits without a COR product; 'storage' isn't in the
    -- credit_transactions_product_type_check enum, and extending that finance-adjacent constraint
    -- isn't warranted). The label lives in reason.
    INSERT INTO public.credit_transactions (user_id, amount, type, reason)
    VALUES (p_user_id, v_cost, 'debit', 'Library storage +' || (p_blocks * 100) || ' MB');

    RETURN jsonb_build_object('success', true,
                              'new_balance', v_new_balance,
                              'blocks', p_blocks,
                              'new_cap_bytes', v_new_cap);
END;
$function$;

-- purchase_library_space is service_role only: it takes p_user_id and moves credits, so it must
-- never be callable directly by a client (which could spoof another user's id). Purchases go
-- through a server action that passes the server-verified user id. (Postgres grants EXECUTE to
-- PUBLIC by default, so revoke PUBLIC too.)
REVOKE EXECUTE ON FUNCTION public.purchase_library_space(uuid, integer) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.purchase_library_space(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.library_storage_is_full(uuid) TO authenticated, service_role;

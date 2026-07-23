-- Task B2: cap purchasable library storage. Base is 100 MiB and each block is +100 MiB, but the
-- total is now capped at 500 MiB — i.e. at most 4 bought blocks (400 MiB of bonus). Enforced in
-- the RPC BEFORE any credit deduction, so a purchase at/over the cap is refused cleanly (no silent
-- failure, no debit that buys nothing). The UI also disables the button at the cap, but the RPC is
-- authoritative. Only the cap check is added; the deduct/grow logic is identical to
-- 20260723140000. Reservation/settlement untouched.
CREATE OR REPLACE FUNCTION public.purchase_library_space(p_user_id uuid, p_blocks integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_block_bytes  bigint  := 104857600;  -- 100 MiB per block
    v_max_bonus    bigint  := 419430400;  -- 4 blocks = 400 MiB bonus (base 100 + 400 = 500 MiB cap)
    v_block_cost   integer := 100;        -- 100 credits per block (1 credit = 1 MB)
    v_cost         integer;
    v_bytes        bigint;
    v_balance      integer;
    v_bonus        bigint;
    v_new_balance  integer;
    v_new_cap      bigint;
BEGIN
    IF p_blocks IS NULL OR p_blocks < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
    END IF;
    v_cost  := p_blocks * v_block_cost;
    v_bytes := p_blocks::bigint * v_block_bytes;

    SELECT credits, COALESCE(library_bytes_bonus, 0) INTO v_balance, v_bonus
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No account');
    END IF;

    -- Cap BEFORE deducting: refuse if this purchase would exceed the 400 MiB bought-bonus ceiling.
    IF v_bonus + v_bytes > v_max_bonus THEN
        RETURN jsonb_build_object('success', false, 'error', 'Storage limit reached',
                                  'max_bonus_bytes', v_max_bonus, 'current_bonus_bytes', v_bonus);
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

    INSERT INTO public.credit_transactions (user_id, amount, type, reason)
    VALUES (p_user_id, v_cost, 'debit', 'Library storage +' || (p_blocks * 100) || ' MB');

    RETURN jsonb_build_object('success', true,
                              'new_balance', v_new_balance,
                              'blocks', p_blocks,
                              'new_cap_bytes', v_new_cap);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purchase_library_space(uuid, integer) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.purchase_library_space(uuid, integer) TO service_role;

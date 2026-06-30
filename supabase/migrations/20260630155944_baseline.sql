-- =================================================================
-- INDXR.AI V2 — Supabase schema baseline
-- Gegenereerd: 2026-06-30 via Management API introspectie
-- Schema: public | Project: uivlvwcplcaixkzuiwsv
-- READONLY — niet direct uitvoeren zonder review
-- =================================================================

-- Extensions (Supabase-managed, ter referentie)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =================================================================
-- TABLES
-- =================================================================

CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY,
    email text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    credits integer DEFAULT 5,
    playlist_quota_used integer DEFAULT 0,
    playlist_quota_reset_date timestamp with time zone DEFAULT (date_trunc('month'::text, now()) + '1 mon'::interval),
    username text,
    role text,
    onboarding_completed boolean DEFAULT false,
    welcome_reward_claimed boolean DEFAULT false,
    avatar_color text,
    suspended boolean DEFAULT false,
    rag_export_confirmed boolean DEFAULT false NOT NULL,
    rag_chunk_size integer DEFAULT 60 NOT NULL,
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
    CONSTRAINT profiles_rag_chunk_size_check CHECK ((rag_chunk_size = ANY (ARRAY[30, 60, 90, 120]))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['student'::text, 'personal_projects'::text, 'academic_researcher'::text, 'content_creator'::text, 'marketing_business'::text, 'developer_technical'::text, 'other'::text])))
);

CREATE TABLE public.transcripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    video_id text,
    transcript jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    title text,
    thumbnail_url text,
    duration integer,
    character_count integer DEFAULT 0,
    is_favorite boolean DEFAULT false,
    source_type text DEFAULT 'youtube'::text,
    filename text,
    credits_used integer,
    processing_method text,
    edited_content jsonb,
    ai_summary jsonb,
    collection_id uuid,
    viewed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    rag_exports jsonb DEFAULT '[]'::jsonb,
    channel text,
    language text,
    CONSTRAINT transcripts_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES collections(id),
    CONSTRAINT transcripts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.user_credits (
    user_id uuid NOT NULL PRIMARY KEY,
    credits integer DEFAULT 0 NOT NULL,
    playlist_quota_used integer DEFAULT 0 NOT NULL,
    quota_resets_at timestamp with time zone DEFAULT (now() + '1 mon'::interval),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    total_credits_purchased integer DEFAULT 0 NOT NULL,
    credits_bonus integer DEFAULT 0 NOT NULL,
    CONSTRAINT user_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.credit_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    balance_after integer DEFAULT 0,
    transaction_type text DEFAULT 'debit'::text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'debit'::text NOT NULL,
    reason text DEFAULT 'Transaction'::text NOT NULL,
    CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT credit_transactions_type_check CHECK ((type = ANY (ARRAY['debit'::text, 'credit'::text])))
);

CREATE TABLE public.playlist_extraction_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid,
    status text DEFAULT 'running'::text,
    playlist_url text,
    playlist_title text,
    total_videos integer DEFAULT 0,
    completed integer DEFAULT 0,
    failed integer DEFAULT 0,
    current_video_index integer DEFAULT 0,
    current_video_title text,
    video_ids jsonb DEFAULT '[]'::jsonb,
    video_results jsonb DEFAULT '{}'::jsonb,
    use_whisper_ids jsonb DEFAULT '[]'::jsonb,
    collection_id uuid,
    processing_time_seconds integer,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    last_progress_at timestamp with time zone,
    last_heartbeat_at timestamp with time zone,
    video_metadata jsonb DEFAULT '{}'::jsonb,
    watchdog_attempts integer DEFAULT 0,
    CONSTRAINT playlist_extraction_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.playlist_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid,
    playlist_url text,
    playlist_title text,
    total_selected integer DEFAULT 0,
    total_succeeded integer DEFAULT 0,
    total_failed integer DEFAULT 0,
    failed_bot_detection integer DEFAULT 0,
    failed_timeout integer DEFAULT 0,
    failed_age_restricted integer DEFAULT 0,
    failed_members_only integer DEFAULT 0,
    failed_other integer DEFAULT 0,
    processing_time_seconds integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT playlist_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.transcription_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    video_url text,
    source_type text DEFAULT 'youtube'::text,
    duration_seconds integer,
    credits_cost integer,
    transcript_id uuid,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    processing_time_seconds integer,
    file_size_bytes bigint DEFAULT 0,
    file_format text DEFAULT 'unknown'::text,
    error_type text,
    credits_deducted boolean DEFAULT false,
    last_heartbeat_at timestamp with time zone,
    watchdog_attempts integer DEFAULT 0,
    CONSTRAINT whisper_jobs_transcript_id_fkey FOREIGN KEY (transcript_id) REFERENCES transcripts(id),
    CONSTRAINT whisper_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.saved_videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    video_id text NOT NULL,
    title text NOT NULL,
    duration_seconds integer,
    channel text,
    thumbnail_url text,
    source text DEFAULT 'manual'::text NOT NULL,
    source_playlist_name text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT saved_videos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.master_transcripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    video_id text NOT NULL,
    language text NOT NULL,
    transcription_model text NOT NULL,
    r2_key text NOT NULL,
    source_method text DEFAULT 'caption_extraction'::text NOT NULL,
    model_quality_rank integer,
    quality_score double precision,
    duration_seconds integer,
    character_count integer,
    word_count integer,
    fetched_from_provider_at timestamp with time zone DEFAULT now(),
    deprecated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    title text,
    channel text,
    CONSTRAINT master_transcripts_video_id_language_transcription_model_key UNIQUE (transcription_model, video_id, language)
);

CREATE TABLE public.usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid,
    ip_address inet,
    video_id text NOT NULL,
    extraction_type text NOT NULL,
    success boolean NOT NULL,
    error_message text,
    credits_used integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);


-- =================================================================
-- INDEXES (non-PK)
-- =================================================================

CREATE INDEX profiles_quota_reset_idx ON public.profiles USING btree (playlist_quota_reset_date);
CREATE INDEX idx_transcripts_collection_id ON public.transcripts USING btree (collection_id);
CREATE INDEX idx_transcripts_source_type ON public.transcripts USING btree (source_type);
CREATE INDEX idx_transcripts_user_source ON public.transcripts USING btree (user_id, source_type);
CREATE INDEX transcripts_created_at_idx ON public.transcripts USING btree (created_at DESC);
CREATE INDEX transcripts_title_idx ON public.transcripts USING btree (title);
CREATE INDEX transcripts_updated_at_idx ON public.transcripts USING btree (updated_at DESC);
CREATE INDEX transcripts_user_id_created_at_idx ON public.transcripts USING btree (user_id, created_at DESC);
CREATE INDEX transcripts_user_id_idx ON public.transcripts USING btree (user_id);
CREATE INDEX transcripts_video_id_idx ON public.transcripts USING btree (video_id);
CREATE INDEX transcripts_viewed_at_idx ON public.transcripts USING btree (viewed_at);
CREATE INDEX idx_collections_user_id ON public.collections USING btree (user_id);
CREATE INDEX idx_user_credits_user_id ON public.user_credits USING btree (user_id);
CREATE INDEX credit_transactions_created_at_idx ON public.credit_transactions USING btree (created_at DESC);
CREATE INDEX credit_transactions_type_idx ON public.credit_transactions USING btree (transaction_type);
CREATE INDEX credit_transactions_user_id_idx ON public.credit_transactions USING btree (user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions USING btree (created_at DESC);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions USING btree (user_id);
CREATE INDEX idx_playlist_jobs_last_progress ON public.playlist_extraction_jobs USING btree (last_progress_at) WHERE (status = 'running'::text);
CREATE INDEX idx_saved_videos_user_id ON public.saved_videos USING btree (user_id);
CREATE INDEX idx_master_transcripts_lookup ON public.master_transcripts USING btree (video_id, language, transcription_model) WHERE (deprecated_at IS NULL);
CREATE UNIQUE INDEX master_transcripts_video_id_language_transcription_model_key ON public.master_transcripts USING btree (video_id, language, transcription_model);
CREATE INDEX usage_logs_created_at_idx ON public.usage_logs USING btree (created_at DESC);
CREATE INDEX usage_logs_ip_address_idx ON public.usage_logs USING btree (ip_address);
CREATE INDEX usage_logs_success_idx ON public.usage_logs USING btree (success);
CREATE INDEX usage_logs_user_id_idx ON public.usage_logs USING btree (user_id);
CREATE INDEX usage_logs_video_id_idx ON public.usage_logs USING btree (video_id);


-- =================================================================
-- ROW LEVEL SECURITY
-- =================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_extraction_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcription_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Policies: profiles
CREATE POLICY "Users can insert own profile" ON public.profiles
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.profiles
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((auth.uid() = id));
CREATE POLICY "Users can view own profile" ON public.profiles
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = id));

-- Policies: transcripts
CREATE POLICY "Users can delete own transcripts" ON public.transcripts
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own transcripts" ON public.transcripts
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own transcripts" ON public.transcripts
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own transcripts" ON public.transcripts
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own transcripts" ON public.transcripts
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = user_id));

-- Policies: collections
CREATE POLICY "Users can manage own collections" ON public.collections
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((auth.uid() = user_id))
    WITH CHECK ((auth.uid() = user_id));

-- Policies: user_credits
CREATE POLICY "Users can view own credits" ON public.user_credits
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = user_id));

-- Policies: credit_transactions
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = user_id));

-- Policies: playlist_extraction_jobs
CREATE POLICY "Users see own jobs" ON public.playlist_extraction_jobs
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((auth.uid() = user_id));

-- Policies: playlist_jobs
CREATE POLICY "Users see own playlist jobs" ON public.playlist_jobs
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((auth.uid() = user_id));

-- Policies: transcription_jobs
CREATE POLICY "Service role can do everything" ON public.transcription_jobs
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Users can view own jobs" ON public.transcription_jobs
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = user_id));

-- Policies: saved_videos
CREATE POLICY "Users can CRUD own saved_videos" ON public.saved_videos
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((auth.uid() = user_id));

-- Policies: usage_logs
CREATE POLICY "Users can view own logs" ON public.usage_logs
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = user_id));


-- =================================================================
-- FUNCTIONS
-- =================================================================

CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'Manual credit addition'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Ensure user_credits record exists
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Lock the user_credits row
    SELECT credits INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Add credits
    v_new_balance := v_current_balance + p_amount;
    
    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log transaction with metadata
    INSERT INTO public.credit_transactions (user_id, amount, type, reason, metadata)
    VALUES (p_user_id, p_amount, 'credit', p_reason, p_metadata);

    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance
    );
END;
$function$

CREATE OR REPLACE FUNCTION public.claim_welcome_reward(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- 1. Lock the profile row to prevent race conditions
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;
    -- 2. Check existence
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;
    -- 3. Check if already claimed
    IF v_profile.welcome_reward_claimed THEN
         RETURN jsonb_build_object('success', false, 'error', 'Reward already claimed');
    END IF;
    -- 4. Mark as claimed
    UPDATE public.profiles
    SET welcome_reward_claimed = TRUE,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- 5. Add Credits (Inlined Logic to avoid function ambiguity)
    -- Ensure record exists
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Lock credits row
    SELECT credits INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    v_new_balance := v_current_balance + 25;
    
    -- Update credits
    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    -- Log transaction
    INSERT INTO public.credit_transactions (user_id, amount, type, reason)
    VALUES (p_user_id, 25, 'credit', 'Welcome Reward');
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$

CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount integer, p_transaction_type text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(new_balance integer, transaction_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Update credits atomically
  UPDATE public.profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id
  RETURNING credits INTO v_new_balance;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- Check if balance went negative (shouldn't happen with proper validation)
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient credits. Balance would be: %', v_new_balance;
  END IF;
  
  -- Log transaction
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    balance_after,
    transaction_type,
    metadata
  ) VALUES (
    p_user_id,
    -p_amount,  -- Negative for deduction
    v_new_balance,
    p_transaction_type,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;
  
  -- Return new balance and transaction ID
  RETURN QUERY SELECT v_new_balance, v_transaction_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(p_user_id uuid, p_amount integer, p_reason text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Lock the user_credits row to prevent race conditions
    SELECT credits INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check if user credits record exists
    IF NOT FOUND THEN
        -- Create credits record if it doesn't exist
        INSERT INTO public.user_credits (user_id, credits)
        VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;
        v_current_balance := 0;
    END IF;

    -- Check if sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits',
            'required', p_amount,
            'available', v_current_balance
        );
    END IF;

    -- Deduct credits
    v_new_balance := v_current_balance - p_amount;
    
    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log transaction
    INSERT INTO public.credit_transactions (user_id, amount, type, reason, metadata)
    VALUES (p_user_id, p_amount, 'debit', p_reason, p_metadata);

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance,
        'amount_deducted', p_amount
    );
END;
$function$

CREATE OR REPLACE FUNCTION public.get_user_credits(p_user_id uuid)
 RETURNS TABLE(credits integer, playlist_quota_used integer, playlist_quota_remaining integer, quota_resets_at timestamp with time zone, total_credits_purchased integer, credits_bonus integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Ensure user_credits record exists
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN QUERY
    SELECT 
        COALESCE(uc.credits, 0) as credits,
        COALESCE(uc.playlist_quota_used, 0) as playlist_quota_used,
        COALESCE(50 - uc.playlist_quota_used, 50) as playlist_quota_remaining,
        COALESCE(uc.quota_resets_at, NOW() + INTERVAL '1 month') as quota_resets_at,
        COALESCE(uc.total_credits_purchased, 0) as total_credits_purchased,
        COALESCE(uc.credits_bonus, 0) as credits_bonus
    FROM public.user_credits uc
    WHERE uc.user_id = p_user_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.reset_monthly_quota(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.profiles
  SET 
    playlist_quota_used = 0,
    playlist_quota_reset_date = date_trunc('month', NOW()) + INTERVAL '1 month'
  WHERE id = p_user_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.update_playlist_video_progress(p_playlist_id uuid, p_video_id text, p_status text, p_transcript_id uuid DEFAULT NULL::uuid, p_error_type text DEFAULT NULL::text, p_amount integer DEFAULT 0, p_reason text DEFAULT 'Playlist caption extraction'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_job            playlist_extraction_jobs%ROWTYPE;
  v_existing       jsonb;
  v_new_entry      jsonb;
  v_already_done   boolean := false;
  v_new_completed  integer;
  v_new_failed     integer;
  v_is_complete    boolean;
  v_has_retryable  boolean;
  v_new_status     text;
BEGIN
  -- Lock de rij voor de duur van de transactie
  SELECT * INTO v_job
  FROM playlist_extraction_jobs
  WHERE id = p_playlist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'playlist_extraction_jobs rij niet gevonden: %', p_playlist_id;
  END IF;

  -- Idempotentie: controleer of deze video_id al met dezelfde status is geregistreerd
  v_existing := v_job.video_results -> p_video_id;
  IF v_existing IS NOT NULL AND (v_existing ->> 'status') = p_status THEN
    v_already_done := true;
  END IF;

  -- Credit-deductie: atomisch met de progress-update, beschermd door v_already_done.
  IF NOT v_already_done AND p_status = 'success' AND p_amount > 0 THEN
    UPDATE user_credits
    SET credits    = credits - p_amount,
        updated_at = NOW()
    WHERE user_id = v_job.user_id;

    INSERT INTO credit_transactions (user_id, amount, type, reason, metadata)
    VALUES (
      v_job.user_id,
      -p_amount,
      'debit',
      p_reason,
      jsonb_build_object('playlist_id', p_playlist_id, 'video_id', p_video_id)
    );
  END IF;

  -- Bouw de nieuwe JSONB-entry op
  IF p_status = 'success' THEN
    v_new_entry := jsonb_build_object(
      'status',        'success',
      'transcript_id', p_transcript_id
    );
  ELSE
    v_new_entry := jsonb_build_object(
      'status',     'error',
      'error_type', p_error_type
    );
  END IF;

  -- Bereken nieuwe counter-waarden (bij replay: counters ongewijzigd)
  IF v_already_done THEN
    v_new_completed := v_job.completed;
    v_new_failed    := v_job.failed;
  ELSE
    IF p_status = 'success' THEN
      v_new_completed := v_job.completed + 1;
      v_new_failed    := v_job.failed;
    ELSE
      v_new_completed := v_job.completed;
      v_new_failed    := v_job.failed + 1;
    END IF;
  END IF;

  v_is_complete := (v_new_completed + v_new_failed) >= v_job.total_videos;

  -- Bepaal definitieve status. Bij completion: check op retry-eligible failures.
  -- 'retry_pending' → process_playlist_retries enqueuen (ADR-030 Gap 1 fix).
  -- 'complete'      → geen retry nodig, job is definitief klaar.
  IF v_is_complete THEN
    v_has_retryable := EXISTS (
      SELECT 1
      FROM jsonb_each(v_job.video_results || jsonb_build_object(p_video_id, v_new_entry)) AS kv(key, val)
      WHERE kv.val ->> 'status' = 'error'
        AND kv.val ->> 'error_type' IN ('bot_detection', 'timeout')
    );
    v_new_status := CASE WHEN v_has_retryable THEN 'retry_pending' ELSE 'complete' END;
  ELSE
    v_new_status := v_job.status;  -- geen wijziging
  END IF;

  -- Atomische update van de playlist-rij
  UPDATE playlist_extraction_jobs SET
    video_results    = video_results || jsonb_build_object(p_video_id, v_new_entry),
    completed        = v_new_completed,
    failed           = v_new_failed,
    last_progress_at = NOW(),
    status           = v_new_status,
    completed_at     = CASE WHEN v_is_complete THEN NOW() ELSE completed_at END,
    processing_time_seconds = CASE
      WHEN v_is_complete
      THEN EXTRACT(EPOCH FROM (NOW() - created_at))::integer
      ELSE processing_time_seconds
    END
  WHERE id = p_playlist_id;

  RETURN jsonb_build_object(
    'playlist_complete', v_is_complete,
    'should_retry',      v_is_complete AND v_has_retryable,
    'completed',         v_new_completed,
    'failed',            v_new_failed,
    'total',             v_job.total_videos
  );
END;
$function$

-- =================================================================
-- TRIGGERS
-- =================================================================

-- Trigger op auth.users: maakt user_credits-rij aan bij signup
-- Functie handle_new_user() zit in de FUNCTIONS-sectie hierboven
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

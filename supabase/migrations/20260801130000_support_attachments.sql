-- Support screenshot attachments: private bucket + RLS + column + RPC param.

-- Private bucket (5 MB, images only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-attachments', 'support-attachments', false, 5242880,
        array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

-- A user may upload to and read only their own folder (first path segment = their uid).
create policy "support_attachments_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text);

create policy "support_attachments_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.support_tickets add column if not exists attachment_path text;

-- Replace the RPC with an optional attachment path (validated to live in the caller's folder).
drop function if exists public.submit_support_ticket(text, text, text, uuid);

create or replace function public.submit_support_ticket(
  p_category text,
  p_subject text,
  p_body text,
  p_transcript_id uuid default null,
  p_attachment_path text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id   uuid := auth.uid();
  v_ticket_id uuid;
  v_count     integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_category not in ('feedback', 'billing', 'bug') then
    raise exception 'invalid_category';
  end if;

  if char_length(p_subject) < 1 or char_length(p_subject) > 200 then
    raise exception 'invalid_subject';
  end if;

  if char_length(p_body) < 1 or char_length(p_body) > 5000 then
    raise exception 'invalid_body';
  end if;

  -- Rate limit: max 5 tickets per user per rolling hour
  select count(*) into v_count
  from public.support_tickets
  where user_id = v_user_id
    and created_at > now() - interval '1 hour';

  if v_count >= 5 then
    raise exception 'rate_limit_exceeded';
  end if;

  -- Validate transcript ownership when provided
  if p_transcript_id is not null then
    if not exists (
      select 1 from public.transcripts
      where id = p_transcript_id
        and user_id = v_user_id
    ) then
      raise exception 'transcript_not_found';
    end if;
  end if;

  -- Attachment, if provided, must live in the caller's own storage folder
  if p_attachment_path is not null then
    if p_attachment_path !~ ('^' || v_user_id::text || '/') then
      raise exception 'invalid_attachment';
    end if;
  end if;

  insert into public.support_tickets (user_id, category, subject, body, transcript_id, attachment_path)
  values (v_user_id, p_category, p_subject, p_body, p_transcript_id, p_attachment_path)
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$function$;

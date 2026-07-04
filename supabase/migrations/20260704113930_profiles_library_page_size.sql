-- Library page-size preference (25 / 50 / 100, default 50).
-- Consumed by the Library page (server-side pagination) and Settings.
alter table public.profiles
  add column if not exists library_page_size integer not null default 50
  check (library_page_size in (25, 50, 100));

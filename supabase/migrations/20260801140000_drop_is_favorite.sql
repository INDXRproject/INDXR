-- Remove the dead `is_favorite` column from transcripts. It had zero readers: only ever written
-- (`is_favorite: false`) on the free-tool insert, which is removed in the same change. No favourites
-- feature exists; keeping the column was just dead weight. (ADR-085 follow-up cleanup.)
alter table public.transcripts drop column if exists is_favorite;

-- ADR-111: Zotero/citation-stijlen fase 1. Per-gebruiker onthouden citatiestijl (SourceCard
-- "stijlkeuze onthouden per gebruiker") — zelfde patroon als rag_chunk_size (baseline): kleine,
-- vaste enum-achtige set via CHECK, geen apart user_preferences-tabel nodig.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS citation_style text DEFAULT 'apa' NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_citation_style_check
  CHECK (citation_style = ANY (ARRAY['apa'::text, 'mla'::text, 'chicago'::text, 'harvard'::text]));

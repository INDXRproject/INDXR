-- Migration: add archived column to messages
-- Third migration after baseline (20260630155944) and messages (20260630164156).
-- The existing UPDATE policy "Users can update own messages" covers setting archived=true/false.

ALTER TABLE public.messages
  ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

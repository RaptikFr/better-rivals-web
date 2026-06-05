-- ============================================================
-- MIGRATION — Ajout de setup_author dans lap_times
-- À appliquer via : Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE lap_times
  ADD COLUMN IF NOT EXISTS setup_author TEXT DEFAULT NULL;

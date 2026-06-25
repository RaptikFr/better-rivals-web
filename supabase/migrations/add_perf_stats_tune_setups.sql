-- À appliquer manuellement dans l'éditeur SQL Supabase (BEGIN/COMMIT).
BEGIN;
ALTER TABLE tune_setups ADD COLUMN IF NOT EXISTS perf_stats jsonb;
COMMIT;

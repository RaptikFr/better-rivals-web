-- ============================================================
-- MIGRATION — Sync cross-device des préférences d'affichage
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- Stocke les préférences d'affichage (format des temps, densité, accent,
-- colonnes, etc.) sur le compte, en plus du localStorage. Un joueur connecté
-- retrouve ainsi ses réglages sur tous ses appareils. Anon → localStorage seul.
-- ============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Les grants sur players sont par colonne : le compte connecté lit et écrit
-- SES préférences (RLS UPDATE de sa propre ligne déjà en place). Pas d'accès anon.
GRANT SELECT (preferences) ON players TO authenticated;
GRANT UPDATE (preferences) ON players TO authenticated;

-- ============================================================
-- Notifications email opt-in — Better Rivals
-- À appliquer via : Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT false;

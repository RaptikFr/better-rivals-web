-- ============================================================
-- MIGRATION — Index sur lap_times.recorded_at (tri des flux)
-- À appliquer via : Supabase Dashboard > SQL Editor (ou API management).
-- ============================================================
-- Le flux « Derniers chronos » de l'accueil (lib/derniersChronos.ts) et le
-- récap hebdomadaire trient par recorded_at DESC (mis à jour à chaque
-- amélioration, contrairement à created_at). L'index existant
-- idx_lap_times_created_at (optimisations.sql) ne sert pas ce tri : sans
-- index dédié, Postgres trie toute la table à chaque recalcul du cache.

CREATE INDEX IF NOT EXISTS idx_lap_times_recorded_at
  ON lap_times (recorded_at DESC);

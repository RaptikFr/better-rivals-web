-- ============================================================
-- RENOMMAGE — « Toge » → « Touge » (romanisation correcte de 峠)
-- À appliquer via : Supabase Dashboard > SQL Editor
-- 5 circuits concernés à la date du 10 juin 2026.
-- ============================================================

UPDATE tracks SET type = 'Touge' WHERE type = 'Toge';

-- Vérification :
--   SELECT type, COUNT(*) FROM tracks GROUP BY type;
--   → plus aucune ligne « Toge »

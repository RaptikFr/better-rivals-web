-- ============================================================
-- RENOMMAGE — « Toge » → « Touge » (romanisation correcte de 峠)
-- À appliquer via : Supabase Dashboard > SQL Editor
-- 5 circuits concernés à la date du 10 juin 2026.
--
-- La contrainte tracks_type_check n'accepte que les anciennes
-- valeurs : il faut la remplacer avant de renommer.
-- (Pour voir sa définition actuelle si besoin :
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'tracks_type_check';)
-- ============================================================

ALTER TABLE tracks DROP CONSTRAINT tracks_type_check;

UPDATE tracks SET type = 'Touge' WHERE type = 'Toge';

ALTER TABLE tracks ADD CONSTRAINT tracks_type_check
  CHECK (type IN (
    'Course sur route',
    'Course tous chemins',
    'Cross-country',
    'Touge',
    'Course de rue',
    'Course de drag'
  ));

-- Vérification :
--   SELECT type, COUNT(*) FROM tracks GROUP BY type;
--   → plus aucune ligne « Toge »

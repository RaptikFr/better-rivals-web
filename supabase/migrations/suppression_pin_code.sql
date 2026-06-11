-- ============================================================
-- NETTOYAGE — suppression de players.pin_code
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- Colonne héritée de l'ancien système du relais (le relais
-- envoyait un PIN que l'API n'a jamais relu). Plus aucune
-- lecture ni écriture : le relais distribué (exe, GitHub
-- Releases) ne l'envoie plus, et l'API /api/times l'ignorait.
-- Elle était déjà masquée par les grants par colonne
-- (securite_colonnes.sql) ; on la supprime définitivement.
-- ============================================================

ALTER TABLE players DROP COLUMN pin_code;

-- Vérification :
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'players';
--   → plus de ligne « pin_code »

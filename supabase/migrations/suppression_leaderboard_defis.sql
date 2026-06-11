-- ============================================================
-- NETTOYAGE — suppression de la vue leaderboard et de la table defis
-- Appliquée via l'API de management Supabase le 12 juin 2026
--
-- Vue leaderboard : classement tout-en-un (jointures lap_times/
-- players/cars/tracks, temps formaté, rang par circuit et classe).
-- Plus utilisée : le site construit ses classements via les routes
-- API, et le relais (relais_gui_v15.py) ne la référence pas
-- (vérifié le 12 juin 2026).
--
-- Table defis : reliquat du défi hebdomadaire, fonctionnalité
-- supprimée du site. Ne contenait que 2 défis périmés (semaines
-- du 24 et 31 mai 2026). Le relais ne la référence pas non plus.
-- ============================================================

DROP VIEW IF EXISTS public.leaderboard;

DROP TABLE IF EXISTS public.defis;

-- Vérification :
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('leaderboard', 'defis');
--   → aucune ligne

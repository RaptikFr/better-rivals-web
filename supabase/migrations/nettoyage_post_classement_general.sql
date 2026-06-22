-- ============================================================
-- NETTOYAGE — suite au retrait du classement général
-- Appliqué le 22/06/2026 via l'API Management (PAT).
--
-- 1) DROP de la RPC general_ranking() : la fonctionnalité
--    « classement général » a été retirée du site (page + API +
--    badge), cf. commit 2e0ea18. Plus aucun appelant.
-- 2) DROP de l'index redondant idx_lap_traces_lap_time : doublon
--    exact de la contrainte unique lap_traces_lap_time_id_key
--    (même colonne lap_time_id) — l'index unique couvre déjà les
--    lookups. Idempotent (IF EXISTS).
--
-- NB : un ANALYZE a aussi été lancé (stats du planificateur) ;
-- ce n'est pas une modification de schéma, donc hors de ce fichier.
-- ============================================================

DROP FUNCTION IF EXISTS public.general_ranking();

DROP INDEX IF EXISTS public.idx_lap_traces_lap_time;

-- Vérifications :
--   SELECT proname FROM pg_proc WHERE proname = 'general_ranking';     -- → 0 ligne
--   SELECT indexname FROM pg_indexes WHERE indexname = 'idx_lap_traces_lap_time'; -- → 0 ligne

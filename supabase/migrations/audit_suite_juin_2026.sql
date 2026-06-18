-- ============================================================
-- SUITE D'AUDIT — Better Rivals (18 juin 2026)
-- Donne suite aux deux points « restent connus et assumés » de
-- audit_rls_complet.sql (11 juin). À APPLIQUER MANUELLEMENT via l'API
-- de management / le dashboard SQL (comme audit_rls_complet.sql) —
-- non appliquée automatiquement par le déploiement web.
--
-- ⚠ AVANT D'APPLIQUER : vérifier que le schéma `tracks` n'a pas gagné de
--    colonne lue côté client depuis cette date (sinon l'ajouter au GRANT).
-- ============================================================

-- ── 1. tracks.submitted_by : ne plus l'exposer côté client ──
-- Les routes serveur (service role) gardent l'accès complet. Côté anon/
-- authenticated, on bascule d'un SELECT « toutes colonnes » à un SELECT par
-- colonne qui retient uniquement submitted_by (UUID auth de l'auteur).
-- Colonnes effectivement lues par le client (epreuves-officielles/communaute,
-- GlobalSearch, circuitRankings, classementMetadata) :
--   id, name, type, length_km, event_lab_code, description, is_sprint,
--   is_official, status
-- La policy RLS « Lecture publique tracks » (status approuvé) continue de
-- s'appliquer EN PLUS de ces grants.
REVOKE SELECT ON tracks FROM anon, authenticated;
GRANT SELECT (
  id, name, type, length_km, event_lab_code, description,
  is_sprint, is_official, status
) ON tracks TO anon, authenticated;

-- ── 2. Vue leaderboard morte ──
-- Notée dans audit_rls_complet.sql comme inutilisée par le code (à valider).
-- Aucune référence côté web. Suppression pour réduire la surface ; si une
-- intégration externe l'utilisait, la recréer (security_invoker=true).
DROP VIEW IF EXISTS leaderboard;

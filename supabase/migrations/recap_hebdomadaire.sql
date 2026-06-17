-- ============================================================
-- MIGRATION — Récap hebdomadaire par email (opt-in)
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- Préférence DÉDIÉE et OPT-IN (défaut false) : le joueur ne reçoit le récap
-- hebdomadaire que s'il coche explicitement l'option dans ses paramètres.
-- Indépendante de email_notifications_enabled (qui pilote les emails de
-- dépassement « exact »).
--
-- L'envoi est déclenché par /api/cron/weekly-recap (protégé par CRON_SECRET),
-- qui lit cette colonne avant d'envoyer pour respecter le choix du joueur.
-- ============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS notify_weekly boolean NOT NULL DEFAULT false;

-- Grants par colonne (cf. securite_colonnes.sql / notifications_par_type.sql) :
-- le compte connecté doit pouvoir lire et modifier sa préférence. Le serveur
-- (service role) contourne les grants. Préférence personnelle → pas d'anon.
GRANT SELECT (notify_weekly) ON players TO authenticated;
GRANT UPDATE (notify_weekly) ON players TO authenticated;

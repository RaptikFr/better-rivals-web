-- ============================================================
-- MIGRATION — Préférences de notification par type
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- Ajoute une granularité aux notifications in-app : le joueur peut couper
-- chacun des 4 types indépendamment. Par défaut tout est activé (comportement
-- actuel inchangé). L'envoi d'email reste piloté par email_notifications_enabled
-- (uniquement les dépassements « exact »).
--
-- Les notifications sont créées côté serveur (service role) dans /api/times,
-- qui lit ces colonnes avant d'insérer pour respecter le choix du joueur.
-- ============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS notify_exact      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_drivetrain boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_class      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_rival      boolean NOT NULL DEFAULT true;

-- Les grants sur players sont PAR COLONNE (cf. securite_colonnes.sql /
-- audit_rls_complet.sql). Il faut donc ouvrir explicitement la lecture et la
-- mise à jour de ces colonnes au compte connecté (le serveur, en service role,
-- contourne les grants). Préférences personnelles → pas de grant pour anon.
GRANT SELECT (notify_exact, notify_drivetrain, notify_class, notify_rival)
  ON players TO authenticated;
GRANT UPDATE (notify_exact, notify_drivetrain, notify_class, notify_rival)
  ON players TO authenticated;

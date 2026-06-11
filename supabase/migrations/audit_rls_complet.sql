-- ============================================================
-- AUDIT RLS COMPLET — Better Rivals (11 juin 2026)
-- Appliquée directement via l'API de management (token PAT).
-- Versionnée ici pour l'historique.
--
-- Constats de l'audit (policies + grants, dashboard jamais revu) :
--   1. cars : policy UPDATE `true` + grant UPDATE → n'importe quel
--      compte connecté pouvait vandaliser le catalogue de voitures.
--   2. reports : policies SELECT/INSERT `true` + grants → tout compte
--      connecté pouvait lire tous les signalements et en insérer
--      directement (en contournant la route API et son rate limit).
--   3. tracks : policy SELECT anon `true` → les épreuves pending et
--      rejected (avec leur event_lab_code et submitted_by) étaient
--      lisibles publiquement.
--   4. notifications : AUCUNE policy DELETE → le bouton « supprimer
--      les notifications lues » échouait silencieusement depuis
--      toujours (corrigé ici par l'ajout de la policy).
--   5. Policies dupliquées (players ×4 SELECT, cars ×2, lap_times ×2,
--      tracks ×2) et mortes (votes INSERT, contact_messages ×4).
--   6. Index dupliqués (lap_times ×2, votes ×1).
--   7. Grants TRUNCATE/REFERENCES/TRIGGER inutiles partout.
-- ============================================================

-- ── cars : écritures réservées au serveur (/api/times) ──
DROP POLICY IF EXISTS "Mise à jour voiture authentifié" ON cars;
DROP POLICY IF EXISTS "Autoriser la lecture publique" ON cars; -- doublon de "Lecture publique cars"
REVOKE INSERT, UPDATE, DELETE ON cars FROM anon, authenticated;

-- ── reports : tout passe par /api/reports (service role) ──
DROP POLICY IF EXISTS "Lecture admin" ON reports;
DROP POLICY IF EXISTS "Insert authentifié" ON reports;
REVOKE SELECT, INSERT, UPDATE, DELETE ON reports FROM anon, authenticated;

-- ── tracks : seules les épreuves approuvées sont publiques ──
DROP POLICY IF EXISTS "Autoriser la lecture publique" ON tracks;          -- anon `true` → fuite des pending
DROP POLICY IF EXISTS "Lecture publique des circuits approuvés" ON tracks; -- doublon de "Lecture publique tracks"
DROP POLICY IF EXISTS "Admins peuvent lire les tracks pending" ON tracks;  -- l'admin passe par /api/admin/tracks
DROP POLICY IF EXISTS "Admins peuvent mettre à jour le status des tracks" ON tracks; -- idem (grant UPDATE déjà révoqué)

-- ── players : une seule policy SELECT, écritures par colonnes ──
DROP POLICY IF EXISTS "Autoriser la lecture publique" ON players;
DROP POLICY IF EXISTS "Lecture profil joueur" ON players;
DROP POLICY IF EXISTS "Players can read own profile" ON players;
-- restent : "Lecture publique players" (les colonnes visibles sont gérées
-- par les grants de securite_colonnes.sql), l'INSERT inscription et
-- l'UPDATE "Joueur peut modifier son profil"
REVOKE INSERT, UPDATE, DELETE ON players FROM anon, authenticated;
GRANT INSERT (pseudo, user_id) ON players TO authenticated;                            -- inscription
GRANT UPDATE (discord_tag, email_notifications_enabled) ON players TO authenticated;  -- page profil

-- ── lap_times / lap_times_history : lecture seule côté client ──
DROP POLICY IF EXISTS "Autoriser la lecture publique" ON lap_times; -- doublon de "Lecture publique des classements"
REVOKE INSERT, UPDATE, DELETE ON lap_times FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON lap_times_history FROM anon, authenticated;

-- ── notifications : marquer lu (colonne read) + supprimer les siennes ──
REVOKE INSERT, UPDATE ON notifications FROM anon, authenticated;
REVOKE SELECT, DELETE ON notifications FROM anon;
GRANT UPDATE (read) ON notifications TO authenticated;
-- Policy DELETE manquante : deleteAllRead() du site échouait en silence
CREATE POLICY "Suppression de ses propres notifications" ON notifications
  FOR DELETE TO authenticated
  USING (player_id = (SELECT players.id FROM players WHERE players.user_id = auth.uid()));

-- ── tune_setups : écritures via /api/tune-setups (vérif conflit + rate limit) ──
DROP POLICY IF EXISTS "Gestion de ses propres réglages" ON tune_setups;
REVOKE INSERT, UPDATE, DELETE ON tune_setups FROM anon, authenticated;

-- ── votes / contact_messages : policies mortes (grants déjà révoqués) ──
DROP POLICY IF EXISTS "Insertion vote authentifié" ON votes;
DROP POLICY IF EXISTS "Lecture admin" ON contact_messages;
DROP POLICY IF EXISTS "Mise à jour admin" ON contact_messages;
DROP POLICY IF EXISTS "Suppression admin" ON contact_messages;
DROP POLICY IF EXISTS "Insert public" ON contact_messages;

-- ── defis (table non utilisée par le code web) / world_records ──
REVOKE INSERT, UPDATE, DELETE ON defis FROM anon, authenticated;
REVOKE ALL ON world_records FROM anon, authenticated;

-- ── privilèges jamais utilisables via PostgREST ──
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- ── index strictement dupliqués ──
DROP INDEX IF EXISTS idx_lap_times_player_id; -- = idx_lap_times_player (player_id)
DROP INDEX IF EXISTS idx_lap_times_time_ms;   -- = idx_lap_times_time (time_ms)
ALTER TABLE votes DROP CONSTRAINT IF EXISTS uq_votes_track_user; -- = contrainte votes_track_id_user_id_key

-- ── unicité (anti-course ; absence de doublons vérifiée le 11 juin 2026) ──
-- /api/epreuves vérifie le code EventLab par SELECT puis INSERT : une
-- contrainte ferme la fenêtre de course. Idem pour la config lap_times.
ALTER TABLE tracks    ADD CONSTRAINT tracks_event_lab_code_key UNIQUE (event_lab_code);
ALTER TABLE lap_times ADD CONSTRAINT lap_times_config_key
  UNIQUE (player_id, track_id, car_ordinal, car_class, drivetrain);

-- ============================================================
-- Restent connus et assumés :
--   - tracks.submitted_by (UUID auth) lisible sur les épreuves
--     approuvées — à restreindre par colonnes si souhaité.
--   - players.user_id lisible par les comptes connectés (nécessaire
--     au fonctionnement du site : usePlayer filtre dessus).
--   - Vue leaderboard : security_invoker=true (saine) mais inutilisée
--     par le code — candidate à la suppression (à valider).
-- ============================================================

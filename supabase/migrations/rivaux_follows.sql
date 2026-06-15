-- ============================================================
-- MIGRATION — Suivi de rivaux (« Mes rivaux »)
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- Permet à un joueur de suivre d'autres pilotes et de recevoir une
-- notification (type 'rival') lorsqu'un suivi le dépasse sur une config,
-- quelle que soit la position. La création des notifications se fait
-- côté serveur (service role) dans /api/times.
-- ============================================================

CREATE TABLE IF NOT EXISTS follows (
  follower_player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  followed_player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_player_id, followed_player_id),
  CONSTRAINT follows_no_self CHECK (follower_player_id <> followed_player_id)
);

-- Recherche des suiveurs d'un joueur (utilisée à chaque chrono enregistré)
CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows (followed_player_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Le joueur ne lit/gère que SES propres suivis (la colonne follower).
-- Le serveur (service role) lit les suiveurs pour notifier, hors RLS.
DROP POLICY IF EXISTS "Lecture de ses propres suivis" ON follows;
CREATE POLICY "Lecture de ses propres suivis" ON follows
  FOR SELECT TO authenticated
  USING (follower_player_id = (SELECT players.id FROM players WHERE players.user_id = auth.uid()));

DROP POLICY IF EXISTS "Ajout de ses propres suivis" ON follows;
CREATE POLICY "Ajout de ses propres suivis" ON follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_player_id = (SELECT players.id FROM players WHERE players.user_id = auth.uid()));

DROP POLICY IF EXISTS "Suppression de ses propres suivis" ON follows;
CREATE POLICY "Suppression de ses propres suivis" ON follows
  FOR DELETE TO authenticated
  USING (follower_player_id = (SELECT players.id FROM players WHERE players.user_id = auth.uid()));

REVOKE ALL ON follows FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON follows TO authenticated;

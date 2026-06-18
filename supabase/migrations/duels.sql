-- ============================================================
-- DUELS — Better Rivals (pack social, #8)
-- Étend les objectifs 🎯 : un joueur DÉFIE un autre sur une config exacte
-- (circuit × voiture × classe × transmission). Le défié accepte ou refuse ;
-- une fois accepté, le duel court jusqu'à sa date limite, puis le vainqueur est
-- déterminé AUTOMATIQUEMENT (meilleur temps des deux sur la config).
--
-- À APPLIQUER MANUELLEMENT via le SQL editor / l'API de management (comme
-- objectifs_a_battre.sql) — non appliquée par le déploiement web.
--
-- Modèle : comme objectifs, le duel est un pointeur (les deux joueurs + la
-- config + la date limite). Les temps ne sont jamais figés : ils sont dérivés
-- en direct de lap_times. La résolution (winner_id, status='completed') se fait
-- paresseusement quand un joueur consulte ses duels après la date limite.
-- ============================================================

CREATE TABLE IF NOT EXISTS duels (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- qui défie
  opponent_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- le défié
  track_id      int  NOT NULL REFERENCES tracks(id)  ON DELETE CASCADE,
  car_ordinal   int  NOT NULL,
  car_class     text NOT NULL,
  drivetrain    text NOT NULL,
  status        text NOT NULL DEFAULT 'pending',  -- pending|accepted|declined|cancelled|completed
  deadline      timestamptz NOT NULL,
  winner_id     uuid REFERENCES players(id) ON DELETE SET NULL,  -- NULL = égalité ou non résolu
  created_at    timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,  -- quand le défié a accepté/refusé
  resolved_at   timestamptz,  -- quand le vainqueur a été déterminé
  CONSTRAINT duels_pas_soi       CHECK (challenger_id <> opponent_id),
  CONSTRAINT duels_status_valide CHECK (status IN ('pending','accepted','declined','cancelled','completed'))
);

-- Lectures « mes duels » (reçus + envoyés) et résolution des duels expirés.
CREATE INDEX IF NOT EXISTS idx_duels_challenger ON duels(challenger_id);
CREATE INDEX IF NOT EXISTS idx_duels_opponent   ON duels(opponent_id);
CREATE INDEX IF NOT EXISTS idx_duels_active     ON duels(status, deadline);

-- Sécurité : tout passe par /api/duels (service role), comme objectifs.
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON duels FROM anon, authenticated;

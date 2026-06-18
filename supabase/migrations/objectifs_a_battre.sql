-- ============================================================
-- OBJECTIFS À BATTRE — Better Rivals (18 juin 2026)
-- Permet à un joueur de se fixer comme objectif de battre le temps d'un
-- PILOTE PRÉCIS sur une config (circuit × voiture × classe × transmission).
-- À APPLIQUER MANUELLEMENT via le SQL editor / l'API de management (comme
-- audit_rls_complet.sql) — non appliquée par le déploiement web.
--
-- Modèle : l'objectif est un pointeur (moi, le pilote visé, la config). Le
-- temps cible et mon temps sont dérivés EN DIRECT de lap_times → pas de
-- valeur figée à resynchroniser quand le pilote visé améliore son temps.
-- achieved_at est posé la première fois que je passe sous le temps cible
-- (par /api/times, voir la détection côté serveur).
-- ============================================================

CREATE TABLE IF NOT EXISTS objectifs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- qui veut battre
  target_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- le pilote visé
  track_id         int  NOT NULL REFERENCES tracks(id)  ON DELETE CASCADE,
  car_ordinal      int  NOT NULL,
  car_class        text NOT NULL,
  drivetrain       text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  achieved_at      timestamptz,  -- NULL tant que l'objectif n'est pas atteint
  CONSTRAINT objectifs_pas_soi      CHECK (player_id <> target_player_id),
  CONSTRAINT objectifs_config_unique UNIQUE (player_id, target_player_id, track_id, car_ordinal, car_class, drivetrain)
);

-- Lecture « mes objectifs » et détection serveur par config visée.
CREATE INDEX IF NOT EXISTS idx_objectifs_player ON objectifs(player_id);
CREATE INDEX IF NOT EXISTS idx_objectifs_config ON objectifs(target_player_id, track_id, car_ordinal, car_class, drivetrain);

-- Sécurité : tout passe par /api/objectifs (service role). Comme reports/
-- tune_setups depuis l'audit du 11 juin, aucun accès direct anon/authenticated.
ALTER TABLE objectifs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON objectifs FROM anon, authenticated;

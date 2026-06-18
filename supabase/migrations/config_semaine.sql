-- ============================================================
-- CONFIG DE LA SEMAINE — Better Rivals (pack social, #9)
-- Une config (circuit × voiture × classe × transmission) mise en avant sur une
-- fenêtre de 7 jours. Le classement de la semaine = les temps POSÉS pendant la
-- fenêtre sur cette config exacte (lap_times.recorded_at ∈ [starts_at, ends_at]),
-- le gagnant = le plus rapide.
--
-- À APPLIQUER MANUELLEMENT via le SQL editor / l'API de management (comme
-- objectifs_a_battre.sql) — non appliquée par le déploiement web.
--
-- Modèle : la config active est la ligne dont now() ∈ [starts_at, ends_at), la
-- plus récente. On ne fige aucun temps : le classement est dérivé en direct de
-- lap_times. Un admin pose une nouvelle config quand il veut (latest gagne).
-- ============================================================

CREATE TABLE IF NOT EXISTS weekly_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id    int  NOT NULL REFERENCES tracks(id)        ON DELETE CASCADE,
  car_ordinal int  NOT NULL REFERENCES cars(car_ordinal) ON DELETE CASCADE,
  car_class   text NOT NULL,
  drivetrain  text NOT NULL,
  starts_at   timestamptz NOT NULL DEFAULT now(),
  ends_at     timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_config_fenetre_valide CHECK (ends_at > starts_at)
);

-- Sélection de la config active (now() entre starts_at et ends_at).
CREATE INDEX IF NOT EXISTS idx_weekly_config_window ON weekly_config(starts_at, ends_at);

-- Sécurité : tout passe par /api/admin/config-semaine (pose, service role) et
-- /config-semaine (lecture serveur, service role). Aucun accès direct anon/auth,
-- aligné sur l'audit du 11 juin (reports/tune_setups/objectifs).
ALTER TABLE weekly_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON weekly_config FROM anon, authenticated;

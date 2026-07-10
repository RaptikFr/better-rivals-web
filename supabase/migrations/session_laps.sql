-- ============================================================
-- SESSION_LAPS — Better Rivals (score de régularité, idée #4)
-- Un enregistrement LÉGER par tour complet validé (temps seulement, pas de
-- télémétrie) : le relais (≥ v1.15) poste déjà CHAQUE tour sur POST
-- /api/sectors pour alimenter best_sectors — on en profite pour garder le
-- temps du tour ici. Sert à calculer le score de RÉGULARITÉ d'une session
-- (écart-type des tours propres) affiché dans l'onglet 📊 Statistiques de
-- /profil. Aucune modification du relais nécessaire.
--
-- Rétention : élagage à l'écriture (tours > 90 jours du joueur supprimés
-- dans POST /api/sectors, best-effort) — c'est une fenêtre glissante, pas
-- une archive.
--
-- À APPLIQUER via la Management API (comme coach_reglage_reports.sql).
-- ============================================================

CREATE TABLE IF NOT EXISTS session_laps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- Config exacte (mêmes 4 clés que lap_times / best_sectors).
  track_id    int  NOT NULL,
  car_ordinal int  NOT NULL,
  car_class   text NOT NULL,
  drivetrain  text NOT NULL,
  lap_ms      int  NOT NULL CHECK (lap_ms > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Lecture « mes tours récents » (GET /api/regularite) + élagage par ancienneté.
CREATE INDEX IF NOT EXISTS idx_session_laps_player_date
  ON session_laps(player_id, created_at DESC);

-- Sécurité : écriture (relais via /api/sectors) et lecture (site via
-- /api/regularite) passent par le service role, comme coach_reglage_reports.
ALTER TABLE session_laps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON session_laps FROM anon, authenticated;

-- ============================================================
-- LAP_TRACES — Better Rivals (brique télémétrie, fondation)
-- Trace échantillonnée d'un tour, capturée par le relais (≥ v1.13) et
-- envoyée sur POST /api/traces au moment d'un nouveau meilleur temps.
-- Une trace par lap_time (le meilleur tour d'une config) → upsert sur
-- lap_time_id. Débloque le delta live (#1), le coach post-tour (#3) et le
-- copilote de réglage (#5).
--
-- À APPLIQUER MANUELLEMENT via le SQL editor (comme duels.sql / secteurs.sql).
--
-- `samples` = tableaux parallèles (compacts), échantillonnés PAR DISTANCE :
--   { "d":[m...], "t":[s...], "v":[km/h...], "thr":[0-100...],
--     "brk":[0-100...], "str":[-100..100...] }
-- d = distance cumulée dans le tour (m) ; t = temps écoulé (s) ; le reste =
-- vitesse et entrées pilote. Le delta live n'utilise que d+t ; v/thr/brk/str
-- servent au coach. Forza n'expose pas de checkpoint : tout est reconstruit.
-- ============================================================

CREATE TABLE IF NOT EXISTS lap_traces (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lap_time_id  uuid NOT NULL UNIQUE REFERENCES lap_times(id) ON DELETE CASCADE,
  sample_dist_m int  NOT NULL,   -- pas d'échantillonnage utilisé (m)
  point_count  int  NOT NULL,    -- nombre de points (= longueur des tableaux)
  samples      jsonb NOT NULL,   -- tableaux parallèles d/t/v/thr/brk/str
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Récupération d'une trace de référence par tour (delta live, coach).
CREATE INDEX IF NOT EXISTS idx_lap_traces_lap_time ON lap_traces(lap_time_id);

-- Sécurité : écriture et lecture passent par /api/traces (service role),
-- comme duels / objectifs.
ALTER TABLE lap_traces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON lap_traces FROM anon, authenticated;

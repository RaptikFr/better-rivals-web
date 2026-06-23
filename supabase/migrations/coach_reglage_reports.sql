-- ============================================================
-- COACH_REGLAGE_REPORTS — Better Rivals (copilote de réglage, compte rendu site)
-- Résumé du diagnostic de RÉGLAGE produit en jeu par le relais (≥ v3,
-- module coach_reglage.diagnostic_compact) à la fin d'un tour, envoyé sur
-- POST /api/coach-reports. Le joueur consulte ses diagnostics dans l'onglet
-- 🔧 Copilote de /profil (modèle boîte de réception : on lit puis on
-- supprime), où ils sont agrégés par config pour faire ressortir les soucis
-- RÉCURRENTS (« blocage frein AVANT récurrent sur cette voiture/circuit »)
-- plutôt qu'un tour isolé.
--
-- À APPLIQUER MANUELLEMENT via le SQL editor (comme lap_traces.sql / secteurs.sql).
--
-- Différence avec lap_traces : ce n'est PAS la télémétrie brute mais le
-- VERDICT compact (titre + 1-2 conseils actionnables) calculé dans le relais
-- (qui a le 60 Hz dense ; le site n'a que la trace sparse). Voir la mémoire
-- projet « compte-rendu-reglage-v3 » et coach_reglage.py (OneDrive/Relais).
-- ============================================================

CREATE TABLE IF NOT EXISTS coach_reglage_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- Config exacte (mêmes 4 clés que lap_times / best_sectors) pour l'agrégation.
  track_id     int  NOT NULL,
  car_ordinal  int  NOT NULL,
  car_class    text NOT NULL,
  drivetrain   text NOT NULL,
  -- Verdict compact de coach_reglage.diagnostic_compact.
  titre        text NOT NULL,                 -- ex. « Survirage de puissance »
  conseils     text[] NOT NULL DEFAULT '{}',  -- 0 à 2 conseils actionnables
  transmission text,                          -- traction / propulsion / intégrale
  n_virages    int,                           -- nb de virages analysés (contexte)
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Liste « mes diagnostics » (les plus récents d'abord) + agrégation par config.
CREATE INDEX IF NOT EXISTS idx_coach_reports_player_date
  ON coach_reglage_reports(player_id, created_at DESC);

-- Sécurité : écriture (relais) et lecture/suppression (site) passent par
-- /api/coach-reports (service role), comme lap_traces / duels / objectifs.
ALTER TABLE coach_reglage_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON coach_reglage_reports FROM anon, authenticated;

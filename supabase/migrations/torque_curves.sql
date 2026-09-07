-- ============================================================
-- TORQUE_CURVES — Better Rivals (courbe couple/puissance/régime d'un build)
-- Capturée en jeu par le relais (≥ v3.8.0) : le joueur arme une « capture de
-- courbe » pour un rapport donné (ex. 4e) dans l'écran de sélection ; dès que
-- ce rapport est atteint à pleine charge, le relais échantillonne le régime,
-- le couple (Nm @264) et la puissance (W @260) à 60 Hz jusqu'à ce qu'une
-- condition tombe (rapport, gaz, patinage) ou arrêt manuel. Les points sont
-- sous-échantillonnés (~1 point / 100 tr/min) puis postés sur
-- POST /api/torque-curves, rattachés au CODE DE PARTAGE FORZA du build (même
-- granularité que lap_times.share_code / tune_setups — un réglage est lié à la
-- voiture, pas à une classe/transmission).
--
-- Le joueur consulte ses courbes dans l'onglet « 📈 Moteur » de /profil
-- (visible seulement si l'opt-in coachReport est actif, comme Coach/Copilote).
-- Sert au réglage de la boîte de vitesses : caler les rapports sur la plage
-- utile (entre pic de couple et pic de puissance).
--
-- À APPLIQUER MANUELLEMENT via le SQL editor (comme lap_traces.sql /
-- coach_reglage_reports.sql).
--
-- Différence avec coach_reglage_reports : ici on stocke des POINTS de mesure
-- bruts (agrégés par tranche de régime), pas un verdict. Une capture = une
-- ligne ; une nouvelle capture du même build REMPLACE la précédente (upsert
-- sur la contrainte d'unicité) — « la dernière mesure gagne ».
-- ============================================================

CREATE TABLE IF NOT EXISTS torque_curves (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- Build : voiture + code de partage Forza (normalisé MAJUSCULES, comme
  -- lib/reglages.ts). car_class / drivetrain / car_pi sont du CONTEXTE (la
  -- courbe moteur n'en dépend pas) pour l'affichage et un futur recoupement.
  car_ordinal    int  NOT NULL REFERENCES cars(car_ordinal),
  share_code     text NOT NULL,
  car_class      text,
  drivetrain     text,
  car_pi         int,
  -- Rapport utilisé pour la bosse (métadonnée : dit la résolution/plage).
  gear           int  NOT NULL,
  -- Rupteur (EngineMaxRpm) au moment de la capture — borne l'axe des régimes.
  engine_max_rpm real,
  -- Points triés par régime croissant : [{ "rpm": int, "nm": number, "kw": number }].
  points         jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Pics extraits des points (affichés en tête, servent au tri).
  peak_torque_rpm int,  peak_torque_nm real,
  peak_power_rpm  int,   peak_power_kw  real,
  captured_at    timestamptz NOT NULL DEFAULT now(),
  -- Une seule courbe par build : une recapture écrase (ON CONFLICT DO UPDATE).
  UNIQUE (player_id, car_ordinal, share_code)
);

-- Liste « mes courbes » (les plus récentes d'abord).
CREATE INDEX IF NOT EXISTS idx_torque_curves_player_date
  ON torque_curves(player_id, captured_at DESC);

-- Sécurité : écriture (relais) et lecture (site) passent par /api/torque-curves
-- (service role + vérif JWT Bearer), comme lap_traces / coach_reglage_reports.
ALTER TABLE torque_curves ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON torque_curves FROM anon, authenticated;

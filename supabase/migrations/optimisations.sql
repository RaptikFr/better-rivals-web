-- ============================================================
-- MIGRATIONS D'OPTIMISATION — Better Rivals
-- À appliquer via : Supabase Dashboard > SQL Editor
-- ============================================================


-- ============================================================
-- PARTIE 1 — INDEX (impact performance immédiat)
-- ============================================================

-- Page classements : filtre principal (circuit + classe + transmission)
-- Cette requête est exécutée à chaque changement de filtre
CREATE INDEX IF NOT EXISTS idx_lap_times_track_class_drive
  ON lap_times (track_id, car_class, drivetrain);

-- Page classements : tri par temps
CREATE INDEX IF NOT EXISTS idx_lap_times_time_ms
  ON lap_times (time_ms ASC);

-- Page profil : tous les temps d'un joueur
CREATE INDEX IF NOT EXISTS idx_lap_times_player_id
  ON lap_times (player_id);

-- Widgets "derniers chronos" + stats : tri par date
CREATE INDEX IF NOT EXISTS idx_lap_times_created_at
  ON lap_times (created_at DESC);

-- Page classement général + onglet classements du profil :
-- meilleur temps par (circuit × voiture × classe × transmission × joueur)
CREATE INDEX IF NOT EXISTS idx_lap_times_config_ranking
  ON lap_times (track_id, car_ordinal, car_class, drivetrain, player_id, time_ms);

-- Lookup joueur par user_id Supabase Auth (fait à chaque connexion)
CREATE INDEX IF NOT EXISTS idx_players_user_id
  ON players (user_id);

-- Réglages : récupérer les réglages d'un joueur pour ses voitures
CREATE INDEX IF NOT EXISTS idx_tune_setups_player_car
  ON tune_setups (player_id, car_ordinal);

-- Signalements : tri par statut puis date (vue admin)
CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON reports (status, created_at DESC);


-- ============================================================
-- PARTIE 2 — CONTRAINTES D'INTÉGRITÉ (données valides garanties)
-- ============================================================

-- Empêche l'insertion d'une classe invalide dans lap_times
ALTER TABLE lap_times
  ADD CONSTRAINT chk_lap_times_car_class
  CHECK (car_class IN ('D', 'C', 'B', 'A', 'S1', 'S2', 'R', 'X'));

-- Empêche l'insertion d'une transmission invalide
ALTER TABLE lap_times
  ADD CONSTRAINT chk_lap_times_drivetrain
  CHECK (drivetrain IN ('AWD', 'RWD', 'FWD'));

-- Statut des circuits
ALTER TABLE tracks
  ADD CONSTRAINT chk_tracks_status
  CHECK (status IN ('approved', 'pending', 'rejected'));

-- Statut des signalements
ALTER TABLE reports
  ADD CONSTRAINT chk_reports_status
  CHECK (status IN ('non_lu', 'lu'));

-- Statut des messages de contact
ALTER TABLE contact_messages
  ADD CONSTRAINT chk_contact_status
  CHECK (status IN ('non_lu', 'lu', 'traité'));

-- Un seul vote par utilisateur par circuit
-- (nécessaire pour que l'upsert fonctionne correctement)
ALTER TABLE votes
  ADD CONSTRAINT uq_votes_track_user
  UNIQUE (track_id, user_id);


-- ============================================================
-- PARTIE 3 — VALEURS PAR DÉFAUT ET NOT NULL
-- (appliquer seulement si toutes les lignes existantes sont valides)
-- ============================================================

-- tracks.is_sprint : devrait toujours avoir une valeur
ALTER TABLE tracks ALTER COLUMN is_sprint SET DEFAULT false;
ALTER TABLE tracks ALTER COLUMN is_sprint SET NOT NULL;

-- reports.status : un signalement est forcément "non_lu" à la création
ALTER TABLE reports ALTER COLUMN status SET DEFAULT 'non_lu';
ALTER TABLE reports ALTER COLUMN status SET NOT NULL;

-- tune_setups.is_original : booléen sans valeur par défaut
ALTER TABLE tune_setups ALTER COLUMN is_original SET DEFAULT false;
ALTER TABLE tune_setups ALTER COLUMN is_original SET NOT NULL;

-- cars.manufacturer / year : nullable dans le schéma mais requis en pratique
-- ⚠️ Vérifier d'abord qu'aucune ligne n'a NULL :
--    SELECT COUNT(*) FROM cars WHERE manufacturer IS NULL OR year IS NULL;
-- Si 0, décommenter :
-- ALTER TABLE cars ALTER COLUMN manufacturer SET NOT NULL;
-- ALTER TABLE cars ALTER COLUMN year SET NOT NULL;

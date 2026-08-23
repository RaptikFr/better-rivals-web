-- ============================================================
-- MIGRATION — Garage (« Mes voitures »)
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- Permet à un joueur de déclarer les MODÈLES de voitures qu'il possède
-- (car_ordinal seul, sans classe/transmission — granularité choisie
-- volontairement : le garage sert uniquement à la découverte de défis
-- possibles, pas à la création de défis elle-même — /api/duels exige
-- toujours que le défieur ait déjà un temps sur la config exacte). La
-- lecture est publique (comme lap_times/players) pour alimenter les
-- suggestions de défi sur le profil public d'un joueur et dans l'onglet
-- Rivaux.
-- ============================================================

CREATE TABLE IF NOT EXISTS garage (
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  car_ordinal INT  NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, car_ordinal)
);

-- Intersection « garage d'un joueur × mes temps » (profil public, rivaux).
CREATE INDEX IF NOT EXISTS idx_garage_car_ordinal ON garage (car_ordinal);

ALTER TABLE garage ENABLE ROW LEVEL SECURITY;

-- Lecture publique (profil public + onglet Rivaux, y compris visiteur anonyme).
DROP POLICY IF EXISTS "Lecture publique du garage" ON garage;
CREATE POLICY "Lecture publique du garage" ON garage
  FOR SELECT TO anon, authenticated
  USING (true);

-- Le joueur ne gère que SON propre garage.
DROP POLICY IF EXISTS "Ajout dans son propre garage" ON garage;
CREATE POLICY "Ajout dans son propre garage" ON garage
  FOR INSERT TO authenticated
  WITH CHECK (player_id = (SELECT players.id FROM players WHERE players.user_id = auth.uid()));

DROP POLICY IF EXISTS "Suppression dans son propre garage" ON garage;
CREATE POLICY "Suppression dans son propre garage" ON garage
  FOR DELETE TO authenticated
  USING (player_id = (SELECT players.id FROM players WHERE players.user_id = auth.uid()));

REVOKE ALL ON garage FROM anon, authenticated;
GRANT SELECT ON garage TO anon, authenticated;
GRANT INSERT, DELETE ON garage TO authenticated;

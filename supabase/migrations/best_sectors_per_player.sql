-- ============================================================
-- MIGRATION — best_sectors PAR JOUEUR (tour optimal du pilote)
-- À appliquer via : Supabase Dashboard > SQL Editor (ou API management).
-- ============================================================
-- Voir d'abord best_sectors.sql. Jusqu'ici best_sectors ne gardait QUE le
-- meilleur secteur GLOBAL par index (tous pilotes confondus). On la passe
-- PAR JOUEUR : meilleur secteur par index ET par player_id.
--   • Tour optimal GLOBAL d'une config = MIN(best_ms) par index (calculé à la
--     lecture, résultat identique à avant).
--   • Tour optimal d'un PILOTE = ses propres lignes → affichable sous son temps
--     (option côté site « Tour optimal par pilote »).
-- Indices 1..N stables (N déduit de length_km), comme avant.

-- 1) player_id devient une colonne de clé → doit être NON NULL. On écarte les
--    lignes orphelines (joueur supprimé → player_id NULL), non rattachables.
DELETE FROM public.best_sectors WHERE player_id IS NULL;
ALTER TABLE public.best_sectors ALTER COLUMN player_id SET NOT NULL;

-- 2) Nouvelle clé primaire incluant player_id.
ALTER TABLE public.best_sectors DROP CONSTRAINT IF EXISTS best_sectors_pkey;
ALTER TABLE public.best_sectors
  ADD CONSTRAINT best_sectors_pkey
  PRIMARY KEY (track_id, car_ordinal, car_class, drivetrain, sector_index, player_id);

-- 3) RPC : upsert PAR JOUEUR (ON CONFLICT inclut player_id ; on ne touche plus à
--    player_id dans le SET, c'est désormais une colonne de clé).
CREATE OR REPLACE FUNCTION public.enregistrer_meilleurs_secteurs(
  p_track_id    int,
  p_car_ordinal int,
  p_car_class   text,
  p_drivetrain  text,
  p_player_id   uuid,
  p_sectors     int[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE i int;
BEGIN
  IF p_sectors IS NULL OR p_player_id IS NULL THEN RETURN; END IF;
  FOR i IN 1 .. array_length(p_sectors, 1) LOOP
    IF p_sectors[i] IS NULL OR p_sectors[i] <= 0 THEN CONTINUE; END IF;
    INSERT INTO public.best_sectors AS bs
      (track_id, car_ordinal, car_class, drivetrain, sector_index, best_ms, player_id, recorded_at)
    VALUES
      (p_track_id, p_car_ordinal, p_car_class, p_drivetrain, i, p_sectors[i], p_player_id, now())
    ON CONFLICT (track_id, car_ordinal, car_class, drivetrain, sector_index, player_id)
    DO UPDATE SET best_ms = excluded.best_ms,
                  recorded_at = excluded.recorded_at
    WHERE excluded.best_ms < bs.best_ms;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.enregistrer_meilleurs_secteurs(int,int,text,text,uuid,int[])
  FROM public, anon, authenticated;

-- 4) Backfill : amorce le tour optimal perso de chaque pilote depuis les secteurs
--    de son PB (lap_times.sectors_ms). Donne une base immédiate (N secteurs
--    complets) ; s'affine ensuite à chaque tour posté sur /api/sectors.
INSERT INTO public.best_sectors
  (track_id, car_ordinal, car_class, drivetrain, sector_index, best_ms, player_id, recorded_at)
SELECT lt.track_id, lt.car_ordinal, lt.car_class, lt.drivetrain,
       s.idx::smallint, s.ms::int, lt.player_id, now()
FROM public.lap_times lt
CROSS JOIN LATERAL unnest(lt.sectors_ms) WITH ORDINALITY AS s(ms, idx)
WHERE lt.sectors_ms IS NOT NULL
  AND lt.player_id IS NOT NULL
  AND s.ms > 0
ON CONFLICT (track_id, car_ordinal, car_class, drivetrain, sector_index, player_id)
DO UPDATE SET best_ms = excluded.best_ms, recorded_at = excluded.recorded_at
WHERE excluded.best_ms < public.best_sectors.best_ms;

-- ============================================================
-- MIGRATION — Meilleurs secteurs par config (tour optimal)
-- À appliquer via : Supabase Dashboard > SQL Editor (ou API management)
-- ============================================================
-- Voir d'abord secteurs.sql. Limite de `lap_times.sectors_ms` : seuls les
-- tours-PB y figurent (un tour raté à 0,1 s qui contenait un meilleur secteur
-- était perdu). On agrège donc le MEILLEUR temps de chaque secteur, par config,
-- à travers TOUS les tours — alimenté par :
--   • POST /api/traces (secteurs du PB recalculés depuis la trace, tout relais
--     ≥ v1.13), et
--   • POST /api/sectors (secteurs de chaque tour, relais ≥ v1.15).
-- Le « tour optimal » d'une config = somme des best_ms par index.
-- N (nb de secteurs) est déduit de length_km (fixe) → indices stables par circuit.

CREATE TABLE IF NOT EXISTS public.best_sectors (
  track_id     integer  NOT NULL,
  car_ordinal  integer  NOT NULL,
  car_class    text     NOT NULL,
  drivetrain   text     NOT NULL,
  sector_index smallint NOT NULL,
  best_ms      integer  NOT NULL CHECK (best_ms > 0),
  player_id    uuid     REFERENCES public.players(id) ON DELETE SET NULL,
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (track_id, car_ordinal, car_class, drivetrain, sector_index)
);

ALTER TABLE public.best_sectors ENABLE ROW LEVEL SECURITY;

-- Lecture publique : donnée d'agrégat non sensible (comme les classements).
DROP POLICY IF EXISTS "best_sectors_select_public" ON public.best_sectors;
CREATE POLICY "best_sectors_select_public" ON public.best_sectors
  FOR SELECT USING (true);

GRANT SELECT ON public.best_sectors TO anon, authenticated;
-- Aucune écriture pour anon/authenticated : seul le service role écrit, via la RPC.

-- RPC : enregistre les secteurs d'un tour, ne conserve que le meilleur par index.
-- Upsert conditionnel atomique (pas de read-modify-write côté serveur).
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
  IF p_sectors IS NULL THEN RETURN; END IF;
  FOR i IN 1 .. array_length(p_sectors, 1) LOOP
    IF p_sectors[i] IS NULL OR p_sectors[i] <= 0 THEN CONTINUE; END IF;
    INSERT INTO public.best_sectors AS bs
      (track_id, car_ordinal, car_class, drivetrain, sector_index, best_ms, player_id, recorded_at)
    VALUES
      (p_track_id, p_car_ordinal, p_car_class, p_drivetrain, i, p_sectors[i], p_player_id, now())
    ON CONFLICT (track_id, car_ordinal, car_class, drivetrain, sector_index)
    DO UPDATE SET best_ms = excluded.best_ms,
                  player_id = excluded.player_id,
                  recorded_at = excluded.recorded_at
    WHERE excluded.best_ms < bs.best_ms;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.enregistrer_meilleurs_secteurs(int,int,text,text,uuid,int[])
  FROM public, anon, authenticated;

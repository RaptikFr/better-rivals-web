-- ============================================================
-- MIGRATION — Classement par config côté serveur (scalabilité)
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- Remplace le téléchargement de TOUS les temps des circuits d'un joueur
-- côté client (fetchAllRows) par un calcul côté Postgres. Pour chacune des
-- configs du joueur (circuit × voiture × classe × transmission), renvoie son
-- rang, le total de pilotes, et ses rivaux directs (juste devant / juste
-- derrière). Soit ~1 ligne par temps du joueur au lieu de toute la table.
--
-- Consommé par le profil et la page joueur via supabase.rpc(
--   'player_config_rankings', { p_player_id }). Les podiums (or/argent/bronze)
-- et les badges en sont dérivés côté client à partir du rang.
--
-- SECURITY INVOKER : la fonction respecte la RLS de l'appelant. lap_times et
-- players étant déjà en lecture publique (classements publics), elle est
-- exécutable par anon et authenticated.
-- L'index idx_lap_times_config_ranking (voir optimisations.sql) couvre déjà
-- le partitionnement (track_id, car_ordinal, car_class, drivetrain, ...).
-- ============================================================

CREATE OR REPLACE FUNCTION player_config_rankings(p_player_id uuid)
RETURNS TABLE (
  track_id      int,
  car_ordinal   int,
  car_class     text,
  drivetrain    text,
  time_ms       int,
  rank          int,
  total         int,
  ahead_pseudo  text,
  ahead_gap_ms  int,
  behind_pseudo text,
  behind_gap_ms int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH player_configs AS (
    SELECT DISTINCT lt.track_id, lt.car_ordinal, lt.car_class, lt.drivetrain
    FROM lap_times lt
    WHERE lt.player_id = p_player_id
  ),
  ranked AS (
    SELECT
      lt.track_id, lt.car_ordinal, lt.car_class, lt.drivetrain,
      lt.player_id, lt.time_ms, p.pseudo,
      ROW_NUMBER() OVER (
        PARTITION BY lt.track_id, lt.car_ordinal, lt.car_class, lt.drivetrain
        ORDER BY lt.time_ms ASC, lt.player_id ASC
      ) AS rnk,
      COUNT(*) OVER (
        PARTITION BY lt.track_id, lt.car_ordinal, lt.car_class, lt.drivetrain
      ) AS total
    FROM lap_times lt
    JOIN player_configs pc
      ON pc.track_id    = lt.track_id
     AND pc.car_ordinal = lt.car_ordinal
     AND pc.car_class   = lt.car_class
     AND pc.drivetrain  = lt.drivetrain
    JOIN players p ON p.id = lt.player_id
  )
  SELECT
    me.track_id::int,
    me.car_ordinal::int,
    me.car_class,
    me.drivetrain,
    me.time_ms::int,
    me.rnk::int   AS rank,
    me.total::int AS total,
    ahead.pseudo  AS ahead_pseudo,
    (me.time_ms - ahead.time_ms)::int  AS ahead_gap_ms,
    behind.pseudo AS behind_pseudo,
    (behind.time_ms - me.time_ms)::int AS behind_gap_ms
  FROM ranked me
  LEFT JOIN ranked ahead
    ON  ahead.track_id    = me.track_id
    AND ahead.car_ordinal = me.car_ordinal
    AND ahead.car_class   = me.car_class
    AND ahead.drivetrain  = me.drivetrain
    AND ahead.rnk = me.rnk - 1
  LEFT JOIN ranked behind
    ON  behind.track_id    = me.track_id
    AND behind.car_ordinal = me.car_ordinal
    AND behind.car_class   = me.car_class
    AND behind.drivetrain  = me.drivetrain
    AND behind.rnk = me.rnk + 1
  WHERE me.player_id = p_player_id;
$$;

REVOKE ALL ON FUNCTION player_config_rankings(uuid) FROM public;
GRANT EXECUTE ON FUNCTION player_config_rankings(uuid) TO anon, authenticated;

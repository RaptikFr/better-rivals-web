-- ============================================================
-- MIGRATION — Classement général côté serveur (scalabilité)
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- Remplace le téléchargement de TOUTE la table lap_times par l'API (puis
-- agrégation en JS) par un calcul côté Postgres. Pour chaque configuration
-- (circuit × voiture × classe × transmission), classe les joueurs par meilleur
-- temps, attribue les points [10,7,5,3,1] et compte les podiums.
--
-- L'API /api/classement-general l'appelle en priorité et retombe sur l'ancien
-- calcul JS si la fonction n'est pas déployée (déploiement sans coupure).
-- SECURITY INVOKER : respecte la RLS de l'appelant (lap_times/players publics).
-- Le tag Discord passe par discord_tag_public (NULL si masqué).
-- ============================================================

CREATE OR REPLACE FUNCTION general_ranking()
RETURNS TABLE (
  player_id   uuid,
  pseudo      text,
  discord_tag text,
  points      int,
  gold        int,
  silver      int,
  bronze      int,
  configs     int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH best AS (
    -- Meilleur temps par (config × joueur)
    SELECT DISTINCT ON (track_id, car_ordinal, car_class, drivetrain, player_id)
      track_id, car_ordinal, car_class, drivetrain, player_id, time_ms
    FROM lap_times
    ORDER BY track_id, car_ordinal, car_class, drivetrain, player_id, time_ms ASC
  ),
  ranked AS (
    SELECT
      player_id,
      ROW_NUMBER() OVER (
        PARTITION BY track_id, car_ordinal, car_class, drivetrain
        ORDER BY time_ms ASC, player_id ASC
      ) AS pos
    FROM best
  ),
  scored AS (
    SELECT
      player_id,
      SUM(CASE pos WHEN 1 THEN 10 WHEN 2 THEN 7 WHEN 3 THEN 5 WHEN 4 THEN 3 WHEN 5 THEN 1 ELSE 0 END)::int AS points,
      COUNT(*)::int                          AS configs,
      COUNT(*) FILTER (WHERE pos = 1)::int    AS gold,
      COUNT(*) FILTER (WHERE pos = 2)::int    AS silver,
      COUNT(*) FILTER (WHERE pos = 3)::int    AS bronze
    FROM ranked
    GROUP BY player_id
  )
  SELECT
    s.player_id,
    p.pseudo,
    p.discord_tag_public AS discord_tag,
    s.points, s.gold, s.silver, s.bronze, s.configs
  FROM scored s
  JOIN players p ON p.id = s.player_id
  ORDER BY s.points DESC, s.gold DESC, s.silver DESC, s.bronze DESC;
$$;

GRANT EXECUTE ON FUNCTION general_ranking() TO anon, authenticated;

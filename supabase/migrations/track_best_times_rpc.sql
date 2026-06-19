-- ============================================================
-- MIGRATION — Meilleurs temps par circuit côté serveur (scalabilité)
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- Remplace, dans GET /api/times?track_id=…, le `.limit(100)` + déduplication
-- en JS (qui tronquait silencieusement les configs au-delà de 100 lignes sur
-- un circuit populaire) par une déduplication côté Postgres : un seul meilleur
-- temps par (joueur × voiture × classe × transmission), triés du plus rapide
-- au plus lent. Renvoie aussi pseudo + infos voiture pour la liste du relais.
--
-- L'API appelle ce RPC en priorité et retombe sur l'ancien calcul si la
-- fonction n'est pas déployée (déploiement sans coupure).
-- SECURITY INVOKER : respecte la RLS de l'appelant (lap_times/players publics).
-- ============================================================

CREATE OR REPLACE FUNCTION track_best_times(p_track_id int)
RETURNS TABLE (
  id           uuid,
  time_ms      int,
  car_ordinal  int,
  car_class    text,
  car_pi       int,
  drivetrain   text,
  pseudo       text,
  manufacturer text,
  name         text,
  year         int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH best AS (
    -- Meilleur temps par (joueur × voiture × classe × transmission) sur ce circuit
    SELECT DISTINCT ON (lt.player_id, lt.car_ordinal, lt.car_class, lt.drivetrain)
      lt.id, lt.time_ms, lt.car_ordinal, lt.car_class, lt.car_pi, lt.drivetrain, lt.player_id
    FROM lap_times lt
    WHERE lt.track_id = p_track_id
    ORDER BY lt.player_id, lt.car_ordinal, lt.car_class, lt.drivetrain, lt.time_ms ASC
  )
  SELECT
    b.id, b.time_ms, b.car_ordinal, b.car_class, b.car_pi, b.drivetrain,
    p.pseudo, c.manufacturer, c.name, c.year
  FROM best b
  JOIN players p ON p.id = b.player_id
  LEFT JOIN cars c ON c.car_ordinal = b.car_ordinal
  ORDER BY b.time_ms ASC;
$$;

GRANT EXECUTE ON FUNCTION track_best_times(int) TO anon, authenticated;

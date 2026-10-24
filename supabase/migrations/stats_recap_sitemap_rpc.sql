-- ============================================================
-- MIGRATION — Agrégats côté Postgres : stats, récap hebdo, sitemap
-- À appliquer via : Supabase Dashboard > SQL Editor (idempotente)
--
-- Remplace les derniers « télécharger toute la table lap_times puis agréger
-- en Node » (même démarche que nouveaux_leaders_et_counts_rpc.sql) :
--
-- 1. stats_globales() — chiffres clés et tops de /stats et de l'accueil
--    (app/api/stats/route.ts, lib/siteStats.ts).
-- 2. recap_leaders_depuis(p_since) — records pris / perdus par joueur depuis
--    une date (cron du récap hebdomadaire, lib/weeklyRecap.ts). Même
--    algorithme que nouveaux_leaders_feed / lib/leaders.ts.
-- 3. track_last_activity() / car_last_activity() / joueurs_indexables() —
--    dates de dernière activité réelles pour le sitemap (au lieu de « maintenant »
--    à chaque visite, que Google finit par ignorer) + pages joueurs indexables.
--
-- Le code applicatif retombe sur l'ancien calcul JS tant que ces fonctions
-- n'existent pas (erreur PGRST202) : l'ordre déploiement / migration est libre.
--
-- SECURITY INVOKER : lap_times, lap_times_history, players, cars et tracks
-- sont en lecture publique → exécutable par anon et authenticated.
-- ============================================================

-- ── 1. Statistiques globales ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION stats_globales()
RETURNS json
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_chronos',  (SELECT count(*) FROM lap_times),
    'total_pilotes',  (SELECT count(*) FROM players),
    'total_circuits', (SELECT count(*) FROM tracks WHERE status = 'approved'),
    'total_voitures', (SELECT count(DISTINCT car_ordinal) FROM lap_times),
    'top_pilotes', COALESCE((
      SELECT json_agg(x) FROM (
        SELECT p.pseudo, count(*) AS count
          FROM lap_times lt JOIN players p ON p.id = lt.player_id
         GROUP BY p.pseudo
         ORDER BY count(*) DESC, p.pseudo
         LIMIT 3
      ) x), '[]'::json),
    'top_circuits', COALESCE((
      SELECT json_agg(x) FROM (
        SELECT t.name, count(*) AS count
          FROM lap_times lt JOIN tracks t ON t.id = lt.track_id
         GROUP BY t.name
         ORDER BY count(*) DESC, t.name
         LIMIT 5
      ) x), '[]'::json),
    'top_voitures', COALESCE((
      SELECT json_agg(x) FROM (
        SELECT concat_ws(' ', c.year::text, c.manufacturer, c.name) AS name, count(*) AS count
          FROM lap_times lt JOIN cars c ON c.car_ordinal = lt.car_ordinal
         GROUP BY 1
         ORDER BY count(*) DESC, 1
         LIMIT 5
      ) x), '[]'::json)
  )
$$;

GRANT EXECUTE ON FUNCTION stats_globales() TO anon, authenticated;

-- ── 2. Récap hebdomadaire : records pris / perdus depuis p_since ────────────
CREATE OR REPLACE FUNCTION recap_leaders_depuis(p_since timestamptz)
RETURNS TABLE (player_id uuid, pseudo text, gained int, lost int)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH events AS (
    SELECT lt.player_id, lt.track_id, lt.car_ordinal, lt.car_class,
           lt.drivetrain, lt.time_ms, lt.recorded_at
      FROM lap_times lt
    UNION ALL
    SELECT lh.player_id, lh.track_id, lh.car_ordinal, lh.car_class,
           lh.drivetrain, lh.time_ms, lh.recorded_at
      FROM lap_times_history lh
  ),
  avec_best AS (
    SELECT e.*,
           min(e.time_ms) OVER (
             PARTITION BY e.track_id, e.car_ordinal, e.car_class, e.drivetrain
             ORDER BY e.recorded_at, e.time_ms DESC
             ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
           ) AS best_avant
      FROM events e
  ),
  records AS (
    SELECT * FROM avec_best
     WHERE best_avant IS NULL OR time_ms < best_avant
  ),
  detronages AS (
    SELECT r.player_id, r.recorded_at,
           lag(r.player_id) OVER w AS old_player
      FROM records r
    WINDOW w AS (PARTITION BY r.track_id, r.car_ordinal, r.car_class, r.drivetrain
                 ORDER BY r.recorded_at, r.time_ms DESC)
  ),
  recents AS (
    SELECT d.player_id AS new_id, d.old_player AS old_id
      FROM detronages d
     WHERE d.old_player IS NOT NULL
       AND d.old_player <> d.player_id
       AND d.recorded_at >= p_since
  ),
  bilan AS (
    SELECT new_id AS pid, 1 AS g, 0 AS l FROM recents
    UNION ALL
    SELECT old_id AS pid, 0 AS g, 1 AS l FROM recents
  )
  SELECT b.pid, p.pseudo, sum(b.g)::int, sum(b.l)::int
    FROM bilan b
    JOIN players p ON p.id = b.pid
   GROUP BY b.pid, p.pseudo
$$;

GRANT EXECUTE ON FUNCTION recap_leaders_depuis(timestamptz) TO anon, authenticated;

-- ── 3. Sitemap : dernière activité réelle + pages joueurs ───────────────────
CREATE OR REPLACE FUNCTION track_last_activity()
RETURNS TABLE (track_id int, last_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT lt.track_id, max(lt.recorded_at) FROM lap_times lt GROUP BY lt.track_id
$$;

GRANT EXECUTE ON FUNCTION track_last_activity() TO anon, authenticated;

CREATE OR REPLACE FUNCTION car_last_activity()
RETURNS TABLE (car_ordinal int, last_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT lt.car_ordinal, max(lt.recorded_at) FROM lap_times lt GROUP BY lt.car_ordinal
$$;

GRANT EXECUTE ON FUNCTION car_last_activity() TO anon, authenticated;

-- Joueurs ayant au moins p_min chronos (pages /joueurs/[pseudo] au sitemap).
CREATE OR REPLACE FUNCTION joueurs_indexables(p_min int DEFAULT 3)
RETURNS TABLE (pseudo text, times bigint, last_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.pseudo, count(*), max(lt.recorded_at)
    FROM lap_times lt JOIN players p ON p.id = lt.player_id
   GROUP BY p.pseudo
  HAVING count(*) >= p_min
$$;

GRANT EXECUTE ON FUNCTION joueurs_indexables(int) TO anon, authenticated;

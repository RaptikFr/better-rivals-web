-- ============================================================
-- MIGRATION — Feed « Nouveaux leaders » + compteurs côté Postgres
-- À appliquer via : Supabase Management API (ou Dashboard > SQL Editor)
--
-- Remplace les deux derniers « télécharger toute la table puis agréger en
-- Node » (cf. commentaire historique de lib/leadersFeed.ts, roadmap point 5) :
--
-- 1. nouveaux_leaders_feed(p_limit) — rejoue la chronologie des records
--    (lap_times ∪ lap_times_history) par config et renvoie les p_limit
--    derniers « détrônages » (un joueur passe sous le record d'un AUTRE
--    joueur), tout joints (pseudos, voiture, circuit, tour actuel du
--    nouveau leader). Même algorithme que lib/leaders.ts
--    computeLeaderChanges : ordre chronologique, à timestamp égal le plus
--    lent d'abord ; les améliorations d'un leader sur lui-même ne comptent
--    pas ; un joueur supprimé fait sauter l'événement (INNER JOIN players).
--
-- 2. car_time_counts() / track_time_counts() — nombre de temps par voiture
--    et par circuit (GROUP BY), pour les listes et le sitemap, au lieu de
--    télécharger une colonne de toute la table lap_times.
--
-- SECURITY INVOKER : lap_times, lap_times_history, players, cars et tracks
-- sont en lecture publique → exécutable par anon et authenticated.
-- ============================================================

CREATE OR REPLACE FUNCTION nouveaux_leaders_feed(p_limit int DEFAULT 8)
RETURNS TABLE (
  new_leader_id uuid,
  new_pseudo    text,
  new_discord   text,
  old_leader_id uuid,
  old_pseudo    text,
  old_discord   text,
  new_time_ms   int,
  old_time_ms   int,
  car           text,
  track         text,
  track_id      int,
  car_ordinal   int,
  car_class     text,
  drivetrain    text,
  lap_id        uuid,
  recorded_at   timestamptz
)
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
  -- Meilleur temps de la config AVANT chaque événement (fenêtre glissante).
  -- À timestamp égal, time_ms DESC = « le plus lent d'abord » (déterminisme,
  -- comme le tri de computeLeaderChanges).
  avec_best AS (
    SELECT e.*,
           min(e.time_ms) OVER (
             PARTITION BY e.track_id, e.car_ordinal, e.car_class, e.drivetrain
             ORDER BY e.recorded_at, e.time_ms DESC
             ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
           ) AS best_avant
      FROM events e
  ),
  -- Seuls les événements qui améliorent le record de la config : le leader ne
  -- change qu'à ces instants-là, donc le record battu et son détenteur sont
  -- simplement la ligne précédente de cette sous-suite (lag).
  records AS (
    SELECT * FROM avec_best
     WHERE best_avant IS NULL OR time_ms < best_avant
  ),
  detronages AS (
    SELECT r.*,
           lag(r.player_id) OVER w AS old_player,
           lag(r.time_ms)   OVER w AS old_time
      FROM records r
    WINDOW w AS (PARTITION BY r.track_id, r.car_ordinal, r.car_class, r.drivetrain
                 ORDER BY r.recorded_at, r.time_ms DESC)
  )
  SELECT
    d.player_id                                   AS new_leader_id,
    np.pseudo                                     AS new_pseudo,
    np.discord_tag_public                         AS new_discord,
    d.old_player                                  AS old_leader_id,
    op.pseudo                                     AS old_pseudo,
    op.discord_tag_public                         AS old_discord,
    d.time_ms                                     AS new_time_ms,
    d.old_time                                    AS old_time_ms,
    COALESCE(NULLIF(car.label, ''), '—')          AS car,
    COALESCE(t.name, '—')                         AS track,
    d.track_id,
    d.car_ordinal,
    d.car_class,
    d.drivetrain,
    pb.id                                         AS lap_id,
    d.recorded_at
  FROM detronages d
  -- Joueur supprimé (nouveau OU ancien leader) → événement sauté, comme avant.
  JOIN players np ON np.id = d.player_id
  JOIN players op ON op.id = d.old_player
  LEFT JOIN tracks t ON t.id = d.track_id
  -- Libellé voiture « année constructeur nom » (concat_ws ignore les NULL).
  LEFT JOIN LATERAL (
    SELECT concat_ws(' ', c.year::text, c.manufacturer, c.name) AS label
      FROM cars c
     WHERE c.car_ordinal = d.car_ordinal
     LIMIT 1
  ) car ON true
  -- Tour ACTUEL du nouveau leader sur la config (highlight du classement).
  -- ⚠ lap_times peut avoir 2 lignes par (joueur, config) : on prend le PB.
  LEFT JOIN LATERAL (
    SELECT lt.id
      FROM lap_times lt
     WHERE lt.player_id  = d.player_id
       AND lt.track_id   = d.track_id
       AND lt.car_ordinal = d.car_ordinal
       AND lt.car_class  = d.car_class
       AND lt.drivetrain = d.drivetrain
     ORDER BY lt.time_ms
     LIMIT 1
  ) pb ON true
  WHERE d.old_player IS NOT NULL
    AND d.old_player <> d.player_id
  ORDER BY d.recorded_at DESC
  LIMIT p_limit
$$;

GRANT EXECUTE ON FUNCTION nouveaux_leaders_feed(int) TO anon, authenticated;

-- ── Compteurs : nombre de temps par voiture / par circuit ──────────────────
-- Servent aux listes (« X temps ») et au seuil d'indexabilité du sitemap.

CREATE OR REPLACE FUNCTION car_time_counts()
RETURNS TABLE (car_ordinal int, times bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT lt.car_ordinal, count(*) AS times
    FROM lap_times lt
   WHERE lt.car_ordinal IS NOT NULL
   GROUP BY lt.car_ordinal
$$;

GRANT EXECUTE ON FUNCTION car_time_counts() TO anon, authenticated;

CREATE OR REPLACE FUNCTION track_time_counts()
RETURNS TABLE (track_id int, times bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT lt.track_id, count(*) AS times
    FROM lap_times lt
   GROUP BY lt.track_id
$$;

GRANT EXECUTE ON FUNCTION track_time_counts() TO anon, authenticated;

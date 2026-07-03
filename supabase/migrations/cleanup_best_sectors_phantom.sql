-- ============================================================
-- CLEANUP — secteurs fantômes dans best_sectors (relais ≤ v3.0.8)
-- Appliqué le 03/07/2026 via PAT management API.
-- ============================================================
-- Cause racine (corrigée dans le relais v3.0.9) : le SectorTracker du relais
-- n'était jamais réinitialisé quand le joueur quittait/recommençait/rembobinait
-- en cours de tour. À la reprise, la chute de current_lap_s finalisait les
-- échantillons du tour INTERROMPU avec pour borne finale last_lap_s = temps du
-- tour précédent COMPLET → mini-secteurs (~5 s) + un dernier énorme, dont la
-- somme vaut un temps de tour valide → passait la validation de /api/sectors
-- (somme ≈ lap_time) et verrouillait best_sectors via l'upsert MIN.
-- C'est ce mécanisme qui a RE-corrompu la 370Z/autoroute après le nettoyage du
-- 27/06 (cleanup_best_sectors_tiny.sql), et pollué NSX S2 AWD + Legend Island.
--
-- Critère physique (même règle que secteursPlausibles côté serveur) : un secteur
-- = length_km/N km ; N = max(5, min(20, round(length_km/1.5))). Aucune voiture
-- ne dépasse 150 m/s (540 km/h) DE MOYENNE sur un secteur → toute ligne plus
-- rapide est un artefact. 16 lignes concernées au moment de l'application.

DELETE FROM public.best_sectors bs
USING public.tracks t
WHERE t.id = bs.track_id
  AND t.length_km > 0
  AND bs.best_ms < (t.length_km * 1000.0
                    / GREATEST(5, LEAST(20, ROUND(t.length_km / 1.5)))
                    / 150.0) * 1000.0;

-- Réamorçage depuis lap_times (sectors_ms recalculé côté serveur depuis la
-- trace = propre), en filtrant par le même critère physique par prudence.
INSERT INTO public.best_sectors
  (track_id, car_ordinal, car_class, drivetrain, sector_index, best_ms, player_id, recorded_at)
SELECT lt.track_id, lt.car_ordinal, lt.car_class, lt.drivetrain,
       s.idx::smallint, s.ms::int, lt.player_id, now()
FROM public.lap_times lt
JOIN public.tracks t ON t.id = lt.track_id
CROSS JOIN LATERAL unnest(lt.sectors_ms) WITH ORDINALITY AS s(ms, idx)
WHERE lt.sectors_ms IS NOT NULL AND lt.player_id IS NOT NULL AND s.ms > 0
  AND (t.length_km IS NULL OR t.length_km <= 0
       OR s.ms >= (t.length_km * 1000.0
                   / GREATEST(5, LEAST(20, ROUND(t.length_km / 1.5)))
                   / 150.0) * 1000.0)
ON CONFLICT (track_id, car_ordinal, car_class, drivetrain, sector_index, player_id)
DO UPDATE SET best_ms = excluded.best_ms, recorded_at = excluded.recorded_at
WHERE excluded.best_ms < public.best_sectors.best_ms;

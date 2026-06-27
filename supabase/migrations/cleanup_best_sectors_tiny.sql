-- ============================================================
-- CLEANUP — secteurs corrompus « minuscules » dans best_sectors
-- Appliqué le 27/06/2026 via PAT management API.
-- ============================================================
-- Résidu du vieux bug d'offset distance (offset 292 ≠ mètres réels, cf.
-- feature-secteurs / best_sectors.sql) : certains tours fantômes avaient des
-- secteurs minuscules (ex. 226 ms) qui, via l'upsert « ne garde que le MIN »
-- de la RPC, écrasaient durablement les vraies valeurs. Conséquence : le tour
-- optimal (global ET par pilote) était masqué par le garde-fou anti-corruption
-- de theoreticalFromBest (total < 70 % du meilleur réel).
-- Cas observé : track 7 (Circuit de l'autoroute) / 370Z Nismo (3307) / A / RWD,
-- secteurs 1-4 à ~226 ms.
--
-- Aucun secteur réel n'est < 1 s (les circuits font ≥ ~2,4 km, N ≤ 20). On
-- supprime donc les lignes < 1000 ms, puis on ré-amorce depuis lap_times
-- (sectors_ms y est recalculé côté serveur depuis la trace = propre).
-- Les chemins d'écriture actuels (POST /api/traces recalculé serveur, POST
-- /api/sectors via relais ≥ v25 à distance réelle) ne réintroduisent pas la
-- corruption : c'est un nettoyage de résidu historique.

DELETE FROM public.best_sectors WHERE best_ms < 1000;

INSERT INTO public.best_sectors
  (track_id, car_ordinal, car_class, drivetrain, sector_index, best_ms, player_id, recorded_at)
SELECT lt.track_id, lt.car_ordinal, lt.car_class, lt.drivetrain,
       s.idx::smallint, s.ms::int, lt.player_id, now()
FROM public.lap_times lt
CROSS JOIN LATERAL unnest(lt.sectors_ms) WITH ORDINALITY AS s(ms, idx)
WHERE lt.sectors_ms IS NOT NULL AND lt.player_id IS NOT NULL AND s.ms > 0
ON CONFLICT (track_id, car_ordinal, car_class, drivetrain, sector_index, player_id)
DO UPDATE SET best_ms = excluded.best_ms, recorded_at = excluded.recorded_at
WHERE excluded.best_ms < public.best_sectors.best_ms;

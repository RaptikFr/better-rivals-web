-- ============================================================
-- MIGRATION — Nettoyage best_sectors corrompus
-- Contexte : des tours avec un time_ms aberrant (ex. ~9 s) ont pu
-- passer la validation tempsDansBornes et faire attacher une trace.
-- secteursDepuisTrace produisait alors des secteurs trop petits (ex.
-- ~787 ms) qui, via l'upsert conditionnel (WHERE excluded.best_ms <
-- bs.best_ms), ont écrasé et bloqué les valeurs correctes (~6 500 ms).
-- Ce script supprime les configs dont le tour optimal est manifestement
-- incohérent (< 70 % du meilleur temps réel connu sur la config).
-- Les lignes saines seront ré-alimentées par /api/traces ou /api/sectors
-- au prochain tour posté par le relais.
-- ============================================================

DELETE FROM public.best_sectors
WHERE (track_id, car_ordinal, car_class, drivetrain) IN (
  SELECT bs.track_id, bs.car_ordinal, bs.car_class, bs.drivetrain
  FROM (
    SELECT track_id, car_ordinal, car_class, drivetrain,
           SUM(best_ms) AS optimal_ms
    FROM   public.best_sectors
    GROUP  BY track_id, car_ordinal, car_class, drivetrain
  ) bs
  JOIN (
    SELECT track_id, car_ordinal, car_class, drivetrain,
           MIN(time_ms) AS real_best_ms
    FROM   public.lap_times
    GROUP  BY track_id, car_ordinal, car_class, drivetrain
  ) lt USING (track_id, car_ordinal, car_class, drivetrain)
  WHERE bs.optimal_ms < lt.real_best_ms * 0.70
);

-- ============================================================
-- MIGRATION — Marqueur `reconstructed` sur lap_times
-- À appliquer via : Supabase Dashboard > SQL Editor
-- ============================================================
--
-- Le relais reconstruit le temps du DERNIER tour des épreuves circuit à nombre
-- de tours fixe (Forza ne le transmet jamais : is_race_on→0 et les chronos→0 au
-- passage de la dernière ligne). Valeur = `current_lap_s` du dernier paquet + 1
-- trame 60 Hz (16,7 ms) — mesuré très stable (±3 ms). Ces chronos comptent comme
-- les autres au classement ; la colonne sert à l'audit (repérer / purger si la
-- méthode se révélait fausse un jour) et à la validation serveur (borne
-- last_cur_ms ≤ temps ≤ last_cur_ms + 40 dans POST /api/times).

ALTER TABLE lap_times
  ADD COLUMN IF NOT EXISTS reconstructed boolean NOT NULL DEFAULT false;

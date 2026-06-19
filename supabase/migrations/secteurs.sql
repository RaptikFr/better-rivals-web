-- ============================================================
-- MIGRATION — Temps par secteurs (brique télémétrie #2)
-- À appliquer via : Supabase Dashboard > SQL Editor
-- ============================================================
-- Forza n'expose AUCUN checkpoint dans sa télémétrie : le relais (≥ v1.12)
-- reconstruit les secteurs lui-même en découpant le tour par DISTANCE.
-- Le nombre de secteurs dépend de la longueur du tracé : N = max(5, min(20,
-- round(length_km / 1.5))) — au moins 5, davantage pour les tracés longs.
-- Comme N varie d'un circuit à l'autre, on stocke un TABLEAU de durées (ms),
-- une par secteur, sur le meilleur tour de chaque config. Colonne nullable :
-- les tours existants et les vieux relais restent valides (NULL = pas de
-- secteurs). Tous les tours d'un même circuit ont le même N (déduit de
-- length_km, fixe), donc les tableaux sont comparables au sein d'une config.
-- Le « tour théorique » = somme des meilleurs secteurs (min par index parmi
-- les pilotes) : calculé côté lecture, pas stocké.

ALTER TABLE lap_times
  ADD COLUMN IF NOT EXISTS sectors_ms INTEGER[] DEFAULT NULL;

-- ============================================================
-- SESSION_LAPS.LAP_NUMBER — exclusion du premier tour (régularité)
-- Le tour n°1 d'une course circuit part de l'ARRÊT : il est structurellement
-- plus lent et fausse l'écart-type de la session. Le relais (≥ v3.4.1) envoie
-- désormais le numéro du tour avec les secteurs ; le calcul de régularité
-- écarte les tours n°1. NULL (anciens relais) = tour compté comme avant.
-- ============================================================

ALTER TABLE session_laps ADD COLUMN IF NOT EXISTS lap_number int;

-- ============================================================
-- Bornes en base sur players.pseudo et players.discord_tag
-- ============================================================
-- Les écritures de ces colonnes passent directement par l'API Supabase (rôle
-- authenticated, GRANT colonne), sans route serveur qui les valide : la base
-- est le seul garde-fou fiable.
--
-- NOT VALID : la contrainte s'applique aux nouvelles écritures immédiatement,
-- sans scanner les lignes existantes (un ancien pseudo trop long ne bloque donc
-- pas la migration). Pour vérifier les lignes existantes ensuite :
--   SELECT id, pseudo FROM players WHERE NOT (char_length(pseudo) BETWEEN 1 AND 15);
--   ALTER TABLE players VALIDATE CONSTRAINT chk_players_pseudo_longueur;
--
-- Mêmes bornes que lib/pseudo.ts (PSEUDO_MAX = 15) et discord (32 caractères,
-- limite des pseudos Discord).

ALTER TABLE players
  ADD CONSTRAINT chk_players_pseudo_longueur
  CHECK (char_length(pseudo) BETWEEN 1 AND 15) NOT VALID;

ALTER TABLE players
  ADD CONSTRAINT chk_players_pseudo_caracteres
  CHECK (pseudo !~ '[<>"''&/\\\x00-\x1f\x7f]') NOT VALID;

ALTER TABLE players
  ADD CONSTRAINT chk_players_discord_tag_longueur
  CHECK (discord_tag IS NULL OR char_length(discord_tag) <= 32) NOT VALID;

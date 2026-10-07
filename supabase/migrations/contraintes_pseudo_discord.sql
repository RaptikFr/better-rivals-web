-- ============================================================
-- Bornes en base sur players.pseudo et players.discord_tag
-- ============================================================
-- Les écritures de ces colonnes passent directement par l'API Supabase (rôle
-- authenticated, GRANT colonne), sans route serveur qui les valide : la base
-- est le seul garde-fou fiable.
--
-- NOT VALID : la contrainte s'applique aux nouvelles écritures immédiatement,
-- sans scanner les lignes existantes. Vérifié avant application : 0 ligne
-- hors bornes, 0 doublon insensible à la casse.
--
-- Mêmes règles que lib/pseudo.ts (PSEUDO_MAX = 15, DISCORD_TAG_MAX = 32).
-- Pas de backslash dans les littéraux : le serveur les interprète comme des
-- échappements, d'où chr(39) et chr(92) pour l'apostrophe et l'antislash.

BEGIN;

ALTER TABLE players
  ADD CONSTRAINT chk_players_pseudo_longueur
  CHECK (char_length(pseudo) BETWEEN 1 AND 15) NOT VALID;

ALTER TABLE players
  ADD CONSTRAINT chk_players_pseudo_caracteres
  CHECK (
    pseudo !~ '[<>"&/]'
    AND strpos(pseudo, chr(39)) = 0
    AND strpos(pseudo, chr(92)) = 0
    AND pseudo !~ '[[:cntrl:]]'
  ) NOT VALID;

ALTER TABLE players
  ADD CONSTRAINT chk_players_discord_tag_longueur
  CHECK (discord_tag IS NULL OR char_length(discord_tag) <= 32) NOT VALID;

COMMIT;

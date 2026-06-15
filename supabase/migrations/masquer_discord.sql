-- ============================================================
-- MIGRATION — Confidentialité : masquer son tag Discord
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- Objectif : un joueur peut cacher son tag Discord du public. Pour une VRAIE
-- confidentialité (la valeur ne doit jamais transiter dans les réponses API),
-- on n'expose plus jamais la colonne brute `discord_tag` au public : on publie
-- une colonne générée `discord_tag_public` qui vaut NULL quand le joueur masque
-- son tag. Le propriétaire lit son propre tag réel (pour l'éditer) via une RPC.
-- ============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS hide_discord_tag boolean NOT NULL DEFAULT false;

-- Version publique du tag : NULL si le joueur l'a masqué. STORED → recalculée
-- automatiquement à chaque mise à jour de discord_tag / hide_discord_tag.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS discord_tag_public text
  GENERATED ALWAYS AS (CASE WHEN hide_discord_tag THEN NULL ELSE discord_tag END) STORED;

-- On retire l'accès en lecture à la colonne BRUTE (anon l'avait via
-- securite_colonnes.sql, authenticated aussi). Plus personne ne lit le tag réel
-- d'autrui, même connecté ; seul le service role (serveur) et la RPC y accèdent.
REVOKE SELECT (discord_tag) ON players FROM anon, authenticated;

-- Lecture publique de la version filtrée + de l'état du masquage.
GRANT SELECT (discord_tag_public, hide_discord_tag) ON players TO anon, authenticated;

-- Le joueur peut activer/couper le masquage de sa propre ligne (policy UPDATE
-- de sa ligne déjà en place ; l'UPDATE de discord_tag reste accordé pour l'édition).
GRANT UPDATE (hide_discord_tag) ON players TO authenticated;

-- Le propriétaire lit SON tag réel (champ d'édition du profil) sans réexposer
-- la colonne à tout le monde.
CREATE OR REPLACE FUNCTION my_discord_tag()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT discord_tag FROM players WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION my_discord_tag() FROM public;
GRANT EXECUTE ON FUNCTION my_discord_tag() TO authenticated;

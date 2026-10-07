-- ============================================================
-- Inscription atomique : le profil joueur est créé dans la même transaction
-- que le compte Auth
-- ============================================================
-- Avant : signUp() créait le compte, puis le client insérait le profil. Si
-- l'insert échouait, le compte restait orphelin et l'email bloqué.
-- Maintenant : le client passe le pseudo dans les métadonnées du signUp, et un
-- trigger sur auth.users insère le profil. Si le pseudo est pris ou invalide,
-- l'insert échoue, le compte Auth est annulé avec lui, rien n'est orphelin.
--
-- Rétrocompatible : sans métadonnée « pseudo » (ancien client encore ouvert),
-- le trigger ne fait rien et l'ancien insert côté client continue de marcher.

BEGIN;

-- Un seul profil par compte. Vérifié avant : 0 compte avec plusieurs profils.
-- (La policy INSERT ne vérifiait que auth.uid() = user_id, sans unicité.)
CREATE UNIQUE INDEX IF NOT EXISTS players_user_id_key
  ON public.players (user_id) WHERE user_id IS NOT NULL;

-- Pseudo unique sans tenir compte de la casse. L'index players_pseudo_key
-- existant était sensible à la casse : « Foo » et « foo » pouvaient coexister.
-- Vérifié avant : 0 doublon.
CREATE UNIQUE INDEX IF NOT EXISTS players_pseudo_lower_key
  ON public.players (lower(pseudo));

CREATE OR REPLACE FUNCTION public.creer_profil_joueur()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.raw_user_meta_data ? 'pseudo' THEN
    INSERT INTO public.players (pseudo, user_id)
    VALUES (NEW.raw_user_meta_data ->> 'pseudo', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.creer_profil_joueur();

COMMIT;

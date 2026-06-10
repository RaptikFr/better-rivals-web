-- ============================================================
-- SÉCURITÉ — Better Rivals
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- ⚠ ORDRE IMPORTANT : déployer d'abord le code (la page admin
--   passe par /api/admin/* et la page stats ne fait plus de
--   SELECT * sur players), PUIS appliquer ce script.
--
-- Les privilèges par colonne s'ajoutent à la RLS : une requête
-- doit passer les deux. Le service role (routes API) n'est pas
-- concerné par ces restrictions.
-- ============================================================

-- ── players : masquer pin_code (à tous) et user_id (aux anonymes) ──
-- pin_code est une colonne héritée de l'ancien système du relais,
-- plus utilisée par le code ; elle était lisible publiquement.
REVOKE SELECT ON players FROM anon, authenticated;
GRANT  SELECT (id, pseudo, discord_tag, created_at) ON players TO anon;
GRANT  SELECT (id, pseudo, discord_tag, created_at, user_id, email_notifications_enabled)
       ON players TO authenticated;

-- ── tracks : approbation/refus réservés au serveur (/api/admin/tracks) ──
-- Aucun code client légitime ne modifie tracks.
REVOKE UPDATE ON tracks FROM anon, authenticated;

-- ── contact_messages : le formulaire public ne fait qu'insérer ──
-- Lecture / édition / suppression réservées au serveur (/api/admin/messages).
REVOKE SELECT, UPDATE, DELETE ON contact_messages FROM anon, authenticated;

-- ============================================================
-- VÉRIFICATIONS après application (doivent échouer / être vides) :
--   curl "https://<projet>.supabase.co/rest/v1/players?select=pin_code" \
--        -H "apikey: <clé anon>"                      → erreur permission
--   curl "https://<projet>.supabase.co/rest/v1/players?select=pseudo" \
--        -H "apikey: <clé anon>"                      → OK (pseudos publics)
-- Et côté site : page stats OK, page admin OK, modification du
-- Discord tag et des notifications email depuis le profil OK.
-- ============================================================

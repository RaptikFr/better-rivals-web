-- ============================================================
-- SÉCURITÉ (suite) — Better Rivals
-- À appliquer via : Supabase Dashboard > SQL Editor
--
-- ⚠ ORDRE IMPORTANT : déployer d'abord le code (le formulaire de
--   contact passe par /api/contact et la page épreuves communauté
--   ne lit plus votes.user_id), PUIS appliquer ce script.
--
-- Le service role (routes API) n'est pas concerné par ces
-- restrictions.
-- ============================================================

-- ── votes : masquer user_id ──
-- La page épreuves communauté n'affiche que les compteurs 👍/👎
-- (votes(vote) imbriqué dans tracks) ; « ai-je voté ? » passe
-- désormais par GET /api/votes. track_id reste lisible car la
-- jointure imbriquée PostgREST en a besoin.
REVOKE SELECT ON votes FROM anon, authenticated;
GRANT  SELECT (track_id, vote) ON votes TO anon, authenticated;

-- Toute écriture passe par POST /api/votes (service role).
REVOKE INSERT, UPDATE, DELETE ON votes FROM anon, authenticated;

-- ── contact_messages : insertion via /api/contact uniquement ──
-- (validation + rate limiting côté serveur ; l'INSERT anon direct
-- était spammable via l'API REST)
REVOKE INSERT ON contact_messages FROM anon, authenticated;

-- ── tracks : soumission via /api/epreuves uniquement ──
REVOKE INSERT, DELETE ON tracks FROM anon, authenticated;

-- ============================================================
-- VÉRIFICATIONS après application :
--   curl "https://<projet>.supabase.co/rest/v1/votes?select=user_id" \
--        -H "apikey: <clé anon>"                      → erreur permission
--   curl "https://<projet>.supabase.co/rest/v1/votes?select=vote" \
--        -H "apikey: <clé anon>"                      → OK
-- Et côté site : page épreuves communauté (compteurs + état « voté »),
-- vote 👍/👎, formulaire de contact, soumission d'épreuve.
-- ============================================================

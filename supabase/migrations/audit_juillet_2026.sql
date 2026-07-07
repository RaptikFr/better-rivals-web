-- Audit complet du 3 juillet 2026 — correctifs sécurité + performance.
--
-- 1. SÉCURITÉ — my_discord_tag() : la migration masquer_discord.sql avait
--    révoqué EXECUTE pour anon, mais un CREATE OR REPLACE ultérieur a redonné
--    le droit par défaut (advisor Supabase : anon_security_definer_function_executable).
--    La fonction ne renvoie rien pour un anonyme (auth.uid() = NULL) mais on
--    referme quand même la surface.
REVOKE EXECUTE ON FUNCTION public.my_discord_tag() FROM anon;

-- 2. PERFORMANCE RLS (advisor auth_rls_initplan) : auth.uid() nu dans une
--    policy est réévalué à CHAQUE ligne ; enveloppé dans (select auth.uid())
--    il devient un InitPlan calculé une seule fois par requête.

-- players — UPDATE du profil
ALTER POLICY "Joueur peut modifier son profil" ON public.players
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- notifications — lecture / marquer lu / suppression
ALTER POLICY "Lecture ses propres notifications" ON public.notifications
  USING (player_id = (SELECT p.id FROM public.players p WHERE p.user_id = (select auth.uid())));
ALTER POLICY "Marquer comme lu" ON public.notifications
  USING (player_id = (SELECT p.id FROM public.players p WHERE p.user_id = (select auth.uid())));
ALTER POLICY "Suppression de ses propres notifications" ON public.notifications
  USING (player_id = (SELECT p.id FROM public.players p WHERE p.user_id = (select auth.uid())));

-- follows — lecture / ajout / suppression
ALTER POLICY "Lecture de ses propres suivis" ON public.follows
  USING (follower_player_id = (SELECT p.id FROM public.players p WHERE p.user_id = (select auth.uid())));
ALTER POLICY "Ajout de ses propres suivis" ON public.follows
  WITH CHECK (follower_player_id = (SELECT p.id FROM public.players p WHERE p.user_id = (select auth.uid())));
ALTER POLICY "Suppression de ses propres suivis" ON public.follows
  USING (follower_player_id = (SELECT p.id FROM public.players p WHERE p.user_id = (select auth.uid())));

-- 3. INDEX MANQUANTS (advisor unindexed_foreign_keys, filtrés sur les usages
--    réels du code — les FK jamais interrogées ne sont volontairement pas
--    indexées) :
--    - notifications.player_id : filtré par les policies RLS ET par toutes les
--      lectures du site (aucun index existant sur cette table hors PK).
--    - lap_times.car_ordinal : carRankings filtre par voiture seule ; les
--      index composites existants ont car_ordinal en position non-tête.
--    - votes.user_id : GET /api/votes filtre par user_id seul ; l'unique
--      (track_id, user_id) ne couvre pas ce chemin.
CREATE INDEX IF NOT EXISTS idx_notifications_player
  ON public.notifications (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lap_times_car_ordinal
  ON public.lap_times (car_ordinal);
CREATE INDEX IF NOT EXISTS idx_votes_user
  ON public.votes (user_id);

-- 4. Statistiques à jour pour le planificateur.
ANALYZE public.notifications;
ANALYZE public.lap_times;
ANALYZE public.votes;

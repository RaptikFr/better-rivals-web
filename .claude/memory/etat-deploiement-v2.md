---
name: etat-deploiement-v2
description: État de déploiement des features v2 (15 juin 2026) — commits locaux non poussés en attente de migrations prod
metadata:
  type: project
---

Le 2026-06-15, livraison des features « Paramètres v2 » + point 4 (cf. [[idee-panneau-options]], [[roadmap-ameliorations-juin-2026]]). **Attention à l'ordre migration → push** : certains commits lisent/écrivent de nouvelles colonnes et CASSENT la prod s'ils sont déployés avant que la migration soit appliquée.

**Déjà poussé sur main (en ligne, sans migration)** :
- `feat(profil): onglet « Mes rivaux »` — gère ses suivis (la table `follows` existe déjà en prod).
- `feat(parametres): taille de police + colonnes masquables` — localStorage seul.

**Commits LOCAUX non poussés (au 15 juin 2026), à pousser SEULEMENT après application des migrations** :
1. `feat(notifications): préférences par type` → migration `notifications_par_type.sql` (colonnes notify_* + grants).
2. `feat(confidentialite): masquer son tag Discord` → migration `masquer_discord.sql` (colonne générée discord_tag_public + RPC my_discord_tag + révocation lecture brute). ⚠️ change toutes les lectures publiques de discord_tag vers `discord_tag:discord_tag_public`.
3. `feat(parametres): sync cross-device` → migration `preferences_sync.sql` (players.preferences jsonb).
4. `feat(perf,securite): Upstash + RPC general_ranking` → **a un repli automatique** (safe même sans migration `general_ranking_rpc.sql`), mais se trouve APRÈS les 3 commits ci-dessus dans l'historique linéaire, donc non poussable seul.

**Procédure pour finir le déploiement** : appliquer les 4 migrations via Dashboard SQL Editor (notifications_par_type, masquer_discord, preferences_sync, general_ranking_rpc), puis `git push` (le reste de main suivra). Tant que ce n'est pas fait, NE PAS pousser au-delà de `cef67a6`.

**Upstash (rate limiting partagé)** : code prêt, repli mémoire si non configuré. Pour l'activer, créer une base Upstash Redis et poser `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` dans `.env.local` et sur Vercel. Sinon, comportement actuel (mémoire par instance) inchangé.

**Différé volontairement** : portage RPC de `/api/nouveaux-leaders` (rejeu chronologique ordre-dépendant, risqué, sans gain au volume actuel ~91 lignes).

**Reste à faire (non bloquant, côté propriétaire connecté)** : vérif visuelle mobile du profil (onglet Rivaux + panneau notifications) — non screenshotable par Claude (page derrière auth).

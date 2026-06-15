---
name: etat-deploiement-v2
description: Features v2 (15 juin 2026) — TOUT déployé (4 migrations appliquées + code poussé sur main)
metadata:
  type: project
---

Le 2026-06-15, livraison des features « Paramètres v2 » + point 4 (cf. [[idee-panneau-options]], [[roadmap-ameliorations-juin-2026]]). **✅ TERMINÉ ET DÉPLOYÉ le 15 juin 2026** : les 4 migrations ont été appliquées en prod par le propriétaire et tout le code est poussé sur `main` (jusqu'au commit `df20aae`).

Migrations appliquées : `notifications_par_type.sql`, `masquer_discord.sql`, `preferences_sync.sql`, `general_ranking_rpc.sql`.

Features livrées : onglet « Mes rivaux » (profil) ; notifications par type (colonnes notify_* + gardes /api/times) ; masquer son tag Discord (colonne générée `discord_tag_public` + RPC `my_discord_tag`, toutes les lectures publiques passent par `discord_tag:discord_tag_public`) ; sync cross-device (`players.preferences jsonb`, réconcilié dans `usePreferences`) ; taille de police + colonnes masquables des classements ; rate limiting Upstash (repli mémoire) ; RPC `general_ranking` (repli JS).

**Note pour le futur** : leçon de rétro — quand un commit lit/écrit une nouvelle colonne, appliquer la migration AVANT de pousser (sinon le `select` casse la prod). C'est ce qui a été respecté ici (push du préfixe sûr, puis du reste après migrations).

**Upstash (rate limiting partagé)** : code prêt, repli mémoire si non configuré. Pour l'activer, créer une base Upstash Redis et poser `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` dans `.env.local` et sur Vercel. Sinon, comportement actuel (mémoire par instance) inchangé.

**Différé volontairement** : portage RPC de `/api/nouveaux-leaders` (rejeu chronologique ordre-dépendant, risqué, sans gain au volume actuel ~91 lignes).

**Reste à faire (non bloquant, côté propriétaire connecté)** : vérif visuelle mobile du profil (onglet Rivaux + panneau notifications) — non screenshotable par Claude (page derrière auth).

---
name: roadmap-ameliorations-juin-2026
description: Backlog des 6 ameliorations discutees le 2026-06-15 et leur statut (ce qui reste a faire)
metadata: 
  node_type: memory
  type: project
  originSessionId: a5640525-f5aa-459a-8a49-f2fd4bbc3cb9
---

Le 2026-06-15, on a passé en revue 6 pistes d'amélioration du site. Contraintes posées par le user : les world records ne servent QUE d'anti-triche (jamais de comparaison de perf au WR), et pas de défi hebdomadaire.

## Statut des 6 points

1. **Mes rivaux** — ✅ FAIT (commits `feat(rivaux)`). Affichage du rival devant/derrière par config (profil + page joueur) ET suivi de pilotes avec notification type `rival` quand un suivi te dépasse. **Reste à faire (optionnel, pas encore demandé)** : un écran « Mes rivaux suivis » centralisé sur le profil pour voir/gérer ses suivis d'un coup — aujourd'hui on ne peut suivre/désuivre que depuis la page d'un joueur. Voir [[autonomie-pas-de-demande-autorisation]].

2. **Lisibilité mobile des tableaux** — ✅ FAIT (commits `feat(mobile)`). Cartes empilées sous `sm`, colonnes alignées au-dessus via `sm:contents`. Couvre classements (officiel+communauté), page joueur, classement général, stats, profil (LapTable, ClassementsTab, Suivi). Comparaison était déjà responsive. **Reste** : vérifier visuellement les tables du profil sur mobile (page auth-gated, non screenshotée — compilée/lintée seulement). Mineur.

3. **Badges / accomplissements** — ✅ FAIT (commit `feat(badges)`). Format validé par le user : **pastilles repliables** (bouton « 🏅 Badges (N) » discret, détail au dépliage) — `components/BadgesBar.tsx`. Dérivation dans `lib/badges.ts` (`computeBadges`), réutilise `groupByConfig`/`configKey` de podiums. 4 familles validées : rangs/podiums (1ʳᵉ place sur N configs, 👑 >10, podium sur N circuits), polyvalence (circuits/voitures/classes, seuils 3/3/4), volume (paliers 10/25/50/100 chronos), classement général (top 10 seulement, via fetch `/api/classement-general` mis en cache). Intégré au profil ET à la page joueur. Pas de comparaison aux WR. aria-label/aria-expanded déjà posés sur le toggle (avance sur le point 6).

4. **Activité « Nouveaux leaders »** — ✅ FAIT (commit `feat(leaders)`). Fil « X a détrôné Y » sur l'accueil (sous « Derniers chronos »). `lib/leaders.ts` (`computeLeaderChanges`) rejoue par config la chronologie complète des records (lap_times + lap_times_history) en suivant le meilleur temps courant ; émet un détrônage quand un temps passe sous le record d'un AUTRE joueur (améliorations sur soi-même ignorées, égalités ignorées). API `/api/nouveaux-leaders` avec `unstable_cache` revalidate 60 (même pattern que classement-general), renvoie les 8 derniers. `components/NouveauxLeaders.tsx` calque le style de DerniersChronos. NB : télécharge tout l'historique côté client de l'API → à migrer en RPC avec le point 5.

5. **Scalabilité du calcul de classement** — ✅ FAIT (commit `feat(perf)`). RPC Postgres `player_config_rankings(uuid)` (`supabase/migrations/classement_rpc.sql`, window functions, SECURITY INVOKER, GRANT anon/authenticated) calcule rang/total/rivaux par config côté serveur ; ne renvoie qu'une ligne par temps du joueur au lieu de toute la table. `lib/playerRankings.ts` (`loadPlayerRankings`) : voie rapide RPC + **repli automatique** sur l'ancien calcul client si la fonction n'est pas déployée. Badges dérivent du rang. Profil + page joueur allégés. ⚠️ La migration SQL doit être appliquée via le SQL Editor du Dashboard pour activer la voie rapide (sinon le repli tourne, comportement identique mais sans gain). NB : classement-general et nouveaux-leaders restent en fetch complet côté API (déjà serveur+cache) — pourraient aussi passer en RPC un jour, non demandé.

6. **Accessibilité** — ✅ FAIT (commit `feat(a11y)`). `aria-label` ajoutés sur tous les boutons icône/emoji-only : toggle thème + cloche 🔔 (Navbar), partage 🔗 + signalement 🚩 + ✕ de filtres (Classements), onglets du profil (libellé masqué sous `sm` → aria-label + aria-pressed, emoji en aria-hidden) + ✕ de filtres (profil & Suivi), ✕ de fermeture modale (Épreuves communauté). BadgesBar avait déjà aria-label/aria-expanded. Boutons à texte visible laissés tels quels. Reste éventuel (non demandé) : audit clavier/focus-visible, rôles ARIA des dropdowns.

## Statut final
Les 6 points sont faits (1, 2, 3, 4, 5, 6). Action en attente côté user : appliquer `supabase/migrations/classement_rpc.sql` sur la prod (Dashboard > SQL Editor) pour activer la voie rapide du point 5.

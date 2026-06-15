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

4. **Activité « Nouveaux leaders »** — ⏳ À FAIRE (le user est pour). Fil « X a détrôné Y sur [config] » (accueil ou stats) pour mettre en avant les changements de tête / configs disputées. Distinct du flux « Derniers chronos » qui existe déjà.

5. **Scalabilité du calcul de classement** — ⏳ À FAIRE (le user est pour). Aujourd'hui le profil, la page joueur ET la feature rivaux téléchargent tous les temps des circuits côté client (`fetchAllRows`) puis classent en JS. À déplacer vers une fonction Postgres/RPC côté serveur pour réduire la charge réseau quand la base grossit.

6. **Accessibilité** — ✅ FAIT (commit `feat(a11y)`). `aria-label` ajoutés sur tous les boutons icône/emoji-only : toggle thème + cloche 🔔 (Navbar), partage 🔗 + signalement 🚩 + ✕ de filtres (Classements), onglets du profil (libellé masqué sous `sm` → aria-label + aria-pressed, emoji en aria-hidden) + ✕ de filtres (profil & Suivi), ✕ de fermeture modale (Épreuves communauté). BadgesBar avait déjà aria-label/aria-expanded. Boutons à texte visible laissés tels quels. Reste éventuel (non demandé) : audit clavier/focus-visible, rôles ARIA des dropdowns.

## Ordre suggéré pour la suite
Points restants : 4 (nouveaux leaders), 5 (scalabilité RPC). Faits : 1, 2, 3, 6.

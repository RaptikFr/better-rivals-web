---
name: roadmap-ameliorations-juin-2026
description: Backlog des 6 ameliorations discutees le 2026-06-15 et leur statut (ce qui reste a faire)
metadata:
  type: project
---

Le 2026-06-15, on a passé en revue 6 pistes d'amélioration du site. Contraintes posées par le user : les world records ne servent QUE d'anti-triche (jamais de comparaison de perf au WR), et pas de défi hebdomadaire.

## Statut des 6 points

1. **Mes rivaux** — ✅ FAIT (commits `feat(rivaux)`). Affichage du rival devant/derrière par config (profil + page joueur) ET suivi de pilotes avec notification type `rival` quand un suivi te dépasse. **Reste à faire (optionnel, pas encore demandé)** : un écran « Mes rivaux suivis » centralisé sur le profil pour voir/gérer ses suivis d'un coup — aujourd'hui on ne peut suivre/désuivre que depuis la page d'un joueur. Voir [[autonomie-pas-de-demande-autorisation]].

2. **Lisibilité mobile des tableaux** — ✅ FAIT (commits `feat(mobile)`). Cartes empilées sous `sm`, colonnes alignées au-dessus via `sm:contents`. Couvre classements (officiel+communauté), page joueur, classement général, stats, profil (LapTable, ClassementsTab, Suivi). Comparaison était déjà responsive. **Reste** : vérifier visuellement les tables du profil sur mobile (page auth-gated, non screenshotée — compilée/lintée seulement). Mineur.

3. **Badges / accomplissements** — ⏳ À FAIRE, en attente de décision. Le user est intéressé MAIS s'inquiète de la **surcharge visuelle des profils**. Avant de coder : proposer une implémentation discrète (ex. ligne de pastilles repliable plutôt que gros blocs). Badges permanents/descriptifs dérivés des données existantes (« 1er sur N configs », « podium sur 10 circuits », etc.), pas de comparaison aux WR.

4. **Activité « Nouveaux leaders »** — ⏳ À FAIRE (le user est pour). Fil « X a détrôné Y sur [config] » (accueil ou stats) pour mettre en avant les changements de tête / configs disputées. Distinct du flux « Derniers chronos » qui existe déjà.

5. **Scalabilité du calcul de classement** — ⏳ À FAIRE (le user est pour). Aujourd'hui le profil, la page joueur ET la feature rivaux téléchargent tous les temps des circuits côté client (`fetchAllRows`) puis classent en JS. À déplacer vers une fonction Postgres/RPC côté serveur pour réduire la charge réseau quand la base grossit.

6. **Accessibilité** — ⏳ À FAIRE (le user est pour). Ajouter des `aria-label` aux boutons emoji-only (toggle thème, partage 🔗, etc.).

## Ordre suggéré pour la suite
Points restants : 3 (badges, après accord sur le format discret), 4 (nouveaux leaders), 5 (scalabilité RPC), 6 (accessibilité). Aucun n'est commencé.

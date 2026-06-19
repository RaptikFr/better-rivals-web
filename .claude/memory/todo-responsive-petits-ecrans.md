---
name: todo-responsive-petits-ecrans
description: "À FAIRE prochaine session : sur petits écrans (~17 pouces) on doit scroller horizontalement pour tout voir. Le mettre sur 2 lignes, ou regrouper des éléments dans un menu déroulant pour gagner de la place"
metadata: 
  node_type: memory
  type: project
  originSessionId: cae85036-f3e2-4180-a051-95649963b520
---

**Demandé par le proprio le 19/06 (à traiter la prochaine session).**

**Problème** : sur des écrans « petits » (genre 17 pouces), il faut **scroller horizontalement** pour voir tout le contenu. 

**Pistes proposées par le proprio** :
1. Faire **passer sur 2 lignes** (wrap) au lieu d'un défilement horizontal.
2. OU regrouper certains éléments dans un **menu déroulant** pour gagner de la place.

**À confirmer en début de session : QUELLE zone exactement** (le proprio n'a pas précisé). Candidat le plus probable = la **vue tableau des classements** (`app/classements/RankingViews.tsx`, `RankingTableView`) : elle a beaucoup de colonnes (classement, pseudo, temps, ancien temps, diff, écarts leader/préc/suiv, PI, réglage, actions) dans un conteneur `overflow-x-auto` → d'où le scroll horizontal. Autres candidats possibles : la barre de filtres des classements, ou la navbar. **Demander/vérifier avant d'agir.**

**Note** : les colonnes du tableau sont déjà configurables via les préférences (`prefs.tableColumns`, voir [[idee-panneau-options]]) — une partie de la largeur dépend donc des colonnes activées. La solution responsive doit cohabiter avec ça.

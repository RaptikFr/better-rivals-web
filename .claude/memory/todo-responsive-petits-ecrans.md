---
name: todo-responsive-petits-ecrans
description: "À FAIRE prochaine session : la NAVBAR déborde sur petits écrans (~17 pouces) → scroll horizontal. La passer sur 2 lignes, ou regrouper des liens dans un menu déroulant pour gagner de la place"
metadata: 
  node_type: memory
  type: project
  originSessionId: cae85036-f3e2-4180-a051-95649963b520
---

**Demandé par le proprio le 19/06 (à traiter la prochaine session).**

**Zone CONFIRMÉE = la NAVBAR** (le proprio a précisé le 19/06). Sur des écrans « petits » (~17 pouces), la barre de navigation **déborde et oblige à scroller horizontalement**. La vue tableau des classements n'est PAS concernée (le proprio ne l'a pas regardée mais ne pense pas que ce soit nécessaire — à ne traiter que si on le constate).

**Pistes proposées par le proprio** :
1. Faire **passer la navbar sur 2 lignes** (wrap) au lieu d'un défilement horizontal.
2. OU regrouper certains liens dans un **menu déroulant** (type « Plus ▾ ») pour gagner de la place.

**Où** : composant navbar = `components/Navbar*` (à localiser : chercher la barre de nav avec les liens Classements / Circuits / Voitures / Réglages / Duels / Config semaine / etc. — beaucoup de liens ajoutés au fil des features, d'où le débordement). Vérifier d'abord comment elle gère déjà le mobile (probablement un menu burger en dessous d'un breakpoint) : le souci est sans doute la plage « tablette/petit laptop » entre le burger mobile et le grand écran.

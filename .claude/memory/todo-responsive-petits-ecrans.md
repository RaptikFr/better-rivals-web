---
name: todo-responsive-petits-ecrans
description: "RÉSOLU (19/06) : la navbar débordait sur petits écrans (~17\") → liens secondaires regroupés dans un dropdown « Plus ▾ ». Reste à confirmer en conditions réelles côté proprio"
metadata: 
  node_type: memory
  type: project
  originSessionId: cae85036-f3e2-4180-a051-95649963b520
---

**Demandé par le proprio le 19/06 — TRAITÉ le 19/06 (commit 5f590cc).**

**Problème** : la NAVBAR (`components/Navbar.tsx`) débordait sur les petits écrans (~17 pouces) → scroll horizontal. Trop d'éléments dès `lg` (1024px) : 2 dropdowns (Épreuves, Classements) + 9 liens + recherche + ⚙️ + cloche + zone auth (Objectifs, Duels, Profil, Déconnexion). Les classements (tableau) n'étaient PAS concernés.

**Solution livrée (option « menu déroulant » suggérée par le proprio, préférée au wrap 2 lignes car pas de saut de hauteur)** : nouveau dropdown **« Plus ▾ »** (modelé sur Épreuves/Classements) qui absorbe les liens secondaires `PLUS_LINKS` = ⭐ Config de la semaine, Stats, Télécharger, Contact. Restent visibles dans `navLinks` : Comparer, Classement général, Voitures, Circuits, Réglages. Le menu burger mobile liste toujours TOUT (`[...navLinks, ...PLUS_LINKS]`). Build + eslint OK.

**RESTE** : le proprio doit confirmer sur son écran réel que ça ne déborde plus. Si ça déborde encore, leviers : déplacer plus de liens dans `PLUS_LINKS`, ou monter le breakpoint de la nav complète de `lg` à `xl` (le burger prendrait le relais sous 1280px).

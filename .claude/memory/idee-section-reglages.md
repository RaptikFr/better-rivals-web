---
name: idee-section-reglages
description: Idée à explorer plus tard — une vraie section « Réglages » (tunes) plus développée que le simple code de partage
metadata:
  type: project
---

Idée proposée par l'utilisateur le 2026-06-16 (à explorer plus tard, pas démarrée) : développer une section **« Réglages »** où cet aspect serait plus riche que le simple code de partage actuellement affiché.

## Existant (point de départ, pas du greenfield)
- Affichage actuel : les réglages se résument au `share_code` d'un `lap_time` — badge copiable dans les classements (`TuneCell` dans `RankingViews.tsx`) et dans les pages circuit/voiture (colonne « Réglage »).
- **Une table `tune_setups` existe déjà** : `player_id, car_ordinal, share_code, label, track_id, track_type, is_original`. Route `POST /api/tune-setups` (`app/api/tune-setups/route.ts`) : soumission d'un réglage avec **revendication d'originalité** (`is_original`) + détection de conflit (un même code ne peut être revendiqué original que par un seul joueur). Rate-limitée.
- Manque : aucun **GET / aucune UI de consultation** des tune_setups — la table est alimentée mais pas exploitée à l'affichage.

## Pistes pour la section (à cadrer avec lui)
- Page/section dédiée listant les réglages par voiture (et/ou par circuit/type), avec : label, auteur (pseudo → /joueurs), original vs copié, code copiable, éventuellement lien vers les chronos obtenus avec.
- Intégration naturelle dans les **pages voiture** (cf. [[roadmap-optimisations]] phase 2) : un onglet/bloc « Réglages » par voiture = contenu supplémentaire + SEO.
- Crédit d'originalité mis en avant (le `is_original` est déjà géré côté API).
- Voir s'il faut un formulaire de soumission côté UI (l'API POST existe déjà) et un `GET /api/tune-setups`.

**Why :** le réglage est une info à forte valeur pour les joueurs FH6 (un bon tune fait gagner des secondes) ; aujourd'hui réduit à un code brut peu engageant.

**How to apply :** repartir de la table `tune_setups` + de l'API POST existantes ; livrer petit (cf. [[lint-zero-warning]]) ; garder le rendu serveur/SEO si on l'accroche aux pages voiture.

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

## Décisions de design prises avec lui (2026-06-16, brainstorm)
- **Emplacement : page dédiée `/reglages`** (annuaire global avec filtres), PAS un simple bloc dans les pages voiture. (Un bloc « Réglages de cette voiture » sur /voitures/[slug] reste possible plus tard en réutilisant la même donnée.)
- **Source des données : HYBRIDE.** Agréger les `tune_setups` riches (label, ⭐ original, contexte circuit) ET dériver les `share_code` déjà présents sur les `lap_times`, dédupliqués par (car_ordinal, share_code), avec le meilleur temps obtenu. → page pleine dès le lancement ; un auteur peut ensuite « enrichir/revendiquer » un code dérivé (réutilise `is_original` + le contrôle de conflit de l'API POST existante).

## Présentation cible de /reglages
- En-tête + bouton **« Partager un réglage »** (si connecté).
- Filtres : Voiture · Classe · Transmission · Type de circuit · ⭐ Originaux uniquement · recherche label/auteur. Tri : récents / plus rapides / originaux d'abord.
- Cartes : voiture (→ page voiture), classe+PI, transmission, label, auteur (→ /joueurs), badge ⭐ Original, « optimisé pour [circuit/type] », **code copiable**, et pour les codes dérivés « utilisé par N pilotes · meilleur temps X ».
- État vide par filtre + encart « comment partager ton réglage ».

## Règles métier confirmées par lui (2026-06-16)
- **Un seul code de partage par modèle de voiture** (par joueur) : le réglage est lié à la voiture, pas à une classe/transmission → **regroupement par `car_ordinal`** (la question de granularité par classe est tranchée : NON). Classe/PI deviennent des métadonnées des temps obtenus (peuvent varier).
- **Code saisi à la main** par le joueur, via deux points d'entrée : son **profil** (champ éditable `ShareCodeCell` dans l'onglet « Tous mes temps », PATCH `/api/times/[id]`) **ou le relais** (BetterRivals.exe l'envoie avec le chrono). → les `lap_times.share_code` sont donc déjà bien alimentés (bonne couverture pour la dérivation). Prévoir quand même normalisation (trim/format) et tolérer les codes absents/fautés.
- Plusieurs codes peuvent coexister pour un même modèle (un par pilote) ; `is_original` distingue le créateur de ceux qui ont recopié le code.

## Reste à trancher au moment du build
- Attribution d'un code **dérivé** non revendiqué (auteur = pilote le plus rapide ? ou « non revendiqué » jusqu'à ce que quelqu'un le revendique).
- Champs exacts du formulaire de soumission.

## À construire (l'API POST existe déjà)
- Une couche data serveur cachée `lib/reglages.ts` (fusion tune_setups + dérivés lap_times, dédup, meilleur temps).
- `app/reglages/page.tsx` (+ probablement un client pour filtres/tri) ; lien Navbar + footer.
- Un `GET /api/tune-setups` ou fetch serveur ; un formulaire/modale de soumission ; action « revendiquer » (réutilise POST is_original).

**Why :** le réglage est une info à forte valeur pour les joueurs FH6 (un bon tune fait gagner des secondes) ; aujourd'hui réduit à un code brut peu engageant. L'hybride évite l'écueil de la page vide.

**How to apply :** repartir de `tune_setups` + API POST existantes ; livrer petit (cf. [[lint-zero-warning]]). NB : page interactive (filtres) donc faible SEO en soi — l'angle SEO viendrait plutôt d'un futur bloc réglages sur les pages voiture (cf. [[roadmap-optimisations]]).

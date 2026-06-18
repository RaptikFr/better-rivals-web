---
name: relais-serveur-et-rang
description: Le relais Python EST dans ce repo (relais_gui_v20.py) ; ingestion serveur optimisée ; intégration relais désormais faisable d'ici
metadata:
  type: project
---

**CORRECTION (18/06) : le code du relais EST dans ce repo / sur ce PC.** Fichiers `relais_gui_v20.py` (actuel, v1.10.0, publié commit 5eed71f) et `relais_v19.py` (ancien) à la racine. Appli Python/Tkinter qui capte la télémétrie UDP de Forza et appelle l'API. **Donc toute évolution touchant le relais EST faisable ici** (mon ancienne note disait l'inverse — c'était faux).

Points d'intégration relais → API (constantes ~ligne 96-99 de `relais_gui_v20.py`) :
- `POST /api/times` (envoi des chronos) — la réponse porte `is_new_record`, `id`, `previous_setup`.
- `GET /api/circuits`, `GET /api/cars` (+ `PATCH /api/cars` rapprochement voiture, service role).
- `GET /api/times/mes-records` ([v13] meilleur temps perso par épreuve, affiché dans la liste).
- Popups GUI : `PopupReglage` (~l.1134, pré-remplie par `previous_setup`), popups « monde »/« réglage » ouvertes après un `is_new_record` (~l.1814-1908).

**Ingestion serveur (livré 17/06, commit b7e6c7e)** — `POST /api/times` optimisé iso-fonctionnel : `after()` (notifs in-app + emails Resend + enrichissement nom voiture différés après réponse), `Promise.all` sur lectures indépendantes, gardes numériques strictes (NaN). Garde NaN aussi ajoutée aux GET cars/times (18/06).

**Idée « rang dans la réponse »** : renvoyer le rang du joueur dans la réponse `POST /api/times` pour afficher « 🥉 Tu es 3e ! » dans la popup. Maintenant débloqué (relais modifiable ici).

**En cours — feature « objectif à battre »** (voir [[autonomie-pas-de-demande-autorisation]]) : cible = temps d'un pilote précis sur une config ; entrées classements + profil + page dédiée ; web d'abord puis affichage en jeu côté relais.

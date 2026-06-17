---
name: relais-serveur-et-rang
description: Code du relais Python pas sur ce PC ; ingestion serveur optimisée (after/parallèle) ; idée rang en attente
metadata:
  type: project
---

Le code du **relais** (BetterRivals.exe / `relais_gui_v15.py`, Python) **n'est PAS dans ce repo ni sur ce PC** — il vit sur une autre machine. Ici, le « code relais » = uniquement le point d'entrée serveur qu'il appelle : `POST /api/times` (+ `/api/cars`).

**Livré (17 juin 2026, commit b7e6c7e)** — optimisation de `POST /api/times` côté serveur, iso-fonctionnel pour le relais :
- `after()` (next/server, stable Next ≥15.1) : notifications in-app, emails Resend et enrichissement du nom de voiture différés **après** la réponse → le relais reçoit sa confirmation plus vite ; corrige aussi le risque d'email gelé en serverless.
- `Promise.all` sur les lectures indépendantes (player/track/world_record/existence voiture, puis historique+update).
- Garde-fous numériques stricts (track_id/car_id/lap_time) contre les filtres NaN silencieux.

**En attente (point 5, pas commencé)** : renvoyer le **rang** du joueur dans la réponse de `POST /api/times` pour que la popup du relais affiche « 🥉 Tu es 3e ! ». Bloqué car ça **change la réponse → le relais Python doit être adapté** (autre machine). À faire : préparer le calcul du rang côté serveur ici, puis adapter le relais là-bas.

Voir aussi [[autonomie-pas-de-demande-autorisation]].

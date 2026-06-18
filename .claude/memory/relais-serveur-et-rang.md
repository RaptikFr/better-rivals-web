---
name: relais-serveur-et-rang
description: Le relais Python EST dans ce repo (relais_gui_v20.py) ; ingestion serveur optimisée ; intégration relais désormais faisable d'ici
metadata:
  type: project
---

**CORRECTION (18/06) : le code du relais EST sur ce PC** — fichier actuel `relais_gui_v21.py` (release **v1.11.0**, objectifs 🎯) à la racine. Appli Python/Tkinter qui capte la télémétrie UDP de Forza et appelle l'API. **Donc toute évolution du relais est éditable ici.**

⚠️ **À TESTER (sur PC fixe, l'utilisateur n'a pas Forza sur le portable) :** le relais **v1.11.0** — lancement+connexion, envoi d'un chrono, et 🎯 dans « Choisir un rival » pour une config posée en objectif sur le site. Repli : dépublier la release v1.11.0 (latest repointe sur v1.10.0) en cas de souci de build.

⚠️ **Le SOURCE `relais_gui_v21.py` n'existe QUE sur ce PC portable** (gitignoré → pas synchronisé sur le PC fixe). Le test desktop passe par l'exe **v1.11.0** téléchargeable depuis la release GitHub (≠ source). Toute future modif du SOURCE du relais doit se faire sur la machine qui a le `.py` (le portable), pas le fixe — ou copier le fichier manuellement.

⚠️ **`relais*.py` est GITIGNORÉ** (`.gitignore` : « Relais desktop … jamais envoyé sur GitHub »). Le relais n'est PAS versionné dans ce repo : éditer le `.py` modifie le fichier local, mais `git add/commit` ne le prend pas (et ne doit pas). Distribution = `BetterRivals.exe` reconstruit séparément à partir de ce `.py`. Donc après une modif relais : prévenir l'utilisateur qu'il doit rebuild/redéployer l'exe lui-même ; ne pas tenter de committer le relais.

Points d'intégration relais → API (constantes ~ligne 96-99 de `relais_gui_v20.py`) :
- `POST /api/times` (envoi des chronos) — la réponse porte `is_new_record`, `id`, `previous_setup`.
- `GET /api/circuits`, `GET /api/cars` (+ `PATCH /api/cars` rapprochement voiture, service role).
- `GET /api/times/mes-records` ([v13] meilleur temps perso par épreuve, affiché dans la liste).
- Popups GUI : `PopupReglage` (~l.1134, pré-remplie par `previous_setup`), popups « monde »/« réglage » ouvertes après un `is_new_record` (~l.1814-1908).

**Ingestion serveur (livré 17/06, commit b7e6c7e)** — `POST /api/times` optimisé iso-fonctionnel : `after()` (notifs in-app + emails Resend + enrichissement nom voiture différés après réponse), `Promise.all` sur lectures indépendantes, gardes numériques strictes (NaN). Garde NaN aussi ajoutée aux GET cars/times (18/06).

**Idée « rang dans la réponse »** : renvoyer le rang du joueur dans la réponse `POST /api/times` pour afficher « 🥉 Tu es 3e ! » dans la popup. Maintenant débloqué (relais modifiable ici).

**Procédure build + release du relais (faite le 18/06 pour v21 / release v1.11.0)** :
- Renommer/bumper `relais_gui_vN.py` (header + ligne packaging + entrée changelog), bumper la version sémantique du site dans `app/telecharger/page.tsx` (2 occurrences « Télécharger v1.x.y »).
- Deps build (Python 3.14 ici) : `python -m pip install requests keyring`. **PAS besoin de pywin32** — keyring utilise l'API Windows via ctypes (`WinVaultKeyring`), testé OK. C'est ce qui rend l'exe ~4 Mo plus léger que les anciens builds (qui embarquaient pywin32 inutilement).
- Build : `python -m PyInstaller --onefile --noconsole --name BetterRivals relais_gui_vN.py` → `dist/BetterRivals.exe` (~15 Mo). Vérifier `build/BetterRivals/warn-*.txt` (aucun module critique manquant) + présence de `certifi/cacert.pem`, `tcl8/tk8`, `keyring.backends.Windows`.
- Release : **`gh` n'est PAS installé** et **curl est bloqué par le sandbox** (HTTP 000) ; en revanche **python `requests` a accès réseau**. Donc piloter l'API GitHub en Python : token récupéré via `git credential fill` (c'est un PAT `ghp_…`), POST `/releases` (tag `v1.x.y`, name « Relais vN — … », target `main`) puis upload de l'asset `BetterRivals.exe` sur `upload_url`. Le site pointe sur `/releases/latest/download/BetterRivals.exe` → un vrai release (pas draft) met à jour « latest » automatiquement.

**Feature « objectif à battre » (livrée 18/06)** (voir [[autonomie-pas-de-demande-autorisation]]) : cible = temps d'un pilote précis sur une config ; entrées classements + profil + page dédiée ; web d'abord puis affichage en jeu côté relais.

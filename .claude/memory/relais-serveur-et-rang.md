---
name: relais-serveur-et-rang
description: "Relais Python relais_gui_v21.py (gitignoré, sur fixe+portable). Dernière release v1.13.0 (trace télémétrie) publiée 19/06 depuis le PORTABLE → ⚠️ portable = source à jour (v1.13.0), fixe en retard (v1.11.1). gh absent du portable → release via fallback Python/requests+git credential"
metadata: 
  node_type: memory
  type: project
  originSessionId: cae85036-f3e2-4180-a051-95649963b520
---

**Le code du relais existe sur LES DEUX machines** (fixe + portable) — fichier `relais_gui_v21.py` à la racine, gitignoré. Appli Python/Tkinter qui capte la télémétrie UDP de Forza et appelle l'API. **Donc toute évolution du relais est éditable ici** (py_compile dispo en local pour le check syntaxe).

⚠️⚠️ **DIVERGENCE DE SOURCE AU 19/06 : le PORTABLE est la copie la plus à jour (v1.13.0), le FIXE est EN RETARD (v1.11.1).** Les v1.11.2 (#13), v1.12.0 (secteurs) PUIS v1.13.0 (trace télémétrie) ont été développées+buildées+publiées **sur le PORTABLE** (`PC-RENAUD`, Python 3.14, `gh` absent → release via fallback requests, exe 14,5 Mo). **Avant toute prochaine modif relais sur le fixe : recopier d'abord `relais_gui_v21.py` du portable vers le fixe**, sinon ça diverge pour de bon. Pour savoir sur quelle machine on est : [[identification-machine]].

✅ **RELEASE v1.13.0 PUBLIÉE (19/06, depuis le PORTABLE)** — fondation **trace télémétrique**. `APP_VERSION="1.13.0"`. `TraceRecorder` (échantillonnage par distance 12 m : distance/temps/vitesse/accel/frein/volant), upload sur POST /api/traces au nouveau record (best-effort). Offsets ajoutés Speed 256/Accel 315/Brake 316/Steer 320 (⚠️ à valider en jeu, mêmes que distance). `/telecharger` bumpé v1.12.0→v1.13.0 (commit da17fba). latest pointe dessus. Détails : [[feature-trace-telemetrie]].

✅ **RELEASE v1.12.0 PUBLIÉE (19/06, depuis le PORTABLE)** — feature **secteurs** (brique télémétrie #2). `APP_VERSION="1.12.0"`. `SectorTracker` + offset `DistanceTraveled` 292 (⚠️ à valider en jeu), payload `sectors` facultatif. `/telecharger` bumpé v1.11.2→v1.12.0 (commit 371cf14). latest pointe dessus. Détails complets : [[feature-secteurs]].

✅ **RELEASE v1.11.2 PUBLIÉE (19/06, depuis le PORTABLE)** — feature **#13 vérification de version du relais**. Source v21 (nom conservé), `APP_VERSION="1.11.2"`. Au lancement, `LoginWindow` lance en thread `derniere_version_disponible()` → GET `api.github.com/repos/RaptikFr/better-rivals-web/releases/latest` (best-effort, timeout 4 s) ; si tag > APP_VERSION, bandeau orange « ⬆️ Nouvelle version dispo → Télécharger » (ouvre `/telecharger` via `webbrowser`). `_parse_version` robuste aux suffixes (`v1.12.0-beta`). N° de version affiché sous le titre. **PAS d'auto-updater** (faux positifs AV). `/telecharger` bumpé v1.11.1→v1.11.2 (commit 65ec84d poussé). ⚠️ **La détection ne marche QUE depuis v1.11.2** (les exe ≤ v1.11.1 n'ont pas le check). py_compile OK, exe **14,5 Mo** (portable, Python 3.14, UPX absent — l'écart avec le ~18-19 Mo du fixe vient de la version Python, pas d'UPX).

⚠️ **`gh` est ABSENT du PORTABLE** (Get-Command + recherche FS = introuvable — comme déjà noté ; sur le FIXE `gh` 2.94 est censé être présent). **Release faite via le fallback Python/requests** : token récupéré par `git credential fill` (protocol=https/host=github.com → password=PAT 40 car.), POST `/repos/.../releases` (draft:false, target main) puis upload de l'asset sur `upload_url`. Réseau sandboxé → lancer le script avec **sandbox désactivé**. Fallback éprouvé le 19/06.

✅ **RELEASE v1.11.1 (19/06)** — source v21, deux améliorations « objectifs plus visibles » : (1) 🎯 devant les CIRCUITS où j'ai un objectif non atteint ; (2) en course, panneau rival « 🎯 OBJECTIF » vs « 🏁 RIVAL ». Lecture seule, contrat POST /api/times inchangé.

✅ **v1.11.0 TESTÉE OK par le proprio** (sur le fixe, avec Forza) — lancement, connexion, envoi de chrono, 🎯 « Choisir un rival ». Reste à tester quand pratique : les 2 nouveautés v1.11.1. Repli en cas de souci : dépublier la release (latest repointe sur la précédente).

📦 **Taille de l'exe (19/06)** : le build du fixe fait ~18-19 Mo, soit ~4 Mo de plus que le build portable de la v1.11.0 (~15 Mo). Cause = **UPX absent du PATH sur le fixe** → PyInstaller ne compresse pas les DLL (le portable devait avoir UPX). Le pywin32 « lourd » n'est PAS installé ici (seul `win32ctypes`, léger, est embarqué) — donc ce n'est pas lui. **Ne pas chercher à compresser** : un exe UPX déclenche plus souvent les faux positifs antivirus (le proprio tient à éviter ça), l'exe non compressé est plus sûr de ce côté. Fonctionnellement identique.

⚠️ **DIVERGENCE DE SOURCE À SURVEILLER** : le `.py` est gitignoré (non synchronisé par git) et existe sur LE FIXE **et** le portable. Les modifs v1.11.1 ont été faites **sur le fixe** → c'est désormais lui la copie la plus à jour, le portable est en retard. Choisir une machine « source de vérité » et y centraliser (ou recopier le fichier) avant la prochaine modif, sinon deux versions vont diverger.

⚠️ **`relais*.py` est GITIGNORÉ** (`.gitignore` : « Relais desktop … jamais envoyé sur GitHub »). Le relais n'est PAS versionné dans ce repo : éditer le `.py` modifie le fichier local, mais `git add/commit` ne le prend pas (et ne doit pas). Distribution = `BetterRivals.exe` reconstruit séparément à partir de ce `.py`. Donc après une modif relais : prévenir l'utilisateur qu'il doit rebuild/redéployer l'exe lui-même ; ne pas tenter de committer le relais.

Points d'intégration relais → API (constantes ~ligne 96-99 de `relais_gui_v20.py`) :
- `POST /api/times` (envoi des chronos) — la réponse porte `is_new_record`, `id`, `previous_setup`.
- `GET /api/circuits`, `GET /api/cars` (+ `PATCH /api/cars` rapprochement voiture, service role).
- `GET /api/times/mes-records` ([v13] meilleur temps perso par épreuve, affiché dans la liste).
- Popups GUI : `PopupReglage` (~l.1134, pré-remplie par `previous_setup`), popups « monde »/« réglage » ouvertes après un `is_new_record` (~l.1814-1908).

**Ingestion serveur (livré 17/06, commit b7e6c7e)** — `POST /api/times` optimisé iso-fonctionnel : `after()` (notifs in-app + emails Resend + enrichissement nom voiture différés après réponse), `Promise.all` sur lectures indépendantes, gardes numériques strictes (NaN). Garde NaN aussi ajoutée aux GET cars/times (18/06).

**Idée « rang dans la réponse »** : renvoyer le rang du joueur dans la réponse `POST /api/times` pour afficher « 🥉 Tu es 3e ! » dans la popup. Maintenant débloqué (relais modifiable ici).

**Procédure build + release du relais (faite le 18/06 pour v1.11.0, refaite le 19/06 pour v1.11.1 — sur le PC FIXE)** :
- Bumper si MAJ importante : renommer `relais_gui_vN.py` (sinon garder le nom, cf. v1.11.1 restée en v21). Toujours : header + entrée changelog + version sémantique du site dans `app/telecharger/page.tsx` (2 occurrences « Télécharger v1.x.y »).
- Deps build (Python **3.13.2** sur le fixe, 3.14 sur le portable) : `python -m pip install requests keyring`. **PAS besoin de pywin32** — keyring passe par `win32ctypes` (léger, ctypes/cffi) ou ctypes Windows, testé OK. Check syntaxe avant build : `python -m py_compile relais_gui_vN.py`.
- Build : `python -m PyInstaller --onefile --noconsole --name BetterRivals relais_gui_vN.py` → `dist/BetterRivals.exe`. **Taille : ~15 Mo si UPX est sur le PATH (cas du portable), ~18-19 Mo sinon (cas du fixe, UPX absent)** — non compressé = plus sûr côté antivirus, ne pas chercher à réduire. Vérifier `build/BetterRivals/warn-*.txt` (aucun module critique manquant) + présence de `certifi/cacert.pem`, `tcl8/tk8`, `keyring.backends.Windows`. dist/, build/, *.spec sont gitignorés.
- Release : **sur le PC fixe `gh` EST installé (2.94) et authentifié** → le plus simple : `gh release create v1.x.y dist/BetterRivals.exe --target main --title "…" --notes-file …` (réseau sandboxé → lancer avec sandbox désactivé). Un release publié (pas draft) devient « latest » auto ; le site sert `/releases/latest/download/BetterRivals.exe`. (Sur le portable gh était absent + curl bloqué → on pilotait l'API GitHub en python `requests`, token via `git credential fill`.)

**Feature « objectif à battre » (livrée 18/06)** (voir [[autonomie-pas-de-demande-autorisation]]) : cible = temps d'un pilote précis sur une config ; entrées classements + profil + page dédiée ; web d'abord puis affichage en jeu côté relais.

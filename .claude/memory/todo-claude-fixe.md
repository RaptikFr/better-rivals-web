---
name: todo-claude-fixe
description: "Passation pour Claude sur RAPTIK-PC (PC fixe) : git pull requis + reste à faire après sessions portable du 23/06 et du 07/07 (dont build+release relais v3.2.0)."
metadata: 
  node_type: memory
  type: project
  originSessionId: 729923f9-277e-4b7e-9849-43b77f4f4d18
---

**À LIRE EN PREMIER si tu es sur RAPTIK-PC.** Cette note a été laissée par Claude sur PC-RENAUD (portable) le 23/06/2026.

## 1. Commencer par synchroniser le repo

```powershell
git fetch && git pull
```

Le portable a poussé plusieurs commits depuis la dernière sync. Le repo web est à jour sur GitHub — le relais lui est dans OneDrive\Relais (gitignoré, synchro automatique).

---

## 2. Ce qui a été fait côté site (session portable 23/06)

- **Fix reset onglet navigateur** (`useAuth`) — `onAuthStateChange` ne relançait `fetchData()` qu'à chaque retour de focus. Corrigé : ne met à jour l'état que si `user.id` change réellement.
- **Coach tab — combobox de recherche** — le `<select>` de config est remplacé par un champ de recherche (filtre par circuit / voiture).
- **Coach tab — plage kilométrique par secteur** — chaque secteur affiche désormais « km X,XX → X,XX » depuis le départ pour situer les conseils sur le tracé.
- **CLAUDE.md** — architecture complète documentée (tables DB, API routes, hooks, télémétrie, conventions).
- **track_mapper.py** — script standalone de cartographie trajectoire FH6 (voir [[track-mapper]]).

---

## 3. Ce qu'il reste à faire (par priorité)

### ✅ FAIT (23/06) — `track_mapper.py` validé en jeu, puis rendu OBSOLÈTE (09/07)

- Offsets Position **validés** après correction (232/236/240 → **244/248/252**, +12 FH6 ; cf. [[track-mapper]]). Test Irokawa : |ΔXZ| = vitesse × dt. `DEBUG` repassé à False.
- **Sélection circuit par menu API** ajoutée (track_id dans le JSON) + port corrigé **5300**. Commit `7c04b50`, poussé.
- ⚠️ **Confirmé obsolète le 09/07** : le relais capture désormais le tracé automatiquement (`track_geometries`, auto-détection v3.1.0) — plus besoin de bibliothèque manuelle via ce script. Voir [[track-mapper]].

### 🟡 À tester en jeu — relais v3.0.0

Le relais v3.0.0 (OneDrive\Relais\relais_gui_v300.py) n'a **pas encore été testé en jeu** (headless depuis le portable). Les fonctionnalités à valider :
- Delta live (overlay « +0,3s vs PB »)
- Copilote de réglage (signal niveau/compare en direct)
- Coach pilotage (rapport post-tour)

### 🟢 Côté site — vérification visuelle

- ✅ **Confirmé OK (23/06, RAPTIK-PC)** : le changement d'onglet navigateur ne reset plus la page Profil.
- Vérifier l'affichage des plages km dans l'onglet Coach (nécessite une trace existante).

### ⚪ En attente

- Calibration `sousvireuse` à refaire plus extrême (thermiquement plate lors du test 23/06 — voir [[copilote-reglage]]).
- Validation delta live en jeu → build + release relais si tout est bon.

---

## 4. Session portable 07/07 — capture technique brute (relais v312)

Ajouté `OneDrive\Relais\relais_gui_v312.py` (copie de v311 + feature) :

- **Capture technique optionnelle** réservée à `codraptik@gmail.com` (liste blanche `RAW_CAPTURE_WHITELIST`, comparaison insensible à la casse sur l'email de connexion Supabase, propagé via `session["email"]`).
- Active uniquement en mode circuit/sprint **sur asphalte** (réutilise `self.surface_asphalte`, même gating que le copilote de réglage).
- Enregistre les paquets UDP bruts dans `captures_perso/course_{date_heure}_{car_ordinal}.bin`, même format que `telemetrie_debug.py` (compatible `coach_diag.py`) — 100 % local, jamais uploadé.
- Classe `RawCaptureRecorder` (démarrer/écrire/arrêter), best-effort, try/except silencieux partout.
- Ouverture sur transition « hors course → en course » ; fermeture seulement après un délai de grâce **`RAW_CAPTURE_END_GRACE_S = 300`** (5 min, dédié — distinct de `SPRINT_END_GRACE_S` qui reste à 1,2 s pour l'affichage du bouton d'envoi manuel), pour absorber une vraie pause (toilettes, etc.) sans couper le fichier ni écraser quoi que ce soit (noms de fichiers horodatés à la seconde, jamais de collision).
- `APP_VERSION` passé à **`3.2.0`**, journal en tête de fichier mis à jour (mention générique « compte de test », sans révéler la whitelist).
- Vérifié uniquement par `python -m py_compile` — **PAS testé en jeu**.

### ✅ FAIT le 7 juil 2026 (RAPTIK-PC) — release v3.2.0 publiée

2-3-4 faits : exe buildé (`%TEMP%\br_build312`, 19,3 Mo), `gh release create v3.2.0` publié,
`/telecharger` bumpé + bandeau `content/announcement.ts` (id 2026-07-relais-v320), commit eedfd25.

### ✅ FAIT le 09/07 — capture technique brute testée en jeu

`captures_perso/` se remplit bien en conditions réelles (5 fichiers, 3 voitures, session du
07/07), lisibles de bout en bout par `coach_diag.py`. Bonus : la calibration « sous-virage »
(voir [[coach-copilote-reglage]]) a une confirmation en conditions réelles (Δtemp AV−AR +31°F,
signal net) — le résultat plat du 23/06 tenait probablement au réglage ARB pas assez extrême,
pas à un défaut de la logique de détection.

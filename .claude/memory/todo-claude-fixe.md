---
name: todo-claude-fixe
description: "Passation pour Claude sur RAPTIK-PC (PC fixe) : git pull requis + liste de ce qu'il reste à faire après la session portable du 23/06."
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

### ✅ FAIT (23/06) — `track_mapper.py` validé en jeu

- Offsets Position **validés** après correction (232/236/240 → **244/248/252**, +12 FH6 ; cf. [[track-mapper]]). Test Irokawa : |ΔXZ| = vitesse × dt. `DEBUG` repassé à False.
- **Sélection circuit par menu API** ajoutée (track_id dans le JSON) + port corrigé **5300**. Commit `7c04b50`, poussé.
- ⏳ Reste (quand tu veux) : enregistrer de **vrais laps complets** par circuit (lap propre, checkpoints [Espace] aux repères) pour bâtir la bibliothèque de tracés. ⚠️ **Fermer le relais** avant (même port UDP 5300).

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

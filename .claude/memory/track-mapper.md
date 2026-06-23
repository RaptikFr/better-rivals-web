---
name: track-mapper
description: "Script standalone track_mapper.py — enregistreur de trajectoire FH6 via UDP, export JSON + SVG. À tester en jeu sur RAPTIK-PC pour valider les offsets X/Y/Z."
metadata: 
  node_type: memory
  type: project
  originSessionId: 729923f9-277e-4b7e-9849-43b77f4f4d18
---

Script Python standalone créé le 23/06 à la racine du repo (`track_mapper.py`), commit `0772b74`. Aucune dépendance externe (stdlib uniquement). Gitignoré ? Non — il EST dans le repo (contrairement au relais).

## Ce que ça fait

Écoute UDP FH6 port **5300** (= le port réellement configuré dans FH6 / utilisé par le relais Better Rivals ; corrigé le 23/06, le code initial disait 5700 à tort — FH6 n'émet que vers UN seul port, donc le mapper DOIT être sur le même que le relais). Enregistre la trajectoire XZ d'un lap, marque des checkpoints au clavier [Espace], exporte :
- `NomCircuit_YYYYMMDD_HHMMSS.json` — trace complète (path + checkpoints)
- `NomCircuit_YYYYMMDD_HHMMSS.svg` — tracé 800×800, fond #0f0f0f, checkpoints colorés

## Offsets utilisés (à valider en jeu)

| Champ | Offset | Type |
|---|---|---|
| is_race_on | 0 | int32 |
| PositionX | 244 | float32 |
| PositionY | 248 | float32 |
| PositionZ | 252 | float32 |
| Speed | 256 | float32 |
| DistanceTraveled | 292 | float32 |
| BestLap | 296 | float32 |
| CurrentLap | 304 | float32 |
| LapNumber | 312 | uint16 |

**Offsets Position CORRIGÉS le 23/06 (test en jeu)** : au premier essai, X/Y/Z étaient à 232/236/240 → lus à **0.0** (alors que Speed/Distance étaient bons). Cause : Position avait été oublié dans le décalage **+12** que reçoivent tous les champs Dash en FH6 (3 champs FH6-only insérés après NumCylinders offset 228). Tout le reste était déjà à +12 (Speed 244→256, Distance 280→292, laps idem). Corrigé : **244/248/252** (= 232/236/240 standard FM + 12), 4 floats contigus avant Speed (256). ✅ **CONFIRMÉ en jeu (Irokawa, 23/06)** : |ΔXZ| par pas = vitesse × dt → coordonnées bonnes.

**Modèle de tour (corrigé 23/06)** : enregistre dès `is_race_on==1`, **1er tour INCLUS** (LapNumber=0 pendant tout le 1er tour en Forza). Fin détectée au 1er incrément LapNumber (0→1) → **UN tour complet suffit** pour une carte. Avant ce fix, la capture ne démarrait qu'à LapNumber≥1 → il fallait 2 tours et on n'obtenait que des bouts (3-5 points en fin de tour). `SAMPLE_EVERY_N` passé 10→**5** (~12 Hz, ~2,7 m entre points).

**Distance = géométrique, PAS le champ Forza (corrigé 23/06)** : `DistanceTraveled` (offset 292) n'est PAS en mètres réels — sur Irokawa il donnait 5949 m pour un tour de 1888 m (≈ 3,15× trop ; 366 km/h de moyenne, impossible). Déjà connu côté relais v25 (« distance Forza ≠ mètres réels »). Fix mapper : `cumulative_distance_m()` somme les segments XZ (positions validées) → `total_distance_m` + `dist_m` par point + `dist_m` des checkpoints sont en MÈTRES RÉELS ; le champ brut Forza est conservé sous `dist_forza`. Vérifié : 1888,5 m, 116 km/h moy. ⚠️ L'affichage live console montre encore le brut Forza (cosmétique, non corrigé).

**Clavier en jeu (gotcha 23/06)** : `msvcrt` ne lit le clavier QUE si la console a le focus → pendant qu'on roule (FH6 au 1er plan), [Espace]/[S] n'arrivaient jamais (checkpoints=0 dans l'export). Fix : poller **global** via `ctypes.windll.user32.GetAsyncKeyState(vk) & 0x8000` (front montant), qui lit l'état physique sans consommer la touche (le jeu la reçoit aussi). Config `CHECKPOINT_VK=0x20` (Espace) + `SAVE_VK=0x53` (S). R/Q restent console. Idéal si on pilote à la manette/volant (clavier libre).

## Validation

Mettre `DEBUG = True` en haut du fichier → affiche `X / Y / Z` bruts toutes les secondes. Si X et Z varient de façon cohérente avec le mouvement en jeu et Y suit les dénivelés, les offsets sont bons. Si tout est 0 ou aberrant, chercher les bons offsets dans le format FH6 réel.

**⚠️ Cohabitation avec le relais** : FH6 n'émet ses paquets que vers UN port (5300). Sur Windows, deux sockets UDP unicast bindés sur le même port (même avec `SO_REUSEADDR`) ne reçoivent PAS tous les deux de façon fiable — généralement un seul capte. **→ Fermer le relais avant de lancer le mapper** (ou changer temporairement le port FH6). Ne pas compter sur le « partage » mentionné dans une note antérieure.

## Utilisation

```
python track_mapper.py
```
Lancer AVANT de démarrer une session Forza (ou pendant une pause). FH6 : Paramètres → Télémétrie → IP 127.0.0.1, **Port 5300**. Puis rouler UN tour complet depuis la ligne ; au passage de la ligne → prompt [S] Sauvegarder.

**Why:** [[todo-claude-fixe]] — premier outil de cartographie manuelle des circuits pour ancrer les conseils du Coach à des repères géographiques réels.

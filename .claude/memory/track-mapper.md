---
name: track-mapper
description: "Script standalone track_mapper.py — OBSOLÈTE depuis le 09/07 : le relais capture désormais le tracé automatiquement (track_geometries + auto-détection v3.1.0). Ne plus le proposer comme reste à faire."
metadata: 
  node_type: memory
  type: project
  originSessionId: 729923f9-277e-4b7e-9849-43b77f4f4d18
---

**⚠️ OBSOLÈTE (confirmé par le proprio le 09/07/2026).** Le relais capture désormais le tracé de chaque circuit tout seul, silencieusement, pendant la conduite normale (table `track_geometries`, un seul tour propre par circuit suffit, dédupliqué côté serveur — voir `/api/track-geometry`), avec auto-détection automatique du circuit depuis le relais v3.1.0. `track_mapper.py` faisait la même chose à la main (checkpoints au clavier, obligation de fermer le relais pour libérer le port UDP 5300) — ce n'est plus nécessaire.

**Why:** le proprio l'a signalé explicitement — ne pas le remettre dans un futur backlog ni proposer de « finir » sa validation en jeu.

**How to apply:** ignorer ce script pour toute future feature de cartographie de circuit ; la carte affichée sur `/circuits/[slug]` et `/classements` (composant `CircuitMap`) vient exclusivement de la capture automatique du relais. Le fichier `track_mapper.py` peut être supprimé du repo si l'occasion se présente (pas fait à ce stade, aucune urgence).

---

## Historique (pour mémoire, plus d'usage actif)

Script Python standalone créé le 23/06 à la racine du repo (`track_mapper.py`), commit `0772b74`. Écoutait UDP FH6 port 5300, offsets Position validés en jeu (244/248/252), distance recalculée géométriquement (le champ Forza brut plafonne ~5950 quel que soit le tracé). Premier outil de cartographie manuelle, avant que la capture automatique par le relais ne le rende inutile.

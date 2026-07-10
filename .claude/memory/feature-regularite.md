---
name: feature-regularite
description: "Score de régularité (idée #4) LIVRÉ 10/07/2026 : table session_laps alimentée par /api/sectors (chaque tour), lib/regularite.ts, GET /api/regularite, section 🎯 dans l'onglet Stats du profil. Aucune modif relais."
metadata: 
  node_type: memory
  type: project
  originSessionId: c036771f-9526-444b-85f8-8debad982e33
---

**Score de régularité (idée #4) — LIVRÉ et DÉPLOYÉ le 10/07/2026** (commit e3a6de2, migration `session_laps.sql` appliquée en prod et vérifiée par sonde anon 42501).

Architecture (validée avec le proprio le 10/07 — il « aime bien l'idée ») :
- **Zéro modif relais** : le relais ≥ v1.15 poste déjà CHAQUE tour sur `POST /api/sectors` ; on y insère désormais aussi le temps du tour dans **`session_laps`** (en `after()`, best-effort, fenêtre glissante 90 j élaguée à l'écriture, RLS fermée service-role only).
- **`lib/regularite.ts`** (pur, 15 tests vitest) : découpe en sessions (trou > 45 min), exclusion des tours ratés (> 110 % de la médiane), écart-type + CV des tours propres (≥ 3 requis), niveaux CV : métronome ≤ 0,5 % · régulier ≤ 1,5 % · variable ≤ 3 % · irrégulier au-delà.
- **`GET /api/regularite`** (Bearer, patron coach-reports) : par config, dernière session scorable + meilleure (CV min) + libellés circuit/voiture.
- **UI** : `RegulariteSection` dans l'onglet 📊 Statistiques de `/profil` (chips de niveau, ±X,XX s, nb tours propres, record).

⚠️ Les données partent de zéro (rien de rétroactif) : le score n'apparaît qu'après une session ≥ 3 tours propres sur une même config postée par le relais APRÈS le déploiement. **Pas encore vérifié en conditions réelles** — au premier retour du proprio, vérifier que session_laps se remplit et que l'onglet Stats affiche la section.

Extensions possibles (non engagées) : badge « Métronome » dans lib/badges.ts, affichage public sur /joueurs/[pseudo].

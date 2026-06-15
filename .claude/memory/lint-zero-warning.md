---
name: lint-zero-warning
description: Le user veut une sortie lint propre (0 warning) ; règle react-hooks/set-state-in-effect gérée par disables ciblés
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a5640525-f5aa-459a-8a49-f2fd4bbc3cb9
---

Le user veut que je règle tous les warnings qui apparaissent, pas seulement les erreurs — viser `npx eslint .` → 0 problème, y compris sur le code existant.

**Why:** Il considère les warnings comme du bruit à éliminer, pas à tolérer.

**How to apply:** Après toute modif, lancer `npx eslint .` et viser 0. Pour la règle React 19 / Next 16 `react-hooks/set-state-in-effect`, qui sur-signale des patterns valides (montage SSR `setMounted(true)`, lectures localStorage/URL au montage, resets sur changement de dépendance, setState dans des fetchs), la convention du projet est un `// eslint-disable-next-line react-hooks/set-state-in-effect -- <raison>` inline (ou bloc `/* eslint-disable ... */ … /* eslint-enable */` pour un effet à plusieurs setState). Ne pas refactorer du code qui marche juste pour la règle si le refacto est risqué. Voir [[autonomie-pas-de-demande-autorisation]].

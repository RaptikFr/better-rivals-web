---
name: idee-panneau-options
description: "Idée à travailler plus tard — un panneau de préférences/options (thème, affichage des temps/tableaux sur PC, etc.)"
metadata: 
  node_type: memory
  type: project
  originSessionId: a5640525-f5aa-459a-8a49-f2fd4bbc3cb9
---

Idée soumise par le user le 2026-06-15, à creuser **ultérieurement** (pas encore commencé) : un **panneau d'options / préférences** centralisé pour personnaliser le site. Points de départ qu'il a cités : choix du **thème**, et la **façon dont les temps et autres infos sont affichés (sur PC)**. Il est ouvert à d'autres idées pour enrichir ce panneau.

## Pistes de réglages proposées (à valider avec lui)
- **Thème** : clair / sombre / **système** (centralise le toggle déjà présent dans la Navbar via next-themes ; ajoute l'option « système »).
- **Format des temps** : `1:23.456` vs `83,456 s`, séparateur décimal, nb de décimales (centraliser dans `components/formatTime.ts`).
- **Densité des tableaux (PC)** : confortable / compact.
- **Colonnes visibles** dans les classements (PC) : PI, transmission, tag Discord, rivaux — pouvoir masquer celles dont on ne veut pas.
- **Dates** : relatives (« il y a 2 j ») vs absolues.
- **Notifications** : granularité par type (exact / transmission / classe / rival) au lieu du seul toggle email actuel (colonne `email_notifications_enabled` sur `players`).
- **Accessibilité** : réduire les animations, taille de police/contraste (prolonge le point 6 de la roadmap).
- **Confidentialité** : masquer son tag Discord publiquement.

## Architecture suggérée
- Hook `usePreferences` adossé à **localStorage** (instantané, marche pour les visiteurs anonymes) pour les prefs d'affichage.
- Pour les utilisateurs connectés, option de **synchroniser** via une colonne `preferences jsonb` sur `players` (cross-device) — comme l'est déjà `email_notifications_enabled`.
- UI : page dédiée `/parametres` ou modale accessible depuis la Navbar / le profil. Penser aria-label (cf. [[lint-zero-warning]] pour garder 0 warning, et l'effort accessibilité déjà fait).

**Why:** Le user veut laisser chaque pilote adapter l'affichage à son écran/ses goûts, surtout sur PC où les tableaux sont denses.

**How to apply:** Quand on s'y met, commencer par cadrer le périmètre v1 avec lui (probablement thème + format des temps + densité), choisir localStorage vs DB, puis livrer petit. Voir la roadmap [[roadmap-ameliorations-juin-2026]] (terminée) pour le style de livraison incrémentale attendu.

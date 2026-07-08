---
name: feature-skins-relais
description: Relais v3.2.5 — suit automatiquement le skin du site (players.preferences.skin) ; comment ça marche et les 2 pièges Tkinter à connaître
metadata:
  type: project
---

**Livré le 08/07/2026 (release v3.2.5, [[relais-serveur-et-rang]]).** Le relais applique le skin d'interface choisi sur le site (`players.preferences.skin` : classic/apex/telemetry/arcade, cf. `lib/preferences.ts` + `app/globals.css`).

**Mécanique** : `connexion_supabase()` fait `select=pseudo,preferences` et extrait `preferences.skin` (validé contre `SKINS`, fallback silencieux `classic` sur tout cas dégénéré — colonne absente, null, pas un dict, clé manquante, valeur inconnue). `main()` appelle `appliquer_skin()` après le login et avant toute fenêtre : la fonction réassigne les **globales de module** `C_BG/C_BG2/C_BG3/C_BORDER/C_BORDER_STRONG/C_TEXT/C_MUTED/C_FAINT/C_ACCENT/C_ACCENT2`. Les fenêtres lisent les C_* à la construction → tout ce qui s'ouvre après le login suit le skin. La fenêtre de login reste en classic (valeurs initiales = classic, détruite au login). L'auto-connexion « Se souvenir de moi » repasse par `connexion_supabase` → couverte. Couleurs sémantiques fixes : `C_SUCCESS/C_ERROR/C_WARNING/C_OFFICIEL/C_COMMUNITY/C_SPRINT`. Pas de sélecteur local, pas de polling en session (changement de skin sur le site = pris en compte au prochain lancement du relais).

**Why:** ne pas ré-implémenter ni casser ce contrat (le proprio a explicitement exclu sélecteur local et refresh en session).

**How to apply — 2 pièges si on retouche les couleurs du relais :**
1. Jamais de `def f(x, c=C_MUTED)` : la valeur par défaut est figée à l'IMPORT (avant `appliquer_skin`). Pattern correct : `c=None` puis résolution à l'appel (`_set_statut`/`_set_message` corrigées ainsi).
2. Pas de couleur hex en dur dans l'UI : les séparateurs `#2a2a2a`/`#333333` ont été remplacés par `C_BORDER`/`C_BORDER_STRONG`. Toute nouvelle couleur passe par une C_* ou une sémantique.

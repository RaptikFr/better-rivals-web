---
name: banniere-annonce-nouveautes
description: "Règle du proprio (10/07/2026) : toute nouveauté visible du site doit s'accompagner d'une mise à jour de la bannière d'annonce (content/announcement.ts, id incrémenté)."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c036771f-9526-444b-85f8-8debad982e33
---

À chaque **nouveauté ou changement important visible sur le site** (feature, page, gros correctif visible), mettre à jour la bannière d'annonce dans `content/announcement.ts` : nouveau `id` (le changer rouvre la bannière pour tous), `message` en français orienté utilisateur, `link`/`linkLabel` vers la page concernée.

**Why :** le proprio me l'a demandé explicitement le 10/07/2026 (je l'avais oublié en livrant le score de régularité) — c'est le canal qui prévient les utilisateurs enregistrés.

**How to apply :** l'inclure dans la checklist de livraison d'une feature site, au même titre que lint/typecheck/tests. Ne PAS re-bump l'id pour un changement invisible (cf. le précédent v3.2.2 : texte ajusté sans changer l'id). Voir [[feature-regularite]].

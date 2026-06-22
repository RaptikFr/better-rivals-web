---
name: suppression-classement-general
description: Le classement général (système de points) a été retiré du site — exploitable, NE PAS le re-proposer
metadata:
  type: project
---

Le **classement général** (page `/classement-general` + API + badge « Top 10 ») a été **supprimé** du site le 22/06/2026 (commit 2e0ea18).

**Why:** le système de points récompensait le volume de configurations jouées : il suffisait de poser un temps avec une voiture peu utilisée pour grimper « gratuitement ». Mécanique jugée trop facile à exploiter par le proprio.

**How to apply:** NE PAS re-proposer un classement général / système de points global au mérite cumulé. Les classements restent par configuration (circuit × voiture × classe × transmission), à armes égales. Les migrations SQL sont conservées (historique) et la RPC `general_ranking` demeure en base, inutilisée. Cohérent avec [[cap-projet-juin-2026]].

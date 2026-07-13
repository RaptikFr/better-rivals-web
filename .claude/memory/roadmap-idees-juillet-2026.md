---
name: roadmap-idees-juillet-2026
description: Analyse complète site+relais du 13/07 — optimisations livrées le jour même ; restent 6 idées de features validées par l'analyse (A-F), le proprio doit choisir la prochaine (A trace visuelle ou E annonces vocales en tête)
metadata:
  type: project
---

Le 13/07, le proprio a demandé une analyse d'optimisation site+relais puis des idées neuves ([[optimisations-juillet-2026]] : les optimisations identifiées ont été livrées le jour même — relais v3.5.0 + 3 RPC Postgres).

**Idées proposées, PAS encore tranchées** (ordre conseillé : A ou E d'abord, au choix du proprio) :
- **A. Comparaison visuelle de traces** sur la carte du circuit (ma trace vs celle du leader, colorée par delta de vitesse) — toutes les données existent (lap_traces + géométrie + CircuitMap). La plus différenciante côté site.
- **E. Annonces vocales du delta au passage des secteurs** (relais, SAPI Windows via win32com, zéro dépendance) — rend le delta live utilisable en conduite. La plus utile côté relais.
- B. Défis générés par le coach (« gagne 0,3 s secteur 4 ») avec validation auto par les traces suivantes.
- C. Notifications Web Push (PWA, VAPID) « un rival a battu ton temps » — le pipeline notifs existe, il manque le canal.
- D. Heatmap communautaire des secteurs (où l'écart entre pilotes est le plus grand) sur les pages circuit — SEO + contenu vivant.
- F. Auto-update du relais (télécharger + relancer depuis la release) — ⚠️ une note historique v1.11.2 dit « pas d'auto-updater : faux positifs antivirus » ; à re-discuter avant de le faire.

**Why:** ne pas re-proposer ces idées comme neuves, et savoir où on s'était arrêté.
**How to apply:** au prochain échange, demander au proprio laquelle lancer (A ou E recommandées) ; rayer ici celles qui sont faites ou écartées.

---
name: roadmap-idees-juillet-2026
description: Analyse 13/07 — optimisations livrées + features A (trace vs trace, web) et E (annonces vocales, relais v3.6.0) LIVRÉES le jour même ; restent B/C/D/F non tranchées
metadata:
  type: project
---

Le 13/07, le proprio a demandé une analyse d'optimisation site+relais puis des idées neuves ([[optimisations-juillet-2026]] : les optimisations identifiées ont été livrées le jour même — relais v3.5.0 + 3 RPC Postgres).

**A et E LIVRÉES le 13/07** (demandées par le proprio) :
- ✅ **A. Mode « 🆚 Trace vs trace »** (commit web 58b728a) : `lib/traceComparison.ts` (9 tests) + bouton dans CircuitMap — tracé coloré au grain ~60 m par le temps réellement perdu/gagné entre MON tour tracé et celui du rival choisi (réutilise les traces déjà chargées par /api/replay, zéro nouvelle API), infobulle delta local/cumul/vitesses. Rampes divergentes rose/violet 3 pas validées (dataviz). ⚠️ Vérifié build + screenshot déconnecté seulement — le rendu CONNECTÉ (bouton + couleurs) reste à voir en réel par le proprio.
- ✅ **E. Annonces vocales** (relais v3.6.0 releasée, tag eb6f78c) : opt-in 🔊 keyring OFF par défaut, `AnnonceurVocal` = PowerShell persistant System.Speech (zéro dépendance, préchargé, SpeakAsyncCancelAll, coupé au finally de _boucle_udp), `phrase_delta` (« moins 2 dixièmes »), hook `_annoncer_passage_secteur` via `LiveDelta.fraction_courante` × n secteurs, + « Nouveau record ! ». Circuit ET sprint. Testé hors jeu (TTS réel OK) — PAS en jeu.

**Idées restantes, PAS tranchées — ordre recommandé au proprio le 13/07** :
1. **C. Notifications Web Push (PWA, VAPID)** « un rival a battu ton temps » sur le téléphone, site fermé — le pipeline notifs de /api/times existe, il manque le canal (service worker + table push_subscriptions, gratuit). La plus recommandée : c'est le déclencheur émotionnel du concept Rivals.
2. **B. Défis générés par le coach** (« gagne 0,3 s secteur 4 ») avec validation auto par les traces suivantes (le serveur recalcule les secteurs à chaque trace) — boucle mesure → conseil → défi → validation, bon complément du mode 🆚.
3. **D. Heatmap communautaire des secteurs** (où l'écart entre pilotes est le plus grand, depuis best_sectors) sur les pages circuit — SEO + contenu vivant, pas cher.
4. **F. Auto-update du relais** — ⚠️ EN DERNIER : la note historique v1.11.2 l'avait écarté (télécharger/remplacer un exe = faux positifs antivirus) ; le bandeau « màj dispo » est peut-être le bon compromis. Re-discuter seulement si les utilisateurs traînent sur de vieilles versions.
+ en réserve : [[idee-section-reglages]] (vraie UI de bibliothèque de réglages, tune_setups existe déjà).

**Why:** ne pas re-proposer ces idées comme neuves, et savoir où on s'était arrêté.
**How to apply:** au premier retour du proprio, lui demander de vérifier EN RÉEL : (1) le mode 🆚 sur une carte en étant connecté, (2) les annonces vocales en jeu (case 🔊), (3) la file d'attente hors-ligne v3.5.0. B/C/D/F : attendre qu'il en choisisse une, ne pas pousser.

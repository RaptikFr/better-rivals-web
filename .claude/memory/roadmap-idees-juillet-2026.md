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

**TRANCHÉES par le proprio le 14/07/2026** :
- ✅ **A (mode 🆚) et E (annonces vocales v3.6.0) VALIDÉES en réel** le 14/07 (« fonctionnelles » / « c'est bon aussi »).
- ⏸️ **v3.5.0 file d'attente hors-ligne : INTESTABLE** — le proprio n'a pas de wifi sur son PC (Ethernet), impossible de couper le réseau proprement pour tester. Ne plus la redemander ; elle se validera d'elle-même à la première vraie panne réseau.
- ❌ **C. Web Push REJETÉE** (« pas de notif sur le téléphone ») — ne plus la proposer.
- ❌ **F. Auto-update REJETÉE** (« sans solution pour le moment ») — le bandeau « màj dispo » reste le compromis.
- ✅ **B. Défis générés par le coach : APPROUVÉE** (« oui, pourquoi pas ») — « gagne 0,3 s secteur 4 », validation auto par les traces suivantes.
- ✅ **D. Heatmap communautaire des secteurs : APPROUVÉE** (« ça me va ») — depuis best_sectors, sur les pages circuit.
+ en réserve : [[idee-section-reglages]] (vraie UI de bibliothèque de réglages, tune_setups existe déjà).

**Why:** ne pas re-proposer C/F (rejetées), ne pas redemander le test hors-ligne (pas de wifi), savoir que B et D sont le chantier en cours.
**How to apply:** implémenter D (petite) puis B (grosse) ; mise en œuvre lancée le 14/07 par Claude Fixe.

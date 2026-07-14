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
- ✅ **B. Défis coach : LIVRÉE le 14/07 (commit 49d993e)** — table `coach_defis` (migration appliquée, RLS fermée, 1 défi actif/secteur/config par index unique partiel), API /api/defis (cible calculée SERVEUR : `lib/defisCoach.cibleDefi` = ~30 % de l'écart au meilleur secteur, borné [0,1 s ; 1 s], null si écart < 150 ms ; testée), validation auto dans POST /api/sectors (after(), garde anti-double-notif via update conditionnel), notif type 'defi', UI onglet Coach (bloc « Mes défis » + bouton par secteur). RESTE : vérif en réel par le proprio (créer un défi, le réussir en jeu).
- ✅ **D. Heatmap secteurs disputés : LIVRÉE le 14/07 (même commit)** — `lib/secteursDisputes` (écart max−min par secteur, testée), mode « 🔥 Secteurs disputés » sur la carte circuit (public, même déconnecté), bloc serveur indexable « Les secteurs les plus disputés » sur les pages circuit (SEO ; rendu vérifié en local sur le circuit 7). RESTE : coup d'œil du proprio.
- ⚠️ **BUG PROD TROUVÉ ET CORRIGÉ en route** : le CHECK `notifications.type` n'autorisait que exact/drivetrain/class → les notifs duel/objectif/rival échouaient EN SILENCE depuis leur création (0 ligne de ces types en base, inserts sans vérif d'erreur). Contrainte élargie en prod aux 7 types (+ 'defi'). Leçon : les inserts supabase-js ne lèvent PAS d'exception — toujours vérifier `error` sur les écritures qui comptent.
+ en réserve : [[idee-section-reglages]] (vraie UI de bibliothèque de réglages, tune_setups existe déjà).

**Why:** ne pas re-proposer C/F (rejetées), ne pas redemander le test hors-ligne (pas de wifi) ; B et D sont livrées, la roadmap juillet est soldée.
**How to apply:** au prochain retour du proprio, faire vérifier B (créer/réussir un défi) et D (mode 🔥 + bloc sous la carte) en réel.

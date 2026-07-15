---
name: feature-delta-live
description: "✅ LIVRÉ : delta live vs PB (#1 chaîne télémétrie), overlay relais par interpolation de la trace du PB (GET /api/traces, e1b2cfa). Releasé (relais v2.0.0 par le fixe, toujours présent en v3.6.0 où LiveDelta.fraction_courante alimente les annonces vocales). Détails d'implémentation ci-dessous."
metadata:
  node_type: memory
  type: project
  originSessionId: cae85036-f3e2-4180-a051-95649963b520
---

**#1 de la chaîne télémétrie** (après secteurs [[feature-secteurs]] et la trace fondatrice [[feature-trace-telemetrie]]). Overlay « DELTA LIVE vs PB » qui affiche en course l'écart instantané au **meilleur temps perso** (PB), à distance égale dans le tour.

**Côté SITE : déjà fait** (avant cette session) — `GET /api/traces` (commit e1b2cfa) renvoie la trace du PB du joueur sur la config exacte (`track_id+car_ordinal+car_class+drivetrain`) = `{lap_time_id, time_ms, sample_dist_m, point_count, samples}`, ou **204** si pas de PB/trace. Rien à ajouter côté serveur.

**Côté RELAIS : CODE ÉCRIT le 20/06** (sur le PC FIXE `RAPTIK-PC`, `relais_gui_v22.py`, `APP_VERSION="1.14.0"`, py_compile OK) :
- **`charger_trace_reference(track_id, car_ordinal, car_class, drivetrain, access_token)`** : GET /api/traces, renvoie le dict `samples` ou None. Best-effort.
- **Classe `LiveDelta`** : garde les tableaux `d`/`t` de la trace de réf ; suit le début de tour (`lap_start_dist`, détecté sur la chute de `current_lap_s`, **même logique que TraceRecorder**) ; `update(distance_m, current_lap_s)` renvoie l'écart en ms (positif = plus lent) par **interpolation linéaire dichotomique** de `t_ref` à la distance relative courante. None si pas de réf / hors plage / tout début de tour. Le suivi de `lap_start` tourne **même sans réf** pour que `rel` soit juste si la réf arrive en plein tour.
- **Overlay** : nouveau panneau « DELTA LIVE vs PB » (mode circuit uniquement, `lbl_delta_live`, vert si plus rapide / rouge si plus lent / « — » sinon). `_maj_delta_live(fields)` appelé à chaque paquet circuit (juste après `trace_recorder.update`) : charge la réf en **arrière-plan dès que la config voiture est connue** (et la recharge si la voiture change — la config voiture n'est PAS connue à la sélection du circuit, d'où le chargement live), puis affiche l'écart (throttle ~10/s, dédup texte). Remis à « — » hors course.
- **100 % lecture seule / best-effort** : n'altère jamais l'envoi du chrono. Dépend des offsets v1.13 (distance 292 + current_lap_s) ; si la trace de réf manque, le delta reste « — ».

**Testé** (logique d'interpolation, hors jeu) : trace de réf à vitesse constante, cas « au rythme » → 0, « +0,4s » → +400, « −0,25s » → −250, interpolation inter-points, reset de nouveau tour, hors plage → None. Tout conforme.

**RESTE (ordre) :**
1. ⚠️ **Valider les offsets en jeu** (mêmes que secteurs/trace : distance 292 + vitesse/etc.). Voir [[todo-proprio-delta-live]]. Tant que non validé, on ne release pas.
2. Une fois OK : **build + release relais v1.14.0** (`pyinstaller --onefile --noconsole --name BetterRivals`, puis `gh release create v1.14.0 dist/BetterRivals.exe --target main …` — `gh` présent sur le fixe) + **bump `/telecharger` v1.13.0→v1.14.0** (2 occurrences dans `app/telecharger/page.tsx`). Voir [[relais-serveur-et-rang]].

**Suite de la chaîne après ça** : #3 coach post-tour (analyse de la trace), puis #5 copilote de réglage. Voir [[roadmap-idees-juin-2026]].

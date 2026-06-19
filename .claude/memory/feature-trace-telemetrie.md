---
name: feature-trace-telemetrie
description: "Brique FONDATRICE télémétrie : capture de trace d'un tour (lap_traces) par le relais, échantillonnée par distance. Débloque #1 delta live, #3 coach, #5 copilote. LIVRÉE + DÉPLOYÉE 19/06 (migration appliquée, release relais v1.13.0). GET /api/traces (trace de réf = PB) FAIT (commit e1b2cfa). Reste : valider offsets en jeu + intégration relais du delta live (#1)"
metadata: 
  node_type: memory
  type: project
  originSessionId: cae85036-f3e2-4180-a051-95649963b520
---

**Brique fondatrice** de la télémétrie (la « capture de trace » décrite dans [[roadmap-idees-juin-2026]]). Une fois validée, elle débloque d'un coup #1 delta live, #3 coach post-tour, #5 copilote de réglage. Suite logique après #2 secteurs ([[feature-secteurs]]).

**Modèle** : le relais échantillonne chaque tour PAR DISTANCE (1 point / `SAMPLE_DIST_M`=12 m → ~quelques centaines de points), capture distance/temps/vitesse/accélérateur/frein/volant, et **envoie la trace du tour sur POST /api/traces uniquement quand c'est un nouveau meilleur temps**. Une trace par `lap_time` (upsert).

**Implémenté (code) le 19/06 — PAS encore commité côté relais (gitignoré) :**
- **DB** : `supabase/migrations/lap_traces.sql` → table `lap_traces` (id, `lap_time_id` uuid UNIQUE FK lap_times ON DELETE CASCADE, `sample_dist_m`, `point_count`, `samples` jsonb, created_at). RLS activée + `REVOKE ALL FROM anon, authenticated` (tout via API service role, comme duels). Index sur lap_time_id. ⚠️ **PAS encore appliquée** (pas de PAT management sur le portable) → **à lancer dans le SQL Editor**. Types ajoutés à `types/database.types.ts` (table `lap_traces`).
- **`samples`** = tableaux parallèles compacts : `{d:[m], t:[s], v:[km/h], thr:[0-100], brk:[0-100], str:[-100..100]}`. Le delta live n'utilisera que d+t ; v/thr/brk/str sont pour le coach.
- **API** `POST /api/traces` (`app/api/traces/route.ts`) : auth Bearer, rate-limit 30/min, `traceValide()` (lib/lap-validation : 6 tableaux même longueur 10→5000, finis, d+t monotones croissants), vérifie que le `lap_time_id` **appartient au joueur** (sinon 403), upsert `onConflict: lap_time_id`. `samples` casté `as unknown as Json`.
- **Relais** (`relais_gui_v21.py`, `APP_VERSION=1.13.0`) : classe `TraceRecorder` (alimentée à chaque paquet en mode circuit, comme `SectorTracker`). Offsets ajoutés (mêmes +12, ⚠ NON validés) : Speed 256 (m/s), Accel 315, Brake 316, Steer 320. Upload best-effort en thread dans `_traiter_reponse_succes` quand `is_new_record` + `trace_pour(best_s)` correspond (POST /api/traces avec le `lap_id` renvoyé par /api/times). Jamais bloquant. Simulé OK (481 points pour un tour de 6 km à 12 m).
- Build + tsc + eslint OK.

**FAIT** : ✅ `lap_traces.sql` appliquée par le proprio (19/06). ✅ **release relais v1.13.0 publiée** (19/06, buildée sur le portable, exe 14,5 Mo, latest pointe dessus, `/telecharger` bumpé v1.13.0 commit da17fba).

**RESTE :**
1. ⚠️ **Valider les offsets en jeu** (distance 292 + speed/accel/brake/steer). **Même validation que les secteurs** : si distance 292 est bon, la trace l'est aussi. Vérifier qu'une ligne `lap_traces` se crée après un record (mode circuit) et que les valeurs sont plausibles (vitesse, % accel/frein, point_count ≈ longueur/12).
2. **#1 delta live** : ✅ **GET /api/traces FAIT (19/06, commit e1b2cfa)** — auth Bearer + rate-limit, résout le joueur via token, renvoie la trace de son PB sur la config exacte (`track_id+car_ordinal+car_class+drivetrain`) = `{lap_time_id, time_ms, sample_dist_m, point_count, samples}` ; **204** si pas de PB ou pas de trace sur la config. RESTE côté **relais** (gitignoré) : appeler ce GET à la sélection de config, charger d+t de la trace de réf, et afficher l'overlay « +0,3s vs PB » par interpolation du temps de réf à distance égale (en course). Voir [[feature-secteurs]] pour la séquence brique.

**Pas encore fait** : l'intégration relais du delta live (#1, charge GET + overlay), et toute visualisation de trace côté site (coach #3).

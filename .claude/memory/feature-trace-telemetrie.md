---
name: feature-trace-telemetrie
description: "Brique FONDATRICE télémétrie : capture de trace d'un tour (lap_traces) par le relais, échantillonnée par distance. Débloque #1 delta live, #3 coach, #5 copilote. Fondation LIVRÉE (code) 19/06 ; reste : appliquer lap_traces.sql + valider offsets en jeu + release v1.13.0, PUIS bâtir delta live"
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

**RESTE À FAIRE :**
1. Appliquer `lap_traces.sql` dans le SQL Editor Supabase.
2. Build + release relais **v1.13.0** (bumper `/telecharger`). Procédure : [[relais-serveur-et-rang]].
3. ⚠️ **Valider les offsets en jeu** (distance 292 + speed/accel/brake/steer). En réalité, **la même validation que les secteurs** : si l'offset distance 292 est bon, la trace l'est aussi. Vérifier qu'une ligne `lap_traces` se crée après un record et que les valeurs sont plausibles (vitesse, % accel/frein).
4. **PUIS bâtir #1 delta live** : GET /api/traces (récupérer la trace de référence = PB du joueur sur la config), chargée par le relais à la sélection ; overlay « +0,3s vs PB » par interpolation du temps de référence à distance égale. Voir [[feature-secteurs]] pour la séquence brique.

**Pas encore fait (volontairement, séquencé)** : le GET de référence + l'overlay delta live (#1), et toute visualisation de trace côté site (coach #3).

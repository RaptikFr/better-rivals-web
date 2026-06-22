---
name: feature-coach-pilotage
description: "Brique télémétrie #3 (coach), PHASE 1 = coach de PILOTAGE (conduite, pas réglage). Rapport post-tour par secteur depuis lap_traces déjà stockées (d/t/v/thr/brk/str). Opt-in /paramètres (défaut OFF) → onglet 🧠 Coach dans /profil. GET /api/coach + lib/coachPilotage.ts (+tests). Build+lint+vitest OK. Phase 2 (copilote de RÉGLAGE) = plus tard, demandera d'étendre lap_traces"
metadata:
  node_type: memory
  type: project
---

Intégration au site du **coach** (idée #3 de [[roadmap-idees-juin-2026]]), décidée **phasée** avec le proprio le 22/06/2026 : **Phase 1 = coach de PILOTAGE** (conduite), **Phase 2 = copilote de RÉGLAGE** (le gros travail offline de [[coach-copilote-reglage]]).

**Pourquoi phasé (constat structurant)** : `lap_traces.samples` ne stocke que 6 canaux **légers** — `d` (distance), `t` (temps), `v` (vitesse), `thr` (gaz), `brk` (frein), `str` (volant). Le copilote de réglage (sous/survirage via β/température, amortisseurs via suspension, slip ratio…) a besoin de canaux **absents** de la trace. Donc :
- **Phase 1 (FAITE 22/06)** = ce qu'on peut tirer des données DÉJÀ là (pilotage). Aucun changement relais, aucune migration DB.
- **Phase 2 (PLUS TARD)** = étendre `lap_traces` avec slip/β/température/suspension + **re-release relais** + porter le diagnostic de [[coach-copilote-reglage]] côté serveur. Plus lourd (propagation relais lente).

## Phase 1 — livré le 22/06/2026 (build + lint + 23 tests vitest verts ; PAS encore commité au moment de l'écriture)

- **Opt-in** : `lib/preferences.ts` → préférence `coachReport: boolean` (défaut **false** = OFF, c'est l'exigence proprio « personne ne reçoit de conseils sans activer »). Sanitize + DEFAULT mis à jour. Section « Coach de pilotage » dans `app/parametres/ParametresClient.tsx` (toggle Activé/Désactivé).
- **Lib d'analyse** : `lib/coachPilotage.ts` (PUR, testé `coachPilotage.test.ts`, 4 tests). `analyserPilotage(trace, sectorsMs, bestMs[])` → par secteur (mêmes bornes que `secteursDepuisTrace` = fractions de d[last]) : Δ temps vs optimal, vitesse d'apex (min v), point de freinage (% du secteur), **roue libre** (% ni gaz ni frein), réaccélération (% où le plein gaz revient après la corde), + 1-2 conseils ancrés au secteur. Seuil `SEUIL_PERTE_MS=80` (on ne conseille un secteur que s'il coûte > 80 ms, anti-bruit). Renvoie `worstIndex` + `totalLossMs` (gain potentiel).
- **API** : `GET /api/coach?track_id&car_ordinal&car_class&drivetrain` (`app/api/coach/route.ts`). Auth **Bearer = access_token de session** (le client web envoie `supabase.auth.getSession().access_token`, vérifié par `supabaseAdmin.auth.getUser` — même mécanisme que /api/objectifs, /api/duels…). Service role car `lap_traces` est fermé à anon. Récupère le meilleur tour DU JOUEUR tracé sur la config (jointure interne `lap_traces`, comme GET /api/traces), ses `sectors_ms` (fallback `secteursDepuisTrace` si absent), les `best_sectors` de la config → `analyserPilotage` → JSON `{ time_ms, sectorsMs, heldByYou[], report }`. **204** si pas de tour tracé sur la config. Rate-limit 60/min.
- **UI** : onglet **🧠 Coach** dans `/profil` (`app/profil/CoachTab.tsx`), **conditionné à l'opt-in** (`visibleTabs = prefs.coachReport ? [...TABS, COACH_TAB] : TABS` dans `ProfilClient.tsx`, via `usePreferences`). Sélecteur de config (déduit des laps du joueur), synthèse (meilleur tour, gain potentiel, secteur prioritaire), cartes par secteur (Δ coloré, apex, freinage, roue libre, plein gaz, 🏅 si tu détiens le meilleur secteur, conseils 💡). Légende rappelant que les secteurs sont des tronçons ÉGAUX EN DISTANCE (pas les checkpoints du jeu).
- **Dark-launch** : opt-in OFF par défaut → pour les joueurs existants, rien ne change sauf le nouvel interrupteur dans /paramètres. Déploiement sans risque.

**RESTE Phase 1 (avant ou après déploiement)** : QA visuelle réelle (l'onglet n'a pas encore été vu rendu), affiner les seuils/formulations des conseils au besoin. **Éventuel +** : comparer la trace du joueur à celle du n°1 de la config (point de freinage/apex objectifs) — pour l'instant les conseils s'appuient sur best_sectors (temps) + heuristiques sur sa propre trace.

**Phase 2 (copilote de réglage)** : voir [[coach-copilote-reglage]] (proto offline `coach_diag.py` mûr). Demandera d'étendre `lap_traces` (slip angle/ratio, β=VelX/VelZ, yaw, température pneus @268-280, suspension) + re-release relais + portage TS du diagnostic 3 juges + leviers. Exigence proprio : 2e niveau d'opt-in « overlay en jeu » (relais) en plus du rapport site.

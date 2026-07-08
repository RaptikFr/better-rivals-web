---
name: optimisations-juillet-2026
description: Optimisations perf 08/07 — JWT local livré, index recorded_at appliqué, relais v3.2.4 (refresh token centralisé) releasé ; restent leadersFeed RPC + counts GROUP BY (futur)
metadata:
  type: project
---

**Livré le 08/07/2026** :
- Commit 242fdf7 : vérification LOCALE du JWT Supabase via `lib/auth-token.ts` (jose + JWKS ES256 public, repli réseau `auth.getUser`) dans les 16 routes API Bearer (~100-300 ms gagnées par requête relais) ; requêtes `/classements` (lap_times + best_sectors) parallélisées ; recalcul secteurs de POST /api/traces passé en `after()`. Le projet Supabase signe en **ES256** (JWKS : `/auth/v1/.well-known/jwks.json`), anon key au nouveau format `sb_publishable_...`. Vérifié en prod (accueil 200, /api/times 200, token bidon → 401).
- Index `idx_lap_times_recorded_at` appliqué (PAT renouvelé). Audit live : base minuscule (181 lap_times, ~2 Mo), rien d'anormal.
- **Relais v3.2.4 releasée** (fichier `relais_gui_v324.py`, [[relais-serveur-et-rang]]) : renouvellement de token CENTRALISÉ — `_rafraichir_session` (verrou + dédup < 30 s, ne rejoue jamais un refresh_token déjà tourné) + `_requete_autorisee` (401 → refresh → rejeu) utilisée par TOUS les envois de l'overlay : chrono, trace, secteurs, coach-reports, géométrie, delta live (`charger_trace_reference` module absorbée par `OverlayWindow._charger_trace_ref`). Mécanisme testé hors jeu (4 scénarios mockés OK). Build PyInstaller + release GitHub (fallback PowerShell pour l'upload d'asset : urllib timeout sur 15 Mo, `Invoke-RestMethod -InFile` vers uploads.github.com marche) + /telecharger bumpé (commit 156d3a9). ⚠️ **Test en jeu prévu par le proprio le soir du 08/07** — vérifier avec lui au prochain échange.

**Reste à faire (futur, seulement si le site grossit)** :
- `lib/leadersFeed.ts` télécharge TOUT lap_times + lap_times_history à chaque recalcul (60 s) → migrer en RPC Postgres.
- `fetchCarsWithTimes` (carRankings) et `fetchIndexableCircuits` (circuitRankings) téléchargent toutes les lignes juste pour compter → RPC `GROUP BY`.

**Why:** éviter de re-analyser ; le gros du code était déjà optimisé (ne pas re-proposer ce qui est fait).
**How to apply:** si la base grossit ou que le proprio parle de lenteur → attaquer leadersFeed en premier.

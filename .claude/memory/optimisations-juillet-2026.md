---
name: optimisations-juillet-2026
description: Optimisations perf juillet — JWT local, index recorded_at, refresh token centralisé, et 13/07 leadersFeed RPC + counts GROUP BY livrés — PLUS RIEN en attente
metadata:
  type: project
---

**Livré le 08/07/2026** :
- Commit 242fdf7 : vérification LOCALE du JWT Supabase via `lib/auth-token.ts` (jose + JWKS ES256 public, repli réseau `auth.getUser`) dans les 16 routes API Bearer (~100-300 ms gagnées par requête relais) ; requêtes `/classements` (lap_times + best_sectors) parallélisées ; recalcul secteurs de POST /api/traces passé en `after()`. Le projet Supabase signe en **ES256** (JWKS : `/auth/v1/.well-known/jwks.json`), anon key au nouveau format `sb_publishable_...`. Vérifié en prod (accueil 200, /api/times 200, token bidon → 401).
- Index `idx_lap_times_recorded_at` appliqué (PAT renouvelé). Audit live : base minuscule (181 lap_times, ~2 Mo), rien d'anormal.
- **Relais v3.2.4 releasée** (fichier `relais_gui_v324.py`, [[relais-serveur-et-rang]]) : renouvellement de token CENTRALISÉ — `_rafraichir_session` (verrou + dédup < 30 s, ne rejoue jamais un refresh_token déjà tourné) + `_requete_autorisee` (401 → refresh → rejeu) utilisée par TOUS les envois de l'overlay : chrono, trace, secteurs, coach-reports, géométrie, delta live (`charger_trace_reference` module absorbée par `OverlayWindow._charger_trace_ref`). Mécanisme testé hors jeu (4 scénarios mockés OK). Build PyInstaller + release GitHub (fallback PowerShell pour l'upload d'asset : urllib timeout sur 15 Mo, `Invoke-RestMethod -InFile` vers uploads.github.com marche) + /telecharger bumpé (commit 156d3a9). ⚠️ **Test en jeu prévu par le proprio le soir du 08/07** — vérifier avec lui au prochain échange.

- **Relais v3.2.5 releasée** (même jour, remplace la v3.2.4 comme release courante) : skins du site suivis automatiquement ([[feature-skins-relais]]). Le test en jeu du soir du 08/07 couvre les DEUX versions (skin visible au login + refresh token sur session > 1 h).

**Livré le 13/07/2026** (commit 000088d, migration `nouveaux_leaders_et_counts_rpc.sql` appliquée en prod via Management API) :
- RPC `nouveaux_leaders_feed(p_limit)` : rejeu chronologique des records en SQL (window functions min/lag, même algo que `computeLeaderChanges`), résultat vérifié IDENTIQUE à la prod avant bascule. `lib/leadersFeed.ts` = simple mapper.
- RPC `car_time_counts()` / `track_time_counts()` : compteurs GROUP BY (listes voitures/circuits, sitemap).
- ⚠️ `computeLeaderChanges` reste utilisé par `weeklyRecap` et `leaderStats` (téléchargement complet, mais rarement sollicités) — candidats si on veut finir le chantier un jour.

**Why:** éviter de re-analyser ; le gros du code était déjà optimisé (ne pas re-proposer ce qui est fait). Le chantier « télécharger tout puis agréger en Node » est CLOS pour les chemins chauds.
**How to apply:** ne plus proposer d'optimisation DB sauf plainte de lenteur ; les 3 RPC sont typées dans `types/database.types.ts` (section Functions).

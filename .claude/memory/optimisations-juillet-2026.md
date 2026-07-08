---
name: optimisations-juillet-2026
description: Optimisations perf 08/07 — JWT local (lib/auth-token.ts) livré ; restent leadersFeed RPC, counts GROUP BY, index recorded_at à appliquer
metadata:
  type: project
---

**Livré le 08/07/2026 (commit 242fdf7)** : vérification LOCALE du JWT Supabase via `lib/auth-token.ts` (jose + JWKS ES256 public, repli réseau `auth.getUser`) dans les 16 routes API Bearer (~100-300 ms gagnées par requête relais) ; requêtes `/classements` (lap_times + best_sectors) parallélisées ; recalcul secteurs de POST /api/traces passé en `after()`. Le projet Supabase signe en **ES256** (JWKS : `/auth/v1/.well-known/jwks.json`), anon key au nouveau format `sb_publishable_...`.

**Reste à faire (identifié à l'analyse, non traité)** :
- `lib/leadersFeed.ts` télécharge TOUT lap_times + lap_times_history à chaque recalcul (60 s) → migrer en RPC Postgres (le commentaire du fichier le prévoit déjà).
- `fetchCarsWithTimes` (carRankings) et `fetchIndexableCircuits` (circuitRankings) téléchargent toutes les lignes juste pour compter → RPC `GROUP BY`.
- Migration `index_recorded_at.sql` créée mais PAS appliquée ([[acces-supabase-pat]] expiré).
- Relais : refresh token sur 401 seulement dans `_envoyer` (chrono) — traces/secteurs/coach-reports échouent en silence si le token expire entre deux chronos ; centraliser dans un wrapper HTTP.

**Why:** éviter de re-analyser ; le gros du code était déjà optimisé (ne pas re-proposer ce qui est fait).
**How to apply:** si la base grossit ou que le proprio parle de lenteur → attaquer leadersFeed en premier.

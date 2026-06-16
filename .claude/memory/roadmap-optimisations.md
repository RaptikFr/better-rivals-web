---
name: roadmap-optimisations
description: Pistes d'optimisation/amélioration du site issues de l'audit du 2026-06-16 (perf, SEO contenu, maintenabilité)
metadata:
  type: project
---

Audit technique du 2026-06-16. Constat : base saine (next/image partout, 0 `any`, APIs avec cache `s-maxage=60`, loading/error states). Pistes classées par impact/effort. Voir aussi [[seo]].

## 🥇 Accueil en server components — ✅ FAIT le 2026-06-16
`app/page.tsx` est `async`, récupère les données serveur (cachées 60 s) et les passe en props à `DerniersChronos`/`NouveauxLeaders` (qui restent client pour `usePreferences`, formatage temps/dates). Contenu désormais dans le HTML prérendu ; accueil = statique + ISR 1 min. Libs : `lib/leadersFeed.ts` (extraction depuis la route API, réutilisée par /api/nouveaux-leaders + page) et `lib/derniersChronos.ts`.

## 🥈 Uniformiser la récupération des données — ✅ FAIT (avec le 🥇)
`DerniersChronos` ne tape plus Supabase en direct côté navigateur : il reçoit ses données du fetch serveur caché (`lib/derniersChronos.ts`). Reste à vérifier si d'autres composants client tapent Supabase directement sans cache (ex. dans les pages `/classement-general`, `/stats`, `/profil` — la plupart passent par des API cachées).

## 🥉 Lazy-load recharts — ✅ DÉJÀ FAIT (constaté 2026-06-16)
Faux positif de l'audit initial : `recharts` est déjà isolé dans `app/profil/LapTimeChart.tsx` et chargé via `next/dynamic` (`ssr: false` + loading) dans `ProfilClient.tsx`. Il n'est donc pas dans le bundle initial. Rien à faire.

## 🛠️ Découper les gros fichiers client — ✅ FAIT le 2026-06-16
ProfilClient 1297 → 549 l. (profilShared.tsx, SuiviTab.tsx, ProfilTabs.tsx) ; ClassementsClient 1145 → 685 l. (classementsShared.tsx + RankingViews.tsx pour les vues tableau/cartes). Comportement inchangé, tsc/eslint/build OK.

## 💡 SEO de contenu (ambitieux) — À FAIRE
- Rendre `/classements` indexable côté serveur (noms voitures/circuits/temps absents du HTML aujourd'hui) → viser des recherches « meilleur temps [voiture] Forza Horizon 6 ». *Impact SEO potentiellement fort, effort élevé.*
- Pages dédiées par circuit / par voiture avec URL indexable (contenu long tail).

**How to apply :** livrer petit, garder `eslint .` → 0 (cf. [[lint-zero-warning]]) et `tsc` OK. Vérifier le rendu via `next build` (l'absence de `RESEND_API_KEY` en local n'empêche pas le build).

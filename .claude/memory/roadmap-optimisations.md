---
name: roadmap-optimisations
description: Pistes d'optimisation/amélioration du site issues de l'audit du 2026-06-16 (perf, SEO contenu, maintenabilité)
metadata:
  type: project
---

Audit technique du 2026-06-16. Constat : base saine (next/image partout, 0 `any`, APIs avec cache `s-maxage=60`, loading/error states). Pistes classées par impact/effort. Voir aussi [[seo]].

## 🥇 Accueil en server components — EN COURS / FAIT le 2026-06-16
Problème : tout le contenu dynamique est récupéré via `useEffect`+`fetch` avec `return null` pendant le chargement → HTML initial vide (mauvais pour SEO + flash). Cible : `DerniersChronos` et `NouveauxLeaders` reçoivent leurs données en props depuis `app/page.tsx` (server component), data fetchée serveur + cachée. Formatage temps/dates reste client (`usePreferences`).

## 🥈 Uniformiser la récupération des données — À FAIRE
`components/DerniersChronos.tsx` tape **Supabase en direct depuis le navigateur** (aucun cache, chaque visiteur frappe la DB), alors que `NouveauxLeaders` passe par `/api/nouveaux-leaders` caché 60 s. Uniformiser via API cachée ou fetch serveur. *Impact moyen, effort faible.* (Largement traité si le 🥇 est fait.)

## 🥉 Lazy-load recharts — À FAIRE
`recharts` n'est utilisé que sur `/profil` (`app/profil/LapTimeChart.tsx` + `ProfilClient.tsx`) mais alourdit le bundle. Le charger via `next/dynamic` (`ssr: false`) le sort du chargement initial. *Impact moyen sur /profil, effort faible.*

## 🛠️ Découper les gros fichiers client — À FAIRE
`app/profil/ProfilClient.tsx` (~1296 lignes) et `app/classements/ClassementsClient.tsx` (~1144) sont monolithiques. Les scinder en sous-composants pour la maintenabilité. *Impact faible court terme.*

## 💡 SEO de contenu (ambitieux) — À FAIRE
- Rendre `/classements` indexable côté serveur (noms voitures/circuits/temps absents du HTML aujourd'hui) → viser des recherches « meilleur temps [voiture] Forza Horizon 6 ». *Impact SEO potentiellement fort, effort élevé.*
- Pages dédiées par circuit / par voiture avec URL indexable (contenu long tail).

**How to apply :** livrer petit, garder `eslint .` → 0 (cf. [[lint-zero-warning]]) et `tsc` OK. Vérifier le rendu via `next build` (l'absence de `RESEND_API_KEY` en local n'empêche pas le build).

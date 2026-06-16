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

## 💡 SEO de contenu (ambitieux) — À FAIRE, PLAN VALIDÉ le 2026-06-16
Objectif : ressortir sur la longue traîne (« meilleur temps [voiture] FH6 », « classement [circuit] FH6 »). `/classements` est interactif → contenu chargé client, invisible pour Google, pas d'URL stable par circuit/voiture.

**Approche retenue : créer des pages serveur dédiées, NE PAS refondre /classements** (laissé comme outil interactif).

Données : table `tracks` (id, name, length_km, type, is_official, is_sprint, status='approved', PAS de colonne slug) ; `cars` (id, manufacturer, name, year, car_ordinal). Modèle de route : `/joueurs/[pseudo]` (page serveur + generateMetadata + client).

- **Phase 1 — pages circuits : ✅ FAIT le 2026-06-16.** `app/circuits/page.tsx` (index), `app/circuits/[slug]/page.tsx` (SSG via generateStaticParams + ISR 5 min + generateMetadata + OG /api/og/classement + redirection canonique du slug), `lib/circuitRankings.ts` (getApprovedCircuits / getCircuitRanking / getIndexableCircuits, cachés ; slug `{id}-{kebab}` ; MIN_TIMES_INDEXABLE=3). sitemap.ts async (+ /circuits + circuits ≥3 temps, noindex sinon). Lien « Circuits » ajouté à la Navbar. DiscordTag passé en "use client". Build : 27 → 114 pages statiques.
- **Phase 2 — pages voitures : ✅ FAIT le 2026-06-16.** `/voitures/[slug]` (`{ordinal}-{marque-modèle}`), meilleurs temps tous circuits groupés par circuit→config, SSG+ISR+canonical. `lib/carRankings.ts` (getCarRanking/getCarsWithTimes/getIndexableCars, clé=car_ordinal) + `lib/carSlug.ts` (helpers PURS, importables client). Catalogue /voitures : modèles avec car_ordinal → liens vers leur page (maillage). sitemap : + voitures ≥3 temps. Build : 114 → 146 pages.
- **Phase 3 — maillage élargi : ✅ FAIT le 2026-06-16.** sitemap async (circuits+voitures), Navbar « Circuits », /voitures→pages voitures, page voiture→pages circuits, et /classements→page circuit dédiée (quand un circuit est sélectionné). Slug circuit extrait dans `lib/circuitSlug.ts` (module pur, importable client ; circuitRankings le ré-exporte). Footer non ajouté (pas de footer sur le site, choix non fait). **SEO de contenu : les 3 phases sont livrées.**

**Qualité :** exclure du sitemap + noindex les pages < 3 temps (anti contenu mince) ; ISR pour la fraîcheur ; pseudos déjà publics, discord déjà masqué via discord_tag_public. **Risques :** renommage circuit → redirection 301 via l'id ; catalogue voitures volumineux → éventuellement dynamicParams + cache au lieu de tout prégénérer. **Effort :** P1 ~½ j, P2 ~2-3 h, P3 ~1-2 h ; livrer phase par phase, eslint 0 warning. Suivre l'indexation dans Search Console après mise en ligne.

**How to apply :** livrer petit, garder `eslint .` → 0 (cf. [[lint-zero-warning]]) et `tsc` OK. Vérifier le rendu via `next build` (l'absence de `RESEND_API_KEY` en local n'empêche pas le build).

---
name: seo
description: État du SEO du site — audit et corrections livrés le 2026-06-16
metadata:
  type: project
---

Audit SEO complet livré le 2026-06-16 (objectif : ressortir sur Google pour « Better Rivals FH6 »). LIVRÉ et poussé sur main :
- `<h1>` unique avec mots-clés (Better Rivals FH6, Forza Horizon 6) + JSON-LD `WebSite` sur l'accueil (`app/page.tsx`).
- `app/sitemap.ts` (convention Next 16, servi à `/sitemap.xml`) listant les 12 pages publiques ; pages privées exclues.
- `app/robots.ts` (servi à `/robots.txt`) : crawl autorisé, `/admin /parametres /profil /api/` exclus, pointe le sitemap.
- `lib/site.ts` : URL canonique unique (better-rivals-fh6.org), réutilisée par layout/sitemap/robots. Voir [[domaine-et-resend]].
- Métadonnées (`generateMetadata`) déjà présentes sur la plupart des pages avant l'audit.

L'utilisateur a soumis le sitemap à **Google Search Console**. Plus rien à coder ; l'indexation est désormais une affaire de patience (jours→semaines).

**Métadonnées dédiées `/connexion` et `/inscription` : ABANDONNÉ** (décision user 2026-06-16) — intérêt SEO nul (pages auth qu'on ne veut pas indexer), elles héritent du défaut du layout. Ne pas reproposer.

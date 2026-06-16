# Mémoire — Better Rivals Web

- [Autonomie sans demande d'autorisation](autonomie-pas-de-demande-autorisation.md) — agir directement (modifs, commits, push, installs) sans demander
- [Lint zéro warning](lint-zero-warning.md) — viser `eslint .` → 0 ; règle react-hooks/set-state-in-effect = disables ciblés justifiés
- [Panneau d'options /parametres](idee-panneau-options.md) — v1 LIVRÉE (thème, format temps/dates, densité, animations) ; pistes DB-bound restantes pour v2
- [Roadmap améliorations juin 2026](roadmap-ameliorations-juin-2026.md) — les 6 pistes sont FAITES et la migration RPC (point 5) est appliquée en prod ; plus rien en attente
- [Feature couleurs d'accent](feature-couleurs-accent.md) — LIVRÉE : option couleurs d'accentuation (pink-violet/red-green/blue-yellow) via remap palette Tailwind v4 sur <html> ; build+lint OK
- [État déploiement v2](etat-deploiement-v2.md) — features v2 livrées le 15 juin : 4 migrations appliquées + tout poussé sur main (df20aae). Plus rien en attente
- [Domaine & Resend](domaine-et-resend.md) — RÉSOLU : domaine canonique better-rivals-fh6.org partout ; domaine vérifié dans Resend, e-mails OK. Plus rien en attente
- [SEO](seo.md) — LIVRÉ (16 juin) : h1 accueil, sitemap.ts, robots.ts, JSON-LD, lib/site.ts. Sitemap soumis à Google Search Console
- [Roadmap optimisations](roadmap-optimisations.md) — perf/SEO-contenu/maintenabilité (16 juin) : 🥇 accueil server components ✅ + 🥈 uniformiser fetch ✅ ; 🥉 lazy-load recharts déjà fait ; RESTE : découpe gros fichiers (ProfilClient/ClassementsClient), SEO contenu /classements

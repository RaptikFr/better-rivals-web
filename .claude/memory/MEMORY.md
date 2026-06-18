# Mémoire — Better Rivals Web

- [Autonomie sans demande d'autorisation](autonomie-pas-de-demande-autorisation.md) — agir directement (modifs, commits, push, installs) sans demander
- [Lint zéro warning](lint-zero-warning.md) — viser `eslint .` → 0 ; règle react-hooks/set-state-in-effect = disables ciblés justifiés
- [Panneau d'options /parametres](idee-panneau-options.md) — v1 + v2 + contraste a11y LIVRÉS et déployés. Plus rien en attente
- [Roadmap améliorations juin 2026](roadmap-ameliorations-juin-2026.md) — les 6 pistes sont FAITES et la migration RPC (point 5) est appliquée en prod ; plus rien en attente
- [Feature couleurs d'accent](feature-couleurs-accent.md) — LIVRÉE : option couleurs d'accentuation (pink-violet/red-green/blue-yellow) via remap palette Tailwind v4 sur <html> ; build+lint OK
- [État déploiement v2](etat-deploiement-v2.md) — features v2 livrées le 15 juin : 4 migrations appliquées + tout poussé sur main (df20aae). Plus rien en attente
- [Domaine & Resend](domaine-et-resend.md) — RÉSOLU : domaine canonique better-rivals-fh6.org partout ; domaine vérifié dans Resend, e-mails OK. Plus rien en attente
- [SEO](seo.md) — LIVRÉ (16 juin) : h1 accueil, sitemap.ts, robots.ts, JSON-LD, lib/site.ts. Sitemap soumis à Google Search Console
- [Idée section Réglages](idee-section-reglages.md) — à explorer plus tard : vraie UI des réglages (tune_setups existe déjà en base + API POST) au lieu du simple code de partage ; à accrocher aux pages voiture
- [Relais serveur & rang](relais-serveur-et-rang.md) — le relais Python EST sur ce PC (`relais_gui_v21.py`, GITIGNORÉ) ; procédure build/release documentée ; release v1.11.0 publiée le 18/06 (objectifs + 🎯 relais)
- [Features site juin 2026](features-site-juin-2026.md) — 4 features livrées le 17/06 ; récap hebdo ACTIVÉ (cron vercel.json + CRON_SECRET défini côté Vercel)
- [Roadmap idées juin 2026](roadmap-idees-juin-2026.md) — idées site/relais validées le 18/06 (brique télémétrie → secteurs/delta/coach/copilote, réglage du n°1, tune library, duels, config semaine, webhook Discord, écuries, check version relais) ; saisons + détection circuit ABANDONNÉES ; départ = réglage du n°1
- [Roadmap optimisations](roadmap-optimisations.md) — perf/SEO-contenu/maintenabilité (16 juin) : 🥇 accueil server components ✅ + 🥈 uniformiser fetch ✅ ; 🥉 recharts + 🛠️ découpe gros fichiers faits ; SEO contenu PHASES 1 (/circuits) + 2 (/voitures) + 3 (maillage) TOUTES ✅. Roadmap optimisations entièrement livrée

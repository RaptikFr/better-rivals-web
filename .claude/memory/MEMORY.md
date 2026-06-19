# Mémoire — Better Rivals Web

- [Identification machine](identification-machine.md) — portable vs fixe via `$env:COMPUTERNAME` (portable = `PC-RENAUD`) ; crucial car le relais est gitignoré (risque divergence)
- [Feature secteurs](feature-secteurs.md) — brique télémétrie #2 : temps par secteurs + tour théorique. Forza n'expose PAS les checkpoints → reconstruits par distance (N variable). Code LIVRÉ 19/06 ; reste : appliquer migration `secteurs.sql` + valider offset 292 en jeu + release relais v1.12.0

- [Autonomie sans demande d'autorisation](autonomie-pas-de-demande-autorisation.md) — agir directement (modifs, commits, push, installs) sans demander
- [Lint zéro warning](lint-zero-warning.md) — viser `eslint .` → 0 ; règle react-hooks/set-state-in-effect = disables ciblés justifiés
- [Panneau d'options /parametres](idee-panneau-options.md) — v1 + v2 + contraste a11y LIVRÉS et déployés. Plus rien en attente
- [Roadmap améliorations juin 2026](roadmap-ameliorations-juin-2026.md) — les 6 pistes sont FAITES et la migration RPC (point 5) est appliquée en prod ; plus rien en attente
- [Feature couleurs d'accent](feature-couleurs-accent.md) — LIVRÉE : option couleurs d'accentuation (pink-violet/red-green/blue-yellow) via remap palette Tailwind v4 sur <html> ; build+lint OK
- [État déploiement v2](etat-deploiement-v2.md) — features v2 livrées le 15 juin : 4 migrations appliquées + tout poussé sur main (df20aae). Plus rien en attente
- [Domaine & Resend](domaine-et-resend.md) — RÉSOLU : domaine canonique better-rivals-fh6.org partout ; domaine vérifié dans Resend, e-mails OK. Plus rien en attente
- [SEO](seo.md) — LIVRÉ (16 juin) : h1 accueil, sitemap.ts, robots.ts, JSON-LD, lib/site.ts. Sitemap soumis à Google Search Console
- [Idée section Réglages](idee-section-reglages.md) — à explorer plus tard : vraie UI des réglages (tune_setups existe déjà en base + API POST) au lieu du simple code de partage ; à accrocher aux pages voiture
- [Relais serveur & rang](relais-serveur-et-rang.md) — relais Python `relais_gui_v21.py` (GITIGNORÉ, fixe+portable) ; **release v1.11.2 publiée 19/06 depuis le PORTABLE (#13 check version, exe 14,5 Mo)** ; ⚠️ **portable = copie à jour (v1.11.2), FIXE EN RETARD (v1.11.1)** → recopier avant d'éditer sur le fixe ; `gh` absent du portable → release via fallback Python/requests + git credential (sandbox désactivé) ; v1.11.0/v1.11.1 testées OK
- [Features site juin 2026](features-site-juin-2026.md) — 4 features livrées le 17/06 ; récap hebdo ACTIVÉ (cron vercel.json + CRON_SECRET défini côté Vercel)
- [Roadmap idées juin 2026](roadmap-idees-juin-2026.md) — LIVRÉ : réglage n°1 + bibliothèque réglages (+modale) + **pack social complet (#8 duels, #9 config semaine, #10 webhook Discord)** + **#13 check version relais (v1.11.2, 19/06)**. RESTE : brique télémétrie (secteurs→delta→coach→copilote), #4 régularité, #12 écuries. Pack social = ACTIVÉ EN PROD (migrations appliquées+vérifiées, DISCORD_WEBHOOK_URL posée local+Vercel, test 204 OK). Saisons + détection circuit ABANDONNÉES
- [Roadmap optimisations](roadmap-optimisations.md) — perf/SEO-contenu/maintenabilité (16 juin) : 🥇 accueil server components ✅ + 🥈 uniformiser fetch ✅ ; 🥉 recharts + 🛠️ découpe gros fichiers faits ; SEO contenu PHASES 1 (/circuits) + 2 (/voitures) + 3 (maillage) TOUTES ✅. Roadmap optimisations entièrement livrée

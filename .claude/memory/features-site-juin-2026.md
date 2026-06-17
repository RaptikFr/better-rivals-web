---
name: features-site-juin-2026
description: 4 features site livrées le 17 juin ; récap hebdo email construit mais PAS encore activé en prod
metadata:
  type: project
---

Lot de 4 améliorations site livrées et poussées le 17 juin 2026 (après le `<<perf relais>>`) :

1. **Stats — « Batailles de leaders »** : config la plus disputée + plus gros écart de détrônage du mois (`lib/leaderStats.ts`, exposé via `/api/stats`).
2. **Comparateur joueurs** : existait déjà (`/comparaison`) ; rendu **partageable** via `?j1=&j2=` + bouton « ⚔️ Comparer » sur les profils.
3. **Image OG dynamique du profil** : `app/joueurs/[pseudo]/opengraph-image.tsx` (next/og). Complète l'OG `/api/og/classement` préexistant.
4. **Récap hebdo email opt-in** : `lib/weeklyRecap.ts` + `/api/cron/weekly-recap`.

**⚠️ Récap hebdo PAS encore actif en prod — 3 étapes manuelles restantes :**
- Appliquer la migration `supabase/migrations/recap_hebdomadaire.sql` (colonne opt-in `notify_weekly`, défaut false, + grants par colonne).
- Définir l'env `CRON_SECRET` (sans lui, l'endpoint répond 401 → rien ne part).
- Brancher un planificateur qui appelle `GET /api/cron/weekly-recap` avec header `Authorization: Bearer <CRON_SECRET>` (pas de `vercel.json` dans le repo ; choix hébergement/cadence à décider). Tester d'abord avec `?dry=1` (liste les destinataires sans envoyer).

Opt-in **dédié** voulu par l'utilisateur : case « Recevoir le récap hebdomadaire », distincte de `email_notifications_enabled`. Voir [[relais-serveur-et-rang]].

**Suite (17 juin, commit 99b273f) :**
- **Gestion des notifications déplacée** de `/profil` vers `/parametres` (composant `components/NotificationSettings.tsx`) ; le profil ne garde qu'un lien.
- **⚠️ Sync cross-device des préférences cassée en prod** : le code (`hooks/usePreferences.tsx`) écrit bien `players.preferences`, mais l'utilisateur constate des réglages différents entre 2 PC du même compte. Cause quasi certaine : la migration **`supabase/migrations/preferences_sync.sql` (colonne + grants par colonne) n'a jamais été appliquée** en prod → l'écriture échoue en silence. **À FAIRE : exécuter ce SQL dans Supabase.** Les échecs sont maintenant loggués en `console.warn` pour confirmer.

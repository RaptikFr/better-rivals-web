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

**Récap hebdo — état au 17/06 soir :** migration `recap_hebdomadaire.sql` APPLIQUÉE ✅ ; planificateur Vercel Cron en place (`vercel.json`, lundi 18:00 UTC, commit b75b00b). **Reste UNIQUEMENT : définir l'env `CRON_SECRET` sur Vercel** (sans lui l'endpoint répond 401 → rien ne part ; Vercel injecte ce Bearer automatiquement dans ses appels cron). Tester avec `GET /api/cron/weekly-recap?dry=1` + `Authorization: Bearer <secret>` (liste sans envoyer).

Opt-in **dédié** voulu par l'utilisateur : case « Recevoir le récap hebdomadaire », distincte de `email_notifications_enabled`. Voir [[relais-serveur-et-rang]].

**Suite (17 juin, commit 99b273f) :**
- **Gestion des notifications déplacée** de `/profil` vers `/parametres` (composant `components/NotificationSettings.tsx`) ; le profil ne garde qu'un lien.
- **Sync cross-device des préférences** : était cassée car la migration `preferences_sync.sql` (colonne `preferences` + grants par colonne) n'était pas appliquée → écriture silencieusement rejetée. **SQL APPLIQUÉE le 17/06 soir ✅** → devrait désormais synchroniser (au login, la base prime sur le local). NB : 2 PC avec prefs locales divergentes → le 1er qui sauvegarde après coup peuple la base, l'autre s'aligne au reload. Échecs éventuels loggués en `console.warn` dans `hooks/usePreferences.tsx`.

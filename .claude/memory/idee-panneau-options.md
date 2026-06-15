---
name: idee-panneau-options
description: "Panneau de préférences /parametres — v1 LIVRÉE le 2026-06-15 (thème, format temps/dates, densité, animations) ; reste des pistes DB-bound non faites"
metadata: 
  node_type: memory
  type: project
  originSessionId: a5640525-f5aa-459a-8a49-f2fd4bbc3cb9
---

## ✅ v1 LIVRÉE (2026-06-15, commit `feat(parametres)`)
Page **`/parametres`** + `hooks/usePreferences` (Context React adossé à **localStorage**, préférences par appareil, sans compte) + `lib/preferences` (types/défauts/sanitize). Réglages câblés dans tous les composants d'affichage des temps (classements, profil, joueur, stats, comparaison, DerniersChronos, NouveauxLeaders, LapTimeChart) :
- **Thème** : clair / sombre / **système** (next-themes `enableSystem` activé ; le toggle Navbar reste une bascule rapide via `resolvedTheme`).
- **Format des temps** : `1:23.456` vs `83.456 s` + **séparateur décimal** `.` / `,` (`formatTime(ms, {style, decimalSep})`).
- **Densité des tableaux** : confortable / compact (classe `.density-compact` sur `<html>`, CSS `:is(td,th)` resserre le padding vertical).
- **Format des dates** : relatif / absolu (`lib/dateAbsolute`).
- **Réduire les animations** (a11y) : classe `.reduce-motion` sur `<html>`.
Lien **⚙️ Paramètres** dans la Navbar (desktop + mobile). `eslint .` → 0, `tsc` OK. NB : `app/api/times` casse le `next build` faute de `RESEND_API_KEY` en local — pré-existant, sans rapport.

## ✅ v2 LIVRÉE (2026-06-15)
Le user a validé « les quatre » fonctionnalités DB-bound + UI. Toutes codées (commits du 15 juin, voir [[etat-deploiement-v2]] pour l'état de push/migrations) :
- **Notifications par type** : 4 colonnes `notify_*` sur players + gardes dans /api/times + panneau dans /profil.
- **Masquer son tag Discord** : colonne générée `discord_tag_public` (vraie confidentialité) + RPC `my_discord_tag` + toggle profil.
- **Sync cross-device** : `players.preferences jsonb`, réconciliation à la connexion dans `usePreferences` (DB prime, sinon push local).
- **Colonnes / police** : taille de police globale (classe `text-scale-large`) + colonnes masquables de la vue tableau des classements (section dans /parametres).
- Au passage (point 4) : taille de police = a11y ; rate limiting Upstash (repli mémoire) ; RPC `general_ranking`.

## Pistes restantes (anciennes notes — la plupart faites en v2 ci-dessus)
Points qui touchent la DB :

## Pistes de réglages proposées (à valider avec lui)
- **Nb de décimales** des temps (pour l'instant fixé à 3) — facile à ajouter à `formatTime`.
- **Colonnes visibles** dans les classements (PC) : PI, transmission, tag Discord, rivaux — pouvoir masquer celles dont on ne veut pas (plus lourd : touche le rendu de chaque tableau).
- **Notifications** : granularité par type (exact / transmission / classe / rival) au lieu du seul toggle email actuel (colonne `email_notifications_enabled` sur `players`) → **DB-bound**.
- **Accessibilité** : taille de police / contraste (en plus du « réduire les animations » déjà livré).
- **Confidentialité** : masquer son tag Discord publiquement → **DB-bound**.
- **Sync cross-device** pour les connectés : colonne `preferences jsonb` sur `players` (comme `email_notifications_enabled`) au lieu du seul localStorage → **DB-bound** (nécessite migration).

**Why:** Le user veut laisser chaque pilote adapter l'affichage à son écran/ses goûts, surtout sur PC où les tableaux sont denses.

**How to apply:** v1 (affichage en localStorage) livrée. Pour la v2, cadrer avec lui les pistes DB-bound ci-dessus (migration `players.preferences jsonb` + chargement via [[usePlayer]] ou équivalent). Garder 0 warning (cf. [[lint-zero-warning]]) et livrer petit comme la [[roadmap-ameliorations-juin-2026]].

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Autorisations Git

Tu es autorisé à créer des commits Git sur ce projet avec un message décrivant les modifications. Regroupe les changements d'une même session en un seul commit cohérent, sauf si les modifications sont clairement indépendantes.

Tu es également autorisé à pousser vers GitHub (git push) après chaque commit, sans demander confirmation.

---

## Commandes

```bash
npm run dev        # serveur de développement (Next.js)
npm run build      # build de production
npm run lint       # ESLint (cible : 0 warning — règle react-hooks/set-state-in-effect = disable ciblé justifié)
npm run typecheck  # tsc --noEmit
npm run test       # vitest run (tests unitaires dans lib/)
```

---

## Architecture

### Vue d'ensemble

**Better Rivals FH6** est une plateforme de classements alternatifs pour Forza Horizon 6 (égalité à voiture identique). Stack : Next.js 16.2 App Router · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + auth + RLS) · Vitest · Vercel.

Le flux central est : **Relais Python (UDP Forza → HTTP)** → `/api/times` → `lap_times` → triggers notifs + classements. Le relais poste aussi les traces (télémétrie) et les diagnostics de réglage.

### Structure des pages (`app/`)

Pattern systématique : **page.tsx async server component** (metadata, prefetch) + **un Client component** (`*Client.tsx`) pour l'interactivité. Les pages publiques (classements, voitures, circuits) sont rendues côté serveur avec `supabaseAdmin` ; les pages personnelles (profil, duels, objectifs) chargent côté client via les API routes.

Pages notables : `/profil` (onglets : Récents, Tous, Suivi, Classements, Rivaux, Stats, Coach, Copilote — les deux derniers requièrent opt-in `coachReport`), `/classements`, `/joueurs/[pseudo]`, `/voitures/[slug]`, `/circuits/[slug]`.

### Base de données Supabase

**Tables centrales :**

| Table | Rôle |
|---|---|
| `lap_times` | Cœur : un chrono par (player, track, car_ordinal, car_class, drivetrain). Contient `sectors_ms[]`. |
| `lap_traces` | Trace sparse d'un tour (JSON : d/t/v/thr/brk/str/temps pneus optionnels). Relation 1:1 avec lap_times. |
| `best_sectors` | Meilleur secteur par index pour une config (tous joueurs) — construit le « tour optimal ». |
| `coach_reglage_reports` | Diagnostics compacts de réglage postés par le relais (survirage, amortisseurs…). |
| `players` | Compte utilisateur + préférences JSON cross-device. |
| `duels` | Défi challenger vs opponent sur une config, avec deadline. |
| `objectifs` | Objectif personnel : battre le PB d'un autre joueur sur une config. |

**RLS :** `lap_times`, `players` = lecture publique. `lap_traces`, `duels`, `objectifs`, `coach_reglage_reports` = fermés (service role only via API routes avec vérif JWT Bearer).

### API routes (`app/api/`)

Points d'entrée du relais Python et du frontend :

- **`/api/times`** — POST nouveau chrono (validation, notifs, insertion) ; GET meilleurs temps d'un circuit (RPC).
- **`/api/traces`** — POST trace d'un tour (recalcule `sectors_ms` + alimente `best_sectors`) ; GET trace de référence (delta live).
- **`/api/coach`** — GET rapport coach pilotage par secteur (Bearer JWT requis).
- **`/api/coach-reports`** — POST/GET/DELETE diagnostics de réglage du relais.
- **`/api/duels`**, **`/api/objectifs`** — CRUD social.
- **`/api/cron/weekly-recap`** — Job hebdomadaire (cron Vercel, `CRON_SECRET`).

### Libs métier (`lib/`)

- **`lap-validation.ts`** — Logique pure de validation (temps plausibles vs longueur circuit, validation trace JSON, reconstruction des secteurs depuis la trace). **Couvert par tests.**
- **`coachPilotage.ts`** — Analyse post-tour : `analyserPilotage(trace, sectorsMs, bestMs)` découpe la trace en secteurs égaux en distance, calcule apex/freinage/roue libre/réaccélération et produit des conseils. `analyseThermique(trace)` pour l'équilibre AV/AR. **Couvert par tests.**
- **`*Rankings.ts`** (`carRankings`, `circuitRankings`, `playerRankings`) — Calculs de classements avec `unstable_cache` Next.js pour les pages serveur.
- **`best-sectors.ts`** — Enregistrement du meilleur secteur par index/config après chaque trace.
- **`preferences.ts`** — Type `Preferences` (skins, densité, format temps/date, contraste, coachReport…) synchronisé entre localStorage et `players.preferences`.

### Hooks (`hooks/`)

- **`useAuth`** — Session Supabase. Optimisé : `onAuthStateChange` ne met à jour l'état que si `user.id` change réellement (sinon Supabase ré-émet à chaque retour de focus d'onglet, ce qui relancerait tous les effets dépendants).
- **`usePlayer`** — Profil du joueur courant (compose `useAuth` + fetch DB).
- **`usePreferences`** — Contexte React des préférences. Applique des classes CSS sur `<html>` (`skin-*`, `density-*`, `accent-*`, etc.). Source de vérité pour l'affichage des temps (`formatTime`).

### Télémétrie

Le relais Python capture l'UDP Forza et poste :
1. Le chrono (`/api/times`) — déclenche classements + notifs + détection objectifs atteints.
2. La trace du tour (`/api/traces`) — débloque coach pilotage, delta live, tour optimal.
3. Les diagnostics de réglage (`/api/coach-reports`) — agrégés par config dans l'onglet Copilote.

Les secteurs sont des **tranches égales en distance** (N = max(5, min(20, round(km/1.5)))), pas les checkpoints Forza. Chaque `SectorCoaching` expose `startM`/`endM` en mètres depuis le départ pour localiser les conseils.

### Instances Claude sur ce projet

Ce projet est édité depuis deux machines. Chaque instance Claude a un surnom :
- **Claude Portable** — `PC-RENAUD` (portable). Pas de `gh`, releases via fallback Python/requests.
- **Claude Fixe** — `RAPTIK-PC` (fixe). `gh` disponible, tests en jeu possibles.

Auto-détection : `$env:COMPUTERNAME`. Le relais Python (`relais_gui_v300.py`) est **gitignoré** et synchronisé via OneDrive — toujours faire `git fetch` avant d'éditer sur le portable (Claude Fixe pousse sur origin).

### Conventions notables

- **Format temps** : contrôlé par `usePreferences().formatTime(ms)` — ne jamais formater directement avec `formatTime` de `components/formatTime.ts` dans un client component qui utilise les préférences.
- **Accès Supabase** : `supabase` (anon, client) dans les composants client ; `supabaseAdmin` (service role) uniquement dans `app/api/` et les server components.
- **Lint zéro warning** : les `eslint-disable` sont autorisés uniquement sous forme ciblée et justifiée (pattern `// eslint-disable-next-line react-hooks/set-state-in-effect -- raison`).
# Better Rivals FH6

Classements alternatifs pour **Forza Horizon 6** : chaque classement isole une
configuration exacte (même voiture, même classe, même transmission) pour que
seul le pilotage fasse la différence.

Site : <https://better-rivals-fh6.org>

## Fonctionnement

```
Forza (UDP « Sortie de données »)
   └─▶ Relais Windows (BetterRivals.exe, Python)
          ├─ POST /api/times          chrono → classements, notifications, objectifs
          ├─ POST /api/traces         trace du tour → coach, delta live, tour optimal
          ├─ POST /api/coach-reports  diagnostics de réglage → onglet Copilote
          └─ POST /api/torque-curves  courbe moteur (Banc moteur) → onglet Moteur
```

Le relais n'est pas dans ce dépôt (gitignoré, synchronisé à part). Les joueurs le
téléchargent depuis `/telecharger`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Supabase (Postgres, Auth, RLS, Realtime) · Vitest · Vercel (hébergement + cron).

> Next.js 16 a des changements incompatibles avec les versions précédentes : la
> documentation de référence est celle embarquée dans `node_modules/next/dist/docs/`.

## Démarrer en local

Prérequis : Node.js 20+ (LTS).

```bash
npm install
cp .env.example .env.local   # puis renseigner au minimum les 3 variables Supabase
npm run dev                  # http://localhost:3000
```

Toutes les variables sont documentées dans [`.env.example`](.env.example). Seules
les variables Supabase sont obligatoires : e-mails (Resend), captcha (Turnstile),
rate-limit partagé (Upstash), cron et Discord se désactivent proprement si leurs
clés sont absentes.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint — objectif **0 warning** |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Tests unitaires Vitest (`lib/**/*.test.ts`) |

## Organisation du code

| Dossier | Contenu |
|---|---|
| `app/` | Pages (un `page.tsx` serveur + un `*Client.tsx` interactif) et routes API (`app/api/`) |
| `components/` | Composants partagés (carte du circuit, replay, navbar…) |
| `lib/` | Logique métier pure et testée (validation des chronos, coach, classements, notifications…) |
| `hooks/` | `useAuth`, `usePlayer`, `usePreferences`, `useNotifications` |
| `supabase/migrations/` | Schéma SQL versionné — **appliqué à la main** (voir son [README](supabase/migrations/README.md)) |
| `types/` | Types Supabase (`database.types.ts`) |

Conventions détaillées (accès Supabase, format des temps, règles de lint…) :
voir [`CLAUDE.md`](CLAUDE.md).

## Base de données

Les migrations ne sont pas jouées automatiquement : chaque fichier de
`supabase/migrations/` s'applique dans **Supabase → SQL Editor**. Les fonctions
RPC récentes ont un repli côté code, donc l'ordre déploiement / migration est
libre ; le README des migrations indique comment vérifier ce qui est appliqué.

## Déploiement

Vercel, à chaque push sur `main`. Le cron hebdomadaire (`vercel.json`) appelle
`/api/cron/weekly-recap` le dimanche à 18 h UTC, protégé par `CRON_SECRET`.

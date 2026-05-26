---
name: project-better-rivals
description: Contexte du projet Better Rivals — stack, architecture, travaux effectués
metadata:
  type: project
---

Better Rivals est un site de leaderboard pour Forza Horizon 6 basé sur la télémétrie UDP. Les joueurs lancent un relais Windows (BetterRivals.exe) qui capte les données de jeu et les envoie à l'API.

**Stack :** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Supabase (auth + base de données)

**Structure clé :**
- `app/api/times/route.ts` — reçoit les chronos du relais UDP, valide le temps par rapport à la longueur du circuit, enregistre en base
- `app/api/circuits/route.ts` — liste les circuits approuvés
- `app/api/votes/route.ts` — gestion des votes communauté
- `app/api/epreuves/route.ts` — soumission d'épreuves communauté
- `app/classements/ClassementsClient.tsx` — leaderboard avec filtres serveur (circuit, classe, transmission) + filtre voiture côté client
- `lib/supabase.ts` — client Supabase (clés via variables d'environnement uniquement)
- `hooks/useAuth.ts` — hook d'authentification Supabase

**Variables d'environnement (.env.local, exclu du git) :**
- `NEXT_PUBLIC_SUPABASE_URL` — URL du projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clé publishable (sb_publishable_...)
- `SUPABASE_SERVICE_ROLE_KEY` — clé secrète serveur (sb_secret_...)

**Travaux effectués (session mai 2026) :**
- npm install (node_modules manquait)
- Correction des erreurs TypeScript : React.FormEvent → SyntheticEvent, catch (err) → catch
- Suppression des clés Supabase codées en dur dans lib/supabase.ts
- Refactorisation ClassementsClient : filtres circuit/classe/transmission déclenchent une requête Supabase, filtre voiture reste côté client

**Why:** Leaderboard équitable par modèle de voiture exact — pas de comparaison inter-voitures.
**How to apply:** Comprendre que chaque combinaison circuit+classe+transmission+voiture est un classement distinct.

---
name: feature-couleurs-accent
description: LIVRÉE le 2026-06-15 — option de choix des couleurs d'accentuation du site (pink-violet par défaut, red-green, blue-yellow)
metadata:
  type: project
---

**LIVRÉ le 2026-06-15** : les 4 étapes ci-dessous ont toutes été codées. `lib/preferences.ts` (type `Accent` + défaut `'pink-violet'` + `pick` dans sanitize), `app/globals.css` (classes `.accent-red-green` / `.accent-blue-yellow` remappant les nuances 50→950 de pink/violet vers red/green et blue/amber), `hooks/usePreferences.tsx` (toggle des classes sur `<html>`), `app/parametres/ParametresClient.tsx` (Segmented dans « Apparence »). Vérifié : build prod OK, lint 0 warning, et le CSS compilé confirme que les utilitaires référencent `var(--color-pink-*)`/`var(--color-violet-*)` et que les palettes cibles existent. **FOUC non traité** (pattern useEffect identique à la densité, accepté par le propriétaire) — si le flash d'accent gêne au rechargement, ajouter le script inline (voir caveat plus bas). Historique de la conception ci-dessous.

Fonctionnalité demandée le 2026-06-15 : permettre à l'utilisateur de **choisir les couleurs d'accentuation** du site. Actuellement tout l'accent est rose → violet (`from-pink-500 to-violet-600`, `text-pink-400`, etc., ~147 occurrences sur 26 fichiers). Exemples de paires voulus par l'utilisateur : rouge+vert, bleu+jaune.

**Approche validée (test de compilation Tailwind fait, concluant) :**
Tailwind v4.3.1 — les utilitaires de couleur référencent des variables CSS : `.text-pink-500 { color: var(--color-pink-500) }`, et les palettes par défaut (red/green/blue/amber…) sont émises dans `:root`. Donc **pas besoin de toucher les 147 occurrences** : on remappe les palettes `pink` et `violet` sous une classe sur `<html>`, et tout le site se recolore (y compris les modificateurs d'opacité `/20` qui passent par `color-mix`).

**Étapes restantes (rien n'est encore codé) :**
1. `lib/preferences.ts` : ajouter `accent: 'pink-violet' | 'red-green' | 'blue-yellow'` (défaut `'pink-violet'`) + l'ajouter dans `sanitizePreferences` (via `pick`). Voir le pattern déjà utilisé pour [[idee-panneau-options]].
2. `app/globals.css` : définir `.accent-red-green { --color-pink-50: var(--color-red-50); … --color-pink-950 ; --color-violet-*: var(--color-green-*) }` et `.accent-blue-yellow { pink→blue, violet→amber }`. Remapper les nuances 50→950 (référencer les vars cibles, pas de hex en dur). Le défaut pink-violet = aucune override.
3. `hooks/usePreferences.tsx` : dans le `useEffect` qui pose déjà `density-compact` / `reduce-motion` sur `document.documentElement`, ajouter le toggle des classes `accent-red-green` / `accent-blue-yellow` selon `prefs.accent`.
4. `app/parametres/ParametresClient.tsx` : ajouter un contrôle dans la section « Apparence » (Segmented ou pastilles de couleur) pour `prefs.accent`.

**Caveats à mentionner à l'utilisateur :**
- Quelques usages *sémantiques* du violet seront aussi remappés : écart « précédent » (`text-violet-400`) dans les classements, badges de [[BadgesBar]], `TypeBadge`. Acceptable pour un changement d'accent global, mais à signaler (risque de collision avec le vert « écart suivant » si accent = vert).
- FOUC possible : `usePreferences` applique la classe en `useEffect` (après montage), comme la densité. Si flash gênant, ajouter un script inline dans `app/layout.tsx` (façon next-themes) pour poser la classe avant le paint.

Lié à [[idee-panneau-options]] (panneau /parametres) et [[lint-zero-warning]] (viser eslint 0).

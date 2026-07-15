---
name: todo-claude-fixe
description: "Passation pour Claude sur RAPTIK-PC (PC fixe) : git pull des DEUX repos + procédure pour avoir accès aux dossiers better-rivals-web ET OneDrive\\Relais (commits/push) + état au 13/07 (v3.6.0, features 🆚 et 🔊 à tester en jeu)."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5e957a61-7ff4-44b8-bcce-e7e5561ef620
---

**À LIRE EN PREMIER si tu es sur RAPTIK-PC.** Note refaite par Claude Portable le 13/07/2026 (l'ancienne version, périmée — v3.0.0/v3.2.0 —, est dans l'historique git).

## 1. Synchroniser les DEUX repos

```powershell
git pull                                          # repo web (cwd)
git -C "$env:OneDrive\Relais" pull                # repo relais (privé, dans OneDrive)
```

⚠️ Le relais est désormais un repo git (`RaptikFr/better-rivals-relais`) : le `.git` synchronise AUSSI par OneDrive, donc après un pull sur une machine l'autre voit déjà les commits — mais fais quand même le pull pour être sûr d'être sur le bon HEAD.

## 2. Donner à Claude Fixe l'accès aux deux dossiers (demande du proprio, 13/07)

Objectif : travailler comme Claude Portable — éditer/committer/pousser dans le repo web ET dans `OneDrive\Relais` depuis la même session.

1. **Lancer Claude Code dans le repo web** (il reste le dossier principal : mémoire, CLAUDE.md, settings y vivent).
2. **Ajouter le dossier du relais comme répertoire de travail supplémentaire** :
   - pour la session : taper `/add-dir C:\Users\<user>\OneDrive\Relais` (vérifier le chemin exact avec `echo $env:OneDrive` — le nom d'utilisateur diffère du portable) ;
   - en PERMANENT (recommandé) : dans `.claude\settings.local.json` du repo web (fichier local à la machine, non versionné), ajouter/fusionner :
     ```json
     {
       "permissions": {
         "additionalDirectories": ["C:\\Users\\<user>\\OneDrive\\Relais"]
       }
     }
     ```
   Ça couvre les outils fichiers (Read/Edit/Write) sans prompt.
3. **git dans le relais** : les commandes passent par le shell (`git -C "$env:OneDrive\Relais" add/commit/push`) — au premier prompt, choisir « Toujours autoriser », ou ajouter des règles `allow` dans le même settings.local.json (c'est ainsi que l'accès s'est construit sur le portable).
4. Les push utilisent le Git Credential Manager déjà configuré ; `gh` est dispo sur le fixe (releases plus simples que le fallback Python du portable).

Pas besoin de capture d'écran du proprio : la demande est claire (accès aux deux dossiers pour commits + push).

## 3. État au 13/07 — à tester EN JEU (le portable est headless)

Retour proprio 15/07 (au portable) :

1. **Relais v3.5.0 — file d'attente hors-ligne** : ⏳ PAS testée. Couper tout le réseau est exclu (filaire + le jeu passerait hors ligne). Procédure proposée 15/07 : bloquer SEULEMENT l'exe du relais par pare-feu (`New-NetFirewallRule -Direction Outbound -Program <exe> -Action Block`, admin), rouler un tour (« 💾 chrono sauvegardé » + `chronos_en_attente.json`), puis `Remove-NetFirewallRule` → envoi auto. Le jeu reste en ligne. Test optionnel, retour attendu.
2. **Relais v3.6.0 — annonces vocales 🔊** : ✅ FONCTIONNE en jeu (confirmé au fixe puis au portable le 15/07).
3. **Site — mode 🆚 « Trace vs trace »** : ✅ FONCTIONNE connecté.
4. **Régularité (onglet Stats)** : ✅ TROUVÉE et FONCTIONNE (15/07). (C'est le dernier bloc en bas de l'onglet 📊 Stats de /profil.)

## 3bis. REPRISE 15/07 — heatmap secteurs (idée D) quasi finie sur le portable

Le proprio a tranché le 15/07 : C (Web Push) et F (auto-update) ÉCARTÉES définitivement, D (heatmap) choisie, B (défis coach) conditionnelle — voir [[roadmap-idees-juillet-2026]].

**D est LIVRÉE et commitée** (commit `4e9375b`, poussé après rebase) : `lib/sectorHeatmap.ts` (logique pure, 7 tests) + `lib/circuitHeatmap.ts` (fetch anon + unstable_cache 5 min) + `app/circuits/[slug]/SecteursHeatmap.tsx` (bande « 🔥 Où se joue la différence » par config, rampe séquentielle pink VALIDÉE dataviz clair ET sombre : clair 400→600→800→950, sombre 800→700→500→400, ancre inversée) + intégration page circuit + bannière annonce bumpée (`2026-07-heatmap-secteurs`). Vérifié : 94 tests, lint 0 warning, typecheck, build, rendu réel contrôlé en SOMBRE sur /circuits/7-circuit-de-l-autoroute (screenshot headless, nickel).

**RESTE (petit, à faire au prochain démarrage)** :
1. Le tout dernier fix (espace insécable « 2 pilotes » dans SecteursHeatmap.tsx, commité) n'a PAS été re-vérifié en rendu — recharger une page circuit et relire la phrase « Plus gros écart ».
2. Contrôle visuel du mode CLAIR jamais fait (le thème est piloté par next-themes via la classe `.dark`, le headless anonyme rend le sombre) — basculer le thème dans le navigateur et vérifier la bande. La rampe claire est déjà validée par le script dataviz, c'est une formalité.
3. Vercel déploie le push : vérifier en prod au passage.

## 4. Reste au long cours

- Idées non tranchées : voir [[roadmap-idees-juillet-2026]] (C push web recommandée en premier). Ne pas pousser, attendre le choix du proprio.
- Découpe du relais (4 400 lignes) en modules : envisagée, plutôt à faire sur le fixe, à l'occasion d'un gros chantier.

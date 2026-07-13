---
name: todo-claude-fixe
description: "Passation pour Claude sur RAPTIK-PC (PC fixe) : git pull des DEUX repos + procédure pour avoir accès aux dossiers better-rivals-web ET OneDrive\\Relais (commits/push) + état au 13/07 (v3.6.0, features 🆚 et 🔊 à tester en jeu)."
metadata:
  type: project
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

Trois livraisons du 13/07, aucune vérifiée en conditions réelles :

1. **Relais v3.5.0 — file d'attente hors-ligne** : couper le réseau juste après un tour → message « 💾 chrono sauvegardé » → au retour du réseau (ou relance), le chrono part seul (`chronos_en_attente.json` apparaît puis disparaît à côté de l'exe).
2. **Relais v3.6.0 — annonces vocales 🔊** : cocher la case sur l'écran de sélection, rouler sur une config avec PB tracé → à chaque secteur la voix Windows annonce le delta (« moins 2 dixièmes »), « Nouveau record ! » sur PB. Vérifier : volume/rythme OK par-dessus le jeu, pas de PowerShell fantôme après fermeture (Task Manager).
3. **Site — mode 🆚 « Trace vs trace »** (connecté) : carte d'un circuit où 2 pilotes ont une trace → bouton 🆚 → tracé coloré rose/violet, infobulle delta + vitesses.

## 4. Reste au long cours

- Idées non tranchées : voir [[roadmap-idees-juillet-2026]] (C push web recommandée en premier). Ne pas pousser, attendre le choix du proprio.
- Découpe du relais (4 400 lignes) en modules : envisagée, plutôt à faire sur le fixe, à l'occasion d'un gros chantier.

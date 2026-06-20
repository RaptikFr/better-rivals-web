---
name: roadmap-idees-juin-2026
description: "Roadmap site/relais (19/06). LIVRÉ : #6 réglage n°1, #7 bibliothèque réglages+modale, pack social complet (#8 duels, #9 config semaine, #10 webhook Discord), #13 check version relais (release v1.11.2). RESTE : brique télémétrie (secteurs→delta→coach→copilote), #4 régularité, #12 écuries. Relais v1.11.0/v1.11.1 testés OK, v1.11.2 publiée (check version). Pack social activé en prod"
metadata: 
  node_type: memory
  type: project
  originSessionId: cae85036-f3e2-4180-a051-95649963b520
---

Idées de features validées avec l'utilisateur le 18/06/2026 (il les a toutes commentées positivement). **Abandonnées : saisons/archives et détection auto du circuit** (ne pas reproposer). Tout le reste est à conserver.

## ⏸️ ÉTAT AU 18/06 (pause demandée — reprise sur PC fixe)

**✅ LIVRÉ & déployé :** #6 Réglage du n°1 · #7 Bibliothèque de réglages `/reglages` + modale Partager/revendiquer · **Pack social complet (#8 duels, #9 config de la semaine, #10 webhook Discord)** poussé le 18/06. (Plus tôt ce jour : feature **Objectifs à battre** 🎯 site+relais, release relais **v1.11.0**.)

**✅ RELAIS v1.11.0 TESTÉ OK** (proprio, sur le fixe). **Release v1.11.1 publiée le 19/06** (objectifs plus visibles : 🎯 sur les circuits dans la sélection + panneau « 🎯 OBJECTIF » vs « 🏁 RIVAL » en course) — rebuildée + publiée par Claude via `gh`. Reste à tester quand pratique : les 2 nouveautés v1.11.1. Voir [[relais-serveur-et-rang]].

**✅ PACK SOCIAL ACTIVÉ EN PROD (18/06) :**
- Les 2 migrations sont **appliquées et vérifiées** en base (par Claude via l'API de management : `weekly_config` 8 cols + `duels` 13 cols, RLS active, grants anon/auth vides). Réseau sandboxé → appel fait avec sandbox désactivé ; PAT lu depuis `~/.claude.json` (config MCP). Voir [[acces-supabase-mcp]].
- `DISCORD_WEBHOOK_URL` **posée en local + Vercel** (redeploy fait), salon dédié — **test réel envoyé et confirmé (HTTP 204)**. ⚠️ sur Vercel l'URL doit être SANS guillemets (en `.env.local` Next.js les retire seul).
- Reste optionnel côté proprio : aller dans **/admin → ⭐ Config de la semaine** poser la 1re config (liste des configs ayant des temps, triées par nb de pilotes) pour inaugurer le défi hebdo.

**📋 RESTE À FAIRE (ordre suggéré) :**
1. **Brique télémétrie** (gros chantier structurant) → **#2 secteurs = CODE LIVRÉ le 19/06** (voir [[feature-secteurs]] ; reste : appliquer migration `secteurs.sql` + valider offset distance 292 en jeu + release relais v1.12.0). Forza n'expose PAS de checkpoint → secteurs reconstruits par distance, N variable (min 5). Suite : **#1 delta live** → **#3 coach** → **#5 copilote réglage**. Détails brique ci-dessous.
2. ~~**Pack social**~~ : **LIVRÉ le 18/06** (#8 duels, #9 config de la semaine, #10 webhook Discord — voir actions propriétaire ci-dessus).
3. **#4 score de régularité** (dépend de la brique télémétrie / multi-tours).
4. **#12 écuries/équipes** (plutôt quand la communauté grandit).
5. ~~**#13 vérification de version du relais**~~ : **LIVRÉ le 19/06 (release relais v1.11.2)** — voir [[relais-serveur-et-rang]].
6. (Optionnel) **formulaire de valeurs détaillées du réglage** sur `/reglages` — bloqué par 3 décisions non tranchées, voir [[idee-section-reglages]].

Détail de chaque idée ci-dessous.

**🧱 Brique fondatrice — capture de trace télémétrique** : **CODE LIVRÉ le 19/06** (voir [[feature-trace-telemetrie]]). Table `lap_traces` + `POST /api/traces` + `TraceRecorder` relais (échantillonnage par distance 12 m : distance/temps/vitesse/accel/frein/volant ; upload au nouveau record). Reste : appliquer `lap_traces.sql` + release relais v1.13.0 + valider offsets en jeu. **Séquence logique : secteurs ✅ → [trace ✅ code] → delta live (#1, PROCHAIN) → coach → copilote.**

Idées (numérotation d'origine conservée) :
1. **Delta live vs fantôme (PB ou rival)** — overlay relais « +0,3s vs PB » à distance égale, depuis une trace de référence. **CODE RELAIS ÉCRIT le 20/06 (v1.14.0), pas encore release (attend validation offsets en jeu)** — vs le PB pour l'instant. Voir [[feature-delta-live]]. *« pourquoi pas, à voir l'intégration »*.
2. **Temps par secteurs + tour théorique** (somme des meilleurs secteurs) — 1er livrable de la brique, le plus simple. *« j'aime beaucoup »*.
3. **Coach post-tour** — analyse trace : freinage tôt/tard, patinage, sous/survirage → rapport. *« j'adore »*.
4. **Score de régularité** — variance entre tours + badge « métronome ». *« oui »*.
5. **Copilote de réglage** — mêmes symptômes que le coach mappés vers des DIRECTIONS de réglage (« assouplis l'antiroulis avant »…). PAS un auto-tune (Forza n'expose pas le tune en télémétrie, le relais ne peut pas écrire de réglage). *« oui, un copilote »*.
6. **⭐ Réglage du n°1 — LIVRÉ (18/06, commit 571cc55)** : ligne « 🔧 Réglage du n°1 » sous l'en-tête de chaque config (toujours visible même replié), code copiable + auteur crédité. Composant `LeaderTuneCell` dans `classementsShared`, câblé dans `RankingViews` (vues tableau + cartes) ; `setup_author` ajouté au select de `ClassementsClient` (partagé avec classements-communauté).
7. **Bibliothèque de réglages — LIVRÉE (18/06, commit fcd28d7)** : page `/reglages` (source hybride `tune_setups` + `share_code` dérivés des `lap_times`, dédup par `car_ordinal`, meilleur temps + nb pilotes + auteur revendiqué/le plus rapide). `lib/reglages.ts` (cache 5 min, service role), page server + `ReglagesClient` (recherche, filtres classe/transmission/⭐originaux, tri pertinence/rapides/utilisés, cartes code copiable). Liens Navbar + Footer. **Volontairement NON fait : le formulaire de valeurs détaillées du réglage** (les 3 points non validés de [[idee-section-reglages]]) + la modale « Partager/revendiquer un réglage » (LIVRÉE 18/06, commit 7a3a71e : `ShareTuneModal` — sélection voiture type-ahead, code, libellé, case ⭐ original ; POST /api/tune-setups ; ajout optimiste + toast) + d'éventuels votes (le classement se fait sur le meilleur temps obtenu, signal objectif). Voir [[idee-section-reglages]].
8. **Duels — LIVRÉ (18/06)** : table `duels` (migration `duels.sql`, RLS fermée), `lib/duels.ts` (DuelView), `/api/duels` (GET reçus+envoyés avec temps live/écart/meneur + RÉSOLUTION PARESSEUSE des duels échus → winner_id + notifs ; POST défi sur sa propre config, anti-doublon miroir ; PATCH accept/decline/cancel). `ChallengeButton` ⚔️ à côté de `TargetButton` (classements + profils). Page `/duels` + `DuelsClient` (sections reçus/en cours/envoyés/terminés, écart live + temps restant). Vainqueur = meilleur temps des deux à la date limite (défaut 7 j). Pas de cron : résolution au prochain GET d'un des deux joueurs.
9. **Config de la semaine — LIVRÉ (18/06)** : table `weekly_config` (migration `config_semaine.sql`), `lib/configSemaine.ts` (config active = now ∈ fenêtre, classement = temps avec `recorded_at` dans la fenêtre, service role), page `/config-semaine` (server dynamic, classement médaillé + badge 👑), `/api/admin/config-semaine` (GET active+candidates triées par nb pilotes, POST pose) + onglet admin « ⭐ Config de la semaine ». L'admin choisit parmi les configs ayant déjà des temps. **NB sémantique** : un joueur doit (re)poser un temps PENDANT la fenêtre pour figurer au classement de la semaine.
10. **Discord webhook — LIVRÉ (18/06)** : `lib/discord.ts` (`annoncerNouveauLeaderDiscord`, best-effort, embed rose) branché en `after()` dans le bloc « niveau 1 » de `notifierRecordBattu` (`POST /api/times`) = à chaque nouveau nº1 sur config exacte. URL via `DISCORD_WEBHOOK_URL` (no-op si absent). Pas de config en base, pas d'UI.
12. **Écuries/équipes** — table `crews`, adhésion par code, classement d'équipe = somme des points (réutilise le RPC classement général groupé par écurie), tag écurie sur profil. *« comment intégrer ? »* — pertinent quand la communauté grandit.
13. **Vérification de version du relais** (PAS un auto-updater : l'utilisateur a signalé le risque antivirus du download+remplacement d'exe). Au lancement, le relais compare sa version à la dernière release GitHub → bandeau « v1.12 dispo → [télécharger] ». Simple check, pas de download auto.

Voir [[relais-serveur-et-rang]] (procédure build/release) et [[features-site-juin-2026]].

---
name: roadmap-idees-juin-2026
description: Roadmap d'idées site/relais validées le 18/06 (télémétrie, réglages, social) ; #6 réglage du n°1 + #7 bibliothèque de réglages LIVRÉS
metadata:
  type: project
---

Idées de features validées avec l'utilisateur le 18/06/2026 (il les a toutes commentées positivement). **Abandonnées : saisons/archives et détection auto du circuit** (ne pas reproposer). Tout le reste est à conserver.

**🧱 Brique fondatrice — capture de trace télémétrique** (débloque 1+2+3+5 d'un coup) : le relais lit déjà ~60 Hz mais ne garde que le chrono. Idée : échantillonner **par distance** (~1 point/10-15 m, qq centaines de points/tour) → vitesse, accélérateur, frein, volant, glisse, temps écoulé. Stockage : table `lap_traces` (JSON compressé) liée au `lap_time`, envoyée par le relais sur un nouvel endpoint au nouveau record. **Séquence logique : secteurs → delta live → coach → copilote.**

Idées (numérotation d'origine conservée) :
1. **Delta live vs fantôme (PB ou rival)** — overlay relais « +0,3s vs PB » à distance égale, depuis une trace de référence. Dépend de la brique. *« pourquoi pas, à voir l'intégration »*.
2. **Temps par secteurs + tour théorique** (somme des meilleurs secteurs) — 1er livrable de la brique, le plus simple. *« j'aime beaucoup »*.
3. **Coach post-tour** — analyse trace : freinage tôt/tard, patinage, sous/survirage → rapport. *« j'adore »*.
4. **Score de régularité** — variance entre tours + badge « métronome ». *« oui »*.
5. **Copilote de réglage** — mêmes symptômes que le coach mappés vers des DIRECTIONS de réglage (« assouplis l'antiroulis avant »…). PAS un auto-tune (Forza n'expose pas le tune en télémétrie, le relais ne peut pas écrire de réglage). *« oui, un copilote »*.
6. **⭐ Réglage du n°1 — LIVRÉ (18/06, commit 571cc55)** : ligne « 🔧 Réglage du n°1 » sous l'en-tête de chaque config (toujours visible même replié), code copiable + auteur crédité. Composant `LeaderTuneCell` dans `classementsShared`, câblé dans `RankingViews` (vues tableau + cartes) ; `setup_author` ajouté au select de `ClassementsClient` (partagé avec classements-communauté).
7. **Bibliothèque de réglages — LIVRÉE (18/06, commit fcd28d7)** : page `/reglages` (source hybride `tune_setups` + `share_code` dérivés des `lap_times`, dédup par `car_ordinal`, meilleur temps + nb pilotes + auteur revendiqué/le plus rapide). `lib/reglages.ts` (cache 5 min, service role), page server + `ReglagesClient` (recherche, filtres classe/transmission/⭐originaux, tri pertinence/rapides/utilisés, cartes code copiable). Liens Navbar + Footer. **Volontairement NON fait : le formulaire de valeurs détaillées du réglage** (les 3 points non validés de [[idee-section-reglages]]) + la modale « Partager/revendiquer un réglage » (l'API `POST /api/tune-setups` existe déjà, à brancher en v1.1) + d'éventuels votes (le classement se fait sur le meilleur temps obtenu, signal objectif). Voir [[idee-section-reglages]].
8. **Duels** — étendre les objectifs 🎯 : *envoyer* un défi à un joueur (notif déjà en place), vainqueur déterminé auto. *« j'aime bien »*.
9. **Config de la semaine** — combo voiture+classe+circuit mise en avant, page filtrant les temps sur cette config + fenêtre 7 j, badge au gagnant. *« à voir comment proposer »*.
10. **Discord webhook** (pas un bot d'abord) — la détection de nouveau leader existe déjà dans `POST /api/times` → POST aussi vers une URL webhook Discord. *« à voir l'intégration »*.
12. **Écuries/équipes** — table `crews`, adhésion par code, classement d'équipe = somme des points (réutilise le RPC classement général groupé par écurie), tag écurie sur profil. *« comment intégrer ? »* — pertinent quand la communauté grandit.
13. **Vérification de version du relais** (PAS un auto-updater : l'utilisateur a signalé le risque antivirus du download+remplacement d'exe). Au lancement, le relais compare sa version à la dernière release GitHub → bandeau « v1.12 dispo → [télécharger] ». Simple check, pas de download auto.

Voir [[relais-serveur-et-rang]] (procédure build/release) et [[features-site-juin-2026]].

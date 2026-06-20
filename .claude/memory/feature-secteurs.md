---
name: feature-secteurs
description: "Brique télémétrie #2 — temps par secteurs + tour théorique. Forza n'expose AUCUN checkpoint → secteurs reconstruits par distance côté relais (N variable selon longueur). LIVRÉ + DÉPLOYÉ 19/06 (migration appliquée, release relais v1.12.0 publiée). SEUL reste : valider l'offset distance 292 en jeu"
metadata: 
  node_type: memory
  type: project
  originSessionId: cae85036-f3e2-4180-a051-95649963b520
---

Premier livrable de la **brique télémétrie** (voir [[roadmap-idees-juin-2026]]). Décidé avec le proprio le 19/06.

**Fait structurant confirmé** : la télémétrie Forza (format sled+dash) n'expose **AUCUN signal de checkpoint/secteur** — seulement des valeurs continues (LapNumber, CurrentLap/LastLap/BestLap, DistanceTraveled, Position X/Y/Z). On reconstruit donc nous-mêmes les secteurs **par distance**.

**Découpe (choix proprio)** : nombre de secteurs **variable selon la longueur** — « au moins 5, plus c'est long plus on en rajoute ». Formule déterministe (pour que tous les relais découpent pareil) : **N = max(5, min(20, round(length_km / 1.5)))**. Secteurs = parts égales en distance.

**Implémenté (code) le 19/06, pas encore commité côté relais (gitignoré) :**
- **DB** : `supabase/migrations/secteurs.sql` → `ALTER TABLE lap_times ADD COLUMN sectors_ms INTEGER[]` (nullable). ⚠️ **PAS encore appliquée** (pas de PAT management sur le portable) → à lancer dans le **SQL Editor**. Types ajoutés à `types/database.types.ts` (Row/Insert/Update).
- **API** `POST /api/times` : accepte `sectors` (liste de durées en s, facultatif). `secteursValides()` dans `lib/lap-validation.ts` valide (2→30 nombres positifs, somme ≈ temps du tour à 3 %/1 s près) → stocke `sectors_ms` (tableau ms) sur insert + update du meilleur tour ; NULL si absent/incohérent. **Iso-fonctionnel** : les vieux relais marchent.
- **Relais** (fichier source aujourd'hui `relais_gui_v22.py`, `APP_VERSION=1.12.0` à l'époque) : offset `DistanceTraveled` ajouté à **292** (`<f`) — *déduit du décalage +12, NON validé en jeu*. Classe `SectorTracker` (découpe par distance, relève le temps écoulé à chaque borne k/N, durées de secteur à la fin d'un tour complet). Alimentée à chaque paquet en **MODE CIRCUIT** (pas sprint). `sectors` ajouté au payload **uniquement si** le dernier tour complet = le meilleur temps soumis. **100 % facultatif** : toute incohérence ⇒ aucun secteur, l'envoi du chrono n'est jamais bloqué. Simulé OK (5 secteurs de 20 s pour un tour de 100 s à vitesse constante).
- **Site** : `computeTheoretical()` + `<TheoreticalLapBanner>` dans `app/classements/classementsShared.tsx`. Tour théorique d'une config = somme des **meilleurs secteurs par index** parmi les pilotes (même N requis), détenteur en infobulle, gain vs meilleur réel. Bannière affichée sous l'en-tête de config (vues tableau + cartes, quand dépliée). `sectors_ms` ajouté au select de `ClassementsClient` + au type `LapTime`. Build + lint + tsc OK.

**FAIT** : ✅ migration `secteurs.sql` appliquée par le proprio (19/06). ✅ **release relais v1.12.0 publiée** (19/06, buildée sur le portable, exe 14,5 Mo, latest pointe dessus, `/telecharger` bumpé v1.12.0 commit 371cf14).

**RESTE — la SEULE chose en attente : valider l'offset distance 292 EN JEU.** Faire un tour en mode circuit avec le relais v1.12.0, puis vérifier qu'une ligne `lap_times` reçoit un `sectors_ms` cohérent (et que le « 🧮 Tour théorique » apparaît sur la config dans /classements). Si 292 est faux → les secteurs sont simplement absents (rien de cassé), il faudra ajuster l'offset puis re-release. ⚠️ Le relais v1.12.0 tourne maintenant sur le PORTABLE comme source à jour ; sur le FIXE recopier d'abord le `.py` (voir [[relais-serveur-et-rang]] / [[identification-machine]]).

**Suite de la brique** (après secteurs) : #1 delta live → #3 coach → #5 copilote réglage. Le full trace (`lap_traces`) viendra pour ces étapes ; les secteurs n'en ont pas eu besoin.

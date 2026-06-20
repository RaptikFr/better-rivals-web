---
name: feature-secteurs
description: "Brique télémétrie #2 — temps par secteurs + tour théorique (= record hypothétique). LIVRÉ 19/06. BUG corrigé 21/06 : offset distance 292 ≠ mètres réels (cap ~5950) → secteurs relais faussés. Fix CÔTÉ SERVEUR : sectors_ms recalculé depuis la trace (parts égales en distance) dans POST /api/traces ; /api/times n'écrit plus les secteurs relais ; backfill fait. Tour théorique vérifié OK"
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

**⚠️ BUG TROUVÉ ET CORRIGÉ le 21/06 (commit 77a0025 + 1 raffinement)** : l'offset distance **292 n'est PAS des mètres réels**. Constat via les traces (`lap_traces`) : `d_last` (distance parcourue par tour) ≈ **5950 quel que soit le circuit** (circuit 8 « Narai-Juku » long. off. 2,4 km, circuit 7 long. off. 7,0 km, circuit 67 long. off. 5,0 km → tous ~5950). La valeur est monotone et reproductible par tour (d'où le delta live qui marche), mais son échelle ne correspond pas à `length_km`. Le `SectorTracker` du relais plaçait ses bornes à `k/N × length_m` (longueur officielle) → pour le circuit 8, les 4 bornes (≤1920 « m ») franchies dans le premier tiers d'une « distance » qui monte à 5950 ⇒ **secteurs 1-4 minuscules + secteur 5 énorme** (ex. réel `[3467,3567,4050,4400,35603]`).

**Correctif = côté SERVEUR, pas relais** (choix : marche pour TOUT relais ≥ v1.13 sans MAJ — précieux vu la propagation laborieuse des updates relais). `lib/lap-validation.ts` : `nbSecteurs(lengthKm)` (même formule) + `secteursDepuisTrace(samples, n, lapTimeMs)` qui découpe la distance RÉELLE du tour (issue de la trace) en N parts égales, interpole le temps à chaque borne, **borne d'arrivée = vrai `time_ms`** (sinon dernier secteur sous-compté → faux gain). `POST /api/traces` recalcule `sectors_ms` et l'écrit sur le `lap_times`. `POST /api/times` **n'écrit plus** les secteurs du relais (remis NULL ; la trace les recalcule) — le relais continue de les envoyer mais ils sont ignorés (pas de re-release relais nécessaire ; son `SectorTracker` est devenu du code mort). **Backfill** des lignes existantes fait via API management (interpolation rejouée en PowerShell). 6 tests lib ajoutés (19 au total, verts).

**Vérifié end-to-end le 21/06** : circuit 8 secteurs désormais équilibrés (ex. `[8838,11496,8461,11138,11134]`) ; **tour théorique correct** — config 3307/A/RWD (2 tours) théorique 50657 vs réel 51067 = **gain 410 ms** ; config à 1 tour → gain ~0 (plus de faux gain). Couverture : sur les données du 20-21/06, 100 % des laps avec secteurs ont une trace (5/5). Le tour théorique = le « record hypothétique » demandé par le proprio (somme des meilleurs secteurs entre pilotes même config). Reste éventuel : si un jour des laps ont des secteurs sans trace (vieux relais qui n'uploade pas), ils resteraient NULL côté serveur (pas de trace = pas de recalcul) — non bloquant.

**Suite de la brique** (après secteurs) : #1 delta live → #3 coach → #5 copilote réglage. Le full trace (`lap_traces`) viendra pour ces étapes ; les secteurs n'en ont pas eu besoin.

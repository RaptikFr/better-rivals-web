---
name: todo-proprio-delta-live
description: "Actions PROPRIO pour débloquer le delta live (#1), à restituer mot pour mot quand il est sur le PC fixe. Le GET /api/traces côté site est FAIT (commit e1b2cfa) ; reste sa validation en jeu + l'intégration relais (gitignoré)"
metadata: 
  node_type: memory
  type: project
  originSessionId: cae85036-f3e2-4180-a051-95649963b520
---

**À RESTITUER MOT POUR MOT au proprio quand il est sur le PC fixe** (il l'a demandé le 19/06). Contexte : côté site, le `GET /api/traces` (trace de référence = PB du joueur) est livré et déployé (commit e1b2cfa). Le delta live (#1) ne peut pas avancer plus sans les actions ci-dessous. Voir [[feature-trace-telemetrie]] et [[relais-serveur-et-rang]].

---

## ✅ Ce que tu dois faire

**1. Valider les offsets de la trace EN JEU (mode circuit).**
- Faire un tour en mode circuit et **battre ton record** (la trace n'est envoyée qu'à un nouveau meilleur temps).
- Vérifier qu'une ligne apparaît bien dans la table `lap_traces` (Supabase).
- Contrôler que les valeurs sont **plausibles** : `point_count` ≈ longueur du circuit / 12 m, vitesse cohérente, % accélérateur/frein crédibles.
- C'est la **même validation que les secteurs** : si l'offset distance 292 est bon, la trace l'est aussi.

**2. ⚠️ AVANT de toucher au relais sur le PC FIXE : recopier la version à jour depuis le portable.**
- Le **portable a la dernière version (v1.13.0)**, le **FIXE est EN RETARD (v1.11.1)**.
- Le relais est **gitignoré** → si tu édites la vieille copie du fixe, tu perds tout le travail récent (secteurs + trace).
- Donc : **copier `relais_gui_v21.py` (et son dossier) du portable vers le fixe d'abord**, puis seulement éditer.

**3. Me prévenir une fois (1) validé.**
- Dès que les offsets sont confirmés en jeu, on enchaîne sur le code relais du delta live : je t'écris la fonction d'interpolation du temps de référence + le format de l'overlay « +0,3s vs PB », tu l'intègres au `.py`, puis on publie une nouvelle release relais.

---

## 🗄️ Migration SQL en attente (indépendante du delta live)

**Appliquer `supabase/migrations/track_best_times_rpc.sql` dans le SQL Editor Supabase.**
- Crée le RPC `track_best_times(p_track_id)` qui déduplique côté Postgres les meilleurs temps par config sur un circuit (commit 14cca00).
- Sans elle, `GET /api/times` retombe sur l'ancienne dédup JS `.limit(100)` → fonctionne, mais tronque les configs au-delà de 100 lignes sur un circuit populaire. **Pas urgent** tant que la communauté est petite ; la prod n'est pas cassée.
- ⚠️ Je n'ai pas pu l'appliquer moi-même : aucun PAT de management Supabase sur cette machine (il était sans doute configuré côté MCP sur le fixe). Si le PAT est dispo sur le fixe, je pourrai l'appliquer là-bas.

---

**Côté Claude, rien d'autre à faire en attendant** (le GET site est prêt). La balle est dans le camp du proprio pour (1), (2) et la migration ci-dessus.

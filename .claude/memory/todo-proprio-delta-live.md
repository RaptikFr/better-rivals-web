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

**2. ✅ FAIT le 20/06 — recopier la version à jour du portable sur le fixe.**
- Le proprio a recopié `relais_gui_v21.py` **v1.13.0** à la racine sur le fixe (`RAPTIK-PC`, APP_VERSION confirmé 1.13.0). Divergence résolue, voir [[relais-serveur-et-rang]].
- (Le relais reste **gitignoré** → toujours travailler sur la copie à jour.)

**3. Me prévenir une fois (1) validé.**
- Dès que les offsets sont confirmés en jeu, on enchaîne sur le code relais du delta live : je t'écris la fonction d'interpolation du temps de référence + le format de l'overlay « +0,3s vs PB », tu l'intègres au `.py`, puis on publie une nouvelle release relais.

---

---

**Côté Claude, rien d'autre à faire en attendant** (le GET site est prêt). La balle est dans le camp du proprio pour (1) et (2).

_(Migration `track_best_times_rpc.sql` : ✅ appliquée par le proprio le 19/06, RPC vérifié HTTP 200. Plus en attente. Toutes les migrations sont désormais appliquées — voir `supabase/migrations/README.md`.)_

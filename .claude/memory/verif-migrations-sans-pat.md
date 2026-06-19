---
name: verif-migrations-sans-pat
description: "Comment vérifier qu'une migration Supabase est appliquée SANS PAT de management : sonder l'existence d'un RPC/table/colonne via la clé anon publique (REST PostgREST) et lire le code d'erreur"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4c1e8a54-8404-473e-99c3-a17c07803c36
---

Quand il n'y a pas de PAT de management Supabase sur la machine (cas du portable, cf. [[relais-serveur-et-rang]]), on peut quand même vérifier en **lecture seule** si une migration est appliquée, via la clé anon publique (`SUPABASE_ANON_KEY` du relais) sur l'API REST PostgREST `https://hmtgzqbxymspauusziyh.supabase.co/rest/v1`.

**Headers** : `apikey` + `Authorization: Bearer <anon_key>`. Toujours `-SkipHttpErrorCheck` pour lire le code.

**Sonder un RPC** : `POST /rpc/<nom>` (body = args JSON ou `{}`).
- `404` + `code=PGRST202` → la fonction **n'existe pas** (migration NON appliquée).
- `200` → existe (appliquée). `400` avec autre code → existe mais args incorrects.

**Sonder une table** : `GET /<table>?limit=1`.
- `404` + `code=PGRST205` → table **absente** (utile aussi pour confirmer un DROP appliqué).
- `401` + `code=42501` → table **existe** mais RLS/grants ferment l'accès anon (= appliquée).
- `200` → existe et lisible.

**Sonder une colonne** : `GET /<table>?select=<colonne>&limit=1`.
- `401` + `code=42501` → la colonne **existe** mais grant colonne fermé à anon (sécurité par colonne, ex. `players.notify_exact`, `email_notifications_enabled`).
- `400` (code `42703`/`PGRST204`) → colonne **absente**.
- `200` → existe et lisible (ex. `discord_tag_public`).

**Limite** : les migrations purement RLS / data (renommages, audits, inserts world_records) ne sont pas testables ainsi. Les recouper avec les mémoires de features.

**Constat 19/06** : toutes les migrations de `supabase/migrations/` sont appliquées SAUF `track_best_times_rpc.sql` (créée le 19/06, optionnelle, repli JS actif). Voir [[todo-proprio-delta-live]].

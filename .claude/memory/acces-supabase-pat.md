---
name: acces-supabase-pat
description: Accès Supabase via PAT Management API — comment exécuter du SQL (DDL inclus) sur la base
metadata:
  type: reference
---

Le proprio **garde** un PAT Supabase (token compte, créé 22/06, nommé `claude-cleanup`) dans `.env.local` sous `SUPABASE_ACCESS_TOKEN=sbp_...` (gitignoré). Il sert à exécuter du SQL arbitraire (DDL inclus : DROP, CREATE INDEX, ALTER…) que la clé service role REST ne permet pas.

**Endpoint** : `POST https://api.supabase.com/v1/projects/{ref}/database/query`, body `{"query":"..."}`, header `Authorization: Bearer <PAT>`. Project ref = `hmtgzqbxymspauusziyh` (extrait de `NEXT_PUBLIC_SUPABASE_URL`).

**⚠️ curl (Git Bash) échoue en TLS (exit 35)** → utiliser **PowerShell `Invoke-RestMethod`** (pile TLS Windows). Pattern : lire le token depuis `.env.local`, définir une fonction `q($sql)` qui POST `@{query=$sql}|ConvertTo-Json`. Dans un here-string PowerShell `@' '@` les apostrophes SQL sont littérales — NE PAS les doubler.

PAT = compte entier (pas scopé projet) → sensible. `VACUUM` peut échouer (transaction) ; `ANALYZE` OK. Migrations : créer aussi le fichier `.sql` dans `supabase/migrations/` (journal versionné) en plus d'appliquer. Cf. [[verif-migrations-sans-pat]] (méthode sans PAT, toujours valable pour de simples sondages).

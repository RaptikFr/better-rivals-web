# Migrations SQL — Better Rivals

Ces fichiers `.sql` sont la **source de vérité versionnée du schéma** Supabase
(en complément de `types/database.types.ts`, qui est généré). Ils servent à
reconstruire la base, auditer l'historique et documenter les choix (RLS,
sécurité…).

## Comment ça marche ici

- **Application MANUELLE** : il n'y a pas de runner automatique. Chaque migration
  est appliquée à la main dans **Supabase Dashboard → SQL Editor** (ou, pour
  certaines, via l'API de management avec un PAT). Une migration déjà appliquée
  qui reste dans ce dossier **ne fait aucun mal** : rien ne la rejoue.
- **Ne pas supprimer** les fichiers une fois appliqués : on perdrait ce journal
  lisible. Pour savoir où on en est, c'est le tableau ci-dessous.
- La plupart sont écrites **idempotentes** (`CREATE OR REPLACE`, `IF EXISTS`…),
  donc rejouables sans risque en cas de doute.

## Vérifier si une migration est appliquée (sans PAT)

Via la clé **anon publique** sur l'API REST PostgREST, en lisant le code d'erreur :

- **RPC** — `POST /rest/v1/rpc/<nom>` : `404 PGRST202` = absent · `200` = présent.
- **Table** — `GET /rest/v1/<table>?limit=1` : `404 PGRST205` = absente ·
  `401 42501` = existe mais RLS fermée · `200` = existe et lisible.
- **Colonne** — `GET /rest/v1/<table>?select=<col>&limit=1` : `400 42703` = absente ·
  `401 42501` = existe (grant colonne fermé) · `200` = existe.

## État des migrations

Toutes **✅ appliquées** (vérifié le 19/06/2026).

### Schéma & features

| Fichier | Rôle |
|---|---|
| `setup_author.sql` | Colonne `lap_times.setup_author` (crédit du réglage). |
| `rivaux_follows.sql` | Table `follows` — suivi de rivaux (« Mes rivaux »). |
| `notifications_par_type.sql` | Colonnes de préférence `notify_exact/drivetrain/class/rival`. |
| `email_notifications.sql` | Opt-in notifications email (`email_notifications_enabled`). |
| `recap_hebdomadaire.sql` | Récap hebdomadaire par email (opt-in, cron). |
| `preferences_sync.sql` | Sync cross-device des préférences d'affichage. |
| `masquer_discord.sql` | Confidentialité : `discord_tag_public` + RPC `my_discord_tag`. |
| `objectifs_a_battre.sql` | Table `objectifs` — battre un pilote précis sur une config. |
| `duels.sql` | Table `duels` (pack social #8) — défi entre deux joueurs. |
| `config_semaine.sql` | Table `weekly_config` (pack social #9) — config de la semaine. |
| `secteurs.sql` | Colonne `lap_times.sectors_ms` (brique télémétrie #2). |
| `lap_traces.sql` | Table `lap_traces` — trace échantillonnée d'un tour (fondation télémétrie). |
| `coach_reglage_reports.sql` | Table `coach_reglage_reports` — comptes rendus du copilote de réglage (relais ≥ v3 → onglet 🔧 Copilote). **Appliqué le 23/06.** |

### RPC (scalabilité — calcul côté Postgres)

| Fichier | Rôle |
|---|---|
| `classement_rpc.sql` | RPC `player_config_rankings` — classements par config d'un joueur. |
| `general_ranking_rpc.sql` | RPC `general_ranking` — classement général agrégé. ⚠️ **fonction supprimée** le 22/06 (feature retirée), cf. `nettoyage_post_classement_general.sql`. |
| `track_best_times_rpc.sql` | RPC `track_best_times` — meilleurs temps dédupliqués par circuit (remplace le `.limit(100)` + dédup JS de `GET /api/times`). |

### Sécurité & audits

| Fichier | Rôle |
|---|---|
| `audit_rls_complet.sql` | Audit RLS complet (11/06) — ferme les écritures directes. |
| `securite_colonnes.sql` | Grants par colonne (colonnes privées non exposées à anon). |
| `securite_votes_contact.sql` | Durcissement sécurité (votes, contact). |
| `audit_suite_juin_2026.sql` | Suite d'audit (18/06) — points restés ouverts du 11/06. |

### Nettoyages & données

| Fichier | Rôle |
|---|---|
| `optimisations.sql` | Index / optimisations diverses. |
| `renommage_touge.sql` | Renommage data « Toge » → « Touge » (5 circuits). |
| `suppression_pin_code.sql` | Suppression de `players.pin_code`. |
| `suppression_leaderboard_defis.sql` | Suppression de l'ancienne vue `leaderboard` + table `defis`. |
| `nettoyage_post_classement_general.sql` | DROP de la RPC `general_ranking()` (feature retirée) + de l'index redondant `idx_lap_traces_lap_time`. Appliqué le 22/06. |
| `world_records_63_72.sql` | Remplissage `world_records` circuits 63-72 (anti-triche). |

-- ============================================================
-- PB_TRACE_HISTORY — Better Rivals (fantôme « optimal du joueur »)
-- lap_traces ne garde QU'UNE trace par (joueur, config) : à chaque nouveau
-- record, l'ancienne est écrasée. Or le fantôme « optimal recollé » d'un
-- joueur a besoin de PLUSIEURS de ses anciens records tracés (ceux qui ont
-- fait, à un moment, chacun de ses meilleurs secteurs) pour avoir quelque
-- chose à recoller — sinon il n'y a qu'un seul candidat, rien à combiner.
--
-- Cette table ARCHIVE (append-only, jamais écrasée) chaque trace envoyée sur
-- POST /api/traces : le relais n'envoie une trace QUE quand le tour vient de
-- battre le record de la config (cf. TraceRecorder.trace_pour côté relais,
-- et le commentaire "Une trace n'accompagne qu'un nouveau record" dans
-- app/api/traces/route.ts) — chaque POST est donc déjà, par construction, un
-- évènement "nouveau PB" à archiver. S'enrichit progressivement à partir
-- d'ici ; ne rattrape pas les PB antérieurs à cette migration (leur trace
-- n'existe déjà plus, seul le chiffre a survécu dans best_sectors).
--
-- À APPLIQUER MANUELLEMENT via l'API de management (comme lap_traces.sql).
-- ============================================================

CREATE TABLE IF NOT EXISTS pb_trace_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  track_id     integer NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  car_ordinal  integer NOT NULL,
  car_class    text NOT NULL,
  drivetrain   text NOT NULL,
  time_ms      integer NOT NULL,
  samples      jsonb NOT NULL,   -- mêmes tableaux parallèles d/t/v que lap_traces.samples
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Lecture de tout l'historique tracé d'un joueur sur une config exacte
-- (fantôme « optimal du joueur » recollé à partir de ses PB successifs).
CREATE INDEX IF NOT EXISTS idx_pb_trace_history_config
  ON pb_trace_history(player_id, track_id, car_ordinal, car_class, drivetrain);

-- Sécurité : même politique que lap_traces (télémétrie détaillée, jamais
-- exposée publiquement) — écriture et lecture passent par /api/traces et
-- /api/replay (service role uniquement).
ALTER TABLE pb_trace_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pb_trace_history FROM anon, authenticated;

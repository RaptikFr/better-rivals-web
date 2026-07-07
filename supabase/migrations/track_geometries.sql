-- ============================================================
-- MIGRATION — Géométrie des circuits (tracés)  [relais ≥ v3.1.0 / v307]
-- À appliquer via : Supabase Dashboard > SQL Editor
-- ============================================================
-- Forza n'expose AUCUN checkpoint dans sa télémétrie. Pour pouvoir découper et
-- VISUALISER les secteurs sur une carte du circuit, le relais échantillonne la
-- position monde (PositionX@244 / PositionZ@252, offsets confirmés par la doc
-- officielle FH6) le long d'un tour → une polyligne = la forme du tracé.
--
-- Un seul tracé par circuit suffit (la forme ne change pas) : `track_id` est la
-- CLÉ PRIMAIRE → déduplication naturelle. Le relais vérifie l'existence au
-- lancement (GET /api/track-geometry) et n'envoie que si le tracé manque ; le
-- premier tour propre gagne (l'API ignore les envois suivants).
--
-- Les coordonnées Forza sont en MÈTRES, en repère MONDE absolu par circuit :
-- tous les tours d'un même circuit se superposent (utile pour une amélioration
-- future par moyenne). `bounds` (min/max X et Z) est pré-calculé pour normaliser
-- facilement le tracé dans un viewBox SVG côté site.

CREATE TABLE IF NOT EXISTS track_geometries (
  track_id         integer PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  points           jsonb   NOT NULL,               -- { "x": [...], "z": [...], "d": [...] }
  point_count      integer NOT NULL,
  sample_dist_m    integer NOT NULL DEFAULT 5,     -- espacement d'échantillonnage (m)
  lap_time_ms      integer,                         -- temps du tour qui a fourni le tracé
  bounds           jsonb,                           -- { "minX","maxX","minZ","maxZ" }
  car_ordinal      integer,                         -- voiture ayant tracé (info)
  car_class        text,
  source_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- RLS : table FERMÉE (comme lap_traces). Aucune policy publique : la lecture et
-- l'écriture passent exclusivement par le service role (routes /api/track-geometry
-- + server components des pages /circuits via supabaseAdmin). Cf. audit RLS.
ALTER TABLE track_geometries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SUPPRESSION CONFIG DE LA SEMAINE — Better Rivals
-- La feature « config de la semaine » (pack social #9) est retirée du site
-- (juillet 2026) : page /config-semaine, API /api/admin/config-semaine et
-- lib/configSemaine.ts supprimées côté code. On droppe la table associée.
--
-- À APPLIQUER MANUELLEMENT (SQL editor / API de management), comme les autres.
-- Idempotente : rejouable sans risque.
-- ============================================================

DROP TABLE IF EXISTS weekly_config;

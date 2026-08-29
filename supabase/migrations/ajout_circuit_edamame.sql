-- Ajout d'un circuit officiel : Circuit d'Edamame (Forza Horizon 6).
-- Course sur route, circuit a tours (is_sprint = false), longueur 1,1 km.
-- Applique le 29 aout 2026 via API de management Supabase (PAT SUPABASE_ACCESS_TOKEN).
-- Inseré avec id = 94, status 'approved', event_lab_code NULL (epreuve du jeu, pas EventLab).
--
-- Anti-triche : aucune ligne world_records pour l'instant -> la config n'est pas
-- jugee par app/api/times/route.ts tant que les temps de reference D->R ne sont
-- pas renseignes (via l'OCR du proprietaire, comme les autres circuits officiels).

INSERT INTO public.tracks (id, name, type, length_km, is_official, is_sprint, status, event_lab_code, submitted_by)
VALUES (94, 'Circuit d''Edamame', 'Course sur route', 1.1, true, false, 'approved', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Resynchronise la sequence si l'insertion a utilise un id explicite.
SELECT setval(pg_get_serial_sequence('public.tracks', 'id'), (SELECT MAX(id) FROM public.tracks));

import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { construireCarte, type CarteCircuit } from '@/lib/circuitGeometry';

// Tracé d'un circuit (capturé silencieusement par le relais ≥ v3.0.7).
// track_geometries est fermée à anon/auth (RLS) : lecture service role,
// uniquement depuis les server components — la carte est passée au client
// en props, déjà simplifiée (~10× moins de points que la capture brute).

async function fetchCarteCircuit(trackId: number): Promise<CarteCircuit | null> {
  const { data } = await supabaseAdmin
    .from('track_geometries')
    .select('points')
    .eq('track_id', trackId)
    .maybeSingle();

  const points = data?.points as { x?: unknown; z?: unknown } | null;
  if (!points || !Array.isArray(points.x) || !Array.isArray(points.z)) return null;
  return construireCarte({ x: points.x as number[], z: points.z as number[] });
}

/** Carte du circuit prête à dessiner, ou null si aucun tracé capturé. Cache 5 min. */
export const getCarteCircuit = unstable_cache(
  fetchCarteCircuit,
  ['carte-circuit'],
  { revalidate: 300 }
);

import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { fetchAllRows } from '@/lib/fetchAllRows';

// Ré-export pour les imports historiques (`from '@/lib/circuitRankings'`).
export { circuitSlug, parseCircuitId } from '@/lib/circuitSlug';

// Ordre d'affichage des classes (repris de la vue classements).
const CAR_CLASS_ORDER = ['D', 'C', 'B', 'A', 'S1', 'S2', 'R', 'X'];

/** En dessous de ce nombre de temps, une page circuit est trop maigre pour
 *  être indexée (noindex + exclue du sitemap). */
export const MIN_TIMES_INDEXABLE = 3;

export interface CircuitMeta {
  id: number;
  name: string;
  length_km: number | null;
  type: string | null;
  is_official: boolean | null;
  is_sprint: boolean | null;
}

export interface CircuitLap {
  id: string;
  time_ms: number;
  car_class: string;
  car_pi: number;
  car_ordinal: number;
  drivetrain: string;
  share_code: string | null;
  players: { pseudo: string; discord_tag: string | null } | null;
  cars: { manufacturer: string | null; name: string; year: number | null } | null;
}

export interface RankedCircuitLap extends CircuitLap { rank: number; }

export interface CircuitConfig {
  key: string;
  carClass: string;
  drivetrain: string;
  carLabel: string;
  laps: RankedCircuitLap[];
}

export interface CircuitRanking {
  track: CircuitMeta | null;
  configs: CircuitConfig[];
  totalTimes: number;
}

async function fetchApprovedCircuits(): Promise<CircuitMeta[]> {
  const { data, error } = await supabaseAdmin
    .from('tracks')
    .select('id, name, length_km, type, is_official, is_sprint')
    .eq('status', 'approved')
    .order('is_official', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CircuitMeta[];
}

/** Tous les circuits approuvés (pour l'index et generateStaticParams). */
export const getApprovedCircuits = unstable_cache(
  fetchApprovedCircuits,
  ['approved-circuits'],
  { revalidate: 300 }
);

async function fetchCircuitRanking(trackId: number): Promise<CircuitRanking> {
  const { data: track } = await supabaseAdmin
    .from('tracks')
    .select('id, name, length_km, type, is_official, is_sprint, status')
    .eq('id', trackId)
    .maybeSingle();
  if (!track || track.status !== 'approved') return { track: null, configs: [], totalTimes: 0 };

  const { data: laps, error } = await fetchAllRows<CircuitLap>((from, to) =>
    supabase
      .from('lap_times')
      .select('id, time_ms, car_class, car_pi, car_ordinal, drivetrain, share_code, players ( pseudo, discord_tag:discord_tag_public ), cars ( manufacturer, name, year )')
      .eq('track_id', trackId)
      .order('time_ms', { ascending: true })
      .order('id')
      .range(from, to)
  );
  // Une erreur lancée n'est pas mise en cache : la prochaine requête réessaiera
  if (error) throw new Error(error.message);

  const byConfig = new Map<string, CircuitLap[]>();
  for (const lap of laps) {
    const key = `${lap.car_class}|${lap.drivetrain}|${lap.car_ordinal}`;
    if (!byConfig.has(key)) byConfig.set(key, []);
    byConfig.get(key)!.push(lap);
  }

  const configs: CircuitConfig[] = [...byConfig.entries()]
    .map(([key, ls]) => {
      const [carClass, drivetrain] = key.split('|');
      const s = ls[0];
      const carLabel = `${s.cars?.year ?? ''} ${s.cars?.manufacturer ?? ''} ${s.cars?.name ?? ''}`.trim() || 'Voiture inconnue';
      const ranked = [...ls]
        .sort((a, b) => a.time_ms - b.time_ms)
        .map((lap, i) => ({ ...lap, rank: i + 1 }));
      return { key, carClass, drivetrain, carLabel, laps: ranked };
    })
    .sort((a, b) => {
      const ord = CAR_CLASS_ORDER.indexOf(a.carClass) - CAR_CLASS_ORDER.indexOf(b.carClass);
      if (ord !== 0) return ord;
      return a.drivetrain.localeCompare(b.drivetrain);
    });

  const { status: _status, ...meta } = track;
  void _status;
  return { track: meta as CircuitMeta, configs, totalTimes: laps.length };
}

/** Classement complet d'un circuit (méta + configs classées), caché 5 min. */
export const getCircuitRanking = unstable_cache(
  fetchCircuitRanking,
  ['circuit-ranking'],
  { revalidate: 300 }
);

async function fetchIndexableCircuits(): Promise<CircuitMeta[]> {
  const circuits = await fetchApprovedCircuits();
  // Comptage par circuit côté Postgres (RPC GROUP BY, cf. la migration
  // nouveaux_leaders_et_counts_rpc.sql) : ~1 ligne par circuit au lieu de
  // télécharger la colonne track_id de toute la table lap_times.
  const { data, error } = await supabase.rpc('track_time_counts');
  if (error) throw new Error(error.message);
  const counts = new Map<number, number>();
  for (const r of (data ?? []) as { track_id: number; times: number }[]) {
    counts.set(r.track_id, Number(r.times));
  }
  return circuits.filter(c => (counts.get(c.id) ?? 0) >= MIN_TIMES_INDEXABLE);
}

/** Circuits ayant assez de temps pour mériter une entrée au sitemap. */
export const getIndexableCircuits = unstable_cache(
  fetchIndexableCircuits,
  ['indexable-circuits'],
  { revalidate: 300 }
);

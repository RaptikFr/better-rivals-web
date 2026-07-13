import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { fetchAllRows } from '@/lib/fetchAllRows';

const CAR_CLASS_ORDER = ['D', 'C', 'B', 'A', 'S1', 'S2', 'R', 'X'];

/** En dessous de ce nombre de temps, une page voiture est trop maigre pour
 *  être indexée (noindex + exclue du sitemap). */
export const MIN_TIMES_INDEXABLE = 3;

export interface CarMeta {
  ordinal: number;
  manufacturer: string;
  name: string;
  year: number | null;
  car_type: string | null;
}

export interface CarLap {
  id: string;
  time_ms: number;
  car_class: string;
  car_pi: number;
  drivetrain: string;
  share_code: string | null;
  track_id: number;
  players: { pseudo: string; discord_tag: string | null } | null;
  tracks: { name: string; length_km: number | null; type: string | null; is_sprint: boolean | null } | null;
}

export interface RankedCarLap extends CarLap { rank: number; }

export interface CarConfig {
  key: string;
  carClass: string;
  drivetrain: string;
  laps: RankedCarLap[];
}

export interface CarCircuitGroup {
  trackId: number;
  trackName: string;
  trackLengthKm: number | null;
  trackType: string | null;
  trackIsSprint: boolean | null;
  configs: CarConfig[];
}

export interface CarRanking {
  car: CarMeta | null;
  circuits: CarCircuitGroup[];
  totalTimes: number;
}

export interface CarWithTimes extends CarMeta { count: number; }

async function fetchCarRanking(ordinal: number): Promise<CarRanking> {
  const { data: car } = await supabaseAdmin
    .from('cars')
    .select('car_ordinal, manufacturer, name, year, car_type')
    .eq('car_ordinal', ordinal)
    .maybeSingle();
  if (!car || car.car_ordinal === null) return { car: null, circuits: [], totalTimes: 0 };

  const { data: laps, error } = await fetchAllRows<CarLap>((from, to) =>
    supabase
      .from('lap_times')
      .select('id, time_ms, car_class, car_pi, drivetrain, share_code, track_id, players ( pseudo, discord_tag:discord_tag_public ), tracks ( name, length_km, type, is_sprint )')
      .eq('car_ordinal', ordinal)
      .order('time_ms', { ascending: true })
      .order('id')
      .range(from, to)
  );
  // Une erreur lancée n'est pas mise en cache : la prochaine requête réessaiera
  if (error) throw new Error(error.message);

  const byTrack = new Map<number, CarLap[]>();
  for (const lap of laps) {
    if (!byTrack.has(lap.track_id)) byTrack.set(lap.track_id, []);
    byTrack.get(lap.track_id)!.push(lap);
  }

  const circuits: CarCircuitGroup[] = [...byTrack.entries()]
    .map(([trackId, trackLaps]) => {
      const sample = trackLaps[0];
      const byConfig = new Map<string, CarLap[]>();
      for (const lap of trackLaps) {
        const key = `${lap.car_class}|${lap.drivetrain}`;
        if (!byConfig.has(key)) byConfig.set(key, []);
        byConfig.get(key)!.push(lap);
      }
      const configs: CarConfig[] = [...byConfig.entries()]
        .map(([key, ls]) => {
          const [carClass, drivetrain] = key.split('|');
          const ranked = [...ls]
            .sort((a, b) => a.time_ms - b.time_ms)
            .map((lap, i) => ({ ...lap, rank: i + 1 }));
          return { key, carClass, drivetrain, laps: ranked };
        })
        .sort((a, b) => {
          const ord = CAR_CLASS_ORDER.indexOf(a.carClass) - CAR_CLASS_ORDER.indexOf(b.carClass);
          if (ord !== 0) return ord;
          return a.drivetrain.localeCompare(b.drivetrain);
        });
      return {
        trackId,
        trackName: sample.tracks?.name ?? 'Circuit inconnu',
        trackLengthKm: sample.tracks?.length_km ?? null,
        trackType: sample.tracks?.type ?? null,
        trackIsSprint: sample.tracks?.is_sprint ?? null,
        configs,
      };
    })
    .sort((a, b) => a.trackName.localeCompare(b.trackName));

  const meta: CarMeta = {
    ordinal: car.car_ordinal,
    manufacturer: car.manufacturer,
    name: car.name,
    year: car.year,
    car_type: car.car_type ?? null,
  };
  return { car: meta, circuits, totalTimes: laps.length };
}

/** Classement complet d'une voiture (méta + circuits/configs classés), caché 5 min. */
export const getCarRanking = unstable_cache(
  fetchCarRanking,
  ['car-ranking'],
  { revalidate: 300 }
);

async function fetchCarsWithTimes(): Promise<CarWithTimes[]> {
  // Comptage par voiture côté Postgres (RPC GROUP BY, cf. la migration
  // nouveaux_leaders_et_counts_rpc.sql) : ~1 ligne par voiture au lieu de
  // télécharger la colonne car_ordinal de toute la table lap_times.
  const { data, error } = await supabase.rpc('car_time_counts');
  if (error) throw new Error(error.message);
  const counts = new Map<number, number>();
  for (const r of (data ?? []) as { car_ordinal: number; times: number }[]) {
    counts.set(r.car_ordinal, Number(r.times));
  }
  const ordinals = [...counts.keys()];
  if (ordinals.length === 0) return [];

  const { data: cars } = await supabaseAdmin
    .from('cars')
    .select('car_ordinal, manufacturer, name, year, car_type')
    .in('car_ordinal', ordinals);

  return (cars ?? [])
    .filter((c): c is typeof c & { car_ordinal: number } => c.car_ordinal != null)
    .map(c => ({
      ordinal: c.car_ordinal,
      manufacturer: c.manufacturer,
      name: c.name,
      year: c.year,
      car_type: c.car_type ?? null,
      count: counts.get(c.car_ordinal) ?? 0,
    }));
}

/** Toutes les voitures ayant au moins un temps (pour generateStaticParams). */
export const getCarsWithTimes = unstable_cache(
  fetchCarsWithTimes,
  ['cars-with-times'],
  { revalidate: 300 }
);

/** Voitures ayant assez de temps pour mériter une entrée au sitemap. */
export async function getIndexableCars(): Promise<CarWithTimes[]> {
  const cars = await getCarsWithTimes();
  return cars.filter(c => c.count >= MIN_TIMES_INDEXABLE);
}

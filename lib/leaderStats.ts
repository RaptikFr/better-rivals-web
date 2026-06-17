import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { computeLeaderChanges, type LeaderLap } from '@/lib/leaders';

// Agrégats « batailles de leaders » dérivés de l'historique complet des records,
// pour la page /stats. Même source que lib/leadersFeed.ts (temps actuels +
// lap_times_history) ; à déplacer côté Postgres/RPC quand la base grossira.

interface CurrentRow extends LeaderLap {
  players: { pseudo: string } | null;
  cars:    { manufacturer: string | null; name: string; year: number | null } | null;
  tracks:  { name: string } | null;
}

export interface ContestedConfig {
  car:        string;
  track:      string;
  car_class:  string;
  drivetrain: string;
  changes:    number; // nombre de détrônages cumulés sur la config
}

export interface BiggestGap {
  newLeader:   string;
  oldLeader:   string;
  car:         string;
  track:       string;
  car_class:   string;
  drivetrain:  string;
  newTimeMs:   number;
  oldTimeMs:   number;
  gapMs:       number;
  recorded_at: string;
}

export interface LeaderStats {
  mostContested:   ContestedConfig | null;
  biggestGapMonth: BiggestGap | null;
}

async function computeLeaderStats(): Promise<LeaderStats> {
  const [currentRes, historyRes] = await Promise.all([
    fetchAllRows<CurrentRow>((from, to) =>
      supabase
        .from('lap_times')
        .select('player_id, track_id, car_ordinal, car_class, drivetrain, time_ms, recorded_at, players ( pseudo ), cars ( manufacturer, name, year ), tracks ( name )')
        .order('id')
        .range(from, to)
    ),
    fetchAllRows<LeaderLap>((from, to) =>
      supabase
        .from('lap_times_history')
        .select('player_id, track_id, car_ordinal, car_class, drivetrain, time_ms, recorded_at')
        .order('id')
        .range(from, to)
    ),
  ]);

  // Une erreur lancée n'est pas mise en cache : la prochaine requête réessaiera
  if (currentRes.error) throw new Error(currentRes.error.message);
  if (historyRes.error) throw new Error(historyRes.error.message);

  const current = currentRes.data;

  // Référentiels (pseudo + libellés voiture/circuit) construits depuis les temps
  // actuels : chaque joueur et chaque config y a forcément sa ligne courante.
  const playerPseudo = new Map<string, string>();
  const configInfo   = new Map<string, { car: string; track: string }>();
  for (const r of current) {
    if (r.players) playerPseudo.set(r.player_id, r.players.pseudo);
    const key = `${r.track_id}-${r.car_ordinal}-${r.car_class}-${r.drivetrain}`;
    if (!configInfo.has(key)) {
      configInfo.set(key, {
        car:   r.cars ? `${r.cars.year ?? ''} ${r.cars.manufacturer ?? ''} ${r.cars.name ?? ''}`.trim() || '—' : '—',
        track: r.tracks?.name ?? '—',
      });
    }
  }

  const changes = computeLeaderChanges([...current, ...historyRes.data]);

  // Config la plus disputée = celle qui a connu le plus de détrônages.
  const countByConfig  = new Map<string, number>();
  const sampleByConfig = new Map<string, (typeof changes)[number]>();
  for (const c of changes) {
    countByConfig.set(c.configKey, (countByConfig.get(c.configKey) ?? 0) + 1);
    if (!sampleByConfig.has(c.configKey)) sampleByConfig.set(c.configKey, c);
  }

  let mostContested: ContestedConfig | null = null;
  for (const [key, count] of countByConfig) {
    if (count > (mostContested?.changes ?? 0)) {
      const s    = sampleByConfig.get(key)!;
      const info = configInfo.get(key) ?? { car: '—', track: '—' };
      mostContested = { car: info.car, track: info.track, car_class: s.car_class, drivetrain: s.drivetrain, changes: count };
    }
  }

  // Plus gros écart de détrônage sur les 30 derniers jours.
  const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
  let biggestGapMonth: BiggestGap | null = null;
  for (const c of changes) {
    if (new Date(c.recorded_at).getTime() < monthAgo) continue;
    const gapMs = c.oldTimeMs - c.newTimeMs;
    if (gapMs <= 0) continue;
    if (!biggestGapMonth || gapMs > biggestGapMonth.gapMs) {
      const info = configInfo.get(c.configKey) ?? { car: '—', track: '—' };
      biggestGapMonth = {
        newLeader:   playerPseudo.get(c.newLeaderId) ?? '—',
        oldLeader:   playerPseudo.get(c.oldLeaderId) ?? '—',
        car:         info.car,
        track:       info.track,
        car_class:   c.car_class,
        drivetrain:  c.drivetrain,
        newTimeMs:   c.newTimeMs,
        oldTimeMs:   c.oldTimeMs,
        gapMs,
        recorded_at: c.recorded_at,
      };
    }
  }

  return { mostContested, biggestGapMonth };
}

// Cache serveur partagé (au plus un recalcul complet par minute).
export const getLeaderStats = unstable_cache(computeLeaderStats, ['leader-stats'], {
  revalidate: 60,
});

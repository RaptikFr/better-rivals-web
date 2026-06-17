import { supabaseAdmin } from '@/lib/supabase-admin';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { computeLeaderChanges, type LeaderLap } from '@/lib/leaders';

// Récap hebdomadaire par joueur : combien de records (#1 sur une config) il a
// pris et combien il en a perdus sur une fenêtre donnée. Dérivé du même moteur
// que le flux « Nouveaux leaders » (computeLeaderChanges).

interface CurrentRow extends LeaderLap {
  players: { pseudo: string } | null;
}

export interface WeeklyRecapEntry {
  playerId: string;
  pseudo:   string;
  gained:   number; // records pris sur la période
  lost:     number; // records perdus sur la période
}

export async function computeWeeklyRecap(sinceMs: number): Promise<WeeklyRecapEntry[]> {
  const [currentRes, historyRes] = await Promise.all([
    fetchAllRows<CurrentRow>((from, to) =>
      supabaseAdmin
        .from('lap_times')
        .select('player_id, track_id, car_ordinal, car_class, drivetrain, time_ms, recorded_at, players ( pseudo )')
        .order('id')
        .range(from, to)
    ),
    fetchAllRows<LeaderLap>((from, to) =>
      supabaseAdmin
        .from('lap_times_history')
        .select('player_id, track_id, car_ordinal, car_class, drivetrain, time_ms, recorded_at')
        .order('id')
        .range(from, to)
    ),
  ]);

  if (currentRes.error) throw new Error(currentRes.error.message);
  if (historyRes.error) throw new Error(historyRes.error.message);

  const pseudoById = new Map<string, string>();
  for (const r of currentRes.data) if (r.players) pseudoById.set(r.player_id, r.players.pseudo);

  const changes = computeLeaderChanges([...currentRes.data, ...historyRes.data]);

  const agg = new Map<string, { gained: number; lost: number }>();
  for (const c of changes) {
    if (new Date(c.recorded_at).getTime() < sinceMs) continue;
    const g = agg.get(c.newLeaderId) ?? { gained: 0, lost: 0 };
    g.gained += 1;
    agg.set(c.newLeaderId, g);
    const l = agg.get(c.oldLeaderId) ?? { gained: 0, lost: 0 };
    l.lost += 1;
    agg.set(c.oldLeaderId, l);
  }

  const entries: WeeklyRecapEntry[] = [];
  for (const [playerId, { gained, lost }] of agg) {
    entries.push({ playerId, pseudo: pseudoById.get(playerId) ?? '—', gained, lost });
  }
  return entries;
}

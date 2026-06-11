import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';

const POINTS_TABLE = [10, 7, 5, 3, 1];

function getPoints(zeroBasedIndex: number): number {
  return POINTS_TABLE[zeroBasedIndex] ?? 0;
}

interface RawLap {
  time_ms:     number;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
  track_id:    number;
  player_id:   string;
  players:     { pseudo: string; discord_tag: string | null } | null;
}

export interface PlayerRanking {
  player_id:   string;
  pseudo:      string;
  discord_tag: string | null;
  points:      number;
  gold:        number;
  silver:      number;
  bronze:      number;
  configs:     number;
}

async function calculerClassement(): Promise<PlayerRanking[]> {
  const { data: allLaps, error } = await fetchAllRows<RawLap>((from, to) =>
    supabase
      .from('lap_times')
      .select('time_ms, car_ordinal, car_class, drivetrain, track_id, player_id, players ( pseudo, discord_tag )')
      .order('id')
      .range(from, to)
  );

  // Une erreur lancée n'est pas mise en cache : la prochaine requête réessaiera
  if (error) throw new Error(error.message);

  // Étape 1 : meilleur temps par (config × joueur)
  // config key = track_id-car_ordinal-car_class-drivetrain
  const configs = new Map<string, Map<string, { pseudo: string; discord_tag: string | null; time_ms: number }>>();

  for (const lap of allLaps) {
    const key = `${lap.track_id}-${lap.car_ordinal}-${lap.car_class}-${lap.drivetrain}`;
    if (!configs.has(key)) configs.set(key, new Map());
    const playerMap = configs.get(key)!;
    const existing = playerMap.get(lap.player_id);
    if (!existing || lap.time_ms < existing.time_ms) {
      playerMap.set(lap.player_id, {
        pseudo:      lap.players?.pseudo      ?? 'Inconnu',
        discord_tag: lap.players?.discord_tag ?? null,
        time_ms:     lap.time_ms,
      });
    }
  }

  // Étape 2 : attribution des points pour chaque config
  const playerScores = new Map<string, PlayerRanking>();

  for (const [, playerMap] of configs) {
    const sorted = [...playerMap.entries()].sort((a, b) => a[1].time_ms - b[1].time_ms);

    sorted.forEach(([playerId, { pseudo, discord_tag }], index) => {
      if (!playerScores.has(playerId)) {
        playerScores.set(playerId, {
          player_id:   playerId,
          pseudo,
          discord_tag,
          points:  0,
          gold:    0,
          silver:  0,
          bronze:  0,
          configs: 0,
        });
      }
      const score = playerScores.get(playerId)!;
      score.points  += getPoints(index);
      score.configs += 1;
      if (index === 0) score.gold++;
      else if (index === 1) score.silver++;
      else if (index === 2) score.bronze++;
    });
  }

  // Étape 3 : tri par points desc, puis podiums comme départage
  return [...playerScores.values()].sort((a, b) =>
    b.points - a.points ||
    b.gold   - a.gold   ||
    b.silver - a.silver ||
    b.bronze - a.bronze
  );
}

// Cache serveur partagé entre tous les visiteurs (une requête Supabase
// par minute au plus, au lieu d'un fetch complet de lap_times par visite)
const classementEnCache = unstable_cache(calculerClassement, ['classement-general'], {
  revalidate: 60,
});

export async function GET() {
  try {
    const ranking = await classementEnCache();
    return NextResponse.json({ ranking }, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Impossible de charger le classement général.' },
      { status: 500 }
    );
  }
}

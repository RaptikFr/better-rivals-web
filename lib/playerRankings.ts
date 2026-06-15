import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { configKey, type Podiums } from '@/lib/podiums';
import { buildRivalIndex, findRivals, type ConfigRivals, type RivalRow } from '@/lib/rivals';

// Rang du joueur sur une config, pour les badges (podiums dérivés du rang).
export interface RankedConfig {
  track_id: number;
  rank:     number;
}

export interface PlayerRankings {
  /** Rivaux directs (devant/derrière) par config — clé = configKey(lap). */
  rivalsByConfig: Map<string, ConfigRivals>;
  podiums: Podiums;
  ranked:  RankedConfig[];
}

// Temps du joueur, champs minimaux pour identifier ses configs.
export interface PlayerLap {
  track_id:    number;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
  time_ms:     number;
}

const EMPTY: PlayerRankings = {
  rivalsByConfig: new Map(),
  podiums: { gold: 0, silver: 0, bronze: 0 },
  ranked: [],
};

/** Récupère un ConfigRivals depuis la map, avec repli « seul sur la config ». */
export function rivalsFor(map: Map<string, ConfigRivals>, lap: PlayerLap): ConfigRivals {
  return map.get(configKey(lap)) ?? { rank: 1, total: 1, ahead: null, behind: null };
}

interface RpcRow {
  track_id:      number;
  car_ordinal:   number;
  car_class:     string;
  drivetrain:    string;
  time_ms:       number;
  rank:          number;
  total:         number;
  ahead_pseudo:  string | null;
  ahead_gap_ms:  number | null;
  behind_pseudo: string | null;
  behind_gap_ms: number | null;
}

function fromRpc(rows: RpcRow[]): PlayerRankings {
  const rivalsByConfig = new Map<string, ConfigRivals>();
  const ranked: RankedConfig[] = [];
  let gold = 0, silver = 0, bronze = 0;

  for (const r of rows) {
    rivalsByConfig.set(configKey(r), {
      rank:   r.rank,
      total:  r.total,
      ahead:  r.ahead_pseudo  != null ? { pseudo: r.ahead_pseudo,  gapMs: r.ahead_gap_ms  ?? 0 } : null,
      behind: r.behind_pseudo != null ? { pseudo: r.behind_pseudo, gapMs: r.behind_gap_ms ?? 0 } : null,
    });
    if      (r.rank === 1) gold++;
    else if (r.rank === 2) silver++;
    else if (r.rank === 3) bronze++;
    ranked.push({ track_id: r.track_id, rank: r.rank });
  }

  return { rivalsByConfig, podiums: { gold, silver, bronze }, ranked };
}

// Repli : ancien chemin (télécharge tous les temps des circuits du joueur et
// classe côté client). Utilisé tant que la RPC player_config_rankings n'est
// pas déployée, ou en cas d'erreur — le site reste fonctionnel.
async function fromClient(playerId: string, playerLaps: PlayerLap[]): Promise<PlayerRankings> {
  const trackIds = [...new Set(playerLaps.map(l => l.track_id))].filter(Boolean);
  if (trackIds.length === 0) return EMPTY;

  const { data: allLaps } = await fetchAllRows<RivalRow>((from, to) =>
    supabase
      .from('lap_times')
      .select('time_ms, car_ordinal, car_class, drivetrain, track_id, player_id, players(pseudo)')
      .in('track_id', trackIds)
      .order('id')
      .range(from, to)
  );

  const index = buildRivalIndex(allLaps);
  const rivalsByConfig = new Map<string, ConfigRivals>();
  const ranked: RankedConfig[] = [];
  let gold = 0, silver = 0, bronze = 0;

  for (const lap of playerLaps) {
    const cr = findRivals(playerId, lap, index);
    rivalsByConfig.set(configKey(lap), cr);
    if      (cr.rank === 1) gold++;
    else if (cr.rank === 2) silver++;
    else if (cr.rank === 3) bronze++;
    ranked.push({ track_id: lap.track_id, rank: cr.rank });
  }

  return { rivalsByConfig, podiums: { gold, silver, bronze }, ranked };
}

/**
 * Charge le classement par config d'un joueur : rang, total et rivaux directs.
 * Voie rapide via la RPC Postgres ; repli sur le calcul client si la fonction
 * n'est pas disponible.
 */
export async function loadPlayerRankings(playerId: string, playerLaps: PlayerLap[]): Promise<PlayerRankings> {
  const { data, error } = await supabase.rpc('player_config_rankings', { p_player_id: playerId });
  if (!error && Array.isArray(data)) return fromRpc(data as RpcRow[]);
  return fromClient(playerId, playerLaps);
}

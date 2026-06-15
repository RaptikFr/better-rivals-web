import { configKey } from '@/lib/podiums';

// Ligne de temps enrichie du joueur (qui l'a posé), nécessaire pour nommer
// les rivaux directs — contrairement à podiums.ts qui ne compte que les rangs.
export interface RivalRow {
  track_id:    number;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
  time_ms:     number;
  player_id:   string;
  players:     { pseudo: string } | null;
}

export interface RivalInfo {
  pseudo: string;
  gapMs:  number; // toujours positif (écart absolu avec le joueur)
}

export interface ConfigRivals {
  rank:   number;
  total:  number;
  ahead:  RivalInfo | null; // pilote juste devant (cible à rattraper)
  behind: RivalInfo | null; // pilote juste derrière (menace)
}

/**
 * Indexe tous les temps par configuration (circuit × voiture × classe ×
 * transmission), chaque liste triée du plus rapide au plus lent. Un seul
 * temps par joueur et par config (contrainte d'unicité lap_times).
 */
export function buildRivalIndex(allLaps: RivalRow[]): Map<string, RivalRow[]> {
  const byConfig = new Map<string, RivalRow[]>();
  for (const lap of allLaps) {
    const key = configKey(lap);
    if (!byConfig.has(key)) byConfig.set(key, []);
    byConfig.get(key)!.push(lap);
  }
  for (const arr of byConfig.values()) arr.sort((a, b) => a.time_ms - b.time_ms);
  return byConfig;
}

/**
 * Rang du joueur sur une config et ses rivaux directs (juste devant / juste
 * derrière). `lap` doit appartenir à `playerId`.
 */
export function findRivals(
  playerId: string,
  lap:      { track_id: number; car_ordinal: number; car_class: string; drivetrain: string; time_ms: number },
  index:    Map<string, RivalRow[]>,
): ConfigRivals {
  const arr = index.get(configKey(lap)) ?? [];
  // Position du joueur dans la config ; repli sur le temps si introuvable
  let i = arr.findIndex(l => l.player_id === playerId);
  if (i === -1) i = arr.filter(l => l.time_ms < lap.time_ms).length;

  const aheadLap  = i > 0 ? arr[i - 1] : null;
  const behindLap = i >= 0 && i < arr.length - 1 ? arr[i + 1] : null;

  return {
    rank:  i + 1,
    total: Math.max(arr.length, 1),
    ahead:  aheadLap  ? { pseudo: aheadLap.players?.pseudo  ?? 'Inconnu', gapMs: lap.time_ms - aheadLap.time_ms } : null,
    behind: behindLap ? { pseudo: behindLap.players?.pseudo ?? 'Inconnu', gapMs: behindLap.time_ms - lap.time_ms } : null,
  };
}

/** Formate un écart en millisecondes → « 1,234s » (virgule décimale FR). */
export function formatGap(ms: number): string {
  return `${(ms / 1000).toFixed(3).replace('.', ',')}s`;
}

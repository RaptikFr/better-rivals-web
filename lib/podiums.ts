export interface Podiums {
  gold:   number;
  silver: number;
  bronze: number;
}

interface ConfigLap {
  track_id:    number;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
  time_ms:     number;
}

export function configKey(lap: ConfigLap): string {
  return `${lap.track_id}-${lap.car_ordinal}-${lap.car_class}-${lap.drivetrain}`;
}

/** Groupe tous les temps par configuration (circuit × voiture × classe × transmission). */
export function groupByConfig(allLaps: ConfigLap[]): Map<string, number[]> {
  const byConfig = new Map<string, number[]>();
  for (const lap of allLaps) {
    const key = configKey(lap);
    if (!byConfig.has(key)) byConfig.set(key, []);
    byConfig.get(key)!.push(lap.time_ms);
  }
  return byConfig;
}

/**
 * Compte les podiums d'un joueur : pour chacun de ses temps, sa position
 * parmi tous les temps de la même configuration.
 */
export function countPodiums(playerLaps: ConfigLap[], allLaps: ConfigLap[]): Podiums {
  const byConfig = groupByConfig(allLaps);
  let gold = 0, silver = 0, bronze = 0;
  for (const lap of playerLaps) {
    const times = byConfig.get(configKey(lap)) ?? [];
    const betterCount = times.filter(t => t < lap.time_ms).length;
    if (betterCount === 0) gold++;
    else if (betterCount === 1) silver++;
    else if (betterCount === 2) bronze++;
  }
  return { gold, silver, bronze };
}

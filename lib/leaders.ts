// Reconstruction des changements de leader (#1) par configuration à partir de
// l'historique complet des records. Une config = circuit × voiture × classe ×
// transmission, comme partout ailleurs (cf. lib/podiums.ts).

export interface LeaderLap {
  player_id:   string;
  track_id:    number;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
  time_ms:     number;
  recorded_at: string;
}

export interface LeaderChange {
  configKey:   string;
  track_id:    number;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
  newLeaderId: string;
  oldLeaderId: string;
  newTimeMs:   number;
  oldTimeMs:   number;
  recorded_at: string; // moment où le nouveau leader a pris la tête
}

function configKey(l: LeaderLap): string {
  return `${l.track_id}-${l.car_ordinal}-${l.car_class}-${l.drivetrain}`;
}

/**
 * Rejoue, pour chaque config, la chronologie de tous les records (historique +
 * temps actuels) en suivant le meilleur temps courant. Chaque fois qu'un
 * nouveau temps passe sous le record détenu par un AUTRE joueur, on émet un
 * « détrônage ». Les améliorations du leader sur lui-même ne comptent pas.
 *
 * `rows` doit contenir tous les temps connus (lap_times + lap_times_history) ;
 * l'ordre d'entrée n'importe pas, le tri se fait ici.
 */
export function computeLeaderChanges(rows: LeaderLap[]): LeaderChange[] {
  const byConfig = new Map<string, LeaderLap[]>();
  for (const r of rows) {
    const key = configKey(r);
    if (!byConfig.has(key)) byConfig.set(key, []);
    byConfig.get(key)!.push(r);
  }

  const changes: LeaderChange[] = [];

  for (const [key, events] of byConfig) {
    // Ordre chronologique ; à timestamp égal, on applique le plus lent d'abord
    // pour que le plus rapide prenne la tête en dernier (déterminisme).
    events.sort((a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime() ||
      b.time_ms - a.time_ms
    );

    let bestTime = Infinity;
    let bestPlayer: string | null = null;

    for (const ev of events) {
      if (ev.time_ms < bestTime) {
        if (bestPlayer !== null && bestPlayer !== ev.player_id) {
          changes.push({
            configKey:   key,
            track_id:    ev.track_id,
            car_ordinal: ev.car_ordinal,
            car_class:   ev.car_class,
            drivetrain:  ev.drivetrain,
            newLeaderId: ev.player_id,
            oldLeaderId: bestPlayer,
            newTimeMs:   ev.time_ms,
            oldTimeMs:   bestTime,
            recorded_at: ev.recorded_at,
          });
        }
        bestTime   = ev.time_ms;
        bestPlayer = ev.player_id;
      }
    }
  }

  // Les plus récents d'abord
  changes.sort((a, b) =>
    new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  return changes;
}

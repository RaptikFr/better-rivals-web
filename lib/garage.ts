import type { TargetConfig } from '@/components/TargetButton';
import { configKey } from '@/lib/podiums';

// Champs minimaux d'un temps posé par MOI, nécessaires pour proposer un défi
// (je dois avoir un temps sur la config exacte — /api/duels le revérifie).
export interface OwnLap {
  track_id:    number;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
}

/**
 * Intersecte mes propres configs roulées avec les car_ordinal déclarés au
 * garage d'un autre joueur (match au niveau du modèle uniquement — le
 * garage ne connaît pas la classe/transmission). Chaque match donne une
 * suggestion de défi valide côté API : j'ai un temps sur la config, le
 * joueur visé possède le modèle, même s'il n'a jamais roulé cette config
 * précise. Dédupliqué par config, trié pour un rendu stable.
 */
export function suggestDuels(
  myLaps: OwnLap[],
  targetPlayerId: string,
  targetGarageCarOrdinals: ReadonlySet<number>,
): TargetConfig[] {
  const seen = new Map<string, TargetConfig>();
  for (const lap of myLaps) {
    if (!targetGarageCarOrdinals.has(lap.car_ordinal)) continue;
    const key = configKey(lap);
    if (seen.has(key)) continue;
    seen.set(key, {
      targetPlayerId,
      trackId:    lap.track_id,
      carOrdinal: lap.car_ordinal,
      carClass:   lap.car_class,
      drivetrain: lap.drivetrain,
    });
  }
  return [...seen.values()].sort((a, b) => a.trackId - b.trackId || a.carOrdinal - b.carOrdinal);
}

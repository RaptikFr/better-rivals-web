// Décision des notifications « record battu » (POST /api/times), isolée des
// accès base pour être testable. La route lit les meilleurs temps concurrents
// (config exacte, puis autre transmission, puis autre voiture de la classe),
// ces fonctions décident si la cible a vraiment été dépassée.

export interface TempsCible {
  player_id: string;
  time_ms:   number;
}

/**
 * Une cible n'est « dépassée » que si elle était devant l'ancien temps du
 * joueur (ou s'il n'en avait pas) : une simple amélioration d'un joueur déjà
 * devant ne renotifie pas.
 */
export function estDepassement(previousTimeMs: number | null, targetTimeMs: number): boolean {
  return previousTimeMs === null || targetTimeMs < previousTimeMs;
}

/** Le nouveau temps bat-il cette cible ET vient-il de la dépasser ? */
export function cibleBattue<T extends TempsCible>(
  newTimeMs: number,
  previousTimeMs: number | null,
  cible: T | null | undefined,
): cible is T {
  return !!cible && newTimeMs < cible.time_ms && estDepassement(previousTimeMs, cible.time_ms);
}

/**
 * Suiveurs de l'auteur que ce nouveau temps vient de dépasser sur la config
 * exacte (toute position, pas seulement la 1re).
 */
export function rivauxDepasses<T extends TempsCible>(newTimeMs: number, previousTimeMs: number | null, rivaux: T[]): T[] {
  return rivaux.filter(r => cibleBattue(newTimeMs, previousTimeMs, r));
}

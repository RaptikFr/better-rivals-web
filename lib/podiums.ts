export interface Podiums {
  gold:   number;
  silver: number;
  bronze: number;
}

// Configuration = circuit × voiture × classe × transmission. Champs minimaux
// pour en dériver la clé ; les temps en portent un sur-ensemble.
interface ConfigLap {
  track_id:    number;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
}

export function configKey(lap: ConfigLap): string {
  return `${lap.track_id}-${lap.car_ordinal}-${lap.car_class}-${lap.drivetrain}`;
}

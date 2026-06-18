// Type partagé entre l'API /api/objectifs et la page « Mes objectifs ».
// Un objectif = battre le temps d'un pilote précis sur une config donnée.
// Le temps cible et mon temps sont calculés en direct depuis lap_times.

export interface ObjectifView {
  id:             string;
  target_pseudo:  string;
  track_id:       number;
  track_name:     string;
  car_ordinal:    number;
  car_label:      string;
  car_class:      string;
  drivetrain:     string;
  target_time_ms: number;        // temps actuel du pilote visé sur la config
  my_time_ms:     number | null; // mon meilleur temps sur la config (null si pas couru)
  gap_ms:         number | null; // my - target (négatif = objectif dépassé) ; null si pas couru
  achieved:       boolean;       // objectif atteint (achieved_at posé OU temps actuel meilleur)
  achieved_at:    string | null;
  created_at:     string;
}

/** Clé de config, alignée sur lib/podiums.configKey. */
export function objectifConfigKey(o: {
  track_id: number; car_ordinal: number; car_class: string; drivetrain: string;
}): string {
  return `${o.track_id}-${o.car_ordinal}-${o.car_class}-${o.drivetrain}`;
}

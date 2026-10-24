import type { Virage } from '@/lib/circuitGeometry';

export interface ConfigCarte {
  key:        string; // `${car_class}|${drivetrain}|${car_ordinal}` — même clé que la page circuit
  carClass:   string;
  drivetrain: string;
  carLabel:   string;
  carOrdinal: number;
}

export type BestSectorRow = {
  player_id:    string;
  car_ordinal:  number;
  car_class:    string;
  drivetrain:   string;
  sector_index: number;
  best_ms:      number;
  players:      { pseudo: string | null } | null;
};

export interface SecteurInfo {
  bestMs:     number | null;
  bestPseudo: string | null;
  mienMs:     number | null;
  /** mien − meilleur (ms), null sans donnée personnelle ou de référence. */
  deltaMs:    number | null;
}

// Trace réduite (GET /api/replay) — mêmes données que le replay 2D, réutilisées
// ici pour chronométrer chaque VIRAGE (fenêtre exacte distDebutM→distFinM), au
// lieu des tranches égales des secteurs qui peuvent chevaucher plusieurs virages.
export type ReplayLap = {
  time_ms: number;
  pseudo:  string | null;
  d: number[];
  t: number[];
  v: number[];
};

// Candidat au rôle de rival (autre pilote tracé de la config) — pour peupler
// le sélecteur. Renvoyé par /api/replay à chaque appel.
export type RivalDisponible = {
  player_id: string;
  pseudo:    string | null;
  time_ms:   number;
};

export interface PerteVirage {
  virage:      Virage;
  moiS:        number;
  rivalS:      number;
  rivalPseudo: string | null;
  /** moi − rival (s), positif = je perds du temps dans ce virage. */
  deltaS:      number;
}

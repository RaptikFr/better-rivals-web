// Types des tables Supabase de Better Rivals

export type Drivetrain = "AWD" | "RWD" | "FWD";
export type CarClass = "D" | "C" | "B" | "A" | "S1" | "S2" | "X";
export type TrackCategory = "Course sur route" | "Cross-country" | "Eventlab" | string;

export interface Player {
  id: number;
  pseudo: string;
  pin_code: string;
}

export interface Car {
  id: number;
  manufacturer: string;
  name: string;
  year: number;
}

export interface Track {
  id: number;
  name: string;
  length_km: number | null;
  type: TrackCategory;
  is_official: boolean;
}

// Supabase retourne les jointures sous forme de tableaux
export interface LapTime {
  time_ms: number;
  car_class: CarClass;
  car_pi: number;
  drivetrain: Drivetrain;
  players: Pick<Player, "pseudo">[] | null;
  cars: Pick<Car, "manufacturer" | "name" | "year">[] | null;
  tracks: Pick<Track, "name" | "length_km">[] | null;
}

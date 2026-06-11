// Types utilitaires du domaine Better Rivals
export type Drivetrain    = "AWD" | "RWD" | "FWD";
export type CarClass      = "D" | "C" | "B" | "A" | "S1" | "S2" | "R" | "X";
// Valeurs autorisées par la contrainte SQL tracks_type_check (voir supabase/migrations/renommage_touge.sql)
export const TRACK_CATEGORIES = [
  "Course sur route", "Course tous chemins", "Cross-country",
  "Touge", "Course de rue", "Course de drag",
] as const;
export type TrackCategory = (typeof TRACK_CATEGORIES)[number];

// Types de lignes dérivés du schéma généré — à préférer pour les nouvelles interfaces
export type { Database } from './database.types';
export type { Tables, TablesInsert, TablesUpdate } from './database.types';

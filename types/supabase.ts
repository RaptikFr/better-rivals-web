// Types utilitaires du domaine Better Rivals
export type Drivetrain    = "AWD" | "RWD" | "FWD";
export type CarClass      = "D" | "C" | "B" | "A" | "S1" | "S2" | "R" | "X";
export type TrackCategory = "Course sur route" | "Cross-country" | "Eventlab" | string;

// Types de lignes dérivés du schéma généré — à préférer pour les nouvelles interfaces
export type { Database } from './database.types';
export type { Tables, TablesInsert, TablesUpdate } from './database.types';

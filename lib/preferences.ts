import type { TimeStyle, DecimalSep } from '@/components/formatTime';

export type { TimeStyle, DecimalSep };
export type Density = 'comfortable' | 'compact';
export type DateStyle = 'relative' | 'absolute';
export type RankingLayout = 'cards' | 'table';
export type Accent = 'pink-violet' | 'red-green' | 'blue-yellow';

export interface Preferences {
  /** Format d'affichage des temps au tour. */
  timeStyle: TimeStyle;
  /** Séparateur décimal des temps. */
  decimalSep: DecimalSep;
  /** Densité des tableaux (espacement vertical des lignes). */
  density: Density;
  /** Format des dates : relatif (« il y a 2 j ») ou absolu (« 13 juin 2026 »). */
  dateStyle: DateStyle;
  /** Réduit/désactive les animations et transitions. */
  reduceMotion: boolean;
  /** Disposition des classements : cartes groupées ou tableau en colonnes. */
  rankingLayout: RankingLayout;
  /** Couleurs d'accentuation du site (dégradés, badges, liens actifs…). */
  accent: Accent;
}

export const DEFAULT_PREFERENCES: Preferences = {
  timeStyle: 'chrono',
  decimalSep: 'point',
  density: 'comfortable',
  dateStyle: 'relative',
  reduceMotion: false,
  rankingLayout: 'cards',
  accent: 'pink-violet',
};

export const PREFERENCES_STORAGE_KEY = 'better-rivals:preferences';

/** Fusionne des préférences stockées (potentiellement partielles/anciennes) avec les défauts. */
export function sanitizePreferences(raw: unknown): Preferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFERENCES };
  const r = raw as Record<string, unknown>;
  const pick = <K extends keyof Preferences>(key: K, allowed: readonly Preferences[K][]): Preferences[K] =>
    allowed.includes(r[key] as Preferences[K]) ? (r[key] as Preferences[K]) : DEFAULT_PREFERENCES[key];

  return {
    timeStyle: pick('timeStyle', ['chrono', 'seconds']),
    decimalSep: pick('decimalSep', ['point', 'comma']),
    density: pick('density', ['comfortable', 'compact']),
    dateStyle: pick('dateStyle', ['relative', 'absolute']),
    reduceMotion: typeof r.reduceMotion === 'boolean' ? r.reduceMotion : DEFAULT_PREFERENCES.reduceMotion,
    rankingLayout: pick('rankingLayout', ['cards', 'table']),
    accent: pick('accent', ['pink-violet', 'red-green', 'blue-yellow']),
  };
}

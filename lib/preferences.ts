import type { TimeStyle, DecimalSep } from '@/components/formatTime';

export type { TimeStyle, DecimalSep };
export type Density = 'comfortable' | 'compact';
export type DateStyle = 'relative' | 'absolute';
export type RankingLayout = 'cards' | 'table';
export type Accent = 'pink-violet' | 'red-green' | 'blue-yellow';
export type FontSize = 'normal' | 'large';
export type Contrast = 'normal' | 'high';

/** Colonnes facultatives de la vue tableau des classements (PC). */
export interface TableColumns {
  previousTime: boolean;
  diff:         boolean;
  gapLeader:    boolean;
  gapPrev:      boolean;
  gapNext:      boolean;
  pi:           boolean;
  tune:         boolean;
  discord:      boolean;
}

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
  /** Taille de police globale (accessibilité). */
  fontSize: FontSize;
  /** Contraste renforcé des textes secondaires et bordures (accessibilité). */
  contrast: Contrast;
  /** Colonnes facultatives affichées dans la vue tableau des classements. */
  tableColumns: TableColumns;
}

export const DEFAULT_TABLE_COLUMNS: TableColumns = {
  previousTime: true,
  diff:         true,
  gapLeader:    true,
  gapPrev:      true,
  gapNext:      true,
  pi:           true,
  tune:         true,
  discord:      true,
};

export const DEFAULT_PREFERENCES: Preferences = {
  timeStyle: 'chrono',
  decimalSep: 'point',
  density: 'comfortable',
  dateStyle: 'relative',
  reduceMotion: false,
  rankingLayout: 'cards',
  accent: 'pink-violet',
  fontSize: 'normal',
  contrast: 'normal',
  tableColumns: DEFAULT_TABLE_COLUMNS,
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
    fontSize: pick('fontSize', ['normal', 'large']),
    contrast: pick('contrast', ['normal', 'high']),
    tableColumns: sanitizeTableColumns(r.tableColumns),
  };
}

/** Fusionne des colonnes stockées (potentiellement partielles) avec les défauts (tout visible). */
function sanitizeTableColumns(raw: unknown): TableColumns {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TABLE_COLUMNS };
  const r = raw as Record<string, unknown>;
  const bool = (k: keyof TableColumns) =>
    typeof r[k] === 'boolean' ? (r[k] as boolean) : DEFAULT_TABLE_COLUMNS[k];
  return {
    previousTime: bool('previousTime'),
    diff:         bool('diff'),
    gapLeader:    bool('gapLeader'),
    gapPrev:      bool('gapPrev'),
    gapNext:      bool('gapNext'),
    pi:           bool('pi'),
    tune:         bool('tune'),
    discord:      bool('discord'),
  };
}

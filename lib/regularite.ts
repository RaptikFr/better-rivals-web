// ============================================================
// RÉGULARITÉ — logique pure du score de régularité (idée #4).
// Entrée : les tours complets d'une config (table session_laps, alimentée
// par POST /api/sectors qui reçoit CHAQUE tour du relais ≥ v1.15).
// Principe : deux pilotes au même chrono ne se valent pas si l'un le répète
// à 0,2 s près et l'autre le sort une fois sur dix. On mesure donc la
// DISPERSION des tours propres d'une même session (écart-type), normalisée
// par le temps moyen (coefficient de variation) pour être comparable d'un
// circuit court à un circuit long.
// ============================================================

/** Un tour complet validé (temps + horodatage). */
export interface TourSession {
  lapMs: number;
  /** Epoch ms (Date.parse de created_at). */
  at: number;
}

export type NiveauRegularite = 'metronome' | 'regulier' | 'variable' | 'irregulier';

export interface ScoreRegularite {
  /** Écart-type des tours propres, en ms. */
  ecartMs: number;
  /** Coefficient de variation (écart-type / moyenne), sans unité. */
  cv: number;
  niveau: NiveauRegularite;
  /** Tours propres retenus pour le calcul. */
  nbTours: number;
  /** Tours de la session avant filtrage des tours ratés. */
  nbToursTotal: number;
  /** Epoch ms du dernier tour de la session. */
  finSession: number;
}

export interface RegulariteConfig {
  /** Score de la session scorable la plus récente. */
  derniere: ScoreRegularite;
  /** Meilleur score (CV le plus bas) parmi les sessions scorables. */
  meilleure: ScoreRegularite;
  /** Nombre de sessions scorables (≥ MIN_TOURS_PROPRES tours propres). */
  nbSessions: number;
}

/** Deux tours espacés de plus de 45 min = deux sessions distinctes. */
export const SESSION_GAP_MS = 45 * 60_000;

/** En dessous de 3 tours propres, un écart-type ne veut rien dire. */
export const MIN_TOURS_PROPRES = 3;

/** Un tour > 110 % de la médiane de la session = tour raté (sortie, mur,
 *  tour d'exploration) — exclu du calcul pour ne pas punir un seul crash. */
const SEUIL_TOUR_RATE = 1.1;

/** Seuils de niveau sur le CV. 0,5 % ≈ ±0,3 s sur un tour d'une minute. */
const SEUILS_NIVEAU: [NiveauRegularite, number][] = [
  ['metronome', 0.005],
  ['regulier',  0.015],
  ['variable',  0.03],
];

function mediane(valeurs: number[]): number {
  const tries = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(tries.length / 2);
  return tries.length % 2 ? tries[m] : (tries[m - 1] + tries[m]) / 2;
}

/** Découpe une liste de tours (ordre quelconque) en sessions chronologiques :
 *  nouvelle session dès qu'un trou > gapMs sépare deux tours consécutifs. */
export function decouperSessions(tours: TourSession[], gapMs: number = SESSION_GAP_MS): TourSession[][] {
  if (tours.length === 0) return [];
  const tries = [...tours].sort((a, b) => a.at - b.at);
  const sessions: TourSession[][] = [[tries[0]]];
  for (let i = 1; i < tries.length; i++) {
    if (tries[i].at - tries[i - 1].at > gapMs) sessions.push([]);
    sessions[sessions.length - 1].push(tries[i]);
  }
  return sessions;
}

/** Score d'une session, ou null si elle n'a pas assez de tours propres. */
export function scoreSession(tours: TourSession[]): ScoreRegularite | null {
  if (tours.length < MIN_TOURS_PROPRES) return null;
  const med = mediane(tours.map(t => t.lapMs));
  const propres = tours.filter(t => t.lapMs <= med * SEUIL_TOUR_RATE);
  if (propres.length < MIN_TOURS_PROPRES) return null;

  const temps = propres.map(t => t.lapMs);
  const moyenne = temps.reduce((s, v) => s + v, 0) / temps.length;
  const variance = temps.reduce((s, v) => s + (v - moyenne) ** 2, 0) / temps.length;
  const ecartMs = Math.sqrt(variance);
  const cv = moyenne > 0 ? ecartMs / moyenne : 0;

  const niveau: NiveauRegularite =
    SEUILS_NIVEAU.find(([, seuil]) => cv <= seuil)?.[0] ?? 'irregulier';

  return {
    ecartMs,
    cv,
    niveau,
    nbTours: propres.length,
    nbToursTotal: tours.length,
    finSession: Math.max(...tours.map(t => t.at)),
  };
}

/** Régularité d'une config : dernière session scorable + meilleure session.
 *  Null si aucune session n'a assez de tours propres. */
export function regulariteConfig(tours: TourSession[]): RegulariteConfig | null {
  const scores = decouperSessions(tours)
    .map(scoreSession)
    .filter((s): s is ScoreRegularite => s !== null);
  if (scores.length === 0) return null;
  const derniere = scores.reduce((a, b) => (b.finSession > a.finSession ? b : a));
  const meilleure = scores.reduce((a, b) => (b.cv < a.cv ? b : a));
  return { derniere, meilleure, nbSessions: scores.length };
}

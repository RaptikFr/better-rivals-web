// Logique pure de validation des chronos, isolée de la route API pour être
// testable sans Next ni Supabase. La route /api/times s'appuie dessus.

/** Formate une durée en ms vers `mm:ss.mmm`. */
export function formatTime(ms: number): string {
  const minutes      = Math.floor(ms / 60000);
  const seconds      = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Circuits : vitesse moyenne plausible entre 20 m/s (72 km/h) et 100 m/s (360 km/h),
// marge de 20 % pour absorber les imprécisions.
// Sprints : bornes volontairement très larges (10 à 150 m/s) — length_km est la
// distance point à point, parcourue parfois très vite (drags) ou très lentement
// (cross-country) ; ça filtre au moins les temps absurdes en attendant des
// records de référence OCR.
export function bornesTempsMs(lengthKm: number, isSprint: boolean): { minMs: number; maxMs: number } {
  const [vMax, vMin] = isSprint ? [150, 10] : [100, 20];
  return {
    minMs: (lengthKm * 1000 / vMax) * 1000 * 0.8,
    maxMs: (lengthKm * 1000 / vMin) * 1000 * 1.2,
  };
}

/**
 * Garde-fous numériques sur les identifiants et le temps. Un id ou un temps non
 * numérique partirait sinon en NaN dans les filtres Supabase (résultats
 * silencieusement vides).
 */
export function identifiantsValides(opts: {
  trackId:    number;
  carOrdinal: number;
  timeMs:     number;
}): boolean {
  return (
    Number.isInteger(opts.trackId)    && opts.trackId    > 0 &&
    Number.isInteger(opts.carOrdinal) && opts.carOrdinal > 0 &&
    Number.isFinite(opts.timeMs)      && opts.timeMs      > 0
  );
}

/** Le temps est-il dans les bornes plausibles vu la longueur du circuit ? */
export function tempsDansBornes(timeMs: number, lengthKm: number, isSprint: boolean): boolean {
  if (!(lengthKm > 0)) return true; // longueur inconnue → pas de filtre
  const { minMs, maxMs } = bornesTempsMs(lengthKm, isSprint);
  return timeMs >= minMs && timeMs <= maxMs;
}

/**
 * Le temps est-il trop rapide par rapport au record de référence ? On tolère
 * 1,5 % sous le world record pour absorber les imprécisions de mesure.
 */
export function plusRapideQueRecord(timeMs: number, worldRecordMs: number | null | undefined): boolean {
  if (!worldRecordMs) return false; // pas de référence → on ne juge pas
  return timeMs < worldRecordMs * 0.985;
}

// Bornes sur le nombre de secteurs acceptées par le serveur. Le relais découpe
// par distance (min 5, plafonné à 20) ; on tolère 2→30 pour rester souple sans
// laisser passer un tableau aberrant.
const SECTEURS_MIN = 2;
const SECTEURS_MAX = 30;

/**
 * Valide et normalise les temps par secteurs envoyés par le relais (brique
 * télémétrie #2). Forza n'expose pas de checkpoint : le relais reconstruit les
 * secteurs par distance, leur NOMBRE dépend de la longueur du tracé. On attend
 * donc un TABLEAU de durées (une par secteur, en secondes, pas le cumul), de
 * longueur variable. Les secteurs sont un bonus facultatif — toute anomalie
 * renvoie `null` (on stocke alors NULL sans rejeter le chrono).
 *
 * Garde-fous : entre SECTEURS_MIN et SECTEURS_MAX nombres finis positifs, et
 * somme cohérente avec le temps du tour (tolérance 3 % ou 1 s, le plus large).
 * Renvoie les durées en millisecondes entières.
 */
export function secteursValides(
  sectors: unknown,
  lapTimeMs: number,
): number[] | null {
  if (!Array.isArray(sectors)) return null;
  if (sectors.length < SECTEURS_MIN || sectors.length > SECTEURS_MAX) return null;

  const ms = sectors.map(s => {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : NaN;
  });
  if (ms.some(v => Number.isNaN(v))) return null;

  const somme = ms.reduce((a, b) => a + b, 0);
  const tolerance = Math.max(lapTimeMs * 0.03, 1000);
  if (Math.abs(somme - lapTimeMs) > tolerance) return null;

  return ms;
}

// Bornes sur le nombre de points d'une trace (brique télémétrie, fondation).
// Échantillonnée par distance (~10-15 m/point) : un tour fait quelques
// centaines de points ; on plafonne large pour ne pas stocker n'importe quoi.
const TRACE_MIN_POINTS = 10;
const TRACE_MAX_POINTS = 5000;

export interface TraceSamples {
  d:   number[];   // distance cumulée dans le tour (m)
  t:   number[];   // temps écoulé (s)
  v:   number[];   // vitesse (km/h)
  thr: number[];   // accélérateur (0-100)
  brk: number[];   // frein (0-100)
  str: number[];   // volant (-100..100)
  // [v2] Températures pneus (°F), OPTIONNELLES — n'arrivent qu'avec les relais
  // ≥ 2.1 ; absentes sur les traces existantes. Quand présentes : 4 roues,
  // même longueur que les autres tableaux. Servent à l'équilibre thermique du
  // copilote de réglage (côté site : surchauffe d'un pneu + tendance AV/AR).
  tfl?: number[];  // pneu avant-gauche
  tfr?: number[];  // pneu avant-droit
  trl?: number[];  // pneu arrière-gauche
  trr?: number[];  // pneu arrière-droit
}

const TEMP_KEYS = ['tfl', 'tfr', 'trl', 'trr'] as const;

/**
 * Valide la trace échantillonnée envoyée par le relais : 6 tableaux parallèles
 * de même longueur, finis, avec distance et temps monotones croissants. Renvoie
 * la trace normalisée ou `null` (la route rejette alors la trace). Les 4 tableaux
 * de température pneus sont OPTIONNELS (best-effort) : présents et valides → on
 * les garde ; absents ou malformés → on les ignore sans rejeter la trace.
 */
export function traceValide(samples: unknown): TraceSamples | null {
  if (!samples || typeof samples !== 'object') return null;
  const src = samples as Record<string, unknown>;
  const cles = ['d', 't', 'v', 'thr', 'brk', 'str'] as const;

  const out = {} as Record<(typeof cles)[number], number[]>;
  for (const k of cles) {
    const a = src[k];
    if (!Array.isArray(a)) return null;
    out[k] = a.map(Number);
  }

  const n = out.d.length;
  if (n < TRACE_MIN_POINTS || n > TRACE_MAX_POINTS) return null;
  for (const k of cles) {
    if (out[k].length !== n) return null;
    if (out[k].some(x => !Number.isFinite(x))) return null;
  }
  // Distance et temps doivent croître (échantillonnage par distance le long du tour)
  for (let i = 1; i < n; i++) {
    if (out.d[i] < out.d[i - 1] || out.t[i] < out.t[i - 1]) return null;
  }

  const result = out as TraceSamples;
  // Températures : on n'accepte les 4 roues QUE si toutes sont présentes, de bonne
  // longueur et finies (température partielle = inexploitable → on laisse tomber tout).
  const temps = TEMP_KEYS.map(k => src[k]);
  if (temps.every(a => Array.isArray(a) && (a as unknown[]).length === n)) {
    const parsed = temps.map(a => (a as unknown[]).map(Number));
    if (parsed.every(arr => arr.every(x => Number.isFinite(x)))) {
      TEMP_KEYS.forEach((k, i) => { result[k] = parsed[i]; });
    }
  }
  return result;
}

/**
 * Nombre de secteurs d'un circuit selon sa longueur — formule déterministe
 * (identique côté relais) pour que tous les tours d'un même circuit aient le
 * même découpage : au moins 5, davantage si long. 0 si longueur inconnue.
 */
export function nbSecteurs(lengthKm: number | null | undefined): number {
  if (!lengthKm || lengthKm <= 0) return 0;
  return Math.max(5, Math.min(20, Math.round(lengthKm / 1.5)));
}

/**
 * Reconstruit des secteurs ÉGAUX EN DISTANCE à partir d'une trace télémétrique
 * (tableaux `d`/`t` parallèles, distance et temps croissants) : découpe la
 * distance RÉELLE du tour en `n` parts égales, interpole le temps écoulé à chaque
 * borne, renvoie les durées de secteur en millisecondes — ou `null` si incohérent.
 *
 * Pourquoi pas la longueur "officielle" du circuit : la valeur de distance de la
 * télémétrie Forza ne correspond pas aux mètres réels (elle plafonne ~5950 quel
 * que soit le tracé). Elle reste monotone et reproductible par tour, donc la
 * découper par ses PROPRES fractions donne des secteurs égaux et comparables
 * entre pilotes. C'est cette fonction qui alimente `sectors_ms` (et donc le tour
 * théorique), pas les secteurs envoyés par le relais (faussés par ce décalage).
 */
export function secteursDepuisTrace(
  samples: { d?: unknown; t?: unknown } | null | undefined,
  n: number,
  lapTimeMs?: number,
): number[] | null {
  if (!samples || !Number.isInteger(n) || n < 2) return null;
  const d = samples.d, t = samples.t;
  if (!Array.isArray(d) || !Array.isArray(t) || d.length !== t.length || d.length < n + 1) {
    return null;
  }
  const dFinal = Number(d[d.length - 1]);
  // Borne d'arrivée = le vrai temps du tour quand on l'a (le dernier échantillon
  // de la trace tombe quelques ms AVANT la ligne ; sans ça le dernier secteur
  // est sous-compté et la somme ne retombe pas sur time_ms → faux gain affiché).
  const tFinal = (lapTimeMs && lapTimeMs > 0) ? lapTimeMs / 1000 : Number(t[t.length - 1]);
  if (!(dFinal > 0) || !(tFinal > 0)) return null;

  // Temps (s) interpolé linéairement à la distance `cible` le long de la trace.
  const interpT = (cible: number): number => {
    if (cible <= Number(d[0])) return Number(t[0]);
    for (let i = 1; i < d.length; i++) {
      const di = Number(d[i]);
      if (di >= cible) {
        const d0 = Number(d[i - 1]);
        const span = di - d0;
        if (span <= 0) return Number(t[i]);
        return Number(t[i - 1]) + ((cible - d0) / span) * (Number(t[i]) - Number(t[i - 1]));
      }
    }
    return tFinal;
  };

  const cumul: number[] = [];
  for (let k = 1; k < n; k++) cumul.push(interpT((k / n) * dFinal));
  cumul.push(tFinal); // dernière borne = ligne d'arrivée

  const durees: number[] = [];
  let prev = 0;
  for (const ti of cumul) {
    const dur = ti - prev;
    if (!(dur > 0)) return null;            // non-monotone → on jette
    durees.push(Math.round(dur * 1000));
    prev = ti;
  }
  return durees;
}

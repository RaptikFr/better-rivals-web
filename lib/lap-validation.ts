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

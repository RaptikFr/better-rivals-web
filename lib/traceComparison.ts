// Comparaison continue de deux traces d'un même circuit (feature « où je
// perds du temps », au grain fin) : le tour est découpé en tranches égales en
// distance et, pour chaque tranche, on mesure le temps que CHAQUE trace y a
// passé (interpolation de t aux frontières). deltaS = moi − rival : positif,
// je perds du temps dans cette tranche ; négatif, j'en gagne. Contrairement à
// la coloration par best_sectors (records de secteurs, tours différents), ici
// on compare DEUX TOURS complets réels — le delta cumulé retombe exactement
// sur l'écart final des deux chronos.
//
// Comme partout (cf. CircuitReplay), les distances sont normalisées 0..1 par
// trace : le sous-comptage ~15 % du compteur Forza est un biais d'échelle qui
// s'annule dans la fraction.

// Import relatif (pas @/) : vitest résout les libs entre elles sans alias.
import { interpoler } from './circuitGeometry';

/** Trace minimale d'un tour (mêmes champs que ReplayLap de /api/replay). */
export interface TraceComparable {
  d: number[];
  t: number[];
  /** Vitesses (km/h) alignées sur d — optionnelles ([] accepté). */
  v: number[];
}

export interface SegmentComparaison {
  /** Fractions de début / fin du tour (0..1). */
  f0: number;
  f1: number;
  /** Temps passé dans la tranche par chaque tour (s). */
  moiS:   number;
  rivalS: number;
  /** moi − rival (s) : positif = je perds du temps ici. */
  deltaS: number;
  /** Delta cumulé depuis le départ, à la FIN de la tranche (s). */
  cumulS: number;
  /** Vitesse interpolée au milieu de la tranche (km/h), null si la trace n'a pas de v. */
  vMoi:   number | null;
  vRival: number | null;
}

interface TraceNormalisee {
  dNorm: number[];
  t:     number[];
  v:     number[];
}

function normaliser(trace: TraceComparable): TraceNormalisee | null {
  if (!Array.isArray(trace.d) || trace.d.length < 2 || trace.t.length !== trace.d.length) return null;
  const dTotal = trace.d[trace.d.length - 1];
  if (!(dTotal > 0)) return null;
  return {
    dNorm: trace.d.map(x => x / dTotal),
    t:     trace.t,
    v:     Array.isArray(trace.v) && trace.v.length === trace.d.length ? trace.v : [],
  };
}

/**
 * Compare deux traces en `nbPas` tranches égales en distance. Renvoie null si
 * l'une des traces est inutilisable (trop courte, distances dégénérées).
 */
export function comparerTraces(
  moi: TraceComparable,
  rival: TraceComparable,
  nbPas: number,
): SegmentComparaison[] | null {
  if (!Number.isFinite(nbPas) || nbPas < 1) return null;
  const m = normaliser(moi);
  const r = normaliser(rival);
  if (!m || !r) return null;

  const segments: SegmentComparaison[] = [];
  let tMoiPrec   = interpoler(m.dNorm, m.t, 0);
  let tRivalPrec = interpoler(r.dNorm, r.t, 0);
  // Décalage de départ : les deux traces ne démarrent pas exactement à t=0 au
  // même point — le cumul est mesuré par rapport à la ligne de départ.
  const cumulDepart = tMoiPrec - tRivalPrec;

  for (let k = 0; k < nbPas; k++) {
    const f0 = k / nbPas;
    const f1 = (k + 1) / nbPas;
    const tMoi   = interpoler(m.dNorm, m.t, f1);
    const tRival = interpoler(r.dNorm, r.t, f1);
    const moiS   = tMoi - tMoiPrec;
    const rivalS = tRival - tRivalPrec;
    const fMid = (f0 + f1) / 2;
    segments.push({
      f0,
      f1,
      moiS,
      rivalS,
      deltaS: moiS - rivalS,
      cumulS: (tMoi - tRival) - cumulDepart,
      vMoi:   m.v.length > 0 ? interpoler(m.dNorm, m.v, fMid) : null,
      vRival: r.v.length > 0 ? interpoler(r.dNorm, r.v, fMid) : null,
    });
    tMoiPrec   = tMoi;
    tRivalPrec = tRival;
  }
  return segments;
}

/**
 * Indice de couleur d'une tranche pour une rampe divergente à `nbBins` pas de
 * chaque côté : 0 = neutre (écart négligeable), 1..nbBins = perte croissante,
 * −1..−nbBins = gain croissant. `maxAbs` = plus grand |deltaS| des tranches.
 * Une tranche est neutre si son |delta| est sous 8 % du max ET sous 10 ms —
 * du bruit d'interpolation, pas un vrai écart.
 */
export function binDivergent(deltaS: number, maxAbs: number, nbBins: number): number {
  if (!(maxAbs > 0)) return 0;
  const abs = Math.abs(deltaS);
  if (abs < 0.01 && abs < maxAbs * 0.08) return 0;
  const bin = Math.min(nbBins, Math.max(1, Math.ceil((abs / maxAbs) * nbBins)));
  return deltaS > 0 ? bin : -bin;
}

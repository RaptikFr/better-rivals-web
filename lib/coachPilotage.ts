import type { TraceSamples } from './lap-validation';

// ============================================================================
// COACH DE PILOTAGE — analyse post-tour à partir de la trace déjà stockée
// (lap_traces : d/t/v/thr/brk/str, échantillonnée par distance). PUR & testable.
//
// Principe : on découpe la trace en secteurs ÉGAUX EN DISTANCE (mêmes bornes que
// `secteursDepuisTrace` → fractions de d[last]), on situe pour chaque secteur où
// se perd le temps (vs l'optimal `best_sectors`) et on décrit le pilotage du
// joueur (freinage, vitesse de passage, roue libre, réaccélération) pour en tirer
// 1-2 conseils ANCRÉS AU SECTEUR. Aucune donnée de réglage ici (c'est la Phase 2,
// copilote de réglage) : on ne parle que de conduite.
// ============================================================================

const FREIN_ON = 5;        // brk > 5 % = on freine
const GAZ_PLEIN = 95;      // thr ≥ 95 % = plein gaz
const GAZ_OFF = 5;         // thr < 5 % = pied levé
const SEUIL_PERTE_MS = 80; // on ne conseille un secteur que s'il coûte > 80 ms (sinon bruit)

export interface SectorCoaching {
  index: number;                  // secteur 0-based
  yourMs: number;                 // ton temps de secteur (ms)
  bestMs: number | null;          // meilleur secteur de la config (best_sectors), ms
  deltaMs: number | null;         // yourMs - bestMs (> 0 = tu perds du temps)
  apexKmh: number;                // vitesse minimale dans le secteur (passage à la corde)
  brakeStartPct: number | null;   // où commence le freinage (% du secteur), null si pas de frein
  brakeLenPct: number;            // part du secteur passée à freiner (%)
  coastPct: number;               // part en roue libre : ni gaz ni frein (%)
  fullThrottlePct: number | null; // où le plein gaz revient après la corde (% du secteur)
  tips: string[];                 // conseils ancrés au secteur (peut être vide)
}

export interface PilotageReport {
  sectors: SectorCoaching[];
  worstIndex: number | null;  // secteur qui coûte le plus de temps
  totalLossMs: number | null; // somme des pertes (= gain potentiel) si l'optimal est connu
}

function fmtSec(ms: number): string {
  return (ms / 1000).toFixed(2).replace('.', ',');
}

/**
 * Analyse une trace par secteur. `bestMs[i]` = meilleur temps connu du secteur i
 * (depuis best_sectors), ou null si inconnu. `sectorsMs` = tes temps de secteur
 * (lap_times.sectors_ms). Les deux doivent avoir la même longueur N (le caller
 * aligne) ; sinon on renvoie un rapport vide.
 */
export function analyserPilotage(
  trace: TraceSamples,
  sectorsMs: number[],
  bestMs: (number | null)[],
): PilotageReport {
  const N = sectorsMs.length;
  const { d, v, thr, brk } = trace;
  const dFinal = d[d.length - 1];
  if (N < 2 || bestMs.length !== N || !(dFinal > 0) || d.length < N + 1) {
    return { sectors: [], worstIndex: null, totalLossMs: null };
  }

  const sectors: SectorCoaching[] = [];
  for (let i = 0; i < N; i++) {
    const lo = (i / N) * dFinal;
    const hi = ((i + 1) / N) * dFinal;
    const span = hi - lo;
    // Indices de la trace tombant dans ce secteur (la borne haute du dernier
    // secteur est inclusive pour ne pas perdre le tout dernier point).
    const idx: number[] = [];
    for (let j = 0; j < d.length; j++) {
      if (d[j] >= lo && (d[j] < hi || (i === N - 1 && d[j] <= hi))) idx.push(j);
    }

    const yourMs = sectorsMs[i];
    const bMs = bestMs[i] ?? null;
    const deltaMs = bMs !== null ? yourMs - bMs : null;

    if (idx.length === 0) {
      sectors.push({ index: i, yourMs, bestMs: bMs, deltaMs, apexKmh: 0,
        brakeStartPct: null, brakeLenPct: 0, coastPct: 0, fullThrottlePct: null, tips: [] });
      continue;
    }

    const m = idx.length;
    const apexJ = idx.reduce((best, j) => (v[j] < v[best] ? j : best), idx[0]);
    const apexKmh = v[apexJ];
    const freinIdx = idx.filter(j => brk[j] > FREIN_ON);
    const brakeLenPct = (freinIdx.length / m) * 100;
    const brakeStartPct = freinIdx.length ? ((d[freinIdx[0]] - lo) / span) * 100 : null;
    const coastPct = (idx.filter(j => thr[j] < GAZ_OFF && brk[j] < FREIN_ON).length / m) * 100;
    // Réaccélération : 1er plein gaz APRÈS la corde (le secteur se gagne en sortie).
    let ftJ: number | null = null;
    for (const j of idx) {
      if (j >= apexJ && thr[j] >= GAZ_PLEIN) { ftJ = j; break; }
    }
    const fullThrottlePct = ftJ !== null ? ((d[ftJ] - lo) / span) * 100 : null;

    const tips: string[] = [];
    if (deltaMs !== null && deltaMs > SEUIL_PERTE_MS) {
      if (coastPct > 15) {
        tips.push(`Tu passes ~${Math.round(coastPct)} % du secteur en roue libre (ni gaz ni frein) : `
          + `enchaîne plus franchement frein → gaz, tu y gagnes du temps « gratuit ».`);
      }
      if (fullThrottlePct !== null && fullThrottlePct > 60) {
        tips.push(`Tu remets les gaz tard (≈${Math.round(fullThrottlePct)} % du secteur) : `
          + `vise une réaccélération plus tôt, dès la corde.`);
      }
      if (brakeStartPct !== null && brakeStartPct < 25 && brakeLenPct > 35) {
        tips.push(`Tu freines tôt et longtemps ici : tente de retarder le point de freinage `
          + `et de freiner plus fort, plus court.`);
      }
      if (tips.length === 0) {
        tips.push(`Tu perds ${fmtSec(deltaMs)} s ici vs l'optimal sans cause de conduite évidente : `
          + `c'est peut-être la trajectoire ou le réglage (vitesse de passage ${Math.round(apexKmh)} km/h).`);
      }
    }

    sectors.push({ index: i, yourMs, bestMs: bMs, deltaMs, apexKmh,
      brakeStartPct, brakeLenPct, coastPct, fullThrottlePct, tips });
  }

  let worstIndex: number | null = null;
  let worstDelta = 0;
  let totalLossMs: number | null = null;
  for (const s of sectors) {
    if (s.deltaMs !== null) {
      totalLossMs = (totalLossMs ?? 0) + Math.max(0, s.deltaMs);
      if (s.deltaMs > worstDelta) { worstDelta = s.deltaMs; worstIndex = s.index; }
    }
  }
  return { sectors, worstIndex, totalLossMs };
}

// ============================================================================
// ÉQUILIBRE THERMIQUE (copilote de réglage, aperçu site) — depuis les
// températures pneus de la trace (optionnelles, relais ≥ 2.1).
// ----------------------------------------------------------------------------
// Deux signaux (cf. coach_diag.py, calibré en jeu) :
//  • SURCHAUFFE d'un pneu : un pneu nettement au-dessus de la moyenne des 4 =
//    il glisse/travaille trop. ACTIONNABLE en absolu (pas besoin de baseline) →
//    viser une pression à chaud plus basse / vérifier le carrossage de ce côté.
//  • TENDANCE AV/AR : l'avant qui chauffe nettement plus = train avant surchargé
//    (sous-vireur) ; l'arrière = survireur. À lire EN RELATIF (le neutre d'une
//    voiture n'est PAS Δ=0 : l'avant chauffe déjà plus via les freins) → on garde
//    une marge (seuil 12 °F) et on reste descriptif.
const SEUIL_TEMP_DELTA = 12;  // °F : écart AV−AR au-delà = un essieu travaille nettement plus
const SEUIL_TEMP_CHAUD = 18;  // °F au-dessus de la moyenne des 4 = pneu en surchauffe relative

export const NOMS_ROUE = ['AV-G', 'AV-D', 'AR-G', 'AR-D'] as const;

export interface ThermalReport {
  available: boolean;
  med: [number, number, number, number];  // médianes FL FR RL RR (°F)
  avgAv: number;
  avgAr: number;
  deltaAvAr: number;                       // AV − AR (>0 = avant plus chaud)
  hottest: number;                         // index 0-3 du pneu le plus chaud
  overheat: boolean;                       // le plus chaud dépasse la moyenne de +SEUIL
  tendency: 'survirage' | 'sous-virage' | 'neutre';
}

function mediane(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const THERMAL_VIDE: ThermalReport = {
  available: false, med: [0, 0, 0, 0], avgAv: 0, avgAr: 0,
  deltaAvAr: 0, hottest: 0, overheat: false, tendency: 'neutre',
};

/** Équilibre thermique d'un tour depuis les températures pneus de la trace.
 *  `available:false` si la trace n'a pas de températures (relais trop ancien). */
export function analyseThermique(trace: TraceSamples): ThermalReport {
  const arrs = [trace.tfl, trace.tfr, trace.trl, trace.trr];
  if (arrs.some(a => !a || a.length < 5)) return THERMAL_VIDE;
  const med = arrs.map(a => mediane(a!)) as [number, number, number, number];
  const avg = (med[0] + med[1] + med[2] + med[3]) / 4;
  const avgAv = (med[0] + med[1]) / 2;
  const avgAr = (med[2] + med[3]) / 2;
  const deltaAvAr = avgAv - avgAr;
  let hottest = 0;
  for (let i = 1; i < 4; i++) if (med[i] > med[hottest]) hottest = i;
  const tendency: ThermalReport['tendency'] =
    deltaAvAr > SEUIL_TEMP_DELTA ? 'sous-virage'
      : deltaAvAr < -SEUIL_TEMP_DELTA ? 'survirage'
        : 'neutre';
  return {
    available: true, med, avgAv, avgAr, deltaAvAr, hottest,
    overheat: med[hottest] - avg > SEUIL_TEMP_CHAUD, tendency,
  };
}

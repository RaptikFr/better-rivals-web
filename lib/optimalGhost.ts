// Fantôme « optimal recollé » : pour chaque secteur (même découpage que
// nbSecteurs/secteursDepuisTrace), garde le segment RÉEL du tour le plus rapide
// parmi des candidats tracés, et les recolle bout à bout en recalant l'horloge
// locale de chaque segment sur le temps cumulé. Contrairement au « tour
// optimal » chiffré (theoreticalFromBest, qui combine des TEMPS de secteurs
// pouvant venir de tours aujourd'hui disparus), ceci ne recolle QUE des tours
// dont la trace existe encore — le résultat est donc rejouable en 2D, mais peut
// être légèrement plus lent que l'optimal chiffré si son meilleur secteur n'a
// plus de trace (lap_traces ne garde qu'UNE trace par joueur et par config,
// écrasée à chaque record).
//
// La position ne « saute » jamais (la fraction de distance progresse toujours
// de 0 à 1 sur le même tracé) : ce qui se voit aux jonctions, c'est un à-coup de
// RYTHME quand le fantôme change de pilote source.

export interface CandidatFantome {
  pseudo:  string | null;
  timeMs:  number;
  d:       number[];
  t:       number[];
  v:       number[];
}

export interface JonctionFantome {
  secteur:     number; // 1-based
  pseudo:      string | null;
  tRunningMs:  number; // instant (ms) où le secteur démarre dans le fantôme recollé
  durMs:       number;
}

export interface FantomeOptimal {
  timeMs: number;
  /** Fraction de distance 0..1 (dTotal=1 par construction — même format que d/dTotal ailleurs). */
  d:      number[];
  t:      number[];
  v:      number[];
  seams:  JonctionFantome[];
}

/** Interpolation linéaire de `ys` en `x` sur la grille croissante `xs` (bornée aux extrémités). */
function interpoler(xs: number[], ys: number[], x: number): number {
  const n = xs.length;
  if (n === 0) return 0;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < x) lo = mid + 1; else hi = mid;
  }
  const a = xs[lo - 1], b = xs[lo];
  const t = b === a ? 0 : (x - a) / (b - a);
  return ys[lo - 1] + t * (ys[lo] - ys[lo - 1]);
}

interface CandidatPret extends CandidatFantome {
  dNorm: number[];
}

function preparer(c: CandidatFantome): CandidatPret | null {
  if (c.d.length < 2 || c.t.length !== c.d.length || c.v.length !== c.d.length) return null;
  const dTotal = c.d[c.d.length - 1];
  if (!(dTotal > 0)) return null;
  return { ...c, dNorm: c.d.map(x => x / dTotal) };
}

/**
 * Construit le fantôme recollé à partir de candidats tracés (au moins 1 requis).
 * `n` = nombre de secteurs (nbSecteurs du circuit). Renvoie null si aucun
 * candidat n'est exploitable.
 */
export function construireFantomeOptimal(candidats: CandidatFantome[], n: number): FantomeOptimal | null {
  if (!Number.isInteger(n) || n < 2) return null;
  const prets = candidats.map(preparer).filter((c): c is CandidatPret => c !== null);
  if (prets.length === 0) return null;

  const d: number[] = [], t: number[] = [], v: number[] = [];
  const seams: JonctionFantome[] = [];
  let running = 0;

  for (let k = 0; k < n; k++) {
    const f0 = k / n, f1 = (k + 1) / n;
    let gagnant = prets[0];
    let meilleureDur = Infinity;
    for (const c of prets) {
      const dur = interpoler(c.dNorm, c.t, f1) - interpoler(c.dNorm, c.t, f0);
      if (dur < meilleureDur) { meilleureDur = dur; gagnant = c; }
    }
    const dur = meilleureDur;
    const t0Local = interpoler(gagnant.dNorm, gagnant.t, f0);

    seams.push({ secteur: k + 1, pseudo: gagnant.pseudo, tRunningMs: Math.round(running * 1000), durMs: Math.round(dur * 1000) });

    // Échantillons du gagnant dans [f0, f1], bornés par les jonctions exactes,
    // temps recalé sur l'horloge cumulée du fantôme.
    let idxDebut = gagnant.dNorm.findIndex(x => x >= f0);
    if (idxDebut === -1) idxDebut = gagnant.dNorm.length;
    let idxFin = gagnant.dNorm.findIndex(x => x >= f1);
    if (idxFin === -1) idxFin = gagnant.dNorm.length;

    const segDNorm  = [f0, ...gagnant.dNorm.slice(idxDebut, idxFin), f1];
    const segTLocal = [t0Local, ...gagnant.t.slice(idxDebut, idxFin), t0Local + dur];
    const segV      = [
      interpoler(gagnant.dNorm, gagnant.v, f0),
      ...gagnant.v.slice(idxDebut, idxFin),
      interpoler(gagnant.dNorm, gagnant.v, f1),
    ];

    for (let i = 0; i < segDNorm.length; i++) {
      d.push(segDNorm[i]);
      t.push(running + (segTLocal[i] - t0Local));
      v.push(segV[i]);
    }
    running += dur;
  }

  return { timeMs: Math.round(running * 1000), d, t, v, seams };
}

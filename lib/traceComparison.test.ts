import { describe, it, expect } from 'vitest';
import { comparerTraces, binDivergent, type TraceComparable } from './traceComparison';

/** Trace à vitesse constante : 1000 m échantillonnés tous les 10 m, `duree` s au total. */
function traceUniforme(duree: number, vitesseKmh?: number): TraceComparable {
  const n = 101;
  const d: number[] = [], t: number[] = [], v: number[] = [];
  for (let i = 0; i < n; i++) {
    d.push(i * 10);
    t.push((i / (n - 1)) * duree);
    if (vitesseKmh !== undefined) v.push(vitesseKmh);
  }
  return { d, t, v };
}

describe('comparerTraces', () => {
  it('deux traces identiques → delta nul partout, cumul nul', () => {
    const segs = comparerTraces(traceUniforme(60), traceUniforme(60), 10)!;
    expect(segs).toHaveLength(10);
    for (const s of segs) {
      expect(s.deltaS).toBeCloseTo(0, 6);
    }
    expect(segs[segs.length - 1].cumulS).toBeCloseTo(0, 6);
  });

  it('rival uniformément plus rapide → perte constante, cumul = écart final', () => {
    // moi 66 s, rival 60 s → je perds 6 s réparties uniformément.
    const segs = comparerTraces(traceUniforme(66), traceUniforme(60), 12)!;
    for (const s of segs) expect(s.deltaS).toBeCloseTo(0.5, 6);
    expect(segs[segs.length - 1].cumulS).toBeCloseTo(6, 6);
  });

  it('perte localisée → seule la tranche concernée ressort, cumul en escalier', () => {
    // moi = rival sauf entre 40 % et 50 % du tour où je traîne 2 s de plus.
    const moi = traceUniforme(60);
    for (let i = 0; i < moi.t.length; i++) {
      const f = moi.d[i] / 1000;
      if (f > 0.4) moi.t[i] += f >= 0.5 ? 2 : ((f - 0.4) / 0.1) * 2;
    }
    const segs = comparerTraces(moi, traceUniforme(60), 10)!;
    expect(segs[4].deltaS).toBeCloseTo(2, 6);     // tranche 40–50 %
    expect(segs[3].deltaS).toBeCloseTo(0, 6);
    expect(segs[5].deltaS).toBeCloseTo(0, 6);
    expect(segs[3].cumulS).toBeCloseTo(0, 6);
    expect(segs[4].cumulS).toBeCloseTo(2, 6);
    expect(segs[9].cumulS).toBeCloseTo(2, 6);
  });

  it('échelles de distance différentes (biais compteur Forza) → comparaison par fraction', () => {
    // Le rival a le même tour mais son compteur sous-compte 15 % : d'échelle
    // différente, mêmes fractions → aucun delta.
    const rival = traceUniforme(60);
    rival.d = rival.d.map(x => x * 0.85);
    const segs = comparerTraces(traceUniforme(60), rival, 8)!;
    for (const s of segs) expect(s.deltaS).toBeCloseTo(0, 6);
  });

  it('vitesses interpolées au milieu de tranche, null sans canal v', () => {
    const segs = comparerTraces(traceUniforme(60, 180), traceUniforme(55), 5)!;
    expect(segs[0].vMoi).toBeCloseTo(180, 6);
    expect(segs[0].vRival).toBeNull();
  });

  it('traces inutilisables → null', () => {
    expect(comparerTraces({ d: [0], t: [0], v: [] }, traceUniforme(60), 10)).toBeNull();
    expect(comparerTraces(traceUniforme(60), { d: [0, 0], t: [0, 1], v: [] }, 10)).toBeNull();
    expect(comparerTraces({ d: [0, 10], t: [0], v: [] }, traceUniforme(60), 10)).toBeNull();
    expect(comparerTraces(traceUniforme(60), traceUniforme(60), 0)).toBeNull();
  });
});

describe('binDivergent', () => {
  it('0 quand le max est nul ou l’écart négligeable', () => {
    expect(binDivergent(0.5, 0, 3)).toBe(0);
    expect(binDivergent(0.005, 1, 3)).toBe(0);        // < 10 ms ET < 8 % du max
    expect(binDivergent(-0.001, 0.5, 3)).toBe(0);
  });

  it('un petit écart reste coloré si le max est petit aussi', () => {
    // 9 ms mais 90 % du max → pas du bruit, tranche colorée.
    expect(binDivergent(0.009, 0.01, 3)).toBe(3);
  });

  it('bins croissants avec la perte, signés côté gain', () => {
    expect(binDivergent(1, 1, 3)).toBe(3);
    expect(binDivergent(0.5, 1, 3)).toBe(2);
    expect(binDivergent(0.2, 1, 3)).toBe(1);
    expect(binDivergent(-1, 1, 3)).toBe(-3);
    expect(binDivergent(-0.34, 1, 3)).toBe(-2);
  });
});

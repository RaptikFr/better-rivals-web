import { describe, it, expect } from 'vitest';
import { analyserPilotage } from './coachPilotage';
import type { TraceSamples } from './lap-validation';

// Trace synthétique sur 200 m, 21 points (pas de 10 m), 2 secteurs égaux :
//  • secteur 0 (0–100 m) : plein gaz, rapide, propre ;
//  • secteur 1 (100–200 m) : court freinage, puis longue ROUE LIBRE, plein gaz tardif.
function traceFixture(): TraceSamples {
  const d: number[] = [], t: number[] = [], v: number[] = [], thr: number[] = [], brk: number[] = [], str: number[] = [];
  for (let j = 0; j <= 20; j++) {
    d.push(j * 10);
    t.push(j <= 10 ? 0.3 * j : 3.0 + 0.5 * (j - 10)); // s0 rapide (3 s), s1 lent (5 s)
    str.push(0);
    if (j <= 10) { v.push(200); thr.push(100); brk.push(0); }       // secteur 0 : plein gaz
    else if (j === 11) { v.push(120); thr.push(0); brk.push(60); }  // freinage
    else if (j === 12) { v.push(80);  thr.push(0); brk.push(40); }
    else if (j <= 18) { v.push(j === 13 ? 60 : 70); thr.push(0); brk.push(0); } // roue libre (6 pts)
    else { v.push(150); thr.push(100); brk.push(0); }               // réaccélération tardive
  }
  return { d, t, v, thr, brk, str };
}

describe('analyserPilotage', () => {
  it('repère le secteur perdant, la roue libre et la réaccélération tardive', () => {
    const r = analyserPilotage(traceFixture(), [3000, 5000], [3000, 4000]);
    expect(r.sectors).toHaveLength(2);
    expect(r.worstIndex).toBe(1);
    expect(r.totalLossMs).toBe(1000);

    const s0 = r.sectors[0];
    expect(s0.tips).toHaveLength(0);          // secteur propre (delta 0) → aucun conseil
    expect(s0.apexKmh).toBe(200);

    const s1 = r.sectors[1];
    expect(s1.deltaMs).toBe(1000);
    expect(s1.apexKmh).toBe(60);
    expect(s1.coastPct).toBeGreaterThan(50);  // ~6 points sur 11 en roue libre (la borne 100 m tombe dans le secteur 1)
    expect(s1.brakeStartPct).toBeCloseTo(10, 0);
    expect(s1.fullThrottlePct).toBeCloseTo(90, 0);
    expect(s1.tips.length).toBeGreaterThanOrEqual(2); // roue libre + gaz tardif
    expect(s1.tips.join(' ')).toMatch(/roue libre/i);
  });

  it('ne conseille rien sous le seuil de perte (80 ms)', () => {
    const r = analyserPilotage(traceFixture(), [3000, 4050], [3000, 4000]); // +50 ms seulement
    expect(r.sectors[1].tips).toHaveLength(0);
  });

  it('renvoie un rapport vide si les longueurs ne concordent pas', () => {
    const r = analyserPilotage(traceFixture(), [1, 2, 3], [1]);
    expect(r.sectors).toHaveLength(0);
    expect(r.worstIndex).toBeNull();
  });

  it('tolère un optimal inconnu (best_sectors absent) sans planter', () => {
    const r = analyserPilotage(traceFixture(), [3000, 5000], [null, null]);
    expect(r.totalLossMs).toBeNull();
    expect(r.sectors[1].deltaMs).toBeNull();
    expect(r.sectors[1].tips).toHaveLength(0); // pas d'optimal → pas de conseil de perte
  });
});
